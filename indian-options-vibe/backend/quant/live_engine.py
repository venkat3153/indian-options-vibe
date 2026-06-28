import os
import time
import threading
from dataclasses import asdict
from datetime import datetime
from typing import Any

import requests

from quant.data_foundation import MarketSnapshot, score_symbol
from quant.dhan_option_adapter import (
    pick_nearest_expiry,
    extract_option_chain_data,
    build_option_pricing_signal,
)
from quant.snapshot_store import save_market_snapshots
from quant.feature_engine import build_model_features, enrich_snapshot_with_features
from quant.live_price_memory import update_live_price_features


DHAN_BASE_URL = "https://api.dhan.co/v2"

_live_thread: threading.Thread | None = None
_stop_event = threading.Event()

_live_state: dict[str, Any] = {
    "running": False,
    "last_updated": None,
    "interval_seconds": 60,
    "latest_snapshot": None,
    "latest_result": None,
    "last_error": None,
    "auto_order_allowed": False,
    "manual_only": True,
}


def dhan_headers():
    return {
        "Content-Type": "application/json",
        "access-token": os.getenv("DHAN_ACCESS_TOKEN", ""),
        "client-id": os.getenv("DHAN_CLIENT_ID", ""),
    }


def credentials_present() -> bool:
    return bool(os.getenv("DHAN_ACCESS_TOKEN")) and bool(os.getenv("DHAN_CLIENT_ID"))


def find_first_number(obj: Any, keys: list[str]) -> float:
    if isinstance(obj, dict):
        for key in keys:
            if key in obj:
                try:
                    return float(obj[key] or 0)
                except Exception:
                    pass

        for value in obj.values():
            found = find_first_number(value, keys)
            if found:
                return found

    if isinstance(obj, list):
        for value in obj:
            found = find_first_number(value, keys)
            if found:
                return found

    return 0


def fetch_nifty_option_pricing() -> dict[str, Any]:
    expiry_response = requests.post(
        f"{DHAN_BASE_URL}/optionchain/expirylist",
        headers=dhan_headers(),
        json={
            "UnderlyingScrip": 13,
            "UnderlyingSeg": "IDX_I",
        },
        timeout=15,
    )

    expiry_payload = expiry_response.json() if expiry_response.content else {}
    expiry = pick_nearest_expiry(expiry_payload)

    if not expiry:
        raise RuntimeError("Could not find nearest NIFTY expiry from Dhan response.")

    chain_response = requests.post(
        f"{DHAN_BASE_URL}/optionchain",
        headers=dhan_headers(),
        json={
            "UnderlyingScrip": 13,
            "UnderlyingSeg": "IDX_I",
            "Expiry": expiry,
        },
        timeout=20,
    )

    chain_payload = chain_response.json() if chain_response.content else {}
    option_snapshot = extract_option_chain_data(chain_payload)
    pricing_signal = build_option_pricing_signal(option_snapshot)

    return {
        "expiry": expiry,
        "option_snapshot": option_snapshot,
        "pricing_signal": pricing_signal,
    }


def fetch_nifty_structure_snapshot() -> dict[str, Any]:
    response = requests.post(
        f"{DHAN_BASE_URL}/marketfeed/ohlc",
        headers=dhan_headers(),
        json={
            "IDX_I": [13],
        },
        timeout=15,
    )

    payload = response.json() if response.content else {}

    ltp = find_first_number(payload, ["last_price", "ltp", "LTP"])
    open_price = find_first_number(payload, ["open", "open_price"])
    close_price = find_first_number(payload, ["close", "prev_close", "previous_close"])
    high_price = find_first_number(payload, ["high", "day_high"])
    low_price = find_first_number(payload, ["low", "day_low"])

    base = close_price if close_price else open_price
    day_change_pct = round(((ltp - base) / base) * 100, 2) if ltp and base else 0

    range_size = high_price - low_price if high_price and low_price else 0
    position_in_range = ((ltp - low_price) / range_size) if range_size and ltp else 0.5

    if day_change_pct > 0.25 and position_in_range >= 0.60:
        trend_strength = 65
    elif day_change_pct < -0.25 and position_in_range <= 0.40:
        trend_strength = -65
    elif day_change_pct > 0:
        trend_strength = 35
    elif day_change_pct < 0:
        trend_strength = -35
    else:
        trend_strength = 0

    return {
        "ltp": ltp,
        "day_change_pct": day_change_pct,
        "volume_ratio": 1,
        "vwap_distance_pct": day_change_pct,
        "trend_strength": trend_strength,
        "breadth_support": 0,
        "retest_quality": 0,
        "liquidity_sweep_score": 0,
    }


