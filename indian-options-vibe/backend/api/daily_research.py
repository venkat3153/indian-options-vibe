from datetime import date
from statistics import mean
from typing import Any

from fastapi import APIRouter

from api.research import compute_research_scores, make_mock_candles
from db.supabase_market_data import (
    NIFTY_50_SYMBOLS,
    is_market_data_storage_enabled,
    list_daily_candles_from_supabase,
    list_symbols_from_supabase,
)

router = APIRouter()


def load_research_universe() -> tuple[list[dict[str, Any]], list[dict[str, Any]], str, str]:
    symbols = NIFTY_50_SYMBOLS
    candles = make_mock_candles(symbols, days=90)
    mode = "memory_mock"
    source = "mock_seed"

    if is_market_data_storage_enabled():
        try:
            db_symbols = list_symbols_from_supabase()
            db_candles = list_daily_candles_from_supabase(limit=5000)
            if db_symbols:
                symbols = db_symbols
            if db_candles:
                candles = db_candles
                mode = "supabase"
                sources = sorted({str(row.get("source", "unknown")) for row in db_candles})
                source = ", ".join(sources[:3])
            else:
                mode = "supabase_empty_using_mock"
        except Exception:
            mode = "fallback_mock"

    return symbols, candles, mode, source


def market_regime(scores: list[dict[str, Any]]) -> dict[str, Any]:
    if not scores:
        return {"label": "Unknown", "score": 0, "reason": "No research data available yet."}

    avg_1d = mean(float(row.get("change_1d_pct", 0)) for row in scores)
    avg_5d = mean(float(row.get("return_5d_pct", 0)) for row in scores)
    strong_count = len([row for row in scores if int(row.get("quant_score", 0)) >= 70])
    weak_count = len([row for row in scores if int(row.get("quant_score", 0)) < 45])

    regime_score = round(50 + avg_1d * 8 + avg_5d * 4 + strong_count * 0.8 - weak_count * 0.6)
    regime_score = max(0, min(100, regime_score))

    if regime_score >= 65:
        label = "Bullish Watch"
        reason = "Breadth and momentum are supportive. Prefer pullback entries in leading stocks."
    elif regime_score <= 40:
        label = "Defensive / Choppy"
        reason = "Breadth is weak or unstable. Reduce trades and avoid chasing breakouts."
    else:
        label = "Neutral / Selective"
        reason = "Market is mixed. Trade only the cleanest stocks with volume and structure confirmation."

    return {
        "label": label,
        "score": regime_score,
        "avg_1d_pct": round(avg_1d, 2),
        "avg_5d_pct": round(avg_5d, 2),
        "strong_count": strong_count,
        "weak_count": weak_count,
        "reason": reason,
    }


def sector_strength(scores: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_sector: dict[str, list[dict[str, Any]]] = {}
    for row in scores:
        by_sector.setdefault(str(row.get("sector") or "Unknown"), []).append(row)

    sectors: list[dict[str, Any]] = []
    for sector, rows in by_sector.items():
        sectors.append({
            "sector": sector,
            "count": len(rows),
            "avg_score": round(mean(int(row.get("quant_score", 0)) for row in rows), 1),
            "avg_5d_pct": round(mean(float(row.get("return_5d_pct", 0)) for row in rows), 2),
            "leaders": [row["symbol"] for row in sorted(rows, key=lambda r: int(r.get("quant_score", 0)), reverse=True)[:3]],
        })

    return sorted(sectors, key=lambda row: (row["avg_score"], row["avg_5d_pct"]), reverse=True)[:8]


def plan_for_stock(row: dict[str, Any], regime: dict[str, Any]) -> dict[str, Any]:
    score = int(row.get("quant_score", 0))
    vol_x = float(row.get("volume_ratio", 0))
    pos_20 = float(row.get("position_20d_pct", 0))
    ret_5d = float(row.get("return_5d_pct", 0))
    change_1d = float(row.get("change_1d_pct", 0))

    reasons: list[str] = []
    warnings: list[str] = []

    if score >= 75:
        reasons.append("high quant score")
    if vol_x >= 1.5:
        reasons.append(f"volume expansion {vol_x}x")
    if pos_20 >= 85:
        reasons.append(f"near 20D high zone at {round(pos_20, 1)}%")
    if ret_5d > 2:
        reasons.append(f"5D momentum {ret_5d}%")
    if change_1d < 0:
        warnings.append("latest daily candle is negative")
    if pos_20 >= 95:
        warnings.append("stock may be extended; wait for retest, do not chase")
    if vol_x < 0.8:
        warnings.append("volume confirmation is weak")

    if score >= 75 and regime.get("label") != "Defensive / Choppy":
        action_tag = "Ready" if pos_20 < 95 else "Wait"
    elif score >= 60:
        action_tag = "Wait"
    else:
        action_tag = "Avoid"

    if warnings and action_tag == "Ready":
        action_tag = "Wait"

    entry = "Wait for intraday VWAP hold or breakout retest with volume. Enter only after confirmation candle."
    if pos_20 >= 85:
        entry = "Wait for breakout retest near the 20D high zone. Avoid first candle chase."
    elif vol_x >= 1.5:
        entry = "Watch for continuation above VWAP with volume staying above average."

    invalidation = "Avoid/exit idea if price loses VWAP or breaks the planned retest zone."
    target = "Target previous high / measured move with minimum 1:1.5 to 1:2 RR; trail only if momentum continues."

    return {
        "symbol": row.get("symbol"),
        "name": row.get("name"),
        "sector": row.get("sector"),
        "close": row.get("close"),
        "quant_score": score,
        "action_tag": action_tag,
        "setup": row.get("tag"),
        "reason": "; ".join(reasons) if reasons else row.get("ai_reason", "Selected by research score."),
        "risk_warning": "; ".join(warnings) if warnings else "No major daily warning. Still wait for intraday confirmation.",
        "entry_idea": entry,
        "invalidation": invalidation,
        "target_idea": target,
        "news_note": "News/fundamental connector not added yet. Check corporate news/results before live trading.",
        "financial_note": "Financial snapshot will be added in the next research layer. Current plan is price/volume based.",
        "metrics": {
            "change_1d_pct": row.get("change_1d_pct"),
            "return_5d_pct": row.get("return_5d_pct"),
            "return_20d_pct": row.get("return_20d_pct"),
            "volume_ratio": row.get("volume_ratio"),
            "position_20d_pct": row.get("position_20d_pct"),
        },
    }


@router.get("")
def daily_research_plan(limit: int = 10) -> dict[str, Any]:
    symbols, candles, mode, source = load_research_universe()
    scores = compute_research_scores(symbols, candles)
    regime = market_regime(scores)
    sectors = sector_strength(scores)

    clean_candidates = [
        row for row in scores
        if int(row.get("quant_score", 0)) >= 55 and float(row.get("volume_ratio", 0)) >= 0.75
    ]
    selected = clean_candidates[: max(1, min(limit, 20))]
    plans = [plan_for_stock(row, regime) for row in selected]

    return {
        "status": "ready",
        "mode": mode,
        "source": source,
        "date": date.today().isoformat(),
        "universe": "NIFTY50",
        "live_orders_enabled": False,
        "market_regime": regime,
        "top_sectors": sectors,
        "count": len(plans),
        "plans": plans,
        "note": "Daily research only. Use as watchlist input, not automatic live execution.",
    }
