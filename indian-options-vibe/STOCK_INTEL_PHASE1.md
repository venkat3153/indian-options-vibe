# Stock Options Intelligence — Phase 1 (read-only)

This module is an isolated addition to **Indian Options Vibe** on branch
`feature/stock-options-intelligence-phase1`. Its pricing levels refer **only
to underlying NSE equities**, never an option strike or premium.

## Current features

- Daily refreshed NSE F&O universe derived from Dhan's **detailed** instrument
  master; filters active `OPTSTK` contracts and resolves NSE equity IDs.
- True daily OHLCV from Dhan's historical API; rejects the current unfinished
  trading-day candle and refuses to invent missing bars.
- 9 / 26 / 200 / 250 EMA, 14-day ATR, completed-session volume ratio vs
  the *previous* five trading sessions, 20-day breakout context.
- Read-only, 2.5R/4R **underlying-stock** planning levels for trends that meet
  alignment rules. The entry is conditional: it is not a market instruction.
- Dhan option-chain OI overview for a configurable number of highest-scoring
  candidates. It does **not** identify individual writers.
- JSON latest-report persistence in `backend/data/stock_intel/latest.json`,
  asynchronous scan progress endpoints, and a Next.js research dashboard.
- Optional weekday 08:30 IST scheduler. A weekday is not necessarily a
  trading day: NSE holiday calendar validation is pending.

## Not yet present / not claimed

- Breaking news, earnings calendar, broker BUY/SELL ratings and report targets.
- Live 30-minute intraday candles, or same-time-of-day relative volume.
- NSE holiday-calendar integration; direct headline alerts.
- Calibrated probability, historical catalyst returns, or validated option P&L.
- Stock-option strike or premium recommendations; any form of order execution.

**No mock fallback:** if Dhan access, equity IDs or sufficient candles are
missing, the affected symbol is marked unavailable and does not produce a
trade candidate. A full ranking is not claimed if data are incomplete.

## Local setup without destructive cleanup

This repository has an existing draft psychology-importer branch and unmerged
features. The new branch is based on that feature branch and leaves it untouched.

First inspect local working changes **without discarding anything**:

```bash
cd ~/indian-options-vibe-github
git status --short
git fetch origin feature/stock-options-intelligence-phase1
git switch --track origin/feature/stock-options-intelligence-phase1
```

If `git switch` reports a local-change conflict, stop. Do **not** clean, reset,
stash without checking, or overwrite work. This guide deliberately uses no
`git clean` or `git add .`.

In `indian-options-vibe/backend/.env`, keep your existing credentials:
`DHAN_CLIENT_ID`, `DHAN_ACCESS_TOKEN`. Never commit this file or paste tokens
into chat.

### Backend — terminal one

```bash
cd ~/indian-options-vibe-github/indian-options-vibe/backend
source .venv/bin/activate
python -m unittest discover -s tests -p 'test_stock_intel.py' -v
uvicorn main:app --reload --port 8000
```

If `.venv` does not exist, use your existing virtual environment; consult
`requirements.txt` for dependencies. Do not delete or replace an environment
that works.

### Frontend — terminal two (restart after changes)

```bash
cd ~/indian-options-vibe-github/indian-options-vibe/frontend
npm run dev
```

Open `http://localhost:3000/stock-options`.

### Research API — manual pilot then full scan

```bash
curl http://localhost:8000/api/stock-intel/status
curl -X POST 'http://localhost:8000/api/stock-intel/scan?max_symbols=10&oi_top=2'
curl http://localhost:8000/api/stock-intel/status
curl http://localhost:8000/api/stock-intel/latest
# After the pilot, run the entire eligible universe:
curl -X POST 'http://localhost:8000/api/stock-intel/scan?max_symbols=0&oi_top=5'
```

The scan is asynchronous; the POST returns QUEUED, not finished. Use
`/status` to monitor progress and `/latest` to retrieve the last **completed**
run. Because of data-provider throttling, full scans may take several minutes.
A new scan is rejected while another scan is active.

### Optional 08:30 AM IST weekday scheduler — terminal three

```bash
cd ~/indian-options-vibe-github/indian-options-vibe/backend
source .venv/bin/activate
python -m stock_intel.scheduler
```

Run **one** scheduler process only. Keep the computer/server awake; the
scheduler is not a hosted service. If offline at 08:30–08:50, it does not
silently claim a run happened. On market holidays it may generate a
prior-session technical report — always check `price_data_through`.

## Data integrity & risk boundaries

- Latest-report timestamps use IST; close data have an explicit session date.
- The premarket analysis uses *previous completed* daily candles.
- `technical_score` is a heuristic ranking **not** success probability.
- Option OI from Dhan lacks a guaranteed exchange-session timestamp in this
  API. We label its market session **LATEST_AVAILABLE_UNVERIFIED**.
- Stock OI is not proof of writers' identities; high OI is not automatically
  resistance/support.
- A stock's 2.5R plan does **not** imply a bought option offers 2.5R after
  theta decay, implied-volatility movement, spreads and settlement effects.
- News, results and analyst ratings must be linked to licensed or authorized
  feeds with publish time, provenance, and verification before a final
  **news-confirmed** BUY/SELL research label is allowed.
- The new endpoints accept research scans only. There are no broker order,
  modify, or cancel paths in this module.

## Next milestones

1. Licensed/authorized news + NSE disclosures + earnings calendar with
   deduplication, timestamp and entity mapping.
2. Intraday 30-minute candle and opening-volume engine, using a single
   rate-limited market-data ingestion process.
3. First-class event-triggered re-ranking and historical recommendation
   journal (1/3/5/6-trading-day outcomes).
4. Forward testing and walk-forward calibration before any confidence claim.
