from typing import Any

from quant.market_session import get_market_session_status
from quant.live_price_memory import get_price_memory


def build_market_open_checklist(live_state: dict[str, Any] | None = None) -> dict[str, Any]:
    live_state = live_state or {}
    market_session = get_market_session_status()

    latest_snapshot = live_state.get("latest_snapshot") or {}
    latest_result = live_state.get("latest_result") or {}
    data_readiness = live_state.get("data_readiness") or latest_snapshot.get("data_readiness") or {}

    price_memory = get_price_memory("NIFTY")
    rolling_points = len(price_memory)

    checks = [
        {
            "name": "Market session",
            "status": "PASS" if market_session.get("is_open") else "BLOCK",
            "detail": market_session.get("reason"),
        },
        {
            "name": "Live engine state",
            "status": "PASS" if live_state.get("running") else "WATCH",
            "detail": "Engine is running." if live_state.get("running") else "Engine is stopped. Start it before live market testing.",
        },
        {
            "name": "Latest scan exists",
            "status": "PASS" if latest_result else "BLOCK",
            "detail": "Latest live result exists." if latest_result else "Click Run Once after backend starts.",
        },
        {
            "name": "Dhan price available",
            "status": "PASS" if float(latest_snapshot.get("ltp") or 0) > 0 else "BLOCK",
            "detail": f"LTP: {latest_snapshot.get('ltp', 0)}",
        },
        {
            "name": "Rolling price memory",
            "status": "PASS" if rolling_points >= 3 else "WATCH",
            "detail": f"Rolling points: {rolling_points}. Need at least 3 for first structure judgment.",
        },
        {
            "name": "Data readiness",
            "status": "PASS" if data_readiness.get("ready_for_watch") else "WATCH",
            "detail": data_readiness.get("status", "No readiness status yet."),
        },
        {
            "name": "Candidate readiness",
            "status": "PASS" if data_readiness.get("ready_for_trade_candidate") else "WATCH",
            "detail": "Candidate ready." if data_readiness.get("ready_for_trade_candidate") else "No trade candidate yet. This is normal before structure confirms.",
        },
        {
            "name": "Auto-order lock",
            "status": "PASS",
            "detail": "Auto-order is disabled. Manual Groww/Dhan only.",
        },
    ]

    blocking = [check for check in checks if check["status"] == "BLOCK"]
    watch = [check for check in checks if check["status"] == "WATCH"]

    if blocking:
        overall_status = "NOT_READY"
    elif watch:
        overall_status = "WATCH_READY"
    else:
        overall_status = "READY"

    return {
        "status": "success",
        "overall_status": overall_status,
        "market_session": market_session,
        "checks": checks,
        "blocking_count": len(blocking),
        "watch_count": len(watch),
        "auto_order_allowed": False,
        "manual_only": True,
    }
