from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter

from api.paper_trades import PAPER_TRADE_STORE
from db.supabase_paper_trades import is_paper_trade_storage_enabled, list_paper_trades_from_supabase

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST)
        return dt.astimezone(IST)
    except Exception:
        return None


def load_paper_trades() -> tuple[list[dict[str, Any]], str]:
    if is_paper_trade_storage_enabled():
        try:
            return list_paper_trades_from_supabase(), "supabase"
        except Exception:
            return list(PAPER_TRADE_STORE.values()), "memory_fallback"
    return list(PAPER_TRADE_STORE.values()), "memory"


def today_ist_trades(trades: list[dict[str, Any]]) -> list[dict[str, Any]]:
    today = datetime.now(IST).date()
    out: list[dict[str, Any]] = []
    for trade in trades:
        dt = parse_dt(trade.get("createdAt") or trade.get("created_at") or trade.get("updatedAt") or trade.get("updated_at"))
        if dt and dt.date() == today:
            out.append(trade)
    return out


def number(value: Any) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def get_limits() -> dict[str, float]:
    return {
        "max_trades": number(os.getenv("DISCIPLINE_MAX_TRADES", 3)) or 3,
        "max_losses": number(os.getenv("DISCIPLINE_MAX_LOSSES", 2)) or 2,
        "daily_loss_limit": number(os.getenv("DISCIPLINE_DAILY_LOSS_LIMIT", -1)),
    }


@router.get("/status")
def discipline_status() -> dict[str, Any]:
    trades, mode = load_paper_trades()
    today_trades = today_ist_trades(trades)
    limits = get_limits()

    closed = [t for t in today_trades if str(t.get("status", "")).lower() in {"closed", "won", "lost", "exit", "exited"} or t.get("paperPnl") is not None or t.get("rResult") is not None]
    pnl_today = sum(number(t.get("paperPnl") or t.get("paper_pnl")) for t in closed)
    r_today = sum(number(t.get("rResult") or t.get("r_result")) for t in closed)
    loss_count = len([t for t in closed if number(t.get("paperPnl") or t.get("paper_pnl")) < 0 or number(t.get("rResult") or t.get("r_result")) < 0])

    max_trades_hit = len(today_trades) >= limits["max_trades"]
    max_losses_hit = loss_count >= limits["max_losses"]
    daily_loss_hit = limits["daily_loss_limit"] < 0 and pnl_today <= limits["daily_loss_limit"]
    locked = max_trades_hit or max_losses_hit or daily_loss_hit

    reasons: list[str] = []
    if max_trades_hit:
        reasons.append(f"Max trades hit: {len(today_trades)}/{int(limits['max_trades'])}")
    if max_losses_hit:
        reasons.append(f"Loss count hit: {loss_count}/{int(limits['max_losses'])}")
    if daily_loss_hit:
        reasons.append(f"Daily loss limit hit: {pnl_today}")
    if not reasons:
        reasons.append("Discipline clear for today based on available paper-trade data.")

    return {
        "status": "locked" if locked else "clear",
        "mode": mode,
        "date_ist": str(datetime.now(IST).date()),
        "timezone": "Asia/Kolkata",
        "locked": locked,
        "trades_today": len(today_trades),
        "closed_trades_today": len(closed),
        "pnl_today": round(pnl_today, 2),
        "r_today": round(r_today, 2),
        "loss_count": loss_count,
        "limits": limits,
        "checks": {
            "max_trades_clear": not max_trades_hit,
            "max_losses_clear": not max_losses_hit,
            "daily_loss_clear": not daily_loss_hit,
        },
        "reason": " | ".join(reasons),
        "note": "Research/paper mode discipline status. This does not place orders.",
    }
