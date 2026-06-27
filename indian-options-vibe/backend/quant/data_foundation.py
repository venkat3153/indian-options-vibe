from dataclasses import dataclass, asdict
from typing import Literal


Decision = Literal["CANDIDATE", "WATCH", "NO_TRADE"]
Side = Literal["BUY_CE", "BUY_PE", "NO_SIDE"]


NIFTY_CORE_UNIVERSE = [
    "RELIANCE",
    "HDFCBANK",
    "ICICIBANK",
    "INFY",
    "TCS",
    "LT",
    "SBIN",
    "AXISBANK",
    "KOTAKBANK",
    "BHARTIARTL",
    "ITC",
    "HINDUNILVR",
    "BAJFINANCE",
    "MARUTI",
    "M&M",
    "TATAMOTORS",
    "SUNPHARMA",
    "ULTRACEMCO",
    "TITAN",
    "NTPC",
]


@dataclass
class MarketSnapshot:
    symbol: str
    ltp: float
    day_change_pct: float
    volume_ratio: float
    vwap_distance_pct: float
    trend_strength: float
    breadth_support: float
    retest_quality: float
    liquidity_sweep_score: float
    option_ce_momentum: float
    option_pe_momentum: float
    iv_rank: float
    spread_quality: float
    option_pricing_score: float = 0
    option_pricing_side: str = "NO_SIDE"


@dataclass
class ScannerResult:
    symbol: str
    side: Side
    decision: Decision
    edge_score: float
    setup: str
    reasons: list[str]
    warnings: list[str]
    auto_order_allowed: bool = False
    manual_only: bool = True


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def has_only_option_pricing_data(snapshot: MarketSnapshot) -> bool:
    core_market_total = (
        abs(snapshot.trend_strength)
        + abs(snapshot.breadth_support)
        + abs(snapshot.vwap_distance_pct)
        + abs(snapshot.retest_quality)
        + abs(snapshot.liquidity_sweep_score)
    )

    return (
        core_market_total <= 0
        and snapshot.option_pricing_score > 0
        and snapshot.option_pricing_side != "NO_SIDE"
    )


