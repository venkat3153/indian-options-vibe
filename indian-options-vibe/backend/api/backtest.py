from fastapi import APIRouter
from pydantic import BaseModel
from backtest.options_engine import run_dummy_options_backtest

router = APIRouter()

class BacktestRequest(BaseModel):
    prompt: str
    symbol: str = "NIFTY"
    timeframe: str = "5m"
    mode: str = "paper"

@router.post("/run")
def run_backtest(payload: BacktestRequest) -> dict:
    return run_dummy_options_backtest(payload.prompt, payload.symbol, payload.timeframe)
