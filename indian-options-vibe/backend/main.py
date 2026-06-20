from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.backtest import router as backtest_router
from api.scanner import router as scanner_router
from api.runs import router as runs_router
from api.brokers import router as brokers_router
from api.market import router as market_router
from api.paper_trades import router as paper_trades_router

load_dotenv()

app = FastAPI(title="Indian Options Vibe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "paper"}

app.include_router(backtest_router, prefix="/api/backtest", tags=["backtest"])
app.include_router(scanner_router, prefix="/api/scanner", tags=["scanner"])
app.include_router(runs_router, prefix="/api/runs", tags=["runs"])
app.include_router(brokers_router, prefix="/api/brokers", tags=["brokers"])
app.include_router(market_router, prefix="/api/market", tags=["market"])
app.include_router(paper_trades_router, prefix="/api/paper-trades", tags=["paper-trades"])
