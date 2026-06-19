class BrokerConnector:
    """Read-only/paper-first broker connector interface."""

    live_orders_enabled = False

    def quote(self, symbol: str) -> dict:
        raise NotImplementedError

    def place_order(self, *args, **kwargs):
        raise RuntimeError("Live order placement is locked in MVP paper mode.")
