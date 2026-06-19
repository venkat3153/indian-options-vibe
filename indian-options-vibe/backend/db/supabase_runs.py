import os
from typing import Any

from supabase import Client, create_client

TABLE_NAME = "backtest_runs"


def get_supabase_client() -> Client | None:
    """Return Supabase client when env vars are configured, otherwise None."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        return None

    return create_client(url, key)


def is_supabase_enabled() -> bool:
    return get_supabase_client() is not None


def to_db_row(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": run["id"],
        "title": run["title"],
        "symbol": run["symbol"],
        "timeframe": run["timeframe"],
        "mode": run.get("mode", "Paper Backtest"),
        "status": run.get("status", "Completed"),
        "created_at_label": run["createdAt"],
        "net_pnl": run["netPnl"],
        "win_rate": run["winRate"],
        "profit_factor": run["profitFactor"],
        "max_drawdown": run["maxDrawdown"],
        "total_trades": run["totalTrades"],
        "charges": run.get("charges", 0),
        "risk": run.get("risk", "Medium"),
        "summary": run["summary"],
        "prompt": run.get("prompt"),
        "trades": run.get("trades", []),
        "raw": run,
    }


def from_db_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "symbol": row["symbol"],
        "timeframe": row["timeframe"],
        "mode": row.get("mode", "Paper Backtest"),
        "status": row.get("status", "Completed"),
        "createdAt": row.get("created_at_label", ""),
        "netPnl": row.get("net_pnl", 0),
        "winRate": row.get("win_rate", 0),
        "profitFactor": row.get("profit_factor", 0),
        "maxDrawdown": row.get("max_drawdown", 0),
        "totalTrades": row.get("total_trades", 0),
        "charges": row.get("charges", 0),
        "risk": row.get("risk", "Medium"),
        "summary": row.get("summary", ""),
        "prompt": row.get("prompt"),
        "trades": row.get("trades") or [],
    }


def save_run_to_supabase(run: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).upsert(to_db_row(run)).execute()
    rows = response.data or []
    return from_db_row(rows[0]) if rows else run


def list_runs_from_supabase() -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).select("*").order("inserted_at", desc=True).execute()
    return [from_db_row(row) for row in response.data or []]


def get_run_from_supabase(run_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(TABLE_NAME).select("*").eq("id", run_id).limit(1).execute()
    rows = response.data or []
    return from_db_row(rows[0]) if rows else None


def delete_run_from_supabase(run_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    existing = get_run_from_supabase(run_id)
    if not existing:
        return None

    client.table(TABLE_NAME).delete().eq("id", run_id).execute()
    return existing


def clear_runs_from_supabase() -> None:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    client.table(TABLE_NAME).delete().neq("id", "__never__").execute()
