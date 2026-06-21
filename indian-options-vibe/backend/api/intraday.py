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


async def get_live_ltp(symbol: str) -> float | None:
    quote_payload = await live_quotes(limit=100)
    quotes = quote_payload.get("quotes", []) if isinstance(quote_payload, dict) else []
    quote = next((q for q in quotes if str(q.get("symbol", "")).upper() == symbol.upper()), None)
    if not quote:
        return None
    ltp = number(quote.get("ltp"))
    return ltp or None


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


def estimate_retest_from_daily(symbol: str, ltp: float | None) -> dict[str, Any]:
    rows = latest_candles(symbol, limit=20)
    if not rows or not ltp:
        return {
            "status": "unknown",
            "result": "Unknown",
            "retest_held": False,
            "message": "Retest status unknown because live price or candle history is missing.",
        }

    highs = [number(row.get("high")) for row in rows if number(row.get("high"))]
    lows = [number(row.get("low")) for row in rows if number(row.get("low"))]
    closes = [number(row.get("close")) for row in rows if number(row.get("close"))]
    if not highs or not lows or not closes:
        return {
            "status": "unknown",
            "result": "Unknown",
            "retest_held": False,
            "message": "Retest status unknown because candle values are missing.",
        }

    period_high = max(highs)
    period_low = min(lows)
    latest_close = closes[-1]
    range_size = max(period_high - period_low, period_high * 0.005)

    # Estimated breakout zone: top 15% of the 20D range.
    breakout_floor = period_high - range_size * 0.15
    retest_buffer = max(range_size * 0.035, period_high * 0.0025)
    retest_low = breakout_floor - retest_buffer
    retest_high = period_high + retest_buffer

    distance_from_zone_pct = round(((ltp / breakout_floor) - 1) * 100, 2) if breakout_floor else None

    if ltp < retest_low:
        return {
            "status": "failed",
            "result": "Retest Failed",
            "retest_held": False,
            "ltp": round(ltp, 2),
            "period_high": round(period_high, 2),
            "period_low": round(period_low, 2),
            "breakout_floor": round(breakout_floor, 2),
            "retest_low": round(retest_low, 2),
            "retest_high": round(retest_high, 2),
            "distance_from_zone_pct": distance_from_zone_pct,
            "message": f"Price is below the estimated retest zone. Wait; retest is not holding yet.",
        }

    if retest_low <= ltp <= retest_high and latest_close >= breakout_floor:
        return {
            "status": "success",
            "result": "Retest Held",
            "retest_held": True,
            "ltp": round(ltp, 2),
            "period_high": round(period_high, 2),
            "period_low": round(period_low, 2),
            "breakout_floor": round(breakout_floor, 2),
            "retest_low": round(retest_low, 2),
            "retest_high": round(retest_high, 2),
            "distance_from_zone_pct": distance_from_zone_pct,
            "message": "Price is inside/near the estimated breakout retest zone and latest close supports the hold.",
        }

    if ltp > retest_high:
        return {
            "status": "waiting",
            "result": "Waiting for Retest",
            "retest_held": False,
            "ltp": round(ltp, 2),
            "period_high": round(period_high, 2),
            "period_low": round(period_low, 2),
            "breakout_floor": round(breakout_floor, 2),
            "retest_low": round(retest_low, 2),
            "retest_high": round(retest_high, 2),
            "distance_from_zone_pct": distance_from_zone_pct,
            "message": "Price is above the retest zone. Do not chase; wait for pullback/retest confirmation.",
        }

    return {
        "status": "unknown",
        "result": "Unknown",
        "retest_held": False,
        "ltp": round(ltp, 2),
        "period_high": round(period_high, 2),
        "period_low": round(period_low, 2),
        "breakout_floor": round(breakout_floor, 2),
        "retest_low": round(retest_low, 2),
        "retest_high": round(retest_high, 2),
        "distance_from_zone_pct": distance_from_zone_pct,
        "message": "Retest status is not clear from estimated daily structure.",
    }


@router.get("/vwap/{symbol}")
async def vwap_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    ltp = await get_live_ltp(clean)

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


@router.get("/retest/{symbol}")
async def retest_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    ltp = await get_live_ltp(clean)
    result = estimate_retest_from_daily(clean, ltp)
    return {
        "symbol": clean,
        **result,
        "source": "estimated_daily_20d_range",
        "note": "Retest Engine v1 is estimated from daily range + LTP. True retest detection needs 5-min/15-min Dhan intraday candles.",
    }
