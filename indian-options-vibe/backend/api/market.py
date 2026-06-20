from datetime import datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter

router = APIRouter()

IST = ZoneInfo("Asia/Kolkata")
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)


def next_trading_open(now: datetime) -> datetime:
    candidate = now

    if candidate.weekday() < 5 and candidate.time() < MARKET_OPEN:
        return candidate.replace(hour=9, minute=15, second=0, microsecond=0)

    candidate = candidate + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate = candidate + timedelta(days=1)

    return candidate.replace(hour=9, minute=15, second=0, microsecond=0)


def get_market_status_payload() -> dict[str, Any]:
    now = datetime.now(IST)
    is_weekend = now.weekday() >= 5
    is_market_hours = MARKET_OPEN <= now.time() <= MARKET_CLOSE
    is_open = (not is_weekend) and is_market_hours

    if is_weekend:
        reason = "Weekend. NSE cash and F&O regular market is closed."
    elif now.time() < MARKET_OPEN:
        reason = "Before NSE regular market open."
    elif now.time() > MARKET_CLOSE:
        reason = "After NSE regular market close."
    else:
        reason = "Within NSE regular market hours. Read-only mode still active until live-order gates are approved."

    next_allowed = next_trading_open(now)

    return {
        "market": "NSE",
        "timezone": "Asia/Kolkata",
        "now_ist": now.strftime("%Y-%m-%d %H:%M:%S IST"),
        "status": "open" if is_open else "closed",
        "is_open": is_open,
        "is_weekend": is_weekend,
        "regular_session": "09:15-15:30 IST",
        "reason": reason,
        "next_allowed": next_allowed.strftime("%A, %d %b %Y, 09:15 AM IST"),
        "live_orders_enabled": False,
        "live_orders_reason": "Live orders are locked. Market safety, manual approval, and daily risk gates must pass first.",
        "order_actions": {
            "place_order": False,
            "modify_order": False,
            "cancel_order": False,
            "auto_trade": False,
        },
    }


@router.get("/status")
def get_market_status() -> dict[str, Any]:
    return get_market_status_payload()
