from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from api.live import live_quotes
from db.supabase_market_data import list_daily_candles_from_supabase

router = APIRouter()


def number(value: Any) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def latest_candles(symbol: str, limit: int = 20) -> list[dict[str, Any]]:
    try:
        rows = list_daily_candles_from_supabase(limit=10000)
    except Exception:
        return []
    filtered = [row for row in rows if str(row.get("symbol", "")).upper() == symbol.upper()]
    return sorted(filtered, key=lambda row: str(row.get("candle_date", "")))[-limit:]


def estimate_vwap_from_daily(symbol: str, ltp: float | None) -> tuple[float | None, str]:
    rows = latest_candles(symbol, limit=20)
    if not rows:
        return (ltp, "ltp_fallback_no_history") if ltp else (None, "missing_history")

    latest = rows[-1]
    high = number(latest.get("high"))
    low = number(latest.get("low"))
    close = number(latest.get("close"))
    typical = (high + low + close) / 3 if high and low and close else close

    # Until true intraday candles are connected, use latest daily typical price as a conservative
    # VWAP proxy. If LTP is available, blend slightly toward live price so the status responds
    # during the day without pretending we have exact tick VWAP.
    if ltp and typical:
        return round((typical * 0.75) + (ltp * 0.25), 2), "estimated_daily_typical_blend"
    if typical:
        return round(typical, 2), "estimated_daily_typical"
    return (ltp, "ltp_fallback") if ltp else (None, "missing_price")


@router.get("/vwap/{symbol}")
async def vwap_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    quote_payload = await live_quotes(limit=100)
    quotes = quote_payload.get("quotes", []) if isinstance(quote_payload, dict) else []
    quote = next((q for q in quotes if str(q.get("symbol", "")).upper() == clean), None)
    ltp = number(quote.get("ltp")) if quote else None

    vwap, source = estimate_vwap_from_daily(clean, ltp)
    if not vwap or not ltp:
        return {
            "status": "unknown",
            "symbol": clean,
            "ltp": ltp,
            "vwap": vwap,
            "above_vwap": False,
            "distance_pct": None,
            "source": source,
            "message": "VWAP status unknown because live price or history is missing.",
            "note": "Research only. True intraday VWAP will replace this estimate later.",
        }

    distance_pct = round(((ltp / vwap) - 1) * 100, 2)
    above = ltp >= vwap
    return {
        "status": "success",
        "symbol": clean,
        "ltp": round(ltp, 2),
        "vwap": round(vwap, 2),
        "above_vwap": above,
        "distance_pct": distance_pct,
        "source": source,
        "message": f"Price is {'above' if above else 'below'} estimated VWAP by {distance_pct}%.",
        "note": "VWAP Engine v1 uses an estimated VWAP proxy until intraday candles are connected. Research only; no live orders.",
    }
