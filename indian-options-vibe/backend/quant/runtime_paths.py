from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
RUNTIME_DATA_DIR = BACKEND_DIR / "data"


def runtime_data_path(filename: str) -> Path:
    return RUNTIME_DATA_DIR / filename
