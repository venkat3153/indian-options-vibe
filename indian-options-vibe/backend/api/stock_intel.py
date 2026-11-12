"""Read-only stock-option research endpoints. Never submits an order."""
import asyncio
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from stock_intel.service import collect_report, credentials_available, latest_report

router = APIRouter(prefix="/api/stock-intel", tags=["stock-intelligence"])
_state: dict = {"state": "IDLE", "processed": 0, "total": 0, "symbol": None}
_task: asyncio.Task | None = None


async def _run(max_symbols: int, oi_top: int) -> None:
    _state.update({"state": "RUNNING", "processed": 0, "total": 0, "symbol": None, "error": None})
    try:
        result = await collect_report(max_symbols=max_symbols, oi_top=oi_top, progress=_state)
        _state.update({"state": "FINISHED", "result": result["status"], "finished_at_ist": datetime.now(tz=ZoneInfo("Asia/Kolkata")).isoformat()})
    except Exception as exc:
        # Never fall back to mock data, and never expose authentication headers.
        _state.update({"state": "FAILED", "error": type(exc).__name__, "result": None})


@router.get("/status")
def status() -> dict:
    return {
        "mode": "READ_ONLY_STOCK_RESEARCH",
        "dhan_credentials_present": credentials_available(),
        "news_feed_connected": False,
        "scheduled_scanner_enabled": False,
        "scan": dict(_state),
        "auto_order_allowed": False,
        "order_execution_available": False,
        "message": "Use POST /api/stock-intel/scan to start the first research scan. Full scans may take several minutes.",
    }


@router.post("/scan", status_code=202)
async def scan(
    max_symbols: int = Query(default=0, ge=0, le=1000, description="0 scans all eligible NSE stock-option underlyings"),
    oi_top: int = Query(default=5, ge=0, le=20),
) -> dict:
    global _task
    if not credentials_available():
        raise HTTPException(status_code=503, detail="Add Dhan read-only market-data credentials to backend/.env")
    if _task is not None and not _task.done():
        raise HTTPException(status_code=409, detail="A stock-intelligence scan is already running")
    _state.update({"state": "QUEUED", "processed": 0, "total": 0})
    _task = asyncio.create_task(_run(max_symbols=max_symbols, oi_top=oi_top))
    return {"status": "QUEUED", "max_symbols": max_symbols, "oi_top": oi_top, "order_execution_available": False}


@router.get("/latest")
def latest() -> dict:
    return latest_report()


@router.get("/symbol/{symbol}")
def symbol_detail(symbol: str) -> dict:
    clean = symbol.upper().strip()
    report = latest_report()
    row = next((item for item in report.get("candidates", []) if item.get("symbol") == clean), None)
    if row is None:
        raise HTTPException(status_code=404, detail="No qualifying technical research for this symbol in latest scan")
    return {
        "stock": row,
        "generated_at_ist": report.get("generated_at_ist"),
        "report_status": report.get("status"),
        "auto_order_allowed": False,
    }
