from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Query

from api.live import live_quotes
from brokers.dhan import DhanApiError, DhanConfigError
from db.supabase_market_data import NIFTY_50_SYMBOLS, list_daily_candles_from_supabase, list_symbols_from_supabase

router = APIRouter()
IST = ZoneInfo("Asia/Kolkata")
DHAN_BASE_URL = "https://api.dhan.co/v2"


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


def get_symbol_meta(symbol: str) -> dict[str, Any] | None:
    clean = symbol.upper().strip()
    try:
        rows = list_symbols_from_supabase()
    except Exception:
        rows = NIFTY_50_SYMBOLS
    return next((row for row in rows if str(row.get("symbol", "")).upper() == clean), None)


async def post_dhan_intraday(security_id: str, exchange_segment: str = "NSE_EQ", instrument: str = "EQUITY") -> Any:
    client_id = os.getenv("DHAN_CLIENT_ID")
    access_token = os.getenv("DHAN_ACCESS_TOKEN")
    if not client_id or not access_token:
        raise DhanConfigError("DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN are required")

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "access-token": access_token,
        "dhanClientId": client_id,
    }
    payload = {
        "securityId": str(security_id),
        "exchangeSegment": exchange_segment,
        "instrument": instrument,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{DHAN_BASE_URL}/charts/intraday", headers=headers, json=payload)
    except httpx.HTTPError as exc:
        raise DhanApiError(f"Could not reach Dhan intraday API: {exc}") from exc

    try:
        data = response.json()
    except ValueError:
        data = response.text

    if response.status_code >= 400:
        raise DhanApiError("Dhan intraday API returned an error", status_code=response.status_code, response=data)
    return data


def parse_intraday_timestamp(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        raw = float(value)
        if raw > 10_000_000_000:
            raw = raw / 1000
        return datetime.fromtimestamp(raw, tz=timezone.utc).astimezone(IST).isoformat()

    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        raw = float(text)
        if raw > 10_000_000_000:
            raw = raw / 1000
        return datetime.fromtimestamp(raw, tz=timezone.utc).astimezone(IST).isoformat()

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d-%m-%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).replace(tzinfo=IST).isoformat()
        except ValueError:
            continue

    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST)
        return dt.astimezone(IST).isoformat()
    except ValueError:
        return None


def normalize_intraday_response(symbol: str, response: Any) -> list[dict[str, Any]]:
    payload = response.get("data", response) if isinstance(response, dict) else response
    rows: list[dict[str, Any]] = []

    if isinstance(payload, list):
        for item in payload:
            if not isinstance(item, dict):
                continue
            ts = parse_intraday_timestamp(item.get("timestamp") or item.get("time") or item.get("start_Time") or item.get("startTime"))
            if not ts:
                continue
            rows.append({
                "symbol": symbol,
                "timestamp": ts,
                "open": number(item.get("open")),
                "high": number(item.get("high")),
                "low": number(item.get("low")),
                "close": number(item.get("close")),
                "volume": int(number(item.get("volume"))),
                "source": "dhan_intraday",
            })
        return sorted(rows, key=lambda row: row["timestamp"])

    if not isinstance(payload, dict):
        return rows

    opens = payload.get("open") or payload.get("opens") or []
    highs = payload.get("high") or payload.get("highs") or []
    lows = payload.get("low") or payload.get("lows") or []
    closes = payload.get("close") or payload.get("closes") or []
    volumes = payload.get("volume") or payload.get("volumes") or []
    timestamps = payload.get("timestamp") or payload.get("timestamps") or payload.get("start_Time") or payload.get("startTime") or []

    count = min(len(opens), len(highs), len(lows), len(closes), len(timestamps))
    for index in range(count):
        ts = parse_intraday_timestamp(timestamps[index])
        if not ts:
            continue
        rows.append({
            "symbol": symbol,
            "timestamp": ts,
            "open": number(opens[index]),
            "high": number(highs[index]),
            "low": number(lows[index]),
            "close": number(closes[index]),
            "volume": int(number(volumes[index] if index < len(volumes) else 0)),
            "source": "dhan_intraday",
        })

    return sorted(rows, key=lambda row: row["timestamp"])


