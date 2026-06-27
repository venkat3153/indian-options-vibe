import os
import requests
from fastapi import APIRouter
from pydantic import BaseModel
from quant.dhan_option_adapter import pick_nearest_expiry, extract_option_chain_data, build_option_pricing_signal
from quant.snapshot_store import save_market_snapshots


router = APIRouter(prefix="/api/dhan-data", tags=["dhan-data"])

DHAN_BASE_URL = "https://api.dhan.co/v2"


def dhan_headers():
    return {
        "Content-Type": "application/json",
        "access-token": os.getenv("DHAN_ACCESS_TOKEN", ""),
        "client-id": os.getenv("DHAN_CLIENT_ID", ""),
    }


def credentials_present():
    return bool(os.getenv("DHAN_ACCESS_TOKEN")) and bool(os.getenv("DHAN_CLIENT_ID"))


@router.get("/status")
def dhan_data_status():
    return {
        "connected": credentials_present(),
        "mode": "DATA_API_READ_ONLY",
        "client_id_present": bool(os.getenv("DHAN_CLIENT_ID")),
        "access_token_present": bool(os.getenv("DHAN_ACCESS_TOKEN")),
        "auto_order_allowed": False,
        "message": "Dhan Data API adapter is configured for read-only market data only.",
    }


class OptionExpiryRequest(BaseModel):
    underlying_scrip: int = 13
    underlying_seg: str = "IDX_I"


@router.post("/optionchain/expirylist")
def dhan_option_expiry_list(payload: OptionExpiryRequest):
    if not credentials_present():
        return {
            "status": "failed",
            "error": "Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env",
        }

    response = requests.post(
        f"{DHAN_BASE_URL}/optionchain/expirylist",
        headers=dhan_headers(),
        json={
            "UnderlyingScrip": payload.underlying_scrip,
            "UnderlyingSeg": payload.underlying_seg,
        },
        timeout=15,
    )

    return {
        "status_code": response.status_code,
        "auto_order_allowed": False,
        "manual_only": True,
        "data": response.json() if response.content else None,
    }


class OptionChainRequest(BaseModel):
    underlying_scrip: int = 13
    underlying_seg: str = "IDX_I"
    expiry: str


@router.post("/optionchain")
def dhan_option_chain(payload: OptionChainRequest):
    if not credentials_present():
        return {
            "status": "failed",
            "error": "Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env",
        }

    response = requests.post(
        f"{DHAN_BASE_URL}/optionchain",
        headers=dhan_headers(),
        json={
            "UnderlyingScrip": payload.underlying_scrip,
            "UnderlyingSeg": payload.underlying_seg,
            "Expiry": payload.expiry,
        },
        timeout=20,
    )

    return {
        "status_code": response.status_code,
        "auto_order_allowed": False,
        "manual_only": True,
        "data": response.json() if response.content else None,
    }


@router.get("/nifty/option-pricing-snapshot")
def dhan_nifty_option_pricing_snapshot():
    if not credentials_present():
        return {
            "status": "failed",
            "error": "Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env",
            "auto_order_allowed": False,
        }

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
        return {
            "status": "failed",
            "error": "Could not find nearest expiry from Dhan expiry response.",
            "raw_expiry_response": expiry_payload,
            "auto_order_allowed": False,
        }

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
        "status": "success",
        "expiry": expiry,
        "underlying": "NIFTY",
        "status_code": chain_response.status_code,
        "auto_order_allowed": False,
        "manual_only": True,
        "option_snapshot": option_snapshot,
        "pricing_signal": pricing_signal,
    }


