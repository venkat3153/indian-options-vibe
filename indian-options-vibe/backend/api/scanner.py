from fastapi import APIRouter, HTTPException

router = APIRouter()

SCREENER_ROWS = [
    {"symbol": "NIFTY", "market": "NSE", "segment": "Index Options", "spot": "23,520", "bias": "Bullish", "score": 84, "setup": "ATM CE pullback above VWAP", "signal": "OI buildup + volume expansion", "risk": "Medium", "action": "Paper CE setup"},
    {"symbol": "SENSEX", "market": "BSE", "segment": "Index Options", "spot": "77,850", "bias": "Neutral", "score": 62, "setup": "Wait near VWAP", "signal": "Mixed OI, no clean direction", "risk": "High", "action": "Wait"},
    {"symbol": "BANKNIFTY", "market": "NSE", "segment": "Index Options", "spot": "51,420", "bias": "Bearish", "score": 78, "setup": "ATM PE breakout below VWAP", "signal": "Put OI + price breakdown", "risk": "Medium", "action": "Paper PE setup"},
    {"symbol": "FINNIFTY", "market": "NSE", "segment": "Index Options", "spot": "23,870", "bias": "Bullish", "score": 69, "setup": "CE watch above day high", "signal": "Sector support from private banks", "risk": "Medium", "action": "Watchlist"},
    {"symbol": "RELIANCE", "market": "NSE", "segment": "Stock Options", "spot": "2,925", "bias": "Bullish", "score": 72, "setup": "Stock CE watch", "signal": "VWAP reclaim + call volume", "risk": "Medium", "action": "Paper only"},
    {"symbol": "HDFCBANK", "market": "NSE", "segment": "Stock Options", "spot": "1,670", "bias": "Weak", "score": 43, "setup": "Avoid until reclaim", "signal": "Below VWAP, low follow-through", "risk": "High", "action": "Avoid"},
    {"symbol": "ICICIBANK", "market": "NSE", "segment": "Stock Options", "spot": "1,115", "bias": "Bullish", "score": 76, "setup": "CE momentum continuation", "signal": "Relative strength + volume", "risk": "Medium", "action": "Paper CE setup"},
    {"symbol": "TCS", "market": "NSE", "segment": "Intraday Stocks", "spot": "3,890", "bias": "Neutral", "score": 58, "setup": "Range breakout watch", "signal": "Low volatility compression", "risk": "Medium", "action": "Wait"},
    {"symbol": "SBIN", "market": "NSE", "segment": "Intraday Stocks", "spot": "845", "bias": "Bearish", "score": 71, "setup": "PDL breakdown short watch", "signal": "Below VWAP + selling volume", "risk": "Medium", "action": "Paper stock setup"},
]

