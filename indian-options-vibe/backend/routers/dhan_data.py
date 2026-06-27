import os
import requests
from fastapi import APIRouter
from pydantic import BaseModel
from quant.dhan_option_adapter import pick_nearest_expiry, extract_option_chain_data, build_option_pricing_signal


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
