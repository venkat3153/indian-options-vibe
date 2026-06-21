from datetime import datetime, timezone
from time import monotonic
from typing import Any
try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore

from fastapi import APIRouter

from brokers.dhan import DhanApiError, DhanConfigError, DhanReadOnlyAdapter
from db.supabase_market_data import (
    NIFTY_50_SYMBOLS,
    is_market_data_storage_enabled,
    list_daily_candles_from_supabase,
    list_symbols_from_supabase,
    seed_symbols_to_supabase,
)

router = APIRouter()

CACHE_TTL_SECONDS = 3.0
_live_cache: dict[str, Any] = {"timestamp": 0.0, "payload": None}


def get_ist_today() -> str:
    if ZoneInfo is not None:
        return datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat()
    return datetime.now(timezone.utc).date().isoformat()


def get_previous_close_by_symbol(limit: int = 5000) -> dict[str, float]:
    """Return previous completed daily close for each symbol.

    Dhan historical daily data can include the current trading day while the market is open.
    If we use that latest row as prev_close, live % becomes 0 because latest daily close
    can match/track LTP. So we prefer the latest candle strictly before today's IST date.
    If older data is not available, we fall back to the latest available close.
    """
    today_ist = get_ist_today()
    by_symbol: dict[str, list[tuple[str, float]]] = {}

    try:
        candles = list_daily_candles_from_supabase(limit=limit)
    except Exception:
        return {}

    for candle in candles:
        symbol = str(candle.get("symbol", "")).upper()
        candle_date = str(candle.get("candle_date", ""))[:10]
        close = float(candle.get("close") or 0)
        if symbol and candle_date and close:
            by_symbol.setdefault(symbol, []).append((candle_date, close))

    prev_close: dict[str, float] = {}
    for symbol, rows in by_symbol.items():
        rows_sorted = sorted(rows, key=lambda item: item[0], reverse=True)
        completed = [row for row in rows_sorted if row[0] < today_ist]
        chosen = completed[0] if completed else rows_sorted[0]
        prev_close[symbol] = chosen[1]

    return prev_close


@router.get("/quotes")
async def live_quotes(limit: int = 50) -> dict[str, Any]:
    """Pull real-time LTP snapshot from Dhan marketfeed.

    This is real-time snapshot polling, not the WebSocket stream yet.
    Live orders remain locked.
    """
    now = monotonic()
    cached = _live_cache.get("payload")
    if cached and now - float(_live_cache.get("timestamp", 0)) < CACHE_TTL_SECONDS:
        return {**cached, "cache": "hit"}

    if not is_market_data_storage_enabled():
        return {
            "status": "blocked",
            "mode": "no_supabase",
            "quotes": [],
            "message": "Supabase symbols with security_id are required for live quotes.",
            "live_orders_enabled": False,
        }

    try:
        symbols = list_symbols_from_supabase() or seed_symbols_to_supabase()
    except Exception:
        symbols = NIFTY_50_SYMBOLS

    selected = [item for item in symbols if item.get("security_id")]
    selected = selected[: max(1, min(limit, 1000))]
    if not selected:
        return {
            "status": "blocked",
            "mode": "missing_security_ids",
            "quotes": [],
            "message": "No symbols have Dhan security_id. Run Seed NIFTY 50 first.",
            "live_orders_enabled": False,
        }

    try:
        adapter = DhanReadOnlyAdapter()
        security_ids = [str(item["security_id"]) for item in selected]
        raw = await adapter.market_ltp(security_ids=security_ids)
    except DhanConfigError as exc:
        return {"status": "blocked", "mode": "dhan_not_configured", "quotes": [], "message": str(exc), "live_orders_enabled": False}
    except DhanApiError as exc:
        return {
            "status": "error",
            "mode": "dhan_marketfeed_error",
            "quotes": [],
            "status_code": exc.status_code,
            "message": str(exc),
            "response": exc.response,
            "live_orders_enabled": False,
        }

    previous_close = get_previous_close_by_symbol()
    data = raw.get("data", {}) if isinstance(raw, dict) else {}
    nse_eq = data.get("NSE_EQ", {}) if isinstance(data, dict) else {}
    symbol_by_id = {str(item.get("security_id")): item for item in selected}

    quotes: list[dict[str, Any]] = []
    for security_id, item in symbol_by_id.items():
        quote = nse_eq.get(security_id) or nse_eq.get(int(security_id)) or {}
        last_price = quote.get("last_price") if isinstance(quote, dict) else None
        symbol = item["symbol"]
        prev_close = previous_close.get(symbol)
        change_pct = None
        change_value = None
        if last_price is not None and prev_close:
            change_value = round(float(last_price) - prev_close, 2)
            change_pct = round(((float(last_price) / prev_close) - 1) * 100, 2)

        quotes.append({
            "symbol": symbol,
            "name": item.get("name", symbol),
            "sector": item.get("sector", "Unknown"),
            "security_id": security_id,
            "ltp": float(last_price) if last_price is not None else None,
            "prev_close": prev_close,
            "change": change_value,
            "change_pct": change_pct,
        })

    payload = {
        "status": "success",
        "mode": "dhan_marketfeed_ltp",
        "source": "dhan_marketfeed_ltp",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(quotes),
        "quotes": quotes,
        "live_orders_enabled": False,
        "note": "Real-time snapshot from Dhan marketfeed LTP. Live % is calculated from previous completed daily close. This is polling, not WebSocket streaming yet.",
    }
    _live_cache["timestamp"] = now
    _live_cache["payload"] = payload
    return {**payload, "cache": "miss"}
