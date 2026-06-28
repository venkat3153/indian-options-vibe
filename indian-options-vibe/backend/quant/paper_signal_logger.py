import json
from datetime import datetime
from pathlib import Path
from typing import Any


SIGNALS_PATH = Path("backend/data/paper_signals.jsonl")


def ensure_parent() -> None:
    SIGNALS_PATH.parent.mkdir(parents=True, exist_ok=True)


def safe_get(data: dict[str, Any], path: list[str], default: Any = None) -> Any:
    current: Any = data

    for key in path:
        if not isinstance(current, dict):
            return default
        current = current.get(key)

    return current if current is not None else default


def log_paper_signal(
    snapshot: dict[str, Any],
    result: dict[str, Any],
    model_features: dict[str, Any],
    market_session: dict[str, Any] | None = None,
    data_readiness: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_parent()

    trade_plan = model_features.get("trade_plan", {}) if isinstance(model_features, dict) else {}

    row = {
        "logged_at_utc": datetime.utcnow().isoformat(),
        "symbol": result.get("symbol") or snapshot.get("symbol"),
        "side": result.get("side") or model_features.get("model_side"),
        "decision": result.get("decision"),
        "edge_score": result.get("edge_score"),
        "model_score": model_features.get("model_score"),
        "model_decision": model_features.get("model_decision"),
        "model_side": model_features.get("model_side"),
        "setup": result.get("setup"),
        "ltp": snapshot.get("ltp"),
        "day_change_pct": snapshot.get("day_change_pct"),
        "trend_strength": snapshot.get("trend_strength"),
        "vwap_distance_pct": snapshot.get("vwap_distance_pct"),
        "structure_score": safe_get(model_features, ["structure", "structure_score"], snapshot.get("structure_score")),
        "structure_side": safe_get(model_features, ["structure", "structure_side"], snapshot.get("structure_side")),
        "alignment_score": safe_get(model_features, ["alignment", "alignment_score"], snapshot.get("alignment_score")),
        "alignment_message": safe_get(model_features, ["alignment", "alignment_message"], snapshot.get("alignment_message")),
        "option_pricing_score": snapshot.get("option_pricing_score"),
        "option_pricing_side": snapshot.get("option_pricing_side"),
        "rolling_price_points": snapshot.get("rolling_price_points"),
        "market_is_open": bool(market_session.get("is_open")) if market_session else False,
        "market_reason": market_session.get("reason") if market_session else None,
        "data_readiness_status": data_readiness.get("status") if data_readiness else None,
        "ready_for_watch": data_readiness.get("ready_for_watch") if data_readiness else None,
        "ready_for_trade_candidate": data_readiness.get("ready_for_trade_candidate") if data_readiness else None,
        "readiness_blockers": data_readiness.get("blockers", []) if data_readiness else [],
        "readiness_warnings": data_readiness.get("warnings", []) if data_readiness else [],
        "entry_zone": trade_plan.get("entry_zone"),
        "stop_loss": trade_plan.get("stop_loss"),
        "target_1": trade_plan.get("target_1"),
        "target_2": trade_plan.get("target_2"),
        "risk_reward_1": trade_plan.get("risk_reward_1"),
        "risk_reward_2": trade_plan.get("risk_reward_2"),
        "paper_status": "OPEN_WATCH" if result.get("decision") == "WATCH" else "OPEN_CANDIDATE" if result.get("decision") == "CANDIDATE" else "NO_TRADE_LOG",
        "paper_outcome": None,
        "auto_order_allowed": False,
        "manual_only": True,
    }

    with SIGNALS_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(row) + "\n")

    return {
        "status": "success",
        "message": "Paper signal logged.",
        "row": row,
        "path": str(SIGNALS_PATH),
    }


def read_paper_signals(limit: int = 100) -> list[dict[str, Any]]:
    ensure_parent()

    if not SIGNALS_PATH.exists():
        return []

    lines = SIGNALS_PATH.read_text(encoding="utf-8").splitlines()
    rows: list[dict[str, Any]] = []

    for line in lines[-limit:]:
        try:
            rows.append(json.loads(line))
        except Exception:
            continue

    return rows


def latest_paper_signal() -> dict[str, Any] | None:
    rows = read_paper_signals(limit=1)
    return rows[-1] if rows else None


