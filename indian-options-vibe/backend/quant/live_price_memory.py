import json
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any


MEMORY_PATH = Path("backend/data/live_price_memory.json")
_price_memory: dict[str, deque[dict[str, Any]]] = {}


def safe_float(value: Any, default: float = 0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def load_memory(symbol: str, max_points: int = 30) -> deque[dict[str, Any]]:
    symbol = symbol.upper()

    if symbol in _price_memory:
        return _price_memory[symbol]

    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not MEMORY_PATH.exists():
        _price_memory[symbol] = deque(maxlen=max_points)
        return _price_memory[symbol]

    try:
        data = json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
        rows = data.get(symbol, [])
        _price_memory[symbol] = deque(rows[-max_points:], maxlen=max_points)
    except Exception:
        _price_memory[symbol] = deque(maxlen=max_points)

    return _price_memory[symbol]


def save_memory() -> None:
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)

    data = {
        symbol: list(points)
        for symbol, points in _price_memory.items()
    }

    MEMORY_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def update_live_price_features(symbol: str, ltp: float, max_points: int = 30) -> dict[str, Any]:
    symbol = symbol.upper()
    ltp = safe_float(ltp)

    memory = load_memory(symbol, max_points=max_points)

    if ltp > 0:
        last_price = safe_float(memory[-1].get("ltp")) if memory else 0

        # Avoid saving exact duplicate ticks too aggressively, but still allow repeated scans.
        memory.append(
            {
                "ts": datetime.utcnow().isoformat(),
                "ltp": ltp,
                "changed": ltp != last_price,
            }
        )

        save_memory()

    points = list(memory)

    if len(points) < 2:
        return {
            "ltp": ltp,
            "points": len(points),
            "rolling_avg": ltp,
            "price_change_pct": 0,
            "vwap_proxy_distance_pct": 0,
            "trend_strength": 0,
            "has_live_price_memory": False,
            "message": "Need at least 2 live price points to calculate structure.",
        }

    first = safe_float(points[0].get("ltp"))
    last = safe_float(points[-1].get("ltp"))
    prices = [safe_float(point.get("ltp")) for point in points if safe_float(point.get("ltp")) > 0]

    rolling_avg = sum(prices) / len(prices) if prices else last

    price_change_pct = round(((last - first) / first) * 100, 4) if first else 0
    vwap_proxy_distance_pct = round(((last - rolling_avg) / rolling_avg) * 100, 4) if rolling_avg else 0

    abs_move = abs(price_change_pct)

    if price_change_pct > 0 and vwap_proxy_distance_pct > 0:
        trend_strength = min(75, 25 + abs_move * 200)
    elif price_change_pct < 0 and vwap_proxy_distance_pct < 0:
        trend_strength = max(-75, -25 - abs_move * 200)
    elif price_change_pct > 0:
        trend_strength = 25
    elif price_change_pct < 0:
        trend_strength = -25
    else:
        trend_strength = 0

    return {
        "ltp": last,
        "points": len(points),
        "rolling_avg": round(rolling_avg, 2),
        "price_change_pct": price_change_pct,
        "vwap_proxy_distance_pct": vwap_proxy_distance_pct,
        "trend_strength": round(trend_strength, 2),
        "has_live_price_memory": True,
        "message": "Live rolling price structure calculated.",
    }


def get_price_memory(symbol: str) -> list[dict[str, Any]]:
    return list(load_memory(symbol.upper()))
