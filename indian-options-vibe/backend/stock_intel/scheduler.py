"""Optional standalone 08:30 IST scanner.

Start with: cd backend && python -m stock_intel.scheduler
Keep exactly one scheduler process running; the laptop/server must remain awake.
Holiday-calendar integration and intraday 30-minute updates are future phases.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time

from stock_intel.core import IST
from stock_intel.service import collect_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stock_intel.scheduler")


async def main() -> None:
    log.info("Stock-intelligence read-only morning scheduler running (08:30 IST)")
    attempted_dates: set[str] = set()
    while True:
        now = datetime.now(tz=IST)
        key = now.date().isoformat()
        # NSE holiday calendar not yet connected; weekday check is only a first filter.
        if now.weekday() < 5 and time(8, 30) <= now.time() < time(8, 50) and key not in attempted_dates:
            attempted_dates.add(key)
            try:
                report = await collect_report(max_symbols=0, oi_top=5)
                log.info("Morning scan complete: %s; scanned=%s; candidates=%s",
                         report["status"], report["selected_count"], report["evaluated_count"])
            except Exception:
                log.exception("Morning stock intelligence scan failed; no mock report will be produced")
        # Discard old completion markers to bound memory in a long-running process.
        if len(attempted_dates) > 7:
            attempted_dates = {key} if key in attempted_dates else set()
        await asyncio.sleep(20)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Scheduler stopped by user")
