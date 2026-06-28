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

    trade_plan = build_trade_plan(snapshot, model_decision, model_side)

    return {
        "model_score": model_score,
        "model_decision": model_decision,
        "model_side": model_side,
        "structure": structure,
        "alignment": alignment,
        "trade_plan": trade_plan,
        "entry_plan": trade_plan.get("entry_zone"),
        "stop_loss_plan": trade_plan.get("stop_loss"),
        "target_plan": trade_plan.get("target_1"),
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
    enriched["trade_plan"] = features.get("trade_plan")
    enriched["entry_zone"] = features.get("trade_plan", {}).get("entry_zone")
    enriched["stop_loss"] = features.get("trade_plan", {}).get("stop_loss")
    enriched["target_1"] = features.get("trade_plan", {}).get("target_1")
    enriched["target_2"] = features.get("trade_plan", {}).get("target_2")
    enriched["risk_reward_1"] = features.get("trade_plan", {}).get("risk_reward_1")
    enriched["risk_reward_2"] = features.get("trade_plan", {}).get("risk_reward_2")

    return enriched



def build_trade_plan(snapshot: dict[str, Any], model_decision: str, model_side: str) -> dict[str, Any]:
    ltp = safe_float(snapshot.get("ltp"))
    option_score = safe_float(snapshot.get("option_pricing_score"))
    structure_score = safe_float(snapshot.get("structure_score"))
    alignment_score = safe_float(snapshot.get("alignment_score"))

    if model_decision not in ["WATCH", "TRADE_CANDIDATE"] or model_side == "NO_SIDE":
        return {
            "has_trade_plan": False,
            "entry_zone": None,
            "stop_loss": None,
            "target_1": None,
            "target_2": None,
            "risk_reward_1": None,
            "risk_reward_2": None,
            "position_size": "NO_TRADE",
            "execution_mode": "NO_ORDER",
            "trade_plan_note": "No trade plan because model does not have enough confirmation.",
        }

    if ltp <= 0:
        return {
            "has_trade_plan": False,
            "entry_zone": None,
            "stop_loss": None,
            "target_1": None,
            "target_2": None,
            "risk_reward_1": None,
            "risk_reward_2": None,
            "position_size": "WAIT",
            "execution_mode": "MANUAL_ONLY",
            "trade_plan_note": "Option signal exists, but live underlying price is missing. Wait for price/VWAP structure data.",
        }

    # First v2 rule:
    # For index options, we use underlying-based planning first.
    # Later we will convert this to exact option premium SL/TGT from selected strike.
    if model_side == "BUY_CE":
        entry_low = round(ltp * 0.9995, 2)
        entry_high = round(ltp * 1.0005, 2)
        stop_loss = round(ltp * 0.9975, 2)
        target_1 = round(ltp * 1.0035, 2)
        target_2 = round(ltp * 1.0055, 2)
    elif model_side == "BUY_PE":
        entry_low = round(ltp * 0.9995, 2)
        entry_high = round(ltp * 1.0005, 2)
        stop_loss = round(ltp * 1.0025, 2)
        target_1 = round(ltp * 0.9965, 2)
        target_2 = round(ltp * 0.9945, 2)
    else:
        return {
            "has_trade_plan": False,
            "entry_zone": None,
            "stop_loss": None,
            "target_1": None,
            "target_2": None,
            "risk_reward_1": None,
            "risk_reward_2": None,
            "position_size": "NO_TRADE",
            "execution_mode": "NO_ORDER",
            "trade_plan_note": "No clean CE/PE direction.",
        }

    risk = abs(ltp - stop_loss)
    reward_1 = abs(target_1 - ltp)
    reward_2 = abs(target_2 - ltp)

    rr1 = round(reward_1 / risk, 2) if risk else None
    rr2 = round(reward_2 / risk, 2) if risk else None

    if model_decision == "TRADE_CANDIDATE":
        note = "Trade candidate exists. Execute manually only after checking Groww/Dhan and fixed SL/TGT."
    else:
        note = "Watch only. Do not execute until structure, option pricing, and model score improve."

    return {
        "has_trade_plan": True,
        "entry_zone": f"{entry_low} - {entry_high}",
        "stop_loss": stop_loss,
        "target_1": target_1,
        "target_2": target_2,
        "risk_reward_1": rr1,
        "risk_reward_2": rr2,
        "position_size": "1 quantity / 1 lot only",
        "execution_mode": "MANUAL_GROWW_ONLY",
        "trade_plan_note": note,
        "quality_inputs": {
            "option_score": option_score,
            "structure_score": structure_score,
            "alignment_score": alignment_score,
        },
    }
