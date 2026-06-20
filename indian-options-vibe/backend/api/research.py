from datetime import date, datetime, timedelta, timezone
from statistics import mean
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from brokers.dhan import DhanApiError, DhanConfigError, DhanReadOnlyAdapter
from db.supabase_market_data import (
    NIFTY_50_SYMBOLS,
    is_market_data_storage_enabled,
    list_daily_candles_from_supabase,
    list_symbols_from_supabase,
    save_daily_candles_to_supabase,
    seed_symbols_to_supabase,
)

router = APIRouter()

MOCK_BASE_PRICES = {
    "RELIANCE": 2860,
    "TCS": 3820,
    "HDFCBANK": 1680,
    "ICICIBANK": 1125,
    "INFY": 1510,
    "BHARTIARTL": 1420,
    "LT": 3560,
    "ITC": 430,
    "SBIN": 825,
    "AXISBANK": 1180,
}


class SeedRequest(BaseModel):
    mode: str = "nifty50"


class DhanIngestRequest(BaseModel):
    mode: str = "nifty50"
    days: int = 180
    limit: int = 50


def mock_price_for_symbol(symbol: str, idx: int) -> float:
    base = MOCK_BASE_PRICES.get(symbol, 500 + (idx * 37) % 2500)
    return float(base)


def make_mock_candles(symbols: list[dict[str, Any]], days: int = 90) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    today = date.today()
    for symbol_idx, item in enumerate(symbols):
        symbol = item["symbol"]
        base = mock_price_for_symbol(symbol, symbol_idx)
        for i in range(days):
            candle_day = today - timedelta(days=days - i)
            drift = (i - days / 2) * 0.18
            wave = ((i + symbol_idx) % 11 - 5) * 0.7
            close = round(base + drift + wave, 2)
            open_price = round(close - (((i + symbol_idx) % 5) - 2) * 0.8, 2)
            high = round(max(open_price, close) + 4 + ((i + symbol_idx) % 7), 2)
            low = round(min(open_price, close) - 4 - ((i + symbol_idx) % 6), 2)
            volume = int(500000 + symbol_idx * 11000 + i * 2300 + ((i + symbol_idx) % 9) * 45000)
            rows.append({
                "symbol": symbol,
                "exchange": "NSE",
                "candle_date": candle_day.isoformat(),
                "open": open_price,
                "high": high,
                "low": low,
                "close": close,
                "volume": volume,
                "source": "mock_seed",
                "raw": {"seed": True, "universe": item.get("universe", "NIFTY50")},
            })
    return rows


def normalize_dhan_historical_response(symbol: str, response: Any) -> list[dict[str, Any]]:
    payload = response.get("data", response) if isinstance(response, dict) else response
    rows: list[dict[str, Any]] = []

    if isinstance(payload, list):
        for item in payload:
            if not isinstance(item, dict):
                continue
            candle_date = parse_dhan_date(item.get("start_Time") or item.get("date") or item.get("timestamp") or item.get("time"))
            if not candle_date:
                continue
            rows.append({
                "symbol": symbol,
                "exchange": "NSE",
                "candle_date": candle_date,
                "open": float(item.get("open", 0)),
                "high": float(item.get("high", 0)),
                "low": float(item.get("low", 0)),
                "close": float(item.get("close", 0)),
                "volume": int(float(item.get("volume", 0) or 0)),
                "source": "dhan_historical",
                "raw": item,
            })
        return rows

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
        candle_date = parse_dhan_date(timestamps[index])
        if not candle_date:
            continue
        rows.append({
            "symbol": symbol,
            "exchange": "NSE",
            "candle_date": candle_date,
            "open": float(opens[index]),
            "high": float(highs[index]),
            "low": float(lows[index]),
            "close": float(closes[index]),
            "volume": int(float(volumes[index] if index < len(volumes) else 0)),
            "source": "dhan_historical",
            "raw": {"index": index, "timestamp": timestamps[index]},
        })

    return rows


