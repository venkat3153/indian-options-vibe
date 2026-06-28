from typing import Any


def safe_float(value: Any, default: float = 0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def assess_data_readiness(
    snapshot: dict[str, Any],
    model_features: dict[str, Any],
    market_session: dict[str, Any] | None = None,
) -> dict[str, Any]:
    blockers: list[str] = []
    warnings: list[str] = []

    ltp = safe_float(snapshot.get("ltp"))
    rolling_points = int(safe_float(snapshot.get("rolling_price_points")))
    option_score = safe_float(snapshot.get("option_pricing_score"))
    structure_score = safe_float(model_features.get("structure", {}).get("structure_score"))
    alignment_score = safe_float(model_features.get("alignment", {}).get("alignment_score"))

    market_open = bool(market_session.get("is_open")) if market_session else False

    if not market_open:
        blockers.append(market_session.get("reason", "Market session is not open.") if market_session else "Market session is unavailable.")

    if ltp <= 0:
        blockers.append("Live underlying price is missing.")

    if rolling_points < 3:
        blockers.append("Need at least 3 rolling live price points before model can judge structure.")

    if option_score <= 0:
        blockers.append("Option-pricing signal is missing.")

    if structure_score < 20:
        warnings.append("Structure score is weak. Trend/VWAP/retest confirmation is not enough yet.")

    if alignment_score < 50:
        warnings.append("Option and structure alignment is weak.")

    ready_for_watch = (
        ltp > 0
        and rolling_points >= 2
        and option_score > 0
    )

    ready_for_trade_candidate = (
        market_open
        and ltp > 0
        and rolling_points >= 3
        and option_score >= 65
        and structure_score >= 35
        and alignment_score >= 60
    )

    if ready_for_trade_candidate:
        status = "READY_FOR_CANDIDATE"
    elif ready_for_watch:
        status = "READY_FOR_WATCH"
    else:
        status = "NOT_READY"

    return {
        "status": status,
        "ready_for_watch": ready_for_watch,
        "ready_for_trade_candidate": ready_for_trade_candidate,
        "market_open": market_open,
        "ltp_available": ltp > 0,
        "rolling_price_points": rolling_points,
        "option_score": option_score,
        "structure_score": structure_score,
        "alignment_score": alignment_score,
        "blockers": blockers,
        "warnings": warnings,
        "auto_order_allowed": False,
        "manual_only": True,
    }
