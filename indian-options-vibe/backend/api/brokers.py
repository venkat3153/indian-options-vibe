import os
from typing import Any

from fastapi import APIRouter

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
        return {"error": "unknown_broker", "broker_id": broker_id}
    return broker_status(broker_id)


@router.get("/{broker_id}/profile")
def get_broker_profile(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return {"error": "unknown_broker", "broker_id": broker_id}

    status = broker_status(broker_id)
    if not status["configured"]:
        return {
            "broker": status["name"],
            "configured": False,
            "mode": "read_only_blocked",
            "message": "Add broker API keys in backend/.env before profile check.",
            "live_orders_enabled": False,
        }

    return {
        "broker": status["name"],
        "configured": True,
        "mode": "mock_read_only",
        "profile": {
            "client_name": "Single User MVP",
            "account_type": "Trading",
            "segment": "NSE F&O",
        },
        "note": "Real broker API call will replace this mock after adapter credentials are verified.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/funds")
def get_broker_funds(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return {"error": "unknown_broker", "broker_id": broker_id}

    status = broker_status(broker_id)
    if not status["configured"]:
        return {
            "broker": status["name"],
            "configured": False,
            "mode": "read_only_blocked",
            "message": "Add broker API keys in backend/.env before funds check.",
            "live_orders_enabled": False,
        }

    return {
        "broker": status["name"],
        "configured": True,
        "mode": "mock_read_only",
        "funds": {
            "available_margin": 0,
            "used_margin": 0,
            "currency": "INR",
        },
        "note": "Real funds API call will replace this mock in the next adapter step.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/positions")
def get_broker_positions(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return {"error": "unknown_broker", "broker_id": broker_id}

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "mock_read_only" if status["configured"] else "read_only_blocked",
        "positions": [],
        "message": "No real positions are fetched until the broker adapter is connected.",
        "live_orders_enabled": False,
    }


@router.get("/{broker_id}/orders")
def get_broker_orders(broker_id: str) -> dict[str, Any]:
    if broker_id not in BROKER_CONFIGS:
        return {"error": "unknown_broker", "broker_id": broker_id}

    status = broker_status(broker_id)
    return {
        "broker": status["name"],
        "configured": status["configured"],
        "mode": "mock_read_only" if status["configured"] else "read_only_blocked",
        "orders": [],
        "message": "No real order book is fetched until the broker adapter is connected.",
        "live_orders_enabled": False,
    }
