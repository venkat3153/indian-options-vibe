# Architecture

## Product flow

1. User writes strategy prompt.
2. Strategy Agent parses market, instrument, timeframe, entry, exit, risk rules.
3. Data layer fetches candles/option-chain data.
4. Backtest engine simulates entries, exits, charges, and slippage.
5. Risk Agent audits the strategy.
6. UI renders metrics, chart, trades, code, and paper-trade readiness.

## Indian-market modules

- `data/nse_loader.py`: NSE bhavcopy and reports loader
- `data/option_chain.py`: option chain snapshots, OI, PCR, max pain
- `backtest/options_engine.py`: NIFTY/BANKNIFTY/stock-options backtesting
- `risk/guards.py`: daily loss, max trades, no-trade-after-time, kill switch
- `brokers/`: Dhan, Zerodha, Angel One, Upstox, Shoonya adapters

## Safety levels

- Level 0: Research only
- Level 1: Backtesting
- Level 2: Paper trading
- Level 3: Manual execution alerts
- Level 4: Semi-auto broker execution with approval
- Level 5: Fully guarded execution after compliance review

MVP is Level 1 moving toward Level 2.
