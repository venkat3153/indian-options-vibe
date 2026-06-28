from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from quant.core import QuantInput, evaluate_quant_candidate, sample_candidates
from quant.data_foundation import NIFTY_CORE_UNIVERSE, MarketSnapshot, score_symbol, run_sample_scanner
from quant.scanner_log import log_scanner_run, read_recent_scanner_runs
from quant.snapshot_store import save_market_snapshots, load_latest_market_snapshots
from quant.scanner_review import save_scanner_review, read_recent_reviews, summarize_reviews
from quant.calibration import build_calibration_report
from quant.live_engine import start_live_engine, stop_live_engine, get_live_state, get_live_latest, run_once


router = APIRouter(prefix="/api/quant", tags=["quant"])


class QuantEvaluateRequest(BaseModel):
    symbol: str
    trend_score: float = 0
    breadth_score: float = 0
    vwap_score: float = 0
    retest_score: float = 0
    liquidity_score: float = 0
    option_momentum_score: float = 0
    volatility_score: float = 0
    risk_penalty: float = 0


class ScannerReviewRequest(BaseModel):
    symbol: str
    side: str
    edge_score: float
    decision: str
    outcome: str
    notes: str = ""


class MarketSnapshotPayload(BaseModel):
    symbol: str
    ltp: float = 0
    day_change_pct: float = 0
    volume_ratio: float = 0
    vwap_distance_pct: float = 0
    trend_strength: float = 0
    breadth_support: float = 0
    retest_quality: float = 0
    liquidity_sweep_score: float = 0
    option_ce_momentum: float = 0
    option_pe_momentum: float = 0
    iv_rank: float = 0
    spread_quality: float = 0


class MarketSnapshotBatchRequest(BaseModel):
    source: str = "manual"
    snapshots: list[MarketSnapshotPayload]


@router.get("/status")
def quant_status():
    return {
        "connected": True,
        "mode": "READ_ONLY_SIGNAL_ENGINE",
        "auto_order_allowed": False,
        "message": "Quant Engine Core v1 is active. It creates candidates only, not orders.",
    }


@router.get("/candidates")
def quant_candidates():
    return {
        "auto_order_allowed": False,
        "manual_only": True,
        "candidates": sample_candidates(),
    }


@router.post("/evaluate")
def quant_evaluate(payload: QuantEvaluateRequest):
    result = evaluate_quant_candidate(
        QuantInput(
            symbol=payload.symbol,
            trend_score=payload.trend_score,
            breadth_score=payload.breadth_score,
            vwap_score=payload.vwap_score,
            retest_score=payload.retest_score,
            liquidity_score=payload.liquidity_score,
            option_momentum_score=payload.option_momentum_score,
            volatility_score=payload.volatility_score,
            risk_penalty=payload.risk_penalty,
        )
    )

    return {
        "auto_order_allowed": False,
        "manual_only": True,
        "candidate": result,
    }


@router.get("/universe")
def quant_universe():
    return {
        "universe": NIFTY_CORE_UNIVERSE,
        "count": len(NIFTY_CORE_UNIVERSE),
        "message": "Core NIFTY universe for scanner v1.",
    }


@router.get("/scanner/sample")
def quant_scanner_sample():
    scanner = run_sample_scanner()
    log_status = log_scanner_run(scanner, source="sample")

    return {
        "auto_order_allowed": False,
        "manual_only": True,
        "log_status": log_status,
        "scanner": scanner,
    }


@router.get("/scanner/logs")
def quant_scanner_logs():
    return {
        "runs": read_recent_scanner_runs(limit=20),
        "message": "Recent scanner runs for quant research and later backtesting.",
    }


@router.post("/scanner/review")
def quant_scanner_review(payload: ScannerReviewRequest):
    return save_scanner_review(
        symbol=payload.symbol,
        side=payload.side,
        edge_score=payload.edge_score,
        decision=payload.decision,
        outcome=payload.outcome,
        notes=payload.notes,
    )


@router.get("/scanner/reviews")
def quant_scanner_reviews():
    return {
        "reviews": read_recent_reviews(limit=50),
        "summary": summarize_reviews(),
    }


@router.get("/scanner/calibration")
def quant_scanner_calibration():
    return build_calibration_report()


@router.post("/snapshots")
def quant_save_snapshots(payload: MarketSnapshotBatchRequest):
    rows = [item.model_dump() for item in payload.snapshots]
    return save_market_snapshots(rows, source=payload.source)


@router.get("/snapshots/latest")
def quant_latest_snapshots():
    return load_latest_market_snapshots()


@router.get("/scanner/latest")
def quant_scanner_latest():
    latest = load_latest_market_snapshots()
    snapshots = latest.get("snapshots", [])

    scanner = []

    for row in snapshots:
        try:
            item = MarketSnapshot(**row)
            scanner.append(score_symbol(item))
        except Exception as error:
            scanner.append({
                "symbol": row.get("symbol", "UNKNOWN"),
                "decision": "NO_TRADE",
                "side": "NO_SIDE",
                "edge_score": 0,
                "setup": "Invalid snapshot",
                "reasons": [],
                "warnings": [str(error)],
                "auto_order_allowed": False,
                "manual_only": True,
            })

    scanner = sorted(
        scanner,
        key=lambda item: item.edge_score if hasattr(item, "edge_score") else item.get("edge_score", 0),
        reverse=True,
    )

    scanner_dicts = [
        item.__dict__ if hasattr(item, "__dict__") else item
        for item in scanner
    ]

    log_status = log_scanner_run(scanner_dicts, source=latest.get("source", "latest"))

    return {
        "auto_order_allowed": False,
        "manual_only": True,
        "snapshot_source": latest.get("source"),
        "snapshot_created_at": latest.get("created_at"),
        "log_status": log_status,
        "scanner": scanner_dicts,
    }



@router.post("/live/start")
def quant_live_start():
    return start_live_engine(interval_seconds=60)


@router.post("/live/stop")
def quant_live_stop():
    return stop_live_engine()


@router.get("/live/status")
def quant_live_status():
    return {
        "status": "success",
        "state": get_live_state(),
        "auto_order_allowed": False,
        "manual_only": True,
    }


@router.get("/live/latest")
def quant_live_latest():
    return get_live_latest()


@router.post("/live/run-once")
def quant_live_run_once():
    return {
        "status": "success",
        "data": run_once(),
        "auto_order_allowed": False,
        "manual_only": True,
    }
