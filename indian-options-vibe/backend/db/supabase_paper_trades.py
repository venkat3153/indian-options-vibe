from typing import Any

from db.supabase_runs import get_supabase_client

TABLE_NAME = "paper_trades"


def is_paper_trade_storage_enabled() -> bool:
    return get_supabase_client() is not None


def to_db_row(trade: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": trade["id"],
        "symbol": trade["symbol"],
        "contract": trade.get("contract"),
        "setup": trade.get("setup", ""),
        "bias": trade.get("bias", ""),
        "entry_plan": trade.get("entry", ""),
        "stop_loss": trade.get("stopLoss", ""),
        "target": trade.get("target", ""),
        "status": trade.get("status", "Planned"),
        "source": trade.get("source", "Screener"),
        "created_at_label": trade.get("createdAt", ""),
        "updated_at_label": trade.get("updatedAt"),
        "r_result": trade.get("rResult"),
        "paper_pnl": trade.get("paperPnl"),
        "broker_snapshot": trade.get("brokerSnapshot") or {},
        "market_snapshot": trade.get("marketSnapshot") or {},
        "funds_snapshot": trade.get("fundsSnapshot") or {},
        "raw": trade,
    }


def from_db_row(row: dict[str, Any]) -> dict[str, Any]:
    raw = row.get("raw") or {}
    return {
        **raw,
        "id": row["id"],
        "symbol": row.get("symbol", raw.get("symbol", "")),
        "contract": row.get("contract") or raw.get("contract"),
        "setup": row.get("setup") or raw.get("setup", ""),
        "bias": row.get("bias") or raw.get("bias", ""),
        "entry": row.get("entry_plan") or raw.get("entry", ""),
        "stopLoss": row.get("stop_loss") or raw.get("stopLoss", ""),
        "target": row.get("target") or raw.get("target", ""),
        "status": row.get("status") or raw.get("status", "Planned"),
        "source": row.get("source") or raw.get("source", "Screener"),
        "createdAt": row.get("created_at_label") or raw.get("createdAt", ""),
        "updatedAt": row.get("updated_at_label") or raw.get("updatedAt"),
        "rResult": row.get("r_result"),
        "paperPnl": row.get("paper_pnl"),
        "brokerSnapshot": row.get("broker_snapshot") or raw.get("brokerSnapshot") or {},
        "marketSnapshot": row.get("market_snapshot") or raw.get("marketSnapshot") or {},
        "fundsSnapshot": row.get("funds_snapshot") or raw.get("fundsSnapshot") or {},
    }


def save_paper_trade_to_supabase(trade: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).upsert(to_db_row(trade)).execute()
    rows = response.data or []
    return from_db_row(rows[0]) if rows else trade


def list_paper_trades_from_supabase() -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).select("*").order("inserted_at", desc=True).execute()
    return [from_db_row(row) for row in response.data or []]


def delete_paper_trade_from_supabase(trade_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).select("*").eq("id", trade_id).limit(1).execute()
    rows = response.data or []
    if not rows:
        return None

    client.table(TABLE_NAME).delete().eq("id", trade_id).execute()
    return from_db_row(rows[0])


def clear_paper_trades_from_supabase() -> None:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    client.table(TABLE_NAME).delete().neq("id", "__never__").execute()