def build_live_nifty_snapshot() -> dict[str, Any]:
    option_data = fetch_nifty_option_pricing()
    structure = fetch_nifty_structure_snapshot()

    pricing_signal = option_data["pricing_signal"]
    option_snapshot = option_data["option_snapshot"]

    side = pricing_signal.get("side", "NO_SIDE")
    option_score = float(pricing_signal.get("option_pricing_score", 0) or 0)

    # Dhan OHLC for index may return weak structure. Use option-chain underlying price as fallback.
    structure_ltp = float(structure.get("ltp", 0) or 0)
    option_underlying_price = float(option_snapshot.get("underlying_price", 0) or 0)
    live_ltp = structure_ltp if structure_ltp > 0 else option_underlying_price

    rolling_price = update_live_price_features("NIFTY", live_ltp)

    trend_strength = float(structure.get("trend_strength", 0) or 0)
    vwap_distance_pct = float(structure.get("vwap_distance_pct", 0) or 0)

    # If Dhan OHLC structure is missing, use rolling live-price structure.
    if trend_strength == 0 and rolling_price.get("has_live_price_memory"):
        trend_strength = float(rolling_price.get("trend_strength", 0) or 0)

    if vwap_distance_pct == 0 and rolling_price.get("has_live_price_memory"):
        vwap_distance_pct = float(rolling_price.get("vwap_proxy_distance_pct", 0) or 0)

    day_change_pct = float(structure.get("day_change_pct", 0) or 0)
    if day_change_pct == 0 and rolling_price.get("has_live_price_memory"):
        day_change_pct = float(rolling_price.get("price_change_pct", 0) or 0)

    structure_agrees = (
        (side == "BUY_CE" and trend_strength > 0 and vwap_distance_pct > 0)
        or (side == "BUY_PE" and trend_strength < 0 and vwap_distance_pct < 0)
    )

    snapshot = {
        "symbol": "NIFTY",
        "ltp": live_ltp,
        "day_change_pct": day_change_pct,
        "volume_ratio": structure.get("volume_ratio", 1),
        "vwap_distance_pct": vwap_distance_pct,
        "trend_strength": trend_strength,
        "breadth_support": 55 if structure_agrees else 0,
        "retest_quality": 55 if structure_agrees else 0,
        "liquidity_sweep_score": 50 if structure_agrees else 0,
        "option_ce_momentum": 70 if side == "BUY_CE" else 30,
        "option_pe_momentum": 70 if side == "BUY_PE" else 30,
        "iv_rank": 50,
        "spread_quality": 70,
        "option_pricing_score": option_score,
        "option_pricing_side": side,
        "rolling_price_points": rolling_price.get("points", 0),
        "rolling_avg": rolling_price.get("rolling_avg", 0),
        "price_memory_message": rolling_price.get("message"),
    }

    return {
        "snapshot": snapshot,
        "option_data": option_data,
        "structure_agrees": structure_agrees,
    }


def run_once() -> dict[str, Any]:
    if not credentials_present():
        raise RuntimeError("Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env")

    live = build_live_nifty_snapshot()
    snapshot = live["snapshot"]

    model_features = build_model_features(snapshot)
    enriched_snapshot = enrich_snapshot_with_features(snapshot)

    save_market_snapshots([enriched_snapshot], source="live-quant-engine-v1")

    scoring_snapshot = {
        "symbol": snapshot.get("symbol", "NIFTY"),
        "ltp": snapshot.get("ltp", 0),
        "day_change_pct": snapshot.get("day_change_pct", 0),
        "volume_ratio": snapshot.get("volume_ratio", 1),
        "vwap_distance_pct": snapshot.get("vwap_distance_pct", 0),
        "trend_strength": snapshot.get("trend_strength", 0),
        "breadth_support": snapshot.get("breadth_support", 0),
        "retest_quality": snapshot.get("retest_quality", 0),
        "liquidity_sweep_score": snapshot.get("liquidity_sweep_score", 0),
        "option_ce_momentum": snapshot.get("option_ce_momentum", 0),
        "option_pe_momentum": snapshot.get("option_pe_momentum", 0),
        "iv_rank": snapshot.get("iv_rank", 0),
        "spread_quality": snapshot.get("spread_quality", 0),
        "option_pricing_score": snapshot.get("option_pricing_score", 0),
        "option_pricing_side": snapshot.get("option_pricing_side", "NO_SIDE"),
    }

    result = score_symbol(MarketSnapshot(**scoring_snapshot))
    result_dict = asdict(result)
    result_dict["model_features"] = model_features
    result_dict["model_score"] = model_features["model_score"]
    result_dict["model_decision"] = model_features["model_decision"]
    result_dict["model_side"] = model_features["model_side"]

    _live_state.update(
        {
            "running": _live_state.get("running", False),
            "last_updated": datetime.utcnow().isoformat(),
            "latest_snapshot": enriched_snapshot,
            "latest_result": result_dict,
            "structure_agrees": live.get("structure_agrees"),
            "last_error": None,
            "auto_order_allowed": False,
            "manual_only": True,
        }
    )

    return {
        "snapshot": enriched_snapshot,
        "result": result_dict,
        "model_features": model_features,
        "structure_agrees": live.get("structure_agrees"),
        "auto_order_allowed": False,
        "manual_only": True,
    }


def _loop(interval_seconds: int):
    _live_state["running"] = True
    _live_state["interval_seconds"] = interval_seconds

    while not _stop_event.is_set():
        try:
            run_once()
        except Exception as error:
            _live_state["last_error"] = str(error)
            _live_state["last_updated"] = datetime.utcnow().isoformat()

        _stop_event.wait(interval_seconds)

    _live_state["running"] = False


def start_live_engine(interval_seconds: int = 60) -> dict[str, Any]:
    global _live_thread

    if _live_thread and _live_thread.is_alive():
        return {
            "started": False,
            "message": "Live Quant Engine is already running.",
            "state": get_live_state(),
        }

    _stop_event.clear()
    _live_thread = threading.Thread(
        target=_loop,
        args=(interval_seconds,),
        daemon=True,
    )
    _live_thread.start()

    return {
        "started": True,
        "message": "Live Quant Engine started.",
        "state": get_live_state(),
    }


def stop_live_engine() -> dict[str, Any]:
    _stop_event.set()

    return {
        "stopped": True,
        "message": "Live Quant Engine stop requested.",
        "state": get_live_state(),
    }


def get_live_state() -> dict[str, Any]:
    return dict(_live_state)


def get_live_latest() -> dict[str, Any]:
    return {
        "status": "success",
        "state": get_live_state(),
        "auto_order_allowed": False,
        "manual_only": True,
    }
