from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Query

from api.live import live_quotes
from api.market_breadth import get_market_breadth
from api.retest_v2 import retest_v2_status
from api.intraday import vwap_status
from db.supabase_market_data import list_daily_candles_from_supabase, list_symbols_from_supabase

router = APIRouter()


def number(value: Any) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def build_stock_rows() -> list[dict[str, Any]]:
    symbols = list_symbols_from_supabase()
    candles = list_daily_candles_from_supabase(limit=10000)
    by_symbol: dict[str, list[dict[str, Any]]] = {}
    for candle in candles:
        by_symbol.setdefault(str(candle.get("symbol", "")).upper(), []).append(candle)

    rows: list[dict[str, Any]] = []
    for meta in symbols:
        symbol = str(meta.get("symbol", "")).upper()
        history = sorted(by_symbol.get(symbol, []), key=lambda row: str(row.get("candle_date", "")))
        if not history:
            continue
        latest = history[-1]
        prev5 = history[-6] if len(history) >= 6 else history[0]
        last20 = history[-20:]
        close = number(latest.get("close"))
        high20 = max([number(row.get("high")) for row in last20] or [close])
        low20 = min([number(row.get("low")) for row in last20] or [close])
        pos20 = round(((close - low20) / max(high20 - low20, 1)) * 100, 2)
        ret5 = round(((close / max(number(prev5.get("close")), 1)) - 1) * 100, 2)
        volume_ratio = number(latest.get("volume_ratio")) or 1.0
        score = 40
        if volume_ratio >= 1.5:
            score += 15
        if pos20 >= 85:
            score += 15
        if ret5 > 2:
            score += 10
        rows.append({
            "symbol": symbol,
            "name": meta.get("name") or symbol,
            "sector": meta.get("sector") or "Unknown",
            "close": close,
            "return_5d_pct": ret5,
            "volume_ratio": round(volume_ratio, 2),
            "position_20d_pct": pos20,
            "quant_score": min(100, score),
        })
    return rows


def live_strength(row: dict[str, Any], quote: dict[str, Any] | None) -> int:
    live_change = number((quote or {}).get("change_pct"))
    score = 35
    score += min(25, max(-15, live_change * 8))
    score += min(20, number(row.get("quant_score")) * 0.2)
    if number(row.get("volume_ratio")) >= 1.5:
        score += 15
    if 85 <= number(row.get("position_20d_pct")) < 95:
        score += 12
    if number(row.get("return_5d_pct")) > 2:
        score += 8
    if number(row.get("position_20d_pct")) >= 95 and live_change >= 1:
        score -= 18
    return max(0, min(100, round(score)))


def base_signal(row: dict[str, Any], quote: dict[str, Any] | None) -> str:
    live_change = number((quote or {}).get("change_pct"))
    strength = live_strength(row, quote)
    if number(row.get("position_20d_pct")) >= 92 and live_change >= 1:
        return "Extended / Avoid"
    if strength >= 70 and live_change >= 0.35:
        return "Live Watch"
    if strength < 35 or live_change <= -0.75:
        return "Weak Live"
    return "Wait"


async def row_final_status(row: dict[str, Any], quote: dict[str, Any] | None, breadth_supportive: bool) -> dict[str, Any]:
    symbol = row["symbol"]
    signal = base_signal(row, quote)

    try:
        retest = await retest_v2_status(symbol)
    except Exception as exc:
        retest = {"status": "unknown", "message": str(exc), "retest_held": False}

    try:
        vwap = await vwap_status(symbol)
    except Exception as exc:
        vwap = {"status": "unknown", "message": str(exc), "above_vwap": False}

    if retest.get("status") == "failed":
        label = "Wait: Retest Failed"
        tone = "loss"
        reason = retest.get("message") or "Real 5m retest failed."
    elif not vwap.get("above_vwap", False):
        label = "Wait: Below VWAP"
        tone = "warn"
        reason = vwap.get("message") or "Price is below real VWAP."
    elif not breadth_supportive:
        label = "Wait: Breadth Weak"
        tone = "warn"
        reason = "Market breadth is weak. Strong stocks stay watch only."
    elif retest.get("status") == "waiting":
        label = "Wait for Retest"
        tone = "warn"
        reason = retest.get("message") or "Waiting for clean 5m retest."
    elif signal == "Weak Live":
        label = "Avoid: Weak Live"
        tone = "loss"
        reason = "Live strength is weak."
    elif signal == "Extended / Avoid":
        label = "Wait: Extended"
        tone = "warn"
        reason = "Price is extended; do not chase."
    elif signal == "Live Watch":
        label = "Ready to Watch"
        tone = "win"
        reason = "Live, VWAP, retest, and breadth gates are not blocking. Still confirm chart/RR/discipline."
    else:
        label = "Wait"
        tone = "neutral"
        reason = "No clean live confirmation."

    return {
        "symbol": symbol,
        "signal": signal,
        "live_strength": live_strength(row, quote),
        "final_status": label,
        "tone": tone,
        "reason": reason,
        "vwap_status": vwap.get("status"),
        "above_vwap": vwap.get("above_vwap"),
        "vwap": vwap.get("vwap"),
        "retest_status": retest.get("status"),
        "retest_result": retest.get("result"),
        "retest_low": retest.get("retest_low"),
        "retest_high": retest.get("retest_high"),
    }


@router.get("/batch")
async def final_status_batch(limit: int = Query(50, ge=1, le=50)) -> dict[str, Any]:
    rows = build_stock_rows()[:limit]
    live_payload = await live_quotes(limit=limit)
    quotes = live_payload.get("quotes", []) if isinstance(live_payload, dict) else []
    quote_by_symbol = {str(q.get("symbol", "")).upper(): q for q in quotes}
    breadth = await get_market_breadth()
    breadth_supportive = bool(breadth.get("supportive"))

    semaphore = asyncio.Semaphore(5)

    async def guarded(row: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await row_final_status(row, quote_by_symbol.get(row["symbol"]), breadth_supportive)

    statuses = await asyncio.gather(*[guarded(row) for row in rows])
    counts = {
        "ready": len([s for s in statuses if s["final_status"] == "Ready to Watch"]),
        "wait": len([s for s in statuses if s["final_status"].startswith("Wait")]),
        "avoid": len([s for s in statuses if s["final_status"].startswith("Avoid")]),
    }
    return {
        "status": "success",
        "count": len(statuses),
        "breadth_supportive": breadth_supportive,
        "breadth_message": breadth.get("message"),
        "counts": counts,
        "items": statuses,
        "note": "Final Status Batch v1 uses real VWAP/retest where available. Read-only research; no live orders.",
        "live_orders_enabled": False,
    }