def floor_to_interval(ts_iso: str, interval: int) -> str:
    dt = datetime.fromisoformat(ts_iso)
    floored_minute = (dt.minute // interval) * interval
    return dt.replace(minute=floored_minute, second=0, microsecond=0).isoformat()


def aggregate_candles(rows: list[dict[str, Any]], interval: int) -> list[dict[str, Any]]:
    if interval <= 1:
        return rows
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(floor_to_interval(row["timestamp"], interval), []).append(row)

    candles: list[dict[str, Any]] = []
    for ts, group in grouped.items():
        ordered = sorted(group, key=lambda row: row["timestamp"])
        candles.append({
            "symbol": ordered[0]["symbol"],
            "timestamp": ts,
            "open": ordered[0]["open"],
            "high": max(row["high"] for row in ordered),
            "low": min(row["low"] for row in ordered),
            "close": ordered[-1]["close"],
            "volume": sum(int(row.get("volume") or 0) for row in ordered),
            "source": f"dhan_intraday_{interval}m_aggregated",
            "child_candles": len(ordered),
        })
    return sorted(candles, key=lambda row: row["timestamp"])


def compute_vwap_from_intraday(rows: list[dict[str, Any]]) -> float | None:
    pv = 0.0
    volume_sum = 0.0
    for row in rows:
        volume = number(row.get("volume"))
        if volume <= 0:
            continue
        typical = (number(row.get("high")) + number(row.get("low")) + number(row.get("close"))) / 3
        pv += typical * volume
        volume_sum += volume
    if volume_sum <= 0:
        return None
    return round(pv / volume_sum, 2)


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

    if ltp and typical:
        return round((typical * 0.75) + (ltp * 0.25), 2), "estimated_daily_typical_blend"
    if typical:
        return round(typical, 2), "estimated_daily_typical"
    return (ltp, "ltp_fallback") if ltp else (None, "missing_price")


def estimate_retest_from_daily(symbol: str, ltp: float | None) -> dict[str, Any]:
    rows = latest_candles(symbol, limit=20)
    if not rows or not ltp:
        return {"status": "unknown", "result": "Unknown", "retest_held": False, "message": "Retest status unknown because live price or candle history is missing."}

    highs = [number(row.get("high")) for row in rows if number(row.get("high"))]
    lows = [number(row.get("low")) for row in rows if number(row.get("low"))]
    closes = [number(row.get("close")) for row in rows if number(row.get("close"))]
    if not highs or not lows or not closes:
        return {"status": "unknown", "result": "Unknown", "retest_held": False, "message": "Retest status unknown because candle values are missing."}

    period_high = max(highs)
    period_low = min(lows)
    latest_close = closes[-1]
    range_size = max(period_high - period_low, period_high * 0.005)
    breakout_floor = period_high - range_size * 0.15
    retest_buffer = max(range_size * 0.035, period_high * 0.0025)
    retest_low = breakout_floor - retest_buffer
    retest_high = period_high + retest_buffer
    distance_from_zone_pct = round(((ltp / breakout_floor) - 1) * 100, 2) if breakout_floor else None

    base = {
        "ltp": round(ltp, 2),
        "period_high": round(period_high, 2),
        "period_low": round(period_low, 2),
        "breakout_floor": round(breakout_floor, 2),
        "retest_low": round(retest_low, 2),
        "retest_high": round(retest_high, 2),
        "distance_from_zone_pct": distance_from_zone_pct,
    }

    if ltp < retest_low:
        return {"status": "failed", "result": "Retest Failed", "retest_held": False, **base, "message": "Price is below the estimated retest zone. Wait; retest is not holding yet."}
    if retest_low <= ltp <= retest_high and latest_close >= breakout_floor:
        return {"status": "success", "result": "Retest Held", "retest_held": True, **base, "message": "Price is inside/near the estimated breakout retest zone and latest close supports the hold."}
    if ltp > retest_high:
        return {"status": "waiting", "result": "Waiting for Retest", "retest_held": False, **base, "message": "Price is above the retest zone. Do not chase; wait for pullback/retest confirmation."}
    return {"status": "unknown", "result": "Unknown", "retest_held": False, **base, "message": "Retest status is not clear from estimated daily structure."}


@router.get("/candles/{symbol}")
async def intraday_candles(symbol: str, interval: int = Query(5, ge=1, le=60)) -> dict[str, Any]:
    clean = symbol.upper().strip()
    meta = get_symbol_meta(clean)
    if not meta or not meta.get("security_id"):
        return {"status": "unknown_symbol", "symbol": clean, "candles": [], "message": "Symbol security_id is missing. Refresh symbols/security master before using intraday candles.", "live_orders_enabled": False}

    try:
        raw = await post_dhan_intraday(str(meta.get("security_id")))
        minute_rows = normalize_intraday_response(clean, raw)
        candles = aggregate_candles(minute_rows, interval)
        vwap = compute_vwap_from_intraday(minute_rows)
        latest = candles[-1] if candles else None
        return {
            "status": "success" if candles else "empty",
            "symbol": clean,
            "security_id": str(meta.get("security_id")),
            "interval_minutes": interval,
            "minute_candles": len(minute_rows),
            "candles_count": len(candles),
            "latest": latest,
            "vwap": vwap,
            "candles": candles[-120:],
            "source": "dhan_intraday",
            "note": "Read-only intraday candle engine v1. This powers future real VWAP and retest detection. No live orders.",
            "live_orders_enabled": False,
        }
    except DhanConfigError as exc:
        return {"status": "blocked", "symbol": clean, "mode": "dhan_not_configured", "message": str(exc), "candles": [], "live_orders_enabled": False}
    except DhanApiError as exc:
        return {"status": "error", "symbol": clean, "mode": "dhan_api_error", "status_code": exc.status_code, "message": str(exc), "response": exc.response, "candles": [], "live_orders_enabled": False}
    except Exception as exc:
        return {"status": "error", "symbol": clean, "mode": "intraday_adapter_error", "message": str(exc), "candles": [], "live_orders_enabled": False}


@router.get("/vwap/{symbol}")
async def vwap_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    ltp = await get_live_ltp(clean)

    vwap, source = estimate_vwap_from_daily(clean, ltp)
    if not vwap or not ltp:
        return {"status": "unknown", "symbol": clean, "ltp": ltp, "vwap": vwap, "above_vwap": False, "distance_pct": None, "source": source, "message": "VWAP status unknown because live price or history is missing.", "note": "Research only. True intraday VWAP will replace this estimate later."}

    distance_pct = round(((ltp / vwap) - 1) * 100, 2)
    above = ltp >= vwap
    return {"status": "success", "symbol": clean, "ltp": round(ltp, 2), "vwap": round(vwap, 2), "above_vwap": above, "distance_pct": distance_pct, "source": source, "message": f"Price is {'above' if above else 'below'} estimated VWAP by {distance_pct}%.", "note": "VWAP Engine v1 uses an estimated VWAP proxy until intraday candles are connected. Research only; no live orders."}


@router.get("/retest/{symbol}")
async def retest_status(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    ltp = await get_live_ltp(clean)
    result = estimate_retest_from_daily(clean, ltp)
    return {"symbol": clean, **result, "source": "estimated_daily_20d_range", "note": "Retest Engine v1 is estimated from daily range + LTP. True retest detection needs 5-min/15-min Dhan intraday candles."}
