from datetime import datetime, time
from zoneinfo import ZoneInfo


IST = ZoneInfo("Asia/Kolkata")


def get_market_session_status() -> dict:
    now = datetime.now(IST)
    weekday = now.weekday()  # Monday=0, Sunday=6

    market_open_time = time(9, 15)
    market_close_time = time(15, 30)

    is_weekday = weekday < 5
    is_open_time = market_open_time <= now.time() <= market_close_time
    is_open = is_weekday and is_open_time

    if not is_weekday:
        reason = "Weekend. NSE live trading is closed."
    elif now.time() < market_open_time:
        reason = "Before market open. NSE live trading starts at 09:15 IST."
    elif now.time() > market_close_time:
        reason = "After market close. NSE live trading ended at 15:30 IST."
    else:
        reason = "Market session is open."

    return {
        "timezone": "Asia/Kolkata",
        "now_ist": now.isoformat(),
        "is_weekday": is_weekday,
        "is_open_time": is_open_time,
        "is_open": is_open,
        "reason": reason,
    }
