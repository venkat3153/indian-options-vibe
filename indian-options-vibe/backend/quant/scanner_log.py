import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any

LOG_DIR = Path("data")
LOG_FILE = LOG_DIR / "quant_scanner_log.jsonl"


def ensure_log_dir():
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def log_scanner_run(results: list[dict[str, Any]], source: str = "sample") -> dict:
    ensure_log_dir()

    event = {
        "created_at": datetime.utcnow().isoformat(),
        "source": source,
        "count": len(results),
        "results": results,
    }

    with LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps(event) + "\n")

    return {
        "logged": True,
        "file": str(LOG_FILE),
        "count": len(results),
    }


def read_recent_scanner_runs(limit: int = 20) -> list[dict]:
    if not LOG_FILE.exists():
        return []

    lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
    recent = lines[-limit:]

    rows = []
    for line in reversed(recent):
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    return rows
