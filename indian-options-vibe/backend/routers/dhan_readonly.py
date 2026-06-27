import os
from typing import Any

import requests
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/dhan", tags=["dhan-readonly"])

DHAN_BASE_URL = "https://api.dhan.co/v2"


def _get_access_token() -> str:
    token = (
        os.getenv("DHAN_ACCESS_TOKEN")
        or os.getenv("DHAN_TOKEN")
        or os.getenv("DHAN_API_TOKEN")
        or ""
    ).strip()

    if not token:
        raise HTTPException(
            status_code=500,
            detail="Dhan access token missing. Set DHAN_ACCESS_TOKEN in backend/.env",
        )

    return token


def _dhan_get(path: str) -> Any:
    token = _get_access_token()

    response = requests.get(
        f"{DHAN_BASE_URL}{path}",
        headers={
            "Content-Type": "application/json",
            "access-token": token,
        },
        timeout=12,
    )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail={
                "message": "Dhan read-only request failed",
                "path": path,
                "response": response.text,
            },
        )

    return response.json()


@router.get("/status")
def dhan_status():
    return {
        "connected": True,
        "mode": "READ_ONLY",
        "message": "Dhan read-only router is active. No order placement endpoints are exposed.",
    }


@router.get("/fundlimit")
def dhan_fundlimit():
    return _dhan_get("/fundlimit")


@router.get("/positions")
def dhan_positions():
    return _dhan_get("/positions")


@router.get("/orders")
def dhan_orders():
    return _dhan_get("/orders")
