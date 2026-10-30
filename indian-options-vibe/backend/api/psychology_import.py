"""Dhan fills -> durable local psychology journal. No Dhan order operations.

Data stays on this machine in backend/data/trading_psychology.sqlite3.
API deliberately reports fills, not guessed round trips, when a position remains open.
"""
import csv
import hashlib
import io
import json
import os
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from brokers.dhan import DhanReadOnlyAdapter, DhanApiError, DhanConfigError

router = APIRouter(prefix="/api/psychology", tags=["psychology-readonly"])
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "trading_psychology.sqlite3"


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS fills (
      fill_id TEXT PRIMARY KEY, account TEXT NOT NULL, trade_date TEXT,
      symbol TEXT, security_id TEXT, segment TEXT, product TEXT,
      side TEXT NOT NULL, qty INTEGER NOT NULL, price REAL NOT NULL,
      executed_at TEXT, order_id TEXT, raw_json TEXT NOT NULL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS reviews (
      review_id TEXT PRIMARY KEY, setup TEXT, original_stop REAL,
      planned_exit TEXT, actual_exit_reason TEXT, emotion TEXT,
      mistakes TEXT, next_action TEXT, entry_grade REAL,
      risk_grade REAL, size_grade REAL, exit_grade REAL,
      process_grade REAL, notes TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    return conn


def stable_id(fill: dict[str, Any]) -> str:
    # Exchange trade ID is normally unique within account/segment.
    account = str(fill.get("dhanClientId") or "")
    exchange = str(fill.get("exchangeSegment") or "")
    trade_id = str(fill.get("exchangeTradeId") or "")
    if trade_id:
        key = [account, exchange, trade_id]
    else:
        key = [account, exchange] + [str(fill.get(k) or "") for k in (
            "orderId", "exchangeTime", "transactionType", "securityId",
            "tradedQuantity", "tradedPrice")]
    return hashlib.sha256(json.dumps(key).encode()).hexdigest()


def normalize(row: dict[str, Any]) -> tuple:
    side = str(row.get("transactionType") or "").upper()
    qty = int(row.get("tradedQuantity") or 0)
    price = float(row.get("tradedPrice") or 0)
    if side not in ("BUY", "SELL") or qty <= 0 or price <= 0:
        raise ValueError("invalid trade fill")
    timestamp = str(row.get("exchangeTime") or row.get("createTime") or "")
    return (
        stable_id(row), str(row.get("dhanClientId") or ""),
        timestamp[:10], str(row.get("tradingSymbol") or ""),
        str(row.get("securityId") or ""), str(row.get("exchangeSegment") or ""),
        str(row.get("productType") or ""), side, qty, price, timestamp,
        str(row.get("orderId") or ""), json.dumps(row, separators=(",", ":"))
    )


def save_fills(rows: list[dict[str, Any]]) -> dict[str, int]:
    added = invalid = 0
    with connect() as db:
        for row in rows:
            try:
                normalized = normalize(row)
            except (ValueError, TypeError, OverflowError):
                invalid += 1
                continue
            result = db.execute("""INSERT OR IGNORE INTO fills
                (fill_id,account,trade_date,symbol,security_id,segment,product,
                 side,qty,price,executed_at,order_id,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", normalized)
            added += result.rowcount
    return {"received": len(rows), "added": added, "duplicates": len(rows)-added-invalid, "invalid": invalid}


async def fetch_dhan(path: str) -> list[dict[str, Any]]:
    # Existing Dhan adapter only exposes GET for account/tradebook reads.
    adapter = DhanReadOnlyAdapter()
    response = await adapter._get(path)
    if isinstance(response, dict) and isinstance(response.get("data"), list):
        response = response["data"]
    if not isinstance(response, list):
        raise HTTPException(status_code=502, detail="Unexpected Dhan tradebook response")
    return response


@router.post("/sync/today")
async def sync_today():
    try:
        fills = await fetch_dhan("/trades")
        return {"status": "ok", "source": "dhan", "broker_mode": "read_only",
                "stats": save_fills(fills)}
    except (DhanConfigError, DhanApiError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/sync/history")
async def sync_history(from_date: date, to_date: date):
    if to_date < from_date or (to_date - from_date).days > 30:
        raise HTTPException(status_code=400, detail="Choose a range of 0 to 30 days")
    try:
        total = {"received": 0, "added": 0, "duplicates": 0, "invalid": 0}
        # Page size is controlled by Dhan; stop at empty page, cap for safety.
        for page in range(100):
            fills = await fetch_dhan(
                f"/trades/{from_date.isoformat()}/{to_date.isoformat()}/{page}")
            if not fills:
                break
            stats = save_fills(fills)
            for key, value in stats.items():
                total[key] += value
        else:
            raise HTTPException(status_code=502, detail="Pagination limit reached; narrow date range")
        return {"status": "ok", "source": "dhan", "broker_mode": "read_only",
                "stats": total}
    except (DhanConfigError, DhanApiError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/fills")
def list_fills(limit: int = 500):
    with connect() as db:
        rows = db.execute("""SELECT fill_id, account, trade_date, symbol, security_id,
         segment, product, side, qty, price, executed_at, order_id
         FROM fills ORDER BY executed_at DESC, fill_id DESC LIMIT ?""",
         (max(1, min(limit, 5000)),)).fetchall()
    return {"fills": [dict(r) for r in rows], "broker_mode": "read_only"}


class PsychologyReview(BaseModel):
    setup: str | None = None
    original_stop: float | None = Field(default=None, gt=0)
    planned_exit: str | None = None
    actual_exit_reason: str | None = None
    emotion: str | None = None
    mistakes: str | None = None
    next_action: str | None = None
    entry_grade: float | None = Field(default=None, ge=0, le=10)
    risk_grade: float | None = Field(default=None, ge=0, le=10)
    size_grade: float | None = Field(default=None, ge=0, le=10)
    exit_grade: float | None = Field(default=None, ge=0, le=10)
    process_grade: float | None = Field(default=None, ge=0, le=10)
    notes: str | None = None


@router.put("/reviews/{review_id}")
def upsert_review(review_id: str, review: PsychologyReview):
    if not review_id or len(review_id) > 128:
        raise HTTPException(status_code=400, detail="Invalid review ID")
    data = review.model_dump()
    fields = list(data)
    with connect() as db:
        db.execute(f"""INSERT INTO reviews (review_id,{','.join(fields)})
           VALUES (? ,{','.join('?' for _ in fields)})
           ON CONFLICT(review_id) DO UPDATE SET
           {','.join(f'{field}=excluded.{field}' for field in fields)},
           updated_at=CURRENT_TIMESTAMP""", [review_id, *data.values()])
    return {"saved": True, "review_id": review_id}


@router.get("/reviews")
def list_reviews():
    with connect() as db:
        rows = db.execute("SELECT * FROM reviews ORDER BY updated_at DESC").fetchall()
    return {"reviews": [dict(r) for r in rows]}


@router.get("/export/fills.csv")
def export_fills():
    with connect() as db:
        rows = db.execute("""SELECT fill_id,trade_date,symbol,security_id,segment,
          product,side,qty,price,executed_at,order_id FROM fills
          ORDER BY executed_at, fill_id""").fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["fill_id","date","symbol","security_id","segment","product",
                     "side","qty","price","executed_at","order_id"])
    for row in rows:
        writer.writerow(list(row))
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
       headers={"Content-Disposition": 'attachment; filename="dhan_fills.csv"'})
