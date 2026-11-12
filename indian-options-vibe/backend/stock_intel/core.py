"""Pure, read-only NSE F&O universe and daily technical research functions.

This is a *stock* research engine, not option-strike selection or an order system.
All recommendations require independent news/option validation.
"""
from __future__ import annotations

import csv
import io
from datetime import date, datetime
from math import isfinite
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def _value(row: dict, *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip() and str(value).lower() != "nan":
            return str(value).strip()
    return ""


def _expiry(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None


def parse_fno_universe(csv_text: str, as_of: date) -> list[dict]:
    """Resolve currently eligible NSE OPTSTK symbols to NSE_EQ underlying IDs.

    Detailed Dhan instrument CSV has underlying IDs; compact may not. Never
    guess IDs or promote index options to stock options.
    """
    reader = csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    rows = list(reader)
    equity: dict[str, str] = {}
    for row in rows:
        if _value(row, "EXCH_ID", "SEM_EXM_EXCH_ID") != "NSE":
            continue
        if _value(row, "SEGMENT", "SEM_SEGMENT") == "E" and _value(
            row, "INSTRUMENT", "SEM_INSTRUMENT_NAME"
        ) == "EQUITY":
            symbol = _value(row, "SYMBOL_NAME", "SM_SYMBOL_NAME", "SEM_TRADING_SYMBOL").upper()
            sid = _value(row, "SECURITY_ID", "SEM_SMST_SECURITY_ID")
            if symbol and sid.isdigit():
                equity[symbol] = sid

    symbols: dict[str, dict] = {}
    for row in rows:
        if _value(row, "EXCH_ID", "SEM_EXM_EXCH_ID") != "NSE":
            continue
        if _value(row, "SEGMENT", "SEM_SEGMENT") != "D":
            continue
        if _value(row, "INSTRUMENT", "SEM_INSTRUMENT_NAME") != "OPTSTK":
            continue
        expiry = _expiry(_value(row, "EXPIRY_DATE", "SEM_EXPIRY_DATE"))
        if expiry is None or expiry < as_of:
            continue
        symbol = _value(row, "UNDERLYING_SYMBOL", "SYMBOL_NAME", "SM_SYMBOL_NAME").upper()
        sid = equity.get(symbol)
        if not symbol or not sid:
            continue
        previous = symbols.get(symbol)
        if previous is None or expiry < date.fromisoformat(previous["nearest_expiry"]):
            symbols[symbol] = {
                "symbol": symbol,
                "security_id": sid,
                "nearest_expiry": expiry.isoformat(),
                "exchange_segment": "NSE_EQ",
            }
    return sorted(symbols.values(), key=lambda item: item["symbol"])


def _ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    current = sum(values[:period]) / period
    k = 2 / (period + 1)
    for close in values[period:]:
        current = close * k + current * (1 - k)
    return current


def _atr(rows: list[dict], period: int = 14) -> float | None:
    if len(rows) < period + 1:
        return None
    recent = rows[-(period + 1):]
    ranges = []
    for old, new in zip(recent, recent[1:]):
        ranges.append(max(new["high"] - new["low"], abs(new["high"] - old["close"]),
                          abs(new["low"] - old["close"])))
    return sum(ranges) / period


def normalize_daily_candles(payload: dict, cutoff: date) -> list[dict]:
    """Discard today's forming candle and reject malformed or duplicate bars."""
    raw = payload.get("data", payload)
    if not isinstance(raw, dict):
        raise ValueError("Dhan returned no historical candle data")
    arrays = [raw.get(key) for key in ("open", "high", "low", "close", "volume", "timestamp")]
    if any(not isinstance(a, list) for a in arrays):
        raise ValueError("Dhan daily candle payload is incomplete")
    n = min(map(len, arrays))
    out: dict[str, dict] = {}
    for i in range(n):
        try:
            stamp = arrays[5][i]
            if isinstance(stamp, (float, int)):
                candle_day = datetime.fromtimestamp(float(stamp), tz=IST).date()
            else:
                candle_day = date.fromisoformat(str(stamp)[:10])
            if candle_day >= cutoff:
                continue
            op, high, low, close, volume = (float(a[i]) for a in arrays[:5])
            if not all(isfinite(v) for v in (op, high, low, close, volume)):
                continue
            if min(op, high, low, close) <= 0 or volume < 0 or high < max(op, close, low) or low > min(op, close, high):
                continue
            out[candle_day.isoformat()] = {
                "date": candle_day.isoformat(), "open": op, "high": high,
                "low": low, "close": close, "volume": volume,
            }
        except (ValueError, TypeError, OverflowError, OSError):
            continue
    return [out[key] for key in sorted(out)]


def evaluate_stock(symbol: str, candles: list[dict]) -> dict:
    """Rule-based *underlying stock* levels; not predictive option returns."""
    if len(candles) < 260:
        return {"symbol": symbol, "status": "INSUFFICIENT_DATA",
                "available_bars": len(candles), "required_bars": 260}
    values = [float(x["close"]) for x in candles]
    ema = {str(p): _ema(values, p) for p in (9, 26, 200, 250)}
    atr = _atr(candles)
    if atr is None or atr <= 0 or any(v is None for v in ema.values()):
        return {"symbol": symbol, "status": "INSUFFICIENT_DATA"}

    last = candles[-1]
    close = last["close"]
    five_vol = sum(row["volume"] for row in candles[-6:-1]) / 5
    vol_ratio = last["volume"] / five_vol if five_vol > 0 else None
    prev_20_high = max(x["high"] for x in candles[-21:-1])
    prev_20_low = min(x["low"] for x in candles[-21:-1])
    bullish = close > ema["200"] and close > ema["250"] and ema["9"] > ema["26"]
    bearish = close < ema["200"] and close < ema["250"] and ema["9"] < ema["26"]
    side = "BULLISH" if bullish else "BEARISH" if bearish else "NEUTRAL"

    positive = [
        "Daily close above both 200 and 250 EMAs" if bullish else
        "Daily close below both 200 and 250 EMAs" if bearish else
        "Long-term EMA trend is mixed",
        "9 EMA above 26 EMA" if ema["9"] > ema["26"] else
        "9 EMA below 26 EMA" if ema["9"] < ema["26"] else "9/26 EMAs flat",
    ]
    if vol_ratio is not None:
        positive.append(f"Latest complete session volume was {vol_ratio:.2f}x prior five-session average")
    score = 30
    if side != "NEUTRAL":
        score += 35
    if vol_ratio is not None and vol_ratio >= 1.5:
        score += 15
    elif vol_ratio is not None and vol_ratio >= 1.1:
        score += 7
    if (bullish and close >= prev_20_high * 0.98) or (bearish and close <= prev_20_low * 1.02):
        score += 10
    if (bullish and close > last["open"]) or (bearish and close < last["open"]):
        score += 10
    score = min(score, 100)

    plan = None
    if side != "NEUTRAL":
        # Trigger only after the next actual trading session confirms the level.
        entry = max(last["high"], prev_20_high) + 0.1 * atr if bullish else min(last["low"], prev_20_low) - 0.1 * atr
        stop = min(last["low"] - 0.1 * atr, entry - 1.2 * atr) if bullish else max(last["high"] + 0.1 * atr, entry + 1.2 * atr)
        risk = abs(entry - stop)
        if risk > 0 and risk <= 4 * atr:
            factor = 1 if bullish else -1
            plan = {
                "entry_trigger": round(entry, 2), "stop_loss": round(stop, 2),
                "target_1": round(entry + factor * 2.5 * risk, 2),
                "target_2": round(entry + factor * 4 * risk, 2),
                "rr_to_target_1": 2.5,
                "level_type": "UNDERLYING_STOCK_ONLY",
                "reason": "Prior high/low breakout with ATR buffer; volatility-based invalidation. Not an option-premium forecast.",
            }
        else:
            positive.append("Stop distance too wide relative to ATR: no plan")

    return {
        "symbol": symbol, "status": "TECHNICAL_WATCH" if plan else "NO_TRADE",
        "bias": side, "technical_score": score,
        "as_of_candle": last["date"], "previous_close": round(close, 2),
        "ema": {k: round(v, 2) for k, v in ema.items()},
        "atr14": round(atr, 2), "volume_ratio_5d": round(vol_ratio, 2) if vol_ratio is not None else None,
        "reasons": positive, "plan": plan,
        "news_status": "NOT_CONNECTED", "option_oi_status": "NOT_CHECKED",
        "source": "DHAN_HISTORICAL_DAILY",
        "confidence_note": "Uncalibrated technical score, not probability. No live BUY/SELL recommendation without news and OI verification.",
        "execution_enabled": False,
    }
