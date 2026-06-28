from typing import Any


def safe_float(value: Any, default: float = 0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def directional_structure_side(trend_strength: float, vwap_distance_pct: float) -> str:
    if trend_strength > 0 and vwap_distance_pct > 0:
        return "BUY_CE"

    if trend_strength < 0 and vwap_distance_pct < 0:
        return "BUY_PE"

    return "NO_SIDE"


def calculate_structure_score(snapshot: dict[str, Any]) -> dict[str, Any]:
    ltp = safe_float(snapshot.get("ltp"))
    day_change_pct = safe_float(snapshot.get("day_change_pct"))
    trend_strength = safe_float(snapshot.get("trend_strength"))
    vwap_distance_pct = safe_float(snapshot.get("vwap_distance_pct"))
    breadth_support = safe_float(snapshot.get("breadth_support"))
    retest_quality = safe_float(snapshot.get("retest_quality"))
    liquidity_sweep_score = safe_float(snapshot.get("liquidity_sweep_score"))

    has_price = ltp > 0
    has_structure = (
        abs(day_change_pct) > 0
        or abs(trend_strength) > 0
        or abs(vwap_distance_pct) > 0
        or breadth_support > 0
        or retest_quality > 0
        or liquidity_sweep_score > 0
    )

    structure_side = directional_structure_side(trend_strength, vwap_distance_pct)

    raw_score = 0

    if has_price:
        raw_score += 10

    raw_score += clamp(abs(trend_strength), 0, 100) * 0.35
    raw_score += clamp(abs(vwap_distance_pct) * 20, 0, 100) * 0.20
    raw_score += clamp(breadth_support, 0, 100) * 0.15
    raw_score += clamp(retest_quality, 0, 100) * 0.20
    raw_score += clamp(liquidity_sweep_score, 0, 100) * 0.10

    return {
        "has_price": has_price,
        "has_structure": has_structure,
        "structure_side": structure_side,
        "structure_score": round(clamp(raw_score), 2),
        "structure_warning": None if has_structure else "Price structure, VWAP, breadth, and retest data are still missing.",
    }


def calculate_option_alignment(snapshot: dict[str, Any], structure: dict[str, Any]) -> dict[str, Any]:
    option_side = str(snapshot.get("option_pricing_side") or "NO_SIDE")
    option_score = safe_float(snapshot.get("option_pricing_score"))
    structure_side = str(structure.get("structure_side") or "NO_SIDE")

    option_has_signal = option_score > 0 and option_side != "NO_SIDE"
    structure_has_signal = structure_side != "NO_SIDE"

    agrees = (
        option_has_signal
        and structure_has_signal
        and option_side == structure_side
    )

    conflicts = (
        option_has_signal
        and structure_has_signal
        and option_side != structure_side
    )

    if agrees:
        alignment_score = 100
        message = "Option pricing and structure agree."
    elif conflicts:
        alignment_score = 25
        message = "Option pricing and structure conflict."
    elif option_has_signal and not structure_has_signal:
        alignment_score = 50
        message = "Option pricing has signal, but structure is missing."
    elif structure_has_signal and not option_has_signal:
        alignment_score = 45
        message = "Structure has signal, but option pricing is missing."
    else:
        alignment_score = 0
        message = "No usable option/structure alignment yet."

    return {
        "option_has_signal": option_has_signal,
        "structure_has_signal": structure_has_signal,
        "agrees": agrees,
        "conflicts": conflicts,
        "alignment_score": alignment_score,
        "alignment_message": message,
    }


def build_model_features(snapshot: dict[str, Any]) -> dict[str, Any]:
    structure = calculate_structure_score(snapshot)
    alignment = calculate_option_alignment(snapshot, structure)

    option_score = safe_float(snapshot.get("option_pricing_score"))
    structure_score = safe_float(structure.get("structure_score"))
    alignment_score = safe_float(alignment.get("alignment_score"))

    model_score = round(
        clamp(
            option_score * 0.45
            + structure_score * 0.35
            + alignment_score * 0.20
        ),
        2,
    )

    if model_score >= 78 and alignment.get("agrees"):
        model_decision = "TRADE_CANDIDATE"
    elif model_score >= 58:
        model_decision = "WATCH"
    else:
        model_decision = "NO_TRADE"

    if alignment.get("agrees"):
        model_side = snapshot.get("option_pricing_side", "NO_SIDE")
    elif option_score >= 58:
        model_side = snapshot.get("option_pricing_side", "NO_SIDE")
    else:
        model_side = structure.get("structure_side", "NO_SIDE")

    ltp = safe_float(snapshot.get("ltp"))
    option_score = safe_float(snapshot.get("option_pricing_score"))

    entry_plan = None
    stop_loss_plan = None
    target_plan = None

    if model_decision in ["WATCH", "TRADE_CANDIDATE"]:
        entry_plan = "Wait for candle confirmation. Do not chase."
        stop_loss_plan = "Use fixed predefined SL. No widening after entry."
        target_plan = "Use fixed target. No emotional early exit."

    return {
        "model_score": model_score,
        "model_decision": model_decision,
        "model_side": model_side,
        "structure": structure,
        "alignment": alignment,
        "entry_plan": entry_plan,
        "stop_loss_plan": stop_loss_plan,
        "target_plan": target_plan,
        "ltp_available": ltp > 0,
        "option_score_available": option_score > 0,
        "auto_order_allowed": False,
        "manual_only": True,
    }


def enrich_snapshot_with_features(snapshot: dict[str, Any]) -> dict[str, Any]:
    features = build_model_features(snapshot)
    enriched = dict(snapshot)

    enriched["model_score"] = features["model_score"]
    enriched["model_decision"] = features["model_decision"]
    enriched["model_side"] = features["model_side"]
    enriched["structure_score"] = features["structure"]["structure_score"]
    enriched["structure_side"] = features["structure"]["structure_side"]
    enriched["alignment_score"] = features["alignment"]["alignment_score"]
    enriched["alignment_message"] = features["alignment"]["alignment_message"]

    return enriched
