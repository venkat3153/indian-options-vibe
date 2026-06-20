from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db.supabase_paper_trades import (
    is_paper_trade_storage_enabled,
    list_paper_trades_from_supabase,
    save_paper_trade_to_supabase,
    update_paper_trade_in_supabase,
)

router = APIRouter()

PAPER_TRADE_STORE: dict[str, dict[str, Any]] = {}


class PaperTrade(BaseModel):
    id: str
    symbol: str
    contract: str | None = None
    setup: str
    bias: str
    entry: str
    stopLoss: str
    target: str
    status: str = "Planned"
    source: str = "Screener"
    createdAt: str
    updatedAt: str | None = None
    rResult: float | None = None
    paperPnl: float | None = None
    notes: str | None = ""
    mistake: str | None = ""
    emotion: str | None = ""
    brokerSnapshot: dict[str, Any] = Field(default_factory=dict)
    marketSnapshot: dict[str, Any] = Field(default_factory=dict)
    fundsSnapshot: dict[str, Any] = Field(default_factory=dict)


class PaperTradeUpdate(BaseModel):
    status: str | None = None
    rResult: float | None = None
    paperPnl: float | None = None
    notes: str | None = None
    mistake: str | None = None
    emotion: str | None = None
    updatedAt: str | None = None


@router.post("")
def save_paper_trade(trade: PaperTrade) -> dict[str, Any]:
    trade_data = trade.model_dump()

    if is_paper_trade_storage_enabled():
        try:
            saved = save_paper_trade_to_supabase(trade_data)
            PAPER_TRADE_STORE[trade.id] = saved
            return {"status": "saved", "mode": "supabase", "trade": saved}
        except Exception as exc:
            PAPER_TRADE_STORE[trade.id] = trade_data
            return {"status": "saved_fallback", "mode": "memory", "error": str(exc), "trade": trade_data, "count": len(PAPER_TRADE_STORE)}

    PAPER_TRADE_STORE[trade.id] = trade_data
    return {"status": "saved", "mode": "memory", "trade": trade_data, "count": len(PAPER_TRADE_STORE)}


@router.get("")
def list_paper_trades() -> dict[str, Any]:
    if is_paper_trade_storage_enabled():
        try:
            trades = list_paper_trades_from_supabase()
            return {"mode": "supabase", "count": len(trades), "trades": trades}
        except Exception as exc:
            trades = list(PAPER_TRADE_STORE.values())
            return {"mode": "memory_fallback", "error": str(exc), "count": len(trades), "trades": trades}

    trades = list(PAPER_TRADE_STORE.values())
    return {"mode": "memory", "count": len(trades), "trades": trades}


@router.patch("/{trade_id}")
def update_paper_trade(trade_id: str, update: PaperTradeUpdate) -> dict[str, Any]:
    patch = update.model_dump(exclude_unset=True)

    if is_paper_trade_storage_enabled():
        try:
            updated = update_paper_trade_in_supabase(trade_id, patch)
            if not updated:
                raise HTTPException(status_code=404, detail=f"Paper trade {trade_id} not found")
            PAPER_TRADE_STORE[trade_id] = updated
            return {"status": "updated", "mode": "supabase", "trade": updated}
        except HTTPException:
            raise
        except Exception as exc:
            if trade_id in PAPER_TRADE_STORE:
                PAPER_TRADE_STORE[trade_id].update(patch)
                return {"status": "updated_fallback", "mode": "memory", "error": str(exc), "trade": PAPER_TRADE_STORE[trade_id]}
            raise HTTPException(status_code=500, detail=str(exc))

    if trade_id not in PAPER_TRADE_STORE:
        raise HTTPException(status_code=404, detail=f"Paper trade {trade_id} not found")

    PAPER_TRADE_STORE[trade_id].update(patch)
    return {"status": "updated", "mode": "memory", "trade": PAPER_TRADE_STORE[trade_id]}
