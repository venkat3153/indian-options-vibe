import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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
    req = Request(
        f"{DHAN_BASE_URL}{path}",
        headers={
            "Content-Type": "application/json",
            "access-token": get_dhan_token(),
        },
        method="GET",
    )

    try:
        with urlopen(req, timeout=12) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as error:
        body = error.read().decode("utf-8")
        raise HTTPException(
            status_code=error.code,
            detail={
                "message": "Dhan read-only request failed",
                "path": path,
                "response": body,
            },
        )
    except URLError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Could not reach Dhan API",
                "path": path,
                "response": str(error),
            },
        )


@router.get("/status")
def dhan_status():
    token_present = bool(
        os.getenv("DHAN_ACCESS_TOKEN")
        or os.getenv("DHAN_TOKEN")
        or os.getenv("DHAN_API_TOKEN")
    )

    return {
        "connected": True,
        "token_present": token_present,
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
