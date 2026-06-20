from typing import Any

from db.supabase_runs import get_supabase_client

SYMBOLS_TABLE = "symbols"
DAILY_CANDLES_TABLE = "daily_candles"


NIFTY_50_SYMBOLS: list[dict[str, Any]] = [
    {"symbol": "RELIANCE", "name": "Reliance Industries", "sector": "Energy", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "INFY", "name": "Infosys", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "sector": "Telecom", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "LT", "name": "Larsen & Toubro", "sector": "Capital Goods", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ITC", "name": "ITC", "sector": "FMCG", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "AXISBANK", "name": "Axis Bank", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "sector": "FMCG", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance", "sector": "Financial Services", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical", "sector": "Pharma", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HCLTECH", "name": "HCL Technologies", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement", "sector": "Cement", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "NTPC", "name": "NTPC", "sector": "Power", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TITAN", "name": "Titan Company", "sector": "Consumer Durables", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ONGC", "name": "Oil and Natural Gas Corporation", "sector": "Energy", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation", "sector": "Power", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "M&M", "name": "Mahindra & Mahindra", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises", "sector": "Metals & Mining", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports", "sector": "Services", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "COALINDIA", "name": "Coal India", "sector": "Metals & Mining", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel", "sector": "Metals", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TATASTEEL", "name": "Tata Steel", "sector": "Metals", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries", "sector": "Metals", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv", "sector": "Financial Services", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints", "sector": "Consumer Durables", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "NESTLEIND", "name": "Nestle India", "sector": "FMCG", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "WIPRO", "name": "Wipro", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TECHM", "name": "Tech Mahindra", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "GRASIM", "name": "Grasim Industries", "sector": "Cement", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "CIPLA", "name": "Cipla", "sector": "Pharma", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "DRREDDY", "name": "Dr. Reddy's Laboratories", "sector": "Pharma", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "DIVISLAB", "name": "Divi's Laboratories", "sector": "Pharma", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "EICHERMOT", "name": "Eicher Motors", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto", "sector": "Automobile", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals", "sector": "Healthcare", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BRITANNIA", "name": "Britannia Industries", "sector": "FMCG", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "SBILIFE", "name": "SBI Life Insurance", "sector": "Insurance", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance", "sector": "Insurance", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "INDUSINDBK", "name": "IndusInd Bank", "sector": "Banking", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "SHRIRAMFIN", "name": "Shriram Finance", "sector": "Financial Services", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "BPCL", "name": "Bharat Petroleum", "sector": "Energy", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "TATACONSUM", "name": "Tata Consumer Products", "sector": "FMCG", "exchange": "NSE", "universe": "NIFTY50"},
    {"symbol": "LTIM", "name": "LTIMindtree", "sector": "IT", "exchange": "NSE", "universe": "NIFTY50"},
]


def is_market_data_storage_enabled() -> bool:
    return get_supabase_client() is not None


def seed_symbols_to_supabase() -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(SYMBOLS_TABLE).upsert(NIFTY_50_SYMBOLS, on_conflict="symbol").execute()
    return response.data or NIFTY_50_SYMBOLS


def list_symbols_from_supabase() -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    response = client.table(SYMBOLS_TABLE).select("*").order("symbol").execute()
    return response.data or []


def save_daily_candles_to_supabase(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")
    if not rows:
        return []

    response = client.table(DAILY_CANDLES_TABLE).upsert(rows, on_conflict="symbol,candle_date").execute()
    return response.data or rows


def list_daily_candles_from_supabase(symbol: str | None = None, limit: int = 250) -> list[dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase is not configured")

    query = client.table(DAILY_CANDLES_TABLE).select("*")
    if symbol:
        query = query.eq("symbol", symbol.upper())
    response = query.order("candle_date", desc=True).limit(limit).execute()
    return response.data or []
