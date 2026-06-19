from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db.supabase_runs import (
    clear_runs_from_supabase,
    delete_run_from_supabase,
    get_run_from_supabase,
    is_supabase_enabled,
    list_runs_from_supabase,
    save_run_to_supabase,
)

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


def storage_mode() -> str:
    return "supabase" if is_supabase_enabled() else "memory"


@router.post("")
def save_run(run: SavedRun) -> dict:
    run_data = run.model_dump()

    if is_supabase_enabled():
        try:
            saved = save_run_to_supabase(run_data)
            RUN_STORE[run.id] = saved
            return {"status": "saved", "mode": "supabase", "run": saved}
        except Exception as exc:
            RUN_STORE[run.id] = run_data
            return {"status": "saved_fallback", "mode": "memory", "error": str(exc), "run": run_data, "count": len(RUN_STORE)}

    RUN_STORE[run.id] = run_data
    return {"status": "saved", "mode": "memory", "run": RUN_STORE[run.id], "count": len(RUN_STORE)}


@router.get("")
def list_runs() -> dict:
    if is_supabase_enabled():
        try:
            runs = list_runs_from_supabase()
            return {"mode": "supabase", "count": len(runs), "runs": runs}
        except Exception as exc:
            runs = list(RUN_STORE.values())
            return {"mode": "memory_fallback", "error": str(exc), "count": len(runs), "runs": runs}

    runs = list(RUN_STORE.values())
    return {"mode": "memory", "count": len(runs), "runs": runs}


@router.get("/{run_id}")
def get_run(run_id: str) -> dict:
    if is_supabase_enabled():
        try:
            run = get_run_from_supabase(run_id)
            if run:
                return {"mode": "supabase", "run": run}
        except Exception as exc:
            run = RUN_STORE.get(run_id)
            if run:
                return {"mode": "memory_fallback", "error": str(exc), "run": run}
            raise HTTPException(status_code=500, detail=str(exc))

    run = RUN_STORE.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return {"mode": storage_mode(), "run": run}


@router.delete("/{run_id}")
def delete_run(run_id: str) -> dict:
    deleted: dict[str, Any] | None = None

    if is_supabase_enabled():
        try:
            deleted = delete_run_from_supabase(run_id)
        except Exception as exc:
            if run_id in RUN_STORE:
                deleted = RUN_STORE.pop(run_id)
                return {"status": "deleted_fallback", "mode": "memory", "error": str(exc), "run": deleted, "count": len(RUN_STORE)}
            raise HTTPException(status_code=500, detail=str(exc))

    if run_id in RUN_STORE:
        deleted = RUN_STORE.pop(run_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return {"status": "deleted", "mode": storage_mode(), "run": deleted, "count": len(RUN_STORE)}


@router.delete("")
def clear_runs() -> dict:
    if is_supabase_enabled():
        try:
            clear_runs_from_supabase()
        except Exception as exc:
            RUN_STORE.clear()
            return {"status": "cleared_fallback", "mode": "memory", "error": str(exc), "count": 0}

    RUN_STORE.clear()
    return {"status": "cleared", "mode": storage_mode(), "count": 0}
