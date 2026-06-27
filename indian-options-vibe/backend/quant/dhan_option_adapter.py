import math
from typing import Any


def safe_float(value: Any, default: float = 0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def pick_nearest_expiry(expiry_response: dict) -> str | None:
    data = expiry_response.get("data", {})

    if isinstance(data, dict):
        inner = data.get("data", [])
        if isinstance(inner, list) and inner:
            return str(inner[0])

    if isinstance(data, list) and data:
        return str(data[0])

    return None


def extract_option_chain_data(chain_response: dict) -> dict:
    data = chain_response.get("data", {})

    if isinstance(data, dict) and "data" in data:
        data = data.get("data", {})

    underlying_price = safe_float(
        data.get("last_price")
        or data.get("underlying_price")
        or data.get("underlyingValue")
        or data.get("ltp")
    )

    oc = data.get("oc") or data.get("option_chain") or data.get("records") or {}

    rows = []

    if isinstance(oc, dict):
        for strike_key, value in oc.items():
            strike = safe_float(strike_key)

            ce = {}
            pe = {}

            if isinstance(value, dict):
                ce = value.get("ce") or value.get("CE") or {}
                pe = value.get("pe") or value.get("PE") or {}

            rows.append({
                "strike": strike,
                "ce_ltp": safe_float(ce.get("last_price") or ce.get("ltp")),
                "pe_ltp": safe_float(pe.get("last_price") or pe.get("ltp")),
                "ce_oi": safe_float(ce.get("oi") or ce.get("open_interest")),
                "pe_oi": safe_float(pe.get("oi") or pe.get("open_interest")),
                "ce_volume": safe_float(ce.get("volume")),
                "pe_volume": safe_float(pe.get("volume")),
                "ce_iv": safe_float(ce.get("implied_volatility") or ce.get("iv")),
                "pe_iv": safe_float(pe.get("implied_volatility") or pe.get("iv")),
                "ce_bid": safe_float(ce.get("top_bid_price") or ce.get("bid")),
                "ce_ask": safe_float(ce.get("top_ask_price") or ce.get("ask")),
                "pe_bid": safe_float(pe.get("top_bid_price") or pe.get("bid")),
                "pe_ask": safe_float(pe.get("top_ask_price") or pe.get("ask")),
            })

    rows = [row for row in rows if row["strike"] > 0]
    rows = sorted(rows, key=lambda row: row["strike"])

    if not underlying_price and rows:
        middle_index = len(rows) // 2
        underlying_price = rows[middle_index]["strike"]

    atm_row = None

    if rows and underlying_price:
        atm_row = min(rows, key=lambda row: abs(row["strike"] - underlying_price))

    total_ce_oi = sum(row["ce_oi"] for row in rows)
    total_pe_oi = sum(row["pe_oi"] for row in rows)
    total_ce_volume = sum(row["ce_volume"] for row in rows)
    total_pe_volume = sum(row["pe_volume"] for row in rows)

    pcr_oi = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi else 0
    pcr_volume = round(total_pe_volume / total_ce_volume, 2) if total_ce_volume else 0

    atm_ce_ltp = safe_float(atm_row.get("ce_ltp")) if atm_row else 0
    atm_pe_ltp = safe_float(atm_row.get("pe_ltp")) if atm_row else 0

    atm_straddle = round(atm_ce_ltp + atm_pe_ltp, 2)

    return {
        "underlying_price": underlying_price,
        "atm_strike": atm_row["strike"] if atm_row else None,
        "atm_ce_ltp": atm_ce_ltp,
        "atm_pe_ltp": atm_pe_ltp,
        "atm_straddle": atm_straddle,
        "pcr_oi": pcr_oi,
        "pcr_volume": pcr_volume,
        "total_ce_oi": total_ce_oi,
        "total_pe_oi": total_pe_oi,
        "total_ce_volume": total_ce_volume,
        "total_pe_volume": total_pe_volume,
        "rows_count": len(rows),
        "near_atm_rows": rows[max(0, rows.index(atm_row) - 5): rows.index(atm_row) + 6] if atm_row in rows else rows[:15],
        "auto_order_allowed": False,
        "manual_only": True,
    }


def build_option_pricing_signal(snapshot: dict) -> dict:
    pcr_oi = safe_float(snapshot.get("pcr_oi"))
    pcr_volume = safe_float(snapshot.get("pcr_volume"))
    atm_ce = safe_float(snapshot.get("atm_ce_ltp"))
    atm_pe = safe_float(snapshot.get("atm_pe_ltp"))

    reasons = []
    warnings = []

    ce_strength = 0
    pe_strength = 0

    if atm_ce > atm_pe:
        ce_strength += 20
        reasons.append("ATM CE premium is stronger than ATM PE.")
    elif atm_pe > atm_ce:
        pe_strength += 20
        reasons.append("ATM PE premium is stronger than ATM CE.")

    if pcr_oi > 1.1:
        ce_strength += 15
        reasons.append("PCR OI suggests put writing / bullish support.")
    elif pcr_oi < 0.9:
        pe_strength += 15
        reasons.append("PCR OI suggests call writing / bearish pressure.")
    else:
        warnings.append("PCR OI is neutral.")

    if pcr_volume > 1.1:
        ce_strength += 15
        reasons.append("PCR volume supports bullish option activity.")
    elif pcr_volume < 0.9:
        pe_strength += 15
        reasons.append("PCR volume supports bearish option activity.")
    else:
        warnings.append("PCR volume is neutral.")

    if ce_strength > pe_strength:
        side = "BUY_CE"
        score = min(100, 50 + ce_strength)
    elif pe_strength > ce_strength:
        side = "BUY_PE"
        score = min(100, 50 + pe_strength)
    else:
        side = "NO_SIDE"
        score = 40
        warnings.append("No clear option-pricing side.")

    decision = "CANDIDATE" if score >= 72 else "WATCH" if score >= 58 else "NO_TRADE"

    return {
        "side": side,
        "decision": decision,
        "option_pricing_score": score,
        "reasons": reasons,
        "warnings": warnings,
        "auto_order_allowed": False,
        "manual_only": True,
    }
