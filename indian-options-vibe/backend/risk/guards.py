class RiskGuard:
    def __init__(self, max_daily_loss: float = 2000, max_trades_per_day: int = 3):
        self.max_daily_loss = max_daily_loss
        self.max_trades_per_day = max_trades_per_day

    def allow_paper_signal(self, current_day_pnl: float, trade_count: int) -> bool:
        if current_day_pnl <= -abs(self.max_daily_loss):
            return False
        if trade_count >= self.max_trades_per_day:
            return False
        return True
