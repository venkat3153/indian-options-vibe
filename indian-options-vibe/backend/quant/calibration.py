from collections import defaultdict
from quant.scanner_review import read_recent_reviews


def bucket_edge_score(score: float) -> str:
    if score >= 80:
        return "80+"
    if score >= 72:
        return "72-79"
    if score >= 65:
        return "65-71"
    if score >= 58:
        return "58-64"
    return "<58"


def summarize_group(rows: list[dict]) -> dict:
    total = len(rows)
    target_hit = sum(1 for row in rows if row.get("outcome") == "TARGET_HIT")
    sl_hit = sum(1 for row in rows if row.get("outcome") == "SL_HIT")
    no_move = sum(1 for row in rows if row.get("outcome") == "NO_MOVE")
    avoided = sum(1 for row in rows if row.get("outcome") == "AVOIDED")
    good_filter = sum(1 for row in rows if row.get("outcome") == "GOOD_FILTER")
    bad_filter = sum(1 for row in rows if row.get("outcome") == "BAD_FILTER")

    resolved = target_hit + sl_hit

    return {
        "total": total,
        "target_hit": target_hit,
        "sl_hit": sl_hit,
        "no_move": no_move,
        "avoided": avoided,
        "good_filter": good_filter,
        "bad_filter": bad_filter,
        "resolved": resolved,
        "win_rate": round((target_hit / resolved) * 100, 2) if resolved else 0,
    }


def build_calibration_report() -> dict:
    reviews = read_recent_reviews(limit=1000)

    by_edge_bucket = defaultdict(list)
    by_symbol = defaultdict(list)
    by_side = defaultdict(list)
    by_decision = defaultdict(list)

    for row in reviews:
        edge_score = float(row.get("edge_score") or 0)

        by_edge_bucket[bucket_edge_score(edge_score)].append(row)
        by_symbol[row.get("symbol", "UNKNOWN")].append(row)
        by_side[row.get("side", "UNKNOWN")].append(row)
        by_decision[row.get("decision", "UNKNOWN")].append(row)

    edge_summary = {
        bucket: summarize_group(rows)
        for bucket, rows in sorted(by_edge_bucket.items())
    }

    symbol_summary = {
        symbol: summarize_group(rows)
        for symbol, rows in sorted(
            by_symbol.items(),
            key=lambda item: len(item[1]),
            reverse=True,
        )
    }

    side_summary = {
        side: summarize_group(rows)
        for side, rows in sorted(by_side.items())
    }

    decision_summary = {
        decision: summarize_group(rows)
        for decision, rows in sorted(by_decision.items())
    }

    total_reviews = len(reviews)

    suggested_threshold = 72
    threshold_reason = "Default threshold remains 72 until enough reviewed samples exist."

    if total_reviews >= 30:
        strong_bucket = edge_summary.get("72-79", {})
        mid_bucket = edge_summary.get("65-71", {})

        strong_wr = strong_bucket.get("win_rate", 0)
        mid_wr = mid_bucket.get("win_rate", 0)

        if mid_bucket.get("resolved", 0) >= 10 and mid_wr >= strong_wr and mid_wr >= 55:
            suggested_threshold = 65
            threshold_reason = "65-71 bucket is performing well enough to test lower candidate threshold."
        elif strong_bucket.get("resolved", 0) >= 10 and strong_wr < 45:
            suggested_threshold = 80
            threshold_reason = "72-79 bucket is weak. Raise threshold until more evidence improves."
        else:
            suggested_threshold = 72
            threshold_reason = "72 remains reasonable based on current reviewed samples."

    return {
        "total_reviews": total_reviews,
        "minimum_reviews_for_threshold_change": 30,
        "suggested_candidate_threshold": suggested_threshold,
        "threshold_reason": threshold_reason,
        "edge_summary": edge_summary,
        "symbol_summary": symbol_summary,
        "side_summary": side_summary,
        "decision_summary": decision_summary,
        "automation_allowed": False,
        "message": "Calibration report is for research only. Do not automate until sample size and live-test rules are proven.",
    }
