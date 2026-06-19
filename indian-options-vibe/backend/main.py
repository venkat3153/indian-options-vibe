from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.backtest import router as backtest_router
from api.scanner import router as scanner_router

app = FastAPI(title="Indian Options Vibe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "paper"}

app.include_router(backtest_router, prefix="/api/backtest", tags=["backtest"])
app.include_router(scanner_router, prefix="/api/scanner", tags=["scanner"])
