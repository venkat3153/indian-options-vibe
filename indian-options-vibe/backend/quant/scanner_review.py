import json
from datetime import datetime
from pathlib import Path
from typing import Literal

REVIEW_DIR = Path("data")
REVIEW_FILE = REVIEW_DIR / "quant_scanner_reviews.jsonl"

Outcome = Literal[
    "TARGET_HIT",
    "SL_HIT",
    "NO_MOVE",
    "AVOIDED",
    "GOOD_FILTER",
    "BAD_FILTER",
]


def ensure_review_dir():
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)


def save_scanner_review(
    symbol: str,
    side: str,
    edge_score: float,
    decision: str,
    outcome: Outcome,
    notes: str = "",
) -> dict:
    ensure_review_dir()

    review = {
        "created_at": datetime.utcnow().isoformat(),
        "symbol": symbol.upper(),
        "side": side,
        "edge_score": edge_score,
        "decision": decision,
        "outcome": outcome,
        "notes": notes,
    }

    with REVIEW_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps(review) + "\n")

    return {
        "saved": True,
        "file": str(REVIEW_FILE),
        "review": review,
    }


def read_recent_reviews(limit: int = 50) -> list[dict]:
    if not REVIEW_FILE.exists():
        return []

    lines = REVIEW_FILE.read_text(encoding="utf-8").splitlines()
    recent = lines[-limit:]

    rows = []

    for line in reversed(recent):
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    return rows


def summarize_reviews() -> dict:
    reviews = read_recent_reviews(limit=500)

    total = len(reviews)
    target_hit = sum(1 for item in reviews if item.get("outcome") == "TARGET_HIT")
    sl_hit = sum(1 for item in reviews if item.get("outcome") == "SL_HIT")
    no_move = sum(1 for item in reviews if item.get("outcome") == "NO_MOVE")
    avoided = sum(1 for item in reviews if item.get("outcome") == "AVOIDED")
    bad_filter = sum(1 for item in reviews if item.get("outcome") == "BAD_FILTER")
    good_filter = sum(1 for item in reviews if item.get("outcome") == "GOOD_FILTER")

    resolved = target_hit + sl_hit

    return {
        "total_reviews": total,
        "target_hit": target_hit,
        "sl_hit": sl_hit,
        "no_move": no_move,
        "avoided": avoided,
        "good_filter": good_filter,
        "bad_filter": bad_filter,
        "resolved_trades": resolved,
        "simple_win_rate": round((target_hit / resolved) * 100, 2) if resolved else 0,
        "message": "Early research stats only. Not enough for automation until sample size is large.",
    }
