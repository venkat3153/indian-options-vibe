from statistics import mean
from typing import Any

from fastapi import APIRouter

from api.live import live_quotes

router = APIRouter()


def to_float(value: Any) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def derived_change_pct(quote: dict[str, Any]) -> float | None:
    raw_change = quote.get("change_pct")
    if raw_change is not None and raw_change != "":
        return round(to_float(raw_change), 2)

    ltp = to_float(quote.get("ltp"))
    prev_close = to_float(quote.get("prev_close"))
    if ltp and prev_close:
        return round(((ltp - prev_close) / prev_close) * 100, 2)

    change = quote.get("change")
    if change is not None and change != "" and prev_close:
        return round((to_float(change) / prev_close) * 100, 2)

    return None


def normalize_quote(quote: dict[str, Any]) -> dict[str, Any] | None:
    change_pct = derived_change_pct(quote)
    if change_pct is None:
        return None
    return {**quote, "change_pct": change_pct, "change_pct_source": "api" if quote.get("change_pct") is not None else "derived"}


@router.get("/breadth")
async def get_market_breadth(symbol: str | None = None, sector: str | None = None) -> dict[str, Any]:
    payload = await live_quotes(limit=100)
    quotes = payload.get("quotes", []) if isinstance(payload, dict) else []
    valid = [normalized for q in quotes if (normalized := normalize_quote(q)) is not None]

    if not valid:
        return {
            "status": "unknown",
            "supportive": False,
            "message": "Market breadth unavailable because live quote change data could not be derived from LTP and previous close.",
            "note": "Research only. No live orders.",
        }

    changes = [to_float(q.get("change_pct")) for q in valid]
    positive = [q for q in valid if to_float(q.get("change_pct")) > 0]
    negative = [q for q in valid if to_float(q.get("change_pct")) < 0]
    flat = len(valid) - len(positive) - len(negative)
    avg_change = round(mean(changes), 2)
    positive_pct = round((len(positive) / len(valid)) * 100, 2)

    clean_symbol = (symbol or "").strip().upper()
    clean_sector = (sector or "").strip().lower()
    selected_quote = None

    if clean_symbol:
        selected_quote = next((q for q in valid if str(q.get("symbol", "")).upper() == clean_symbol), None)
        if selected_quote and not clean_sector:
            clean_sector = str(selected_quote.get("sector", "")).lower()

    sector_quotes = [q for q in valid if clean_sector and str(q.get("sector", "")).lower() == clean_sector]
    sector_positive = [q for q in sector_quotes if to_float(q.get("change_pct")) > 0]
    sector_avg = round(mean([to_float(q.get("change_pct")) for q in sector_quotes]), 2) if sector_quotes else None
    sector_positive_pct = round((len(sector_positive) / len(sector_quotes)) * 100, 2) if sector_quotes else None

    market_supportive = positive_pct >= 50 and avg_change >= -0.15
    sector_supportive = True
    if sector_quotes:
        sector_supportive = bool(sector_positive_pct is not None and sector_positive_pct >= 50 and (sector_avg or 0) >= -0.2)

    supportive = market_supportive and sector_supportive

    derived_count = len([q for q in valid if q.get("change_pct_source") == "derived"])
    reasons = [
        f"NIFTY50 breadth: {len(positive)} positive, {len(negative)} negative, {flat} flat; average change {avg_change}%.",
    ]
    if derived_count:
        reasons.append(f"Derived live % for {derived_count} symbols from LTP and previous close.")
    if sector_quotes:
        reasons.append(f"Sector breadth: {len(sector_positive)}/{len(sector_quotes)} positive; average change {sector_avg}%.")
    if selected_quote:
        reasons.append(f"{selected_quote.get('symbol')} live change: {selected_quote.get('change_pct')}%.")

    return {
        "status": "success",
        "supportive": supportive,
        "market_supportive": market_supportive,
        "sector_supportive": sector_supportive,
        "count": len(valid),
        "positive": len(positive),
        "negative": len(negative),
        "flat": flat,
        "positive_pct": positive_pct,
        "avg_change_pct": avg_change,
        "derived_count": derived_count,
        "symbol": clean_symbol or None,
        "sector": clean_sector or None,
        "sector_count": len(sector_quotes),
        "sector_positive": len(sector_positive),
        "sector_positive_pct": sector_positive_pct,
        "sector_avg_change_pct": sector_avg,
        "message": " | ".join(reasons),
        "note": "Market Breadth Engine v2 derives live percentage from LTP and previous close if the feed does not provide change_pct. Research only; no live orders.",
    }
