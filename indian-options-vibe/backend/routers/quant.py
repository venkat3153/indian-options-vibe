from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from quant.core import QuantInput, evaluate_quant_candidate, sample_candidates
from quant.data_foundation import NIFTY_CORE_UNIVERSE, run_sample_scanner
from quant.scanner_log import log_scanner_run, read_recent_scanner_runs
from quant.scanner_review import save_scanner_review, read_recent_reviews, summarize_reviews


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
