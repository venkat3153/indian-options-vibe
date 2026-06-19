from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

RUN_STORE: dict[str, dict[str, Any]] = {}


class SavedTrade(BaseModel):
    time: str
    symbol: str
    side: str
    entry: float | str
    exit: float | str
    pnl: float
    result: str


class SavedRun(BaseModel):
    id: str
    title: str
    symbol: str
    timeframe: str
    mode: str = "Paper Backtest"
    status: str = "Completed"
    createdAt: str
    netPnl: float
    winRate: float
    profitFactor: float
    maxDrawdown: float
    totalTrades: int
    charges: float = 0
    risk: str = "Medium"
    summary: str
    prompt: str | None = None
    trades: list[SavedTrade] = Field(default_factory=list)


@router.post("")
def save_run(run: SavedRun) -> dict:
    RUN_STORE[run.id] = run.model_dump()
    return {"status": "saved", "run": RUN_STORE[run.id], "count": len(RUN_STORE)}


@router.get("")
def list_runs() -> dict:
    runs = list(RUN_STORE.values())
    return {"mode": "memory", "count": len(runs), "runs": runs}


@router.get("/{run_id}")
def get_run(run_id: str) -> dict:
    run = RUN_STORE.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return {"mode": "memory", "run": run}


@router.delete("/{run_id}")
def delete_run(run_id: str) -> dict:
    if run_id not in RUN_STORE:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    deleted = RUN_STORE.pop(run_id)
    return {"status": "deleted", "run": deleted, "count": len(RUN_STORE)}


@router.delete("")
def clear_runs() -> dict:
    RUN_STORE.clear()
    return {"status": "cleared", "count": 0}
