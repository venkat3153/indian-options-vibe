import json
from datetime import datetime
from pathlib import Path
from typing import Any

DATA_DIR = Path("data")
SNAPSHOT_FILE = DATA_DIR / "quant_market_snapshots.json"


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_market_snapshots(snapshots: list[dict[str, Any]], source: str = "manual") -> dict:
    ensure_data_dir()

    payload = {
        "created_at": datetime.utcnow().isoformat(),
        "source": source,
        "count": len(snapshots),
        "snapshots": snapshots,
    }

    SNAPSHOT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    return {
        "saved": True,
        "file": str(SNAPSHOT_FILE),
        "count": len(snapshots),
        "source": source,
    }


def load_latest_market_snapshots() -> dict:
    if not SNAPSHOT_FILE.exists():
        return {
            "created_at": None,
            "source": "empty",
            "count": 0,
            "snapshots": [],
        }

    try:
        return json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {
            "created_at": None,
            "source": "corrupt",
            "count": 0,
            "snapshots": [],
        }
