def run_dummy_options_backtest(prompt: str, symbol: str, timeframe: str) -> dict:
    """Return a dummy Indian options backtest result for UI development."""
    return {
        "run_id": "demo-run-001",
        "symbol": symbol,
        "timeframe": timeframe,
        "prompt": prompt,
        "metrics": {
            "net_pnl": 42850,
            "win_rate": 54.2,
            "profit_factor": 1.71,
            "max_drawdown": -8200,
            "total_trades": 86,
            "charges": 6120,
        },
        "trades": [
            {"time": "09:25", "symbol": "NIFTY 23500 CE", "side": "BUY", "entry": 124.5, "exit": 171.2, "pnl": 2335, "exit_reason": "Target"},
            {"time": "10:40", "symbol": "NIFTY 23500 CE", "side": "BUY", "entry": 138.0, "exit": 109.5, "pnl": -1425, "exit_reason": "SL"},
        ],
        "risk": {
            "paper_mode": True,
            "live_orders_enabled": False,
            "daily_loss_guard": True,
            "kill_switch": True,
        },
    }
