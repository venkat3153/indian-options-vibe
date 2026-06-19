# Indian Options Vibe

AI-powered research, backtesting, and paper-trading terminal for Indian intraday and options trading.

> MVP goal: clone the Vibe-Trading style website flow for NIFTY/BANKNIFTY/stock-options strategy research before any live execution.

## What is included

- Next.js + TypeScript frontend shell
- Dark sidebar layout similar to Vibe-Trading
- Agent chat page with dummy streaming steps
- Run detail page with KPI cards, chart placeholder, trade table, and strategy code
- Scanner, Paper Trading, Broker Connect, Settings pages
- FastAPI backend with dummy `/api/backtest/run` endpoint
- Risk-first architecture notes for Indian F&O

## Safety boundary

This repo starts in **research + paper mode only**. Broker order placement is intentionally stubbed. Add real broker execution only after implementing:

- Manual approval gate
- Daily loss guard
- Per-trade max loss guard
- Kill switch
- Audit ledger
- Broker compliance review

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs

## MVP prompts

```text
Backtest NIFTY ATM CE buying when 5-min candle closes above VWAP and RSI > 60. SL 20%, target 40%, last 90 days.

Backtest BANKNIFTY opening range breakout option buying with max daily loss ₹2000.

Scan NIFTY options for OI buildup and give only paper-trade signals.
```

## Roadmap

1. UI shell + dummy backtest flow
2. Real backend strategy parser
3. NSE/broker historical data loaders
4. Options chain analytics: OI, PCR, IV, Max Pain
5. Paper trading engine
6. Broker connectors: Dhan, Zerodha, Angel One, Upstox, Shoonya
7. Guarded semi-auto execution
