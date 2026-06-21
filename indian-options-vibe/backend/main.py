from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.backtest import router as backtest_router
from api.scanner import router as scanner_router
from api.runs import router as runs_router
from api.brokers import router as brokers_router
from api.market import router as market_router
from api.market_breadth import router as market_breadth_router
from api.paper_trades import router as paper_trades_router
from api.research import router as research_router
from api.daily_research import router as daily_research_router
from api.discipline import router as discipline_router
from api.intraday import router as intraday_router
from api.retest_v2 import router as retest_v2_router
from api.final_status import router as final_status_router
from api.stock_history import router as stock_history_router
from api.live import router as quotes_router
from api.watchlist import router as watchlist_router

load_dotenv()

app = FastAPI(title="Indian Options Vibe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "paper"}

app.include_router(backtest_router, prefix="/api/backtest", tags=["backtest"])
app.include_router(scanner_router, prefix="/api/scanner", tags=["scanner"])
app.include_router(runs_router, prefix="/api/runs", tags=["runs"])
app.include_router(brokers_router, prefix="/api/brokers", tags=["brokers"])
app.include_router(market_router, prefix="/api/market", tags=["market"])
app.include_router(market_breadth_router, prefix="/api/market", tags=["market-breadth"])
app.include_router(paper_trades_router, prefix="/api/paper-trades", tags=["paper-trades"])
app.include_router(research_router, prefix="/api/research", tags=["research"])
app.include_router(daily_research_router, prefix="/api/research/daily-plan", tags=["daily-research"])
app.include_router(discipline_router, prefix="/api/discipline", tags=["discipline"])
app.include_router(intraday_router, prefix="/api/intraday", tags=["intraday"])
app.include_router(retest_v2_router, prefix="/api/intraday", tags=["retest-v2"])
app.include_router(final_status_router, prefix="/api/final-status", tags=["final-status"])
app.include_router(stock_history_router, prefix="/api/stocks/history", tags=["stock-history"])
app.include_router(quotes_router, prefix="/api/live", tags=["live"])
app.include_router(watchlist_router, prefix="/api/watchlist", tags=["watchlist"])
