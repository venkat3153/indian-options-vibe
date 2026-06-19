import os
from typing import Any, Awaitable, Callable

from fastapi import APIRouter

from brokers.dhan import (
    DhanConfigError,
    DhanReadOnlyAdapter,
    dhan_error_response,
    dhan_not_configured_response,
)

router = APIRouter()

BROKER_CONFIGS = {
    "dhan": {
        "name": "Dhan",
        "required_env": ["DHAN_CLIENT_ID", "DHAN_ACCESS_TOKEN"],
        "priority": "first_adapter",
    },
    "angel": {
        "name": "Angel One SmartAPI",
        "required_env": ["ANGEL_CLIENT_ID", "ANGEL_API_KEY", "ANGEL_TOTP_SECRET"],
        "priority": "second_adapter",
    },
    "upstox": {
        "name": "Upstox",
        "required_env": ["UPSTOX_CLIENT_ID", "UPSTOX_ACCESS_TOKEN"],
        "priority": "third_adapter",
    },
    "zerodha": {
        "name": "Zerodha Kite",
        "required_env": ["ZERODHA_API_KEY", "ZERODHA_ACCESS_TOKEN"],
        "priority": "later_adapter",
    },
}

READ_ONLY_TESTS = ["profile", "funds", "positions", "orders"]


def mask_status(env_name: str) -> dict[str, Any]:
    value = os.getenv(env_name)
    return {
        "name": env_name,
        "configured": bool(value),
        "masked": f"{value[:4]}...{value[-4:]}" if value and len(value) > 8 else None,
    }


def broker_status(broker_id: str) -> dict[str, Any]:
    config = BROKER_CONFIGS[broker_id]
    env_status = [mask_status(env_name) for env_name in config["required_env"]]
    configured = all(item["configured"] for item in env_status)

    return {
        "id": broker_id,
        "name": config["name"],
        "priority": config["priority"],
        "configured": configured,
        "mode": "read_only_ready" if configured else "not_configured",
        "live_orders_enabled": False,
        "live_orders_reason": "Live orders are locked until manual approval and risk gates are added.",
        "read_only_tests": READ_ONLY_TESTS,
        "env": env_status,
    }


def unknown_broker_response(broker_id: str) -> dict[str, Any]:
    return {"error": "unknown_broker", "broker_id": broker_id}


async def run_dhan_read_only(action: str, call: Callable[[DhanReadOnlyAdapter], Awaitable[Any]]) -> dict[str, Any]:
    try:
        adapter = DhanReadOnlyAdapter()
    except DhanConfigError:
        return dhan_not_configured_response(action)

    try:
        data = await call(adapter)
        return {
            "broker": "Dhan",
            "configured": True,
            "mode": "dhan_live_read_only",
            "action": action,
            "data": data,
            "live_orders_enabled": False,
        }
    except Exception as exc:
        return dhan_error_response(action, exc)


@router.get("/status")
def get_all_broker_status() -> dict[str, Any]:
    brokers = [broker_status(broker_id) for broker_id in BROKER_CONFIGS]
    return {
        "mode": "single_user",
        "paper_default": True,
        "live_orders_enabled": False,
        "first_adapter": "dhan",
        "brokers": brokers,
    }


@router.get("/{broker_id}/status")
def get_broker_status(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return unknown_broker_response(broker_id)
    return broker_status(broker_id)


@router.get("/{broker_id}/profile")
async def get_broker_profile(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return unknown_broker_response(broker_id)

    if broker_id == "dhan":
        return await run_dhan_read_only("profile", lambda adapter: adapter.profile())

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "adapter_pending",
        "message": "Only Dhan read-only adapter is connected in this phase.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/funds")
async def get_broker_funds(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return unknown_broker_response(broker_id)

    if broker_id == "dhan":
        return await run_dhan_read_only("funds", lambda adapter: adapter.funds())

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "adapter_pending",
        "message": "Only Dhan read-only adapter is connected in this phase.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/positions")
async def get_broker_positions(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return unknown_broker_response(broker_id)

    if broker_id == "dhan":
        return await run_dhan_read_only("positions", lambda adapter: adapter.positions())

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "adapter_pending",
        "positions": [],
        "message": "Only Dhan read-only adapter is connected in this phase.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/orders")
async def get_broker_orders(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return unknown_broker_response(broker_id)

    if broker_id == "dhan":
        return await run_dhan_read_only("orders", lambda adapter: adapter.orders())

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "adapter_pending",
        "orders": [],
        "message": "Only Dhan read-only adapter is connected in this phase.",
        "live_orders_enabled": False,
    }