DETAILS = {
    "NIFTY": {"symbol": "NIFTY", "market": "NSE", "segment": "Index Options", "spot": "23,520", "bias": "Bullish", "score": 84, "setup": "ATM CE pullback above VWAP", "tradePlan": "Wait for price to hold above VWAP. Enter paper CE only after bullish 5-minute close with volume confirmation.", "bestCe": "23500 CE", "bestPe": "23500 PE", "entry": "Above 23,560 spot confirmation", "stopLoss": "Below VWAP or -20% option premium", "target": "+40% option premium or trail above 1:2 RR", "risk": "Medium"},
    "SENSEX": {"symbol": "SENSEX", "market": "BSE", "segment": "Index Options", "spot": "77,850", "bias": "Neutral", "score": 62, "setup": "Wait near VWAP", "tradePlan": "No fresh option buy while price is trapped near VWAP. Paper trade only after clean break and retest.", "bestCe": "77800 CE", "bestPe": "77800 PE", "entry": "Above range high or below range low", "stopLoss": "Inside range re-entry", "target": "Next strike zone or 1:2 RR", "risk": "High"},
    "BANKNIFTY": {"symbol": "BANKNIFTY", "market": "NSE", "segment": "Index Options", "spot": "51,420", "bias": "Bearish", "score": 78, "setup": "ATM PE breakout below VWAP", "tradePlan": "Paper PE buy only if price stays below VWAP and breakdown candle has strong volume.", "bestCe": "51400 CE", "bestPe": "51400 PE", "entry": "Below 51,350 spot confirmation", "stopLoss": "Above VWAP or -20% option premium", "target": "+40% option premium or trail after 1:2 RR", "risk": "Medium"},
    "FINNIFTY": {"symbol": "FINNIFTY", "market": "NSE", "segment": "Index Options", "spot": "23,870", "bias": "Bullish", "score": 69, "setup": "CE watch above day high", "tradePlan": "Wait for day-high breakout. Avoid chasing if spread widens.", "bestCe": "23900 CE", "bestPe": "23900 PE", "entry": "Above day high retest", "stopLoss": "Below breakout candle low", "target": "1:2 RR", "risk": "Medium"},
    "RELIANCE": {"symbol": "RELIANCE", "market": "NSE", "segment": "Stock Options", "spot": "2,925", "bias": "Bullish", "score": 72, "setup": "Stock CE watch", "tradePlan": "Watch ATM CE after stock price reclaims VWAP with volume. Avoid if option spread is wide.", "bestCe": "2920 CE", "bestPe": "2920 PE", "entry": "Above VWAP reclaim", "stopLoss": "Below VWAP", "target": "1:2 RR", "risk": "Medium"},
    "HDFCBANK": {"symbol": "HDFCBANK", "market": "NSE", "segment": "Stock Options", "spot": "1,670", "bias": "Weak", "score": 43, "setup": "Avoid until reclaim", "tradePlan": "No trade. Add to watchlist only if stock reclaims VWAP and sector improves.", "bestCe": "1670 CE", "bestPe": "1670 PE", "entry": "No entry yet", "stopLoss": "N/A", "target": "N/A", "risk": "High"},
    "ICICIBANK": {"symbol": "ICICIBANK", "market": "NSE", "segment": "Stock Options", "spot": "1,115", "bias": "Bullish", "score": 76, "setup": "CE momentum continuation", "tradePlan": "Paper CE buy on pullback to VWAP if relative strength remains strong.", "bestCe": "1120 CE", "bestPe": "1120 PE", "entry": "VWAP pullback hold", "stopLoss": "Below VWAP", "target": "1:2 RR", "risk": "Medium"},
    "TCS": {"symbol": "TCS", "market": "NSE", "segment": "Intraday Stocks", "spot": "3,890", "bias": "Neutral", "score": 58, "setup": "Range breakout watch", "tradePlan": "Cash stock paper setup only. Wait for range breakout with volume.", "bestCe": "N/A", "bestPe": "N/A", "entry": "Above range high", "stopLoss": "Inside range", "target": "1:2 RR", "risk": "Medium"},
    "SBIN": {"symbol": "SBIN", "market": "NSE", "segment": "Intraday Stocks", "spot": "845", "bias": "Bearish", "score": 71, "setup": "PDL breakdown short watch", "tradePlan": "Cash stock paper short setup if price breaks previous day low and stays below VWAP.", "bestCe": "N/A", "bestPe": "N/A", "entry": "Below previous day low", "stopLoss": "Back above VWAP", "target": "1:2 RR", "risk": "Medium"},
}

OPTION_CHAIN = [
    {"strike": "ATM - 200", "ceLtp": "252.40", "ceVolume": "18.2L", "ceOi": "42.1L", "ceOiChange": "+8.2%", "ceIv": "13.4", "peLtp": "54.80", "peVolume": "9.1L", "peOi": "31.8L", "peOiChange": "-3.1%", "peIv": "14.0", "signal": "ITM CE strength"},
    {"strike": "ATM - 100", "ceLtp": "185.20", "ceVolume": "24.7L", "ceOi": "51.4L", "ceOiChange": "+12.0%", "ceIv": "13.8", "peLtp": "96.40", "peVolume": "14.8L", "peOi": "38.2L", "peOiChange": "-4.0%", "peIv": "14.1", "signal": "Call buildup"},
    {"strike": "ATM", "ceLtp": "124.50", "ceVolume": "31.6L", "ceOi": "68.7L", "ceOiChange": "+18.0%", "ceIv": "14.2", "peLtp": "121.80", "peVolume": "28.4L", "peOi": "62.5L", "peOiChange": "+7.0%", "peIv": "14.5", "signal": "Best liquid strike"},
    {"strike": "ATM + 100", "ceLtp": "82.10", "ceVolume": "21.3L", "ceOi": "44.9L", "ceOiChange": "+9.0%", "ceIv": "14.7", "peLtp": "178.30", "peVolume": "18.2L", "peOi": "53.6L", "peOiChange": "+15.0%", "peIv": "15.0", "signal": "Put hedge zone"},
    {"strike": "ATM + 200", "ceLtp": "48.70", "ceVolume": "13.9L", "ceOi": "35.2L", "ceOiChange": "+5.4%", "ceIv": "15.1", "peLtp": "248.90", "peVolume": "10.4L", "peOi": "40.3L", "peOiChange": "+9.8%", "peIv": "15.4", "signal": "OTM lottery avoid"},
]

@router.get("/market")
def market_screener() -> dict:
    return {"mode": "mock", "rows": SCREENER_ROWS}

@router.get("/symbol/{symbol}")
def symbol_detail(symbol: str) -> dict:
    key = symbol.upper()
    if key not in DETAILS:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    return {"mode": "mock", "detail": DETAILS[key], "optionChain": OPTION_CHAIN}