@router.get("/nifty/save-option-snapshot")
def dhan_save_nifty_option_snapshot():
    result = dhan_nifty_option_pricing_snapshot()

    if result.get("status") != "success":
        return result

    pricing_signal = result.get("pricing_signal", {})
    option_snapshot = result.get("option_snapshot", {})

    snapshot_row = {
        "symbol": "NIFTY",
        "ltp": option_snapshot.get("underlying_price", 0),
        "day_change_pct": 0,
        "volume_ratio": 1,
        "vwap_distance_pct": 0,
        "trend_strength": 0,
        "breadth_support": 0,
        "retest_quality": 0,
        "liquidity_sweep_score": 0,
        "option_ce_momentum": 70 if pricing_signal.get("side") == "BUY_CE" else 30,
        "option_pe_momentum": 70 if pricing_signal.get("side") == "BUY_PE" else 30,
        "iv_rank": 50,
        "spread_quality": 70,
        "option_pricing_score": pricing_signal.get("option_pricing_score", 0),
        "option_pricing_side": pricing_signal.get("side", "NO_SIDE"),
    }

    save_status = save_market_snapshots(
        [snapshot_row],
        source="dhan-option-pricing",
    )

    return {
        "status": "success",
        "message": "Dhan option-pricing snapshot saved into quant snapshot store.",
        "save_status": save_status,
        "snapshot": snapshot_row,
        "auto_order_allowed": False,
        "manual_only": True,
    }



class MarketOhlcRequest(BaseModel):
    instruments: dict[str, list[int]]



@router.post("/market/ohlc")
def dhan_market_ohlc(payload: MarketOhlcRequest):
    if not credentials_present():
        return {
            "status": "failed",
            "error": "Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env",
            "auto_order_allowed": False,
        }

    response = requests.post(
        f"{DHAN_BASE_URL}/marketfeed/ohlc",
        headers=dhan_headers(),
        json=payload.instruments,
        timeout=15,
    )

    return {
        "status_code": response.status_code,
        "auto_order_allowed": False,
        "manual_only": True,
        "data": response.json() if response.content else None,
    }



@router.get("/nifty/structure-snapshot")
def dhan_nifty_structure_snapshot():
    if not credentials_present():
        return {
            "status": "failed",
            "error": "Missing DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN in backend/.env",
            "auto_order_allowed": False,
        }

    # Dhan NIFTY index security id commonly used in current option-chain route is 13.
    response = requests.post(
        f"{DHAN_BASE_URL}/marketfeed/ohlc",
        headers=dhan_headers(),
        json={
            "IDX_I": [13],
        },
        timeout=15,
    )

    payload = response.json() if response.content else {}
    data = payload.get("data", {})
    index_data = data.get("IDX_I", {}).get("13", {}) if isinstance(data, dict) else {}

    ltp = float(index_data.get("last_price") or 0)
    ohlc = index_data.get("ohlc") or {}

    open_price = float(ohlc.get("open") or 0)
    close_price = float(ohlc.get("close") or 0)
    high_price = float(ohlc.get("high") or 0)
    low_price = float(ohlc.get("low") or 0)

    base = close_price if close_price else open_price
    day_change_pct = round(((ltp - base) / base) * 100, 2) if base else 0

    range_size = high_price - low_price if high_price and low_price else 0
    position_in_range = ((ltp - low_price) / range_size) if range_size else 0.5

    if day_change_pct > 0.25 and position_in_range >= 0.60:
        trend_strength = 65
    elif day_change_pct < -0.25 and position_in_range <= 0.40:
        trend_strength = -65
    else:
        trend_strength = 25 if day_change_pct > 0 else -25 if day_change_pct < 0 else 0

    snapshot = {
        "symbol": "NIFTY",
        "ltp": ltp,
        "day_change_pct": day_change_pct,
        "volume_ratio": 1,
        "vwap_distance_pct": day_change_pct,
        "trend_strength": trend_strength,
        "breadth_support": 0,
        "retest_quality": 0,
        "liquidity_sweep_score": 0,
        "option_ce_momentum": 0,
        "option_pe_momentum": 0,
        "iv_rank": 50,
        "spread_quality": 70,
        "option_pricing_score": 0,
        "option_pricing_side": "NO_SIDE",
    }

    return {
        "status": "success",
        "status_code": response.status_code,
        "raw": payload,
        "snapshot": snapshot,
        "auto_order_allowed": False,
        "manual_only": True,
    }
