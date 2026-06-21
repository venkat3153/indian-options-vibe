from statistics import mean
from typing import Any

from fastapi import APIRouter

from api.research import make_mock_candles
from db.supabase_market_data import (
    NIFTY_50_SYMBOLS,
    is_market_data_storage_enabled,
    list_daily_candles_from_supabase,
    list_symbols_from_supabase,
)

router = APIRouter()


def load_candles() -> tuple[list[dict[str, Any]], str, str]:
    symbols = NIFTY_50_SYMBOLS
    candles = make_mock_candles(symbols, days=90)
    mode = "memory_mock"
    source = "mock_seed"

    if is_market_data_storage_enabled():
        try:
            db_symbols = list_symbols_from_supabase()
            db_candles = list_daily_candles_from_supabase(limit=10000)
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

    return candles, mode, source


def compact_candle(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "date": str(row.get("candle_date", ""))[:10],
        "open": float(row.get("open") or 0),
        "high": float(row.get("high") or 0),
        "low": float(row.get("low") or 0),
        "close": float(row.get("close") or 0),
        "volume": int(float(row.get("volume") or 0)),
        "source": row.get("source", "unknown"),
    }


@router.get("/{symbol}")
def stock_history(symbol: str, days: int = 20) -> dict[str, Any]:
    clean_symbol = symbol.upper().strip()
    candles, mode, source = load_candles()
    rows = [row for row in candles if str(row.get("symbol", "")).upper() == clean_symbol]
    rows = sorted(rows, key=lambda row: str(row.get("candle_date", "")))

    if not rows:
        return {
            "status": "not_found",
            "symbol": clean_symbol,
            "mode": mode,
            "source": source,
            "candles": [],
            "message": "No daily candle history found for this symbol.",
        }

    selected = rows[-max(5, min(days, 90)):]
    closes = [float(row.get("close") or 0) for row in selected]
    highs = [float(row.get("high") or 0) for row in selected]
    lows = [float(row.get("low") or 0) for row in selected]
    volumes = [float(row.get("volume") or 0) for row in selected]

    latest_close = closes[-1]
    high_period = max(highs) if highs else latest_close
    low_period = min(lows) if lows else latest_close
    range_position = ((latest_close - low_period) / (high_period - low_period) * 100) if high_period != low_period else 50
    avg_volume = mean(volumes) if volumes else 0
    latest_volume = volumes[-1] if volumes else 0
    volume_ratio = latest_volume / avg_volume if avg_volume else 0
    change_period_pct = ((latest_close / closes[0]) - 1) * 100 if closes and closes[0] else 0

    return {
        "status": "success",
        "symbol": clean_symbol,
        "mode": mode,
        "source": source,
        "count": len(selected),
        "candles": [compact_candle(row) for row in selected],
        "summary": {
            "latest_close": round(latest_close, 2),
            "period_high": round(high_period, 2),
            "period_low": round(low_period, 2),
            "range_position_pct": round(range_position, 2),
            "avg_volume": int(avg_volume),
            "latest_volume": int(latest_volume),
            "volume_ratio": round(volume_ratio, 2),
            "change_period_pct": round(change_period_pct, 2),
        },
        "note": "Daily candle mini history for research only. No live orders.",
    }