def paper_signal_summary() -> dict[str, Any]:
    rows = read_paper_signals(limit=1000)

    total = len(rows)
    watch = sum(1 for row in rows if row.get("decision") == "WATCH")
    candidate = sum(1 for row in rows if row.get("decision") == "CANDIDATE")
    no_trade = sum(1 for row in rows if row.get("decision") == "NO_TRADE")
    ready_candidate = sum(1 for row in rows if row.get("ready_for_trade_candidate") is True)
    market_open = sum(1 for row in rows if row.get("market_is_open") is True)

    latest = rows[-1] if rows else None

    outcome_counts: dict[str, int] = {}
    for row in rows:
        outcome = row.get("paper_outcome") or "UNMARKED"
        outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1

    target_hit = outcome_counts.get("TARGET_HIT", 0)
    sl_hit = outcome_counts.get("SL_HIT", 0)
    no_move = outcome_counts.get("NO_MOVE", 0)
    avoided = outcome_counts.get("AVOIDED", 0)
    good_filter = outcome_counts.get("GOOD_FILTER", 0)
    bad_signal = outcome_counts.get("BAD_SIGNAL", 0)
    manual_skip = outcome_counts.get("MANUAL_SKIP", 0)
    unmarked = outcome_counts.get("UNMARKED", 0)

    resolved_trade_tests = target_hit + sl_hit + no_move
    research_win_rate = round((target_hit / resolved_trade_tests) * 100, 2) if resolved_trade_tests else None

    protection_count = avoided + good_filter
    failure_count = sl_hit + bad_signal
    protection_ratio = round((protection_count / (protection_count + failure_count)) * 100, 2) if (protection_count + failure_count) else None

    return {
        "status": "success",
        "total_signals_logged": total,
        "outcome_counts": outcome_counts,
        "watch_count": watch,
        "candidate_count": candidate,
        "no_trade_count": no_trade,
        "ready_candidate_count": ready_candidate,
        "market_open_count": market_open,
        "target_hit_count": target_hit,
        "sl_hit_count": sl_hit,
        "no_move_count": no_move,
        "avoided_count": avoided,
        "good_filter_count": good_filter,
        "bad_signal_count": bad_signal,
        "manual_skip_count": manual_skip,
        "unmarked_count": unmarked,
        "resolved_trade_tests": resolved_trade_tests,
        "research_win_rate": research_win_rate,
        "protection_ratio": protection_ratio,
        "latest": latest,
        "auto_order_allowed": False,
        "manual_only": True,
    }


def reset_paper_signals() -> dict[str, Any]:
    ensure_parent()
    SIGNALS_PATH.write_text("", encoding="utf-8")

    return {
        "status": "success",
        "message": "Paper signal log reset.",
        "auto_order_allowed": False,
        "manual_only": True,
    }



def update_latest_paper_outcome(
    outcome: str,
    notes: str | None = None,
) -> dict[str, Any]:
    ensure_parent()

    allowed = {
        "TARGET_HIT",
        "SL_HIT",
        "NO_MOVE",
        "AVOIDED",
        "BAD_SIGNAL",
        "GOOD_FILTER",
        "MANUAL_SKIP",
    }

    if outcome not in allowed:
        return {
            "status": "failed",
            "error": f"Invalid outcome. Allowed: {sorted(allowed)}",
            "auto_order_allowed": False,
            "manual_only": True,
        }

    if not SIGNALS_PATH.exists():
        return {
            "status": "failed",
            "error": "No paper signals file found.",
            "auto_order_allowed": False,
            "manual_only": True,
        }

    rows = read_paper_signals(limit=100000)

    if not rows:
        return {
            "status": "failed",
            "error": "No paper signals found.",
            "auto_order_allowed": False,
            "manual_only": True,
        }

    latest = rows[-1]
    latest["paper_outcome"] = outcome
    latest["outcome_notes"] = notes
    latest["outcome_marked_at_utc"] = datetime.utcnow().isoformat()

    SIGNALS_PATH.write_text(
        "\n".join(json.dumps(row) for row in rows) + "\n",
        encoding="utf-8",
    )

    return {
        "status": "success",
        "message": "Latest paper signal outcome updated.",
        "latest": latest,
        "auto_order_allowed": False,
        "manual_only": True,
    }
