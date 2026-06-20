from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from db.supabase_market_data import (
    is_market_data_storage_enabled,
    list_watchlist_from_supabase,
    upsert_watchlist_item_to_supabase,
    delete_watchlist_item_from_supabase,
)

router = APIRouter()


class WatchlistItemRequest(BaseModel):
    symbol: str
    name: str | None = None
    sector: str | None = None
    quant_score: int | None = None
    live_signal: str | None = None
    reason: str | None = None
    source: str = "stocks_dashboard"
    notes: str | None = None
    status: str | None = "Watching"
    action_tag: str | None = "Wait"
    entry_idea: str | None = None
    invalidation: str | None = None
    target_idea: str | None = None
    outcome: str | None = "Pending"
    outcome_date: str | None = None
    review_note: str | None = None
    lesson: str | None = None


@router.get("")
def list_watchlist() -> dict[str, Any]:
    if not is_market_data_storage_enabled():
        return {"mode": "no_supabase", "count": 0, "items": [], "message": "Supabase is required for permanent watchlist."}

    try:
        items = list_watchlist_from_supabase()
        return {"mode": "supabase", "count": len(items), "items": items, "live_orders_enabled": False}
    except Exception as exc:
        return {"mode": "error", "count": 0, "items": [], "error": str(exc), "live_orders_enabled": False}


@router.post("")
def add_watchlist_item(request: WatchlistItemRequest) -> dict[str, Any]:
    if not is_market_data_storage_enabled():
        return {"status": "blocked", "mode": "no_supabase", "message": "Supabase is required for permanent watchlist.", "live_orders_enabled": False}

    row = {
        "symbol": request.symbol.upper(),
        "name": request.name,
        "sector": request.sector,
        "quant_score": request.quant_score,
        "live_signal": request.live_signal,
        "reason": request.reason,
        "source": request.source,
        "notes": request.notes,
        "status": request.status or "Watching",
        "action_tag": request.action_tag or "Wait",
        "entry_idea": request.entry_idea,
        "invalidation": request.invalidation,
        "target_idea": request.target_idea,
        "outcome": request.outcome or "Pending",
        "outcome_date": request.outcome_date,
        "review_note": request.review_note,
        "lesson": request.lesson,
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Keep insert/update resilient if user has not run the latest SQL migration yet.
    row = {key: value for key, value in row.items() if value is not None}

    try:
        saved = upsert_watchlist_item_to_supabase(row)
        return {"status": "saved", "mode": "supabase", "item": saved, "live_orders_enabled": False}
    except Exception as exc:
        return {"status": "error", "mode": "supabase", "error": str(exc), "live_orders_enabled": False}


@router.delete("/{symbol}")
def remove_watchlist_item(symbol: str) -> dict[str, Any]:
    if not is_market_data_storage_enabled():
        return {"status": "blocked", "mode": "no_supabase", "message": "Supabase is required for permanent watchlist.", "live_orders_enabled": False}

    try:
        result = delete_watchlist_item_from_supabase(symbol)
        return {"status": "removed", "mode": "supabase", **result, "live_orders_enabled": False}
    except Exception as exc:
        return {"status": "error", "mode": "supabase", "error": str(exc), "live_orders_enabled": False}
