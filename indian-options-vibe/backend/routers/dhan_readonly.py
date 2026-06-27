import os
from typing import Any

import requests
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/dhan", tags=["dhan-readonly"])

DHAN_BASE_URL = "https://api.dhan.co/v2"


def get_dhan_token() -> str:
    token = (
        os.getenv("DHAN_ACCESS_TOKEN")
        or os.getenv("DHAN_TOKEN")
        or os.getenv("DHAN_API_TOKEN")
        or ""
    ).strip()

    if not token:
        raise HTTPException(
            status_code=500,
            detail="Dhan token missing. Add DHAN_ACCESS_TOKEN in backend/.env",
        )

    return token


def dhan_get(path: str) -> Any:
    response = requests.get(
        f"{DHAN_BASE_URL}{path}",
        headers={
            "Content-Type": "application/json",
            "access-token": get_dhan_token(),
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
        "message": "Dhan read-only backend is active. No order placement route exists here.",
    }


@router.get("/fundlimit")
def dhan_fundlimit():
    return dhan_get("/fundlimit")


@router.get("/positions")
def dhan_positions():
    return dhan_get("/positions")


@router.get("/orders")
def dhan_orders():
    return dhan_get("/orders")
