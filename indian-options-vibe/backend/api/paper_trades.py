from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from db.supabase_paper_trades import (
    is_paper_trade_storage_enabled,
    list_paper_trades_from_supabase,
    save_paper_trade_to_supabase,
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
    brokerSnapshot: dict[str, Any] = Field(default_factory=dict)
    marketSnapshot: dict[str, Any] = Field(default_factory=dict)
    fundsSnapshot: dict[str, Any] = Field(default_factory=dict)


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
