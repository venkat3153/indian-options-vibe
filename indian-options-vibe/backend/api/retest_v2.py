from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from api.intraday import estimate_retest_from_daily, get_live_ltp, get_real_intraday_bundle, number

router = APIRouter()


def candle_volume_avg(candles: list[dict[str, Any]], lookback: int = 20) -> float:
    window = candles[-lookback:] if len(candles) >= lookback else candles
    vols = [number(row.get("volume")) for row in window if number(row.get("volume")) > 0]
    return sum(vols) / len(vols) if vols else 0.0


def real_retest_from_5m(symbol: str, candles: list[dict[str, Any]], vwap: float | None, ltp: float | None, from_date: str | None) -> dict[str, Any]:
    if len(candles) < 25:
        return {
            "status": "unknown",
            "result": "Unknown",
            "retest_held": False,
            "message": "Real retest needs at least 25 five-minute candles. Not enough intraday structure yet.",
            "source": "real_dhan_5m_retest_v2",
        }

    ordered = sorted(candles, key=lambda row: str(row.get("timestamp", "")))
    latest = ordered[-1]
    previous = ordered[-2]
    recent = ordered[-12:]
    prior = ordered[:-12]
    if len(prior) < 10:
        prior = ordered[:-3]
        recent = ordered[-3:]

    prior_high = max(number(row.get("high")) for row in prior)
    session_high = max(number(row.get("high")) for row in ordered)
    session_low = min(number(row.get("low")) for row in ordered)
    latest_close = number(latest.get("close"))
    latest_open = number(latest.get("open"))
    latest_low = number(latest.get("low"))
    previous_close = number(previous.get("close"))
    compare_price = ltp or latest_close

    if not prior_high or not latest_close:
        return {
            "status": "unknown",
            "result": "Unknown",
            "retest_held": False,
            "message": "Real retest could not be calculated because candle prices are missing.",
            "source": "real_dhan_5m_retest_v2",
        }

    range_size = max(session_high - session_low, prior_high * 0.004)
    buffer = max(range_size * 0.025, prior_high * 0.0015)
    retest_low = prior_high - buffer
    retest_high = prior_high + buffer
    recent_low = min(number(row.get("low")) for row in recent)
    recent_high = max(number(row.get("high")) for row in recent)
    avg_vol = candle_volume_avg(ordered, 20)
    latest_vol = number(latest.get("volume"))
    volume_ratio = round(latest_vol / avg_vol, 2) if avg_vol else None

    broke_above = recent_high >= prior_high + buffer * 0.2 or latest_close >= prior_high
    pulled_back_near_zone = recent_low <= retest_high
    held_zone = latest_close >= retest_low and latest_low >= retest_low - buffer
    above_vwap = True if vwap is None else latest_close >= vwap
    recovery_candle = latest_close >= latest_open or latest_close >= previous_close
    failed_zone = latest_close < retest_low or (vwap is not None and latest_close < vwap and latest_close < previous_close)
    extended_without_retest = compare_price > retest_high + buffer * 2 and not pulled_back_near_zone

    base = {
        "symbol": symbol,
        "ltp": round(compare_price, 2) if compare_price else None,
        "latest_close": round(latest_close, 2),
        "latest_candle": latest,
        "from_date": from_date,
        "vwap": round(vwap, 2) if vwap else None,
        "prior_high": round(prior_high, 2),
        "session_high": round(session_high, 2),
        "session_low": round(session_low, 2),
        "breakout_floor": round(prior_high, 2),
        "retest_low": round(retest_low, 2),
        "retest_high": round(retest_high, 2),
        "recent_low": round(recent_low, 2),
        "recent_high": round(recent_high, 2),
        "volume_ratio": volume_ratio,
        "candles_count": len(ordered),
        "source": "real_dhan_5m_retest_v2",
    }

    if failed_zone:
        return {
            **base,
            "status": "failed",
            "result": "Retest Failed",
            "retest_held": False,
            "message": "Latest 5-minute structure is below the breakout/VWAP hold area. Do not mark Ready.",
        }

    if broke_above and pulled_back_near_zone and held_zone and above_vwap and recovery_candle:
        return {
            **base,
            "status": "success",
            "result": "Retest Held",
            "retest_held": True,
            "message": "Real 5-minute structure shows breakout/retest area held and price is holding above the key zone/VWAP.",
        }

    if extended_without_retest:
        return {
            **base,
            "status": "waiting",
            "result": "Waiting for Retest",
            "retest_held": False,
            "message": "Price is above the breakout zone but has not given a clean pullback/retest. Do not chase.",
        }

    return {
        **base,
        "status": "waiting",
        "result": "Waiting for Retest",
        "retest_held": False,
        "message": "Real 5-minute candles do not yet confirm a clean retest hold. Keep on watch only.",
    }


@router.get("/retest-v2/{symbol}")
async def retest_v2_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    ltp = await get_live_ltp(clean)

    try:
        bundle = await get_real_intraday_bundle(clean, interval=5, days=1)
        if bundle.get("status") == "success" and bundle.get("candles"):
            result = real_retest_from_5m(
                clean,
                bundle.get("candles", []),
                bundle.get("vwap"),
                ltp,
                bundle.get("from_date"),
            )
            return {
                **result,
                "attempted_dates": bundle.get("attempted_dates", []),
                "note": "Retest Engine v2 uses real Dhan 5-minute candles. It is read-only and does not place orders.",
                "live_orders_enabled": False,
            }
    except Exception as exc:
        fallback_error = str(exc)
    else:
        fallback_error = "Real intraday retest unavailable."

    fallback = estimate_retest_from_daily(clean, ltp)
    return {
        "symbol": clean,
        **fallback,
        "source": "estimated_daily_20d_range_fallback",
        "intraday_error": fallback_error,
        "note": "Retest Engine v2 fell back to estimated daily range because real 5-minute candles were unavailable. Research only; no live orders.",
        "live_orders_enabled": False,
    }
