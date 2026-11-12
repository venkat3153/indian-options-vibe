"""Authorized Dhan market-data collector for stock-options *research* only."""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, time
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

from stock_intel.core import IST, evaluate_stock, normalize_daily_candles, parse_fno_universe

MASTER_URL = "https://images.dhan.co/api-data/api-scrip-master-detailed.csv"
DHAN_BASE = "https://api.dhan.co/v2"
DATA_DIR = Path(os.environ.get("STOCK_INTEL_DATA_DIR", str(Path(__file__).resolve().parents[1] / "data" / "stock_intel")))
LATEST_PATH = DATA_DIR / "latest.json"


def credentials_available() -> bool:
    return bool(os.getenv("DHAN_CLIENT_ID") and os.getenv("DHAN_ACCESS_TOKEN"))


def latest_report() -> dict:
    if not LATEST_PATH.exists():
        return {"status": "NOT_RUN", "message": "No real-market scan saved yet. No sample market data is shown."}
    try:
        return json.loads(LATEST_PATH.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {"status": "ERROR", "message": "Saved report could not be read"}


def save_report(report: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp = LATEST_PATH.with_suffix(".tmp")
    temp.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, LATEST_PATH)


async def _dhan_post(client: httpx.AsyncClient, endpoint: str, payload: dict) -> dict:
    r = await client.post(
        f"{DHAN_BASE}/{endpoint}",
        headers={"access-token": os.environ["DHAN_ACCESS_TOKEN"],
                 "client-id": os.environ["DHAN_CLIENT_ID"],
                 "Content-Type": "application/json"},
        json=payload,
    )
    r.raise_for_status()
    result = r.json()
    if not isinstance(result, dict) or result.get("status") == "failure":
        raise ValueError(f"Dhan {endpoint} returned an invalid or failed response")
    return result


def _oi_snapshot(data: dict, at: datetime) -> dict:
    body = data.get("data", {})
    if not isinstance(body, dict):
        raise ValueError("Invalid Dhan option-chain body")
    chain = body.get("oc")
    if not isinstance(chain, dict) or not chain:
        raise ValueError("Empty option chain")
    call_oi, put_oi = 0, 0
    call_change, put_change = 0, 0
    call_max, put_max = (0, None), (0, None)
    for strike, pair in chain.items():
        if not isinstance(pair, dict):
            continue
        ce, pe = pair.get("ce") or {}, pair.get("pe") or {}
        if not isinstance(ce, dict) or not isinstance(pe, dict):
            continue
        c, p = int(ce.get("oi") or 0), int(pe.get("oi") or 0)
        call_oi += c
        put_oi += p
        call_change += c - int(ce.get("previous_oi") or 0)
        put_change += p - int(pe.get("previous_oi") or 0)
        if c > call_max[0]:
            call_max = (c, strike)
        if p > put_max[0]:
            put_max = (p, strike)
    return {
        "source": "DHAN_OPTIONCHAIN",
        "retrieved_at_ist": at.isoformat(),
        "as_of_market_session": "LATEST_AVAILABLE_UNVERIFIED",
        "max_call_oi_strike": call_max[1],
        "max_put_oi_strike": put_max[1],
        "total_call_oi": call_oi, "total_put_oi": put_oi,
        "change_call_oi_vs_previous": call_change,
        "change_put_oi_vs_previous": put_change,
        "pcr_oi": round(put_oi / call_oi, 3) if call_oi else None,
        "interpretation": "OI concentrations are potential positioning areas, not verified writer locations or directional proof.",
    }


async def collect_report(
    max_symbols: int = 0,
    oi_top: int = 5,
    progress: dict | None = None,
) -> dict:
    """Scan the entire current stock F&O universe by default (max_symbols=0).

    For pilot tests pass max_symbols>0. Request limits, market holidays and
    data-provider availability apply. Does not connect any news source yet.
    """
    if not credentials_available():
        raise RuntimeError("DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN are required in backend/.env")
    now = datetime.now(tz=IST)
    # Dhan daily historical endpoint may include an in-progress candle;
    # only consume today's candle when the full session has closed.
    cutoff = now.date() + timedelta(days=1) if now.time() >= time(15, 45) else now.date()
    from_date = (now.date() - timedelta(days=570)).isoformat()
    to_date = (now.date() + timedelta(days=1)).isoformat()
    async with httpx.AsyncClient(timeout=httpx.Timeout(40)) as client:
        master_response = await client.get(MASTER_URL)
        master_response.raise_for_status()
        universe = parse_fno_universe(master_response.text, now.date())
        if not universe:
            raise RuntimeError("Dhan master returned no valid NSE stock-option underlyings; refusing mock fallback")
        selected = universe[:max_symbols] if max_symbols else universe
        rows, failures = [], []
        for i, stock in enumerate(selected):
            if progress is not None:
                progress.update({"processed": i, "total": len(selected), "symbol": stock["symbol"]})
            try:
                payload = await _dhan_post(client, "charts/historical", {
                    "securityId": stock["security_id"], "exchangeSegment": "NSE_EQ",
                    "instrument": "EQUITY", "expiryCode": 0, "oi": False,
                    "fromDate": from_date, "toDate": to_date,
                })
                candles = normalize_daily_candles(payload, cutoff)
                row = evaluate_stock(stock["symbol"], candles)
                row["nearest_option_expiry"] = stock["nearest_expiry"]
                expiry_days = (datetime.fromisoformat(stock["nearest_expiry"]).date() - now.date()).days
                row["expiry_warning"] = (
                    "Nearest listed stock-option expiry is close to a 5–6-day holding horizon; "
                    "check the next monthly series and physical-settlement obligations."
                    if expiry_days < 9 else None
                )
                if row["status"] == "TECHNICAL_WATCH":
                    rows.append(row)
                else:
                    failures.append({"symbol": stock["symbol"], "reason": row["status"]})
            except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
                failures.append({"symbol": stock["symbol"], "reason": type(exc).__name__})
            # Avoid burst-loading the historical endpoint.
            await asyncio.sleep(0.35)

        rows.sort(key=lambda item: item["technical_score"], reverse=True)
        oi_count = 0
        for row in rows[:oi_top]:
            try:
                stock = next(item for item in selected if item["symbol"] == row["symbol"])
                chain = await _dhan_post(client, "optionchain", {
                    "UnderlyingScrip": int(stock["security_id"]),
                    "UnderlyingSeg": "NSE_EQ",
                    "Expiry": stock["nearest_expiry"],
                })
                row["option_oi"] = _oi_snapshot(chain, datetime.now(tz=IST))
                row["option_oi_status"] = "AVAILABLE"
                oi_count += 1
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                row["option_oi_status"] = f"UNAVAILABLE_{type(exc).__name__}"
            # Dhan option-chain API: one unique request per three seconds.
            await asyncio.sleep(3.2)

    bullish = [row for row in rows if row["bias"] == "BULLISH"]
    bearish = [row for row in rows if row["bias"] == "BEARISH"]
    report = {
        "status": "SUCCESS" if not failures else "PARTIAL",
        "generated_at_ist": datetime.now(tz=IST).isoformat(),
        "price_data_through": max((x["as_of_candle"] for x in rows), default=None),
        "source": "DHAN_LIVE_API_HISTORICAL_AND_OPTIONCHAIN",
        "universe_count": len(universe), "selected_count": len(selected),
        "evaluated_count": len(rows), "skipped_count": len(failures),
        "oi_enriched_count": oi_count,
        "is_pilot_subset": bool(max_symbols),
        "bullish": bullish[:10], "bearish": bearish[:10],
        "candidates": rows, "skipped_sample": failures[:30],
        "news_status": "NOT_CONNECTED",
        "brokerage_rating_status": "NOT_CONNECTED",
        "decision": "TECHNICAL_RESEARCH_ONLY",
        "warning": "No current news, broker ratings, live intraday confirmation or calibrated stock/option-return probability. All levels are underlying stock research levels.",
        "auto_order_allowed": False,
        "order_execution_available": False,
    }
    save_report(report)
    if progress is not None:
        progress.update({"processed": len(selected), "total": len(selected), "symbol": None})
    return report
