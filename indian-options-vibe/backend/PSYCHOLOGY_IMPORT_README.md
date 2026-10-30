# Dhan Tradebook -> Psychology Journal (read-only v1)

This feature adds only GET calls to Dhan's tradebook. It does **not**
place/modify/cancel orders. Broker tokens remain in `backend/.env`
and are never returned in journal responses.

## Run

Backend:
```bash
cd ~/indian-options-vibe-github/indian-options-vibe/backend
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

Frontend (unchanged):
```bash
cd ~/indian-options-vibe-github/indian-options-vibe/frontend
npm run dev
```

## Manual first sync (after backend is running)

```bash
curl -X POST http://localhost:8000/api/psychology/sync/today
curl 'http://localhost:8000/api/psychology/fills'
```

For a historical range of at most 30 days:

```bash
curl -X POST 'http://localhost:8000/api/psychology/sync/history?from_date=2026-10-30&to_date=2026-10-30'
```

Export broker fills to import/reconcile in the master Excel workbook:

```bash
curl -o dhan_fills.csv http://localhost:8000/api/psychology/export/fills.csv
```

Psychology notes and numerical grades can be added via PUT
`/api/psychology/reviews/{review_id}` and read using GET
`/api/psychology/reviews`.

## Data and limitations

* SQLite data: `backend/data/trading_psychology.sqlite3` (local only; back it up).
* Avoid committing the SQLite file; exclude it from Git.
* Stores **executed fills**, including partial fills. Does not infer closed round
  trips, realized net P&L, initial stops, R multiple or personal psychology.
* Brokerage, STT, exchange fees and taxes are not inferred.
* Previously reviewed trades must be reconciled manually using fill ID/order ID.
* A full automatic Excel merge and frontend dashboard are **not yet built**.
* Historical requests are paginated until an empty response.
* API routes currently rely on the terminal's existing local-only trust model.
  Do not expose port 8000 publicly without authentication.
* The account token may have separate trading permissions; the importer itself
  only calls HTTP GET and no broker order-writing methods.