def score_symbol(snapshot: MarketSnapshot) -> ScannerResult:
    reasons: list[str] = []
    warnings: list[str] = []

    if has_only_option_pricing_data(snapshot):
        score = round(clamp(snapshot.option_pricing_score), 2)
        side = snapshot.option_pricing_side if snapshot.option_pricing_side in ["BUY_CE", "BUY_PE"] else "NO_SIDE"

        if score >= 72:
            decision: Decision = "CANDIDATE"
        elif score >= 58:
            decision = "WATCH"
        else:
            decision = "NO_TRADE"

        reasons = [
            "Option-pricing model is the only active data source.",
            f"Option-pricing side is {side}.",
        ]

        warnings = [
            "Stock trend, VWAP, retest, and breadth factors are missing. Treat as options-only signal.",
        ]

        return ScannerResult(
            symbol=snapshot.symbol.upper(),
            side=side,  # type: ignore[arg-type]
            decision=decision,
            edge_score=score,
            setup="Dhan Option Pricing Only",
            reasons=reasons,
            warnings=warnings,
            option_pricing_score=snapshot.option_pricing_score,
            option_pricing_side=snapshot.option_pricing_side,
        )


    bullish_score = (
        max(snapshot.trend_strength, 0) * 0.20
        + snapshot.breadth_support * 0.15
        + max(snapshot.vwap_distance_pct, 0) * 0.15
        + snapshot.retest_quality * 0.15
        + snapshot.liquidity_sweep_score * 0.10
        + snapshot.option_ce_momentum * 0.15
        + (snapshot.option_pricing_score * 0.12 if snapshot.option_pricing_side == "BUY_CE" else 0)
        + snapshot.volume_ratio * 5
        + snapshot.spread_quality * 0.05
    )

    bearish_score = (
        max(-snapshot.trend_strength, 0) * 0.20
        + snapshot.breadth_support * 0.15
        + max(-snapshot.vwap_distance_pct, 0) * 0.15
        + snapshot.retest_quality * 0.15
        + snapshot.liquidity_sweep_score * 0.10
        + snapshot.option_pe_momentum * 0.15
        + (snapshot.option_pricing_score * 0.12 if snapshot.option_pricing_side == "BUY_PE" else 0)
        + snapshot.volume_ratio * 5
        + snapshot.spread_quality * 0.05
    )

    if bullish_score > bearish_score and bullish_score >= 55:
        side: Side = "BUY_CE"
        raw_score = bullish_score
    elif bearish_score > bullish_score and bearish_score >= 55:
        side = "BUY_PE"
        raw_score = bearish_score
    else:
        side = "NO_SIDE"
        raw_score = max(bullish_score, bearish_score)

    risk_penalty = 0

    if snapshot.iv_rank > 80:
        risk_penalty += 10
        warnings.append("IV rank is high. Option may be expensive.")

    if snapshot.spread_quality < 50:
        risk_penalty += 10
        warnings.append("Spread quality is weak. Avoid illiquid option.")

    if snapshot.volume_ratio < 1:
        risk_penalty += 8
        warnings.append("Volume confirmation is weak.")

    edge_score = round(clamp(raw_score - risk_penalty), 2)

    if snapshot.retest_quality >= 65:
        reasons.append("Retest quality supports controlled entry.")

    if abs(snapshot.vwap_distance_pct) >= 0.25:
        reasons.append("VWAP displacement is meaningful.")

    if snapshot.liquidity_sweep_score >= 60:
        reasons.append("Liquidity sweep factor supports setup.")

    if side == "BUY_CE" and snapshot.option_ce_momentum >= 60:
        reasons.append("CE option momentum supports bullish side.")

    if side == "BUY_CE" and snapshot.option_pricing_side == "BUY_CE" and snapshot.option_pricing_score >= 60:
        reasons.append("Option-pricing model supports bullish side.")

    if side == "BUY_PE" and snapshot.option_pe_momentum >= 60:
        reasons.append("PE option momentum supports bearish side.")

    if side == "BUY_PE" and snapshot.option_pricing_side == "BUY_PE" and snapshot.option_pricing_score >= 60:
        reasons.append("Option-pricing model supports bearish side.")

    if snapshot.option_pricing_side not in ["NO_SIDE", side]:
        warnings.append("Option-pricing side conflicts with scanner side.")

    if side == "NO_SIDE":
        decision: Decision = "NO_TRADE"
        warnings.append("No clean CE/PE side from current data.")
    elif edge_score >= 72:
        decision = "CANDIDATE"
    elif edge_score >= 58:
        decision = "WATCH"
    else:
        decision = "NO_TRADE"

    return ScannerResult(
        symbol=snapshot.symbol.upper(),
        side=side,
        decision=decision,
        edge_score=edge_score,
        setup="Trend + VWAP + Retest + Liquidity + Option Momentum",
        reasons=reasons,
        warnings=warnings,
        option_pricing_score=snapshot.option_pricing_score,
        option_pricing_side=snapshot.option_pricing_side,
    )


def sample_market_snapshots() -> list[MarketSnapshot]:
    return [
        MarketSnapshot(
            symbol="BAJFINANCE",
            ltp=7100,
            day_change_pct=1.2,
            volume_ratio=1.8,
            vwap_distance_pct=0.45,
            trend_strength=78,
            breadth_support=70,
            retest_quality=75,
            liquidity_sweep_score=68,
            option_ce_momentum=76,
            option_pe_momentum=28,
            iv_rank=55,
            spread_quality=75,
            option_pricing_score=70,
            option_pricing_side="BUY_CE",
        ),
        MarketSnapshot(
            symbol="TATAMOTORS",
            ltp=950,
            day_change_pct=-1.1,
            volume_ratio=1.6,
            vwap_distance_pct=-0.42,
            trend_strength=-74,
            breadth_support=66,
            retest_quality=72,
            liquidity_sweep_score=64,
            option_ce_momentum=22,
            option_pe_momentum=74,
            iv_rank=58,
            spread_quality=70,
            option_pricing_score=62,
            option_pricing_side="BUY_PE",
        ),
        MarketSnapshot(
            symbol="INFY",
            ltp=1500,
            day_change_pct=0.2,
            volume_ratio=0.8,
            vwap_distance_pct=0.08,
            trend_strength=35,
            breadth_support=45,
            retest_quality=38,
            liquidity_sweep_score=30,
            option_ce_momentum=35,
            option_pe_momentum=30,
            iv_rank=50,
            spread_quality=60,
            option_pricing_score=40,
            option_pricing_side="NO_SIDE",
        ),
    ]


def run_sample_scanner() -> list[dict]:
    results = [score_symbol(snapshot) for snapshot in sample_market_snapshots()]
    results = sorted(results, key=lambda item: item.edge_score, reverse=True)
    return [asdict(item) for item in results]