def parse_dhan_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        raw = float(value)
        if raw > 10_000_000_000:
            raw = raw / 1000
        return datetime.fromtimestamp(raw, tz=timezone.utc).date().isoformat()

    text = str(value)
    if not text:
        return None
    if text.isdigit():
        raw = float(text)
        if raw > 10_000_000_000:
            raw = raw / 1000
        return datetime.fromtimestamp(raw, tz=timezone.utc).date().isoformat()

    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text[:19], fmt).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


def compute_research_scores(symbols: list[dict[str, Any]], candles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_symbol: dict[str, list[dict[str, Any]]] = {}
    for candle in candles:
        by_symbol.setdefault(candle["symbol"], []).append(candle)

    results: list[dict[str, Any]] = []
    symbol_meta = {item["symbol"]: item for item in symbols}

    for symbol, rows in by_symbol.items():
        ordered = sorted(rows, key=lambda row: row["candle_date"])
        if len(ordered) < 20:
            continue

        latest = ordered[-1]
        close = float(latest["close"])
        prev_close = float(ordered[-2]["close"])
        returns_5d = ((close / float(ordered[-6]["close"])) - 1) * 100 if len(ordered) >= 6 else 0
        returns_20d = ((close / float(ordered[-21]["close"])) - 1) * 100 if len(ordered) >= 21 else 0
        avg_volume_20 = mean(float(row["volume"]) for row in ordered[-20:])
        volume_ratio = float(latest["volume"]) / avg_volume_20 if avg_volume_20 else 0
        high_20 = max(float(row["high"]) for row in ordered[-20:])
        low_20 = min(float(row["low"]) for row in ordered[-20:])
        position_20 = ((close - low_20) / (high_20 - low_20)) * 100 if high_20 != low_20 else 50
        one_day_change = ((close / prev_close) - 1) * 100 if prev_close else 0

        momentum_score = max(0, min(100, 50 + returns_20d * 5 + returns_5d * 3))
        volume_score = max(0, min(100, volume_ratio * 50))
        breakout_score = max(0, min(100, position_20))
        quant_score = round((momentum_score * 0.45) + (volume_score * 0.25) + (breakout_score * 0.30))

        if quant_score >= 75:
            tag = "Strong watchlist"
        elif quant_score >= 60:
            tag = "Improving"
        elif quant_score >= 45:
            tag = "Neutral"
        else:
            tag = "Weak / avoid"

        meta = symbol_meta.get(symbol, {})
        results.append({
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "sector": meta.get("sector", "Unknown"),
            "close": close,
            "change_1d_pct": round(one_day_change, 2),
            "return_5d_pct": round(returns_5d, 2),
            "return_20d_pct": round(returns_20d, 2),
            "volume_ratio": round(volume_ratio, 2),
            "position_20d_pct": round(position_20, 2),
            "quant_score": quant_score,
            "tag": tag,
            "ai_reason": make_ai_reason(symbol, returns_20d, volume_ratio, position_20, quant_score),
        })

    return sorted(results, key=lambda row: row["quant_score"], reverse=True)


def make_ai_reason(symbol: str, returns_20d: float, volume_ratio: float, position_20: float, score: int) -> str:
    direction = "momentum is improving" if returns_20d > 0 else "momentum is weak"
    volume = "volume confirmation is present" if volume_ratio >= 1.1 else "volume confirmation is not strong yet"
    breakout = "price is near the upper 20-day range" if position_20 >= 70 else "price is not near a clean breakout zone"
    return f"{symbol}: {direction}, {volume}, and {breakout}. Quant score {score}/100. Use this only for research, not automatic execution."


@router.get("/symbols")
def list_symbols() -> dict[str, Any]:
    if is_market_data_storage_enabled():
        try:
            rows = list_symbols_from_supabase()
            if rows:
                return {"mode": "supabase", "count": len(rows), "symbols": rows}
        except Exception as exc:
            return {"mode": "fallback", "error": str(exc), "count": len(NIFTY_50_SYMBOLS), "symbols": NIFTY_50_SYMBOLS}

    return {"mode": "memory", "count": len(NIFTY_50_SYMBOLS), "symbols": NIFTY_50_SYMBOLS}


@router.post("/seed")
def seed_research_data(request: SeedRequest) -> dict[str, Any]:
    symbols = NIFTY_50_SYMBOLS
    candles = make_mock_candles(symbols, days=90)

    if is_market_data_storage_enabled():
        try:
            saved_symbols = seed_symbols_to_supabase()
            saved_candles = save_daily_candles_to_supabase(candles)
            return {
                "status": "seeded",
                "mode": "supabase",
                "symbols": len(saved_symbols),
                "daily_candles": len(saved_candles),
                "note": "Mock OHLCV seed created for research dashboard. Use Fetch Dhan Daily to replace with real candles.",
            }
        except Exception as exc:
            return {"status": "seeded_fallback", "mode": "memory", "error": str(exc), "symbols": len(symbols), "daily_candles": len(candles)}

    return {"status": "seeded", "mode": "memory", "symbols": len(symbols), "daily_candles": len(candles)}


@router.post("/ingest/dhan-daily")
async def ingest_dhan_daily(request: DhanIngestRequest) -> dict[str, Any]:
    if not is_market_data_storage_enabled():
        return {"status": "blocked", "mode": "no_supabase", "message": "Supabase is required before storing Dhan candles."}

    try:
        symbols = list_symbols_from_supabase() or seed_symbols_to_supabase()
    except Exception:
        symbols = NIFTY_50_SYMBOLS
        seed_symbols_to_supabase()

    selected = [item for item in symbols if item.get("security_id")]
    selected = selected[: max(1, min(request.limit, 50))]
    from_date = (date.today() - timedelta(days=max(30, min(request.days, 730)))).isoformat()
    to_date = date.today().isoformat()

    try:
        adapter = DhanReadOnlyAdapter()
    except DhanConfigError as exc:
        return {"status": "blocked", "mode": "dhan_not_configured", "message": str(exc)}

    saved_total = 0
    failed: list[dict[str, Any]] = []
    examples: list[dict[str, Any]] = []

    for item in selected:
        symbol = item["symbol"]
        security_id = str(item.get("security_id"))
        try:
            raw = await adapter.historical_daily(security_id=security_id, from_date=from_date, to_date=to_date)
            rows = normalize_dhan_historical_response(symbol, raw)
            saved = save_daily_candles_to_supabase(rows)
            saved_total += len(saved)
            if len(examples) < 5:
                examples.append({"symbol": symbol, "security_id": security_id, "candles": len(saved)})
        except DhanApiError as exc:
            failed.append({"symbol": symbol, "security_id": security_id, "status_code": exc.status_code, "error": str(exc), "response": exc.response})
        except Exception as exc:
            failed.append({"symbol": symbol, "security_id": security_id, "error": str(exc)})

    return {
        "status": "completed_with_errors" if failed else "completed",
        "mode": "dhan_historical",
        "from_date": from_date,
        "to_date": to_date,
        "symbols_attempted": len(selected),
        "candles_saved": saved_total,
        "examples": examples,
        "failed_count": len(failed),
        "failed": failed[:10],
        "note": "Dhan daily candles saved to Supabase daily_candles. Live orders remain locked.",
    }


@router.get("/stocks")
def stock_research() -> dict[str, Any]:
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
        except Exception as exc:
            scores = compute_research_scores(symbols, candles)
            return {"mode": "fallback_mock", "source": source, "error": str(exc), "count": len(scores), "stocks": scores}

    scores = compute_research_scores(symbols, candles)
    return {
        "mode": mode,
        "source": source,
        "universe": "NIFTY50",
        "count": len(scores),
        "stocks": scores,
        "note": "Research only. No live orders. Use Fetch Dhan Daily to replace mock candles with real Dhan historical candles.",
    }
