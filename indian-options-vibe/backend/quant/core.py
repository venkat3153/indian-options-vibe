from dataclasses import dataclass, asdict
from typing import Literal, Optional


Decision = Literal["CANDIDATE", "WATCH", "NO_TRADE"]
Side = Literal["BUY_CE", "BUY_PE", "NO_SIDE"]


@dataclass
class QuantInput:
    symbol: str
    trend_score: float = 0
    breadth_score: float = 0
    vwap_score: float = 0
    retest_score: float = 0
    liquidity_score: float = 0
    option_momentum_score: float = 0
    volatility_score: float = 0
    risk_penalty: float = 0


@dataclass
class QuantCandidate:
    symbol: str
    side: Side
    decision: Decision
    score: float
    setup: str
    confidence: Literal["LOW", "MEDIUM", "HIGH"]
    reasons: list[str]
    warnings: list[str]
    manual_only: bool = True
    auto_order_allowed: bool = False


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def confidence_from_score(score: float) -> Literal["LOW", "MEDIUM", "HIGH"]:
    if score >= 80:
        return "HIGH"
    if score >= 65:
        return "MEDIUM"
    return "LOW"


def side_from_scores(vwap_score: float, option_momentum_score: float, liquidity_score: float) -> Side:
    bullish = vwap_score + option_momentum_score + liquidity_score
    bearish = (-vwap_score) + (-option_momentum_score) + liquidity_score

    if bullish >= 120:
        return "BUY_CE"

    if bearish >= 120:
        return "BUY_PE"

    return "NO_SIDE"


def evaluate_quant_candidate(data: QuantInput) -> QuantCandidate:
    reasons: list[str] = []
    warnings: list[str] = []

    weighted_score = (
        data.trend_score * 0.18
        + data.breadth_score * 0.16
        + data.vwap_score * 0.18
        + data.retest_score * 0.18
        + data.liquidity_score * 0.12
        + data.option_momentum_score * 0.14
        + data.volatility_score * 0.04
        - data.risk_penalty
    )

    score = round(clamp(weighted_score), 2)
    side = side_from_scores(data.vwap_score, data.option_momentum_score, data.liquidity_score)

    if data.trend_score >= 60:
        reasons.append("Trend factor supports the setup.")
    else:
        warnings.append("Trend factor is weak.")

    if data.breadth_score >= 60:
        reasons.append("Market breadth supports the setup.")
    else:
        warnings.append("Breadth is not strongly supportive.")

    if data.vwap_score >= 60 or data.vwap_score <= -60:
        reasons.append("VWAP factor is decisive.")
    else:
        warnings.append("VWAP factor is not decisive.")

    if data.retest_score >= 60:
        reasons.append("Retest factor supports controlled entry.")
    else:
        warnings.append("Retest quality is weak.")

    if data.option_momentum_score >= 60 or data.option_momentum_score <= -60:
        reasons.append("Option momentum supports direction.")
    else:
        warnings.append("Option momentum is not strong.")

    if data.risk_penalty > 20:
        warnings.append("Risk penalty is high. Avoid forcing trade.")

    if side == "NO_SIDE":
        decision: Decision = "NO_TRADE"
        warnings.append("No clear CE/PE side from current factors.")
    elif score >= 70:
        decision = "CANDIDATE"
    elif score >= 55:
        decision = "WATCH"
    else:
        decision = "NO_TRADE"

    setup = "VWAP + Retest + Breadth + Option Momentum"

    return QuantCandidate(
        symbol=data.symbol.upper(),
        side=side,
        decision=decision,
        score=score,
        setup=setup,
        confidence=confidence_from_score(score),
        reasons=reasons,
        warnings=warnings,
    )


def sample_candidates() -> list[dict]:
    samples = [
        QuantInput(
            symbol="NIFTY",
            trend_score=72,
            breadth_score=68,
            vwap_score=75,
            retest_score=70,
            liquidity_score=62,
            option_momentum_score=74,
            volatility_score=55,
            risk_penalty=5,
        ),
        QuantInput(
            symbol="BANKNIFTY",
            trend_score=52,
            breadth_score=48,
            vwap_score=35,
            retest_score=40,
            liquidity_score=55,
            option_momentum_score=42,
            volatility_score=50,
            risk_penalty=10,
        ),
    ]

    return [asdict(evaluate_quant_candidate(item)) for item in samples]
