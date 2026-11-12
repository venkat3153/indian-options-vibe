"""Deterministic, offline tests: python -m unittest discover -s tests -p 'test_stock_intel.py'."""
import csv
import io
import unittest
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from stock_intel.core import evaluate_stock, normalize_daily_candles, parse_fno_universe


class StockIntelligenceCoreTests(unittest.TestCase):
    def test_universe_only_current_nse_stock_options(self):
        data = io.StringIO()
        writer = csv.DictWriter(data, fieldnames=[
            "EXCH_ID", "SEGMENT", "INSTRUMENT", "SYMBOL_NAME",
            "SECURITY_ID", "UNDERLYING_SYMBOL", "EXPIRY_DATE"
        ])
        writer.writeheader()
        writer.writerows([
            {"EXCH_ID": "NSE", "SEGMENT": "E", "INSTRUMENT": "EQUITY",
             "SYMBOL_NAME": "RELIANCE", "SECURITY_ID": "2885"},
            {"EXCH_ID": "NSE", "SEGMENT": "D", "INSTRUMENT": "OPTSTK",
             "UNDERLYING_SYMBOL": "RELIANCE", "EXPIRY_DATE": "2026-11-24"},
            {"EXCH_ID": "NSE", "SEGMENT": "D", "INSTRUMENT": "OPTSTK",
             "UNDERLYING_SYMBOL": "RELIANCE", "EXPIRY_DATE": "2026-12-29"},
            {"EXCH_ID": "NSE", "SEGMENT": "D", "INSTRUMENT": "OPTSTK",
             "UNDERLYING_SYMBOL": "OLD", "EXPIRY_DATE": "2026-10-20"},
            {"EXCH_ID": "NSE", "SEGMENT": "D", "INSTRUMENT": "OPTIDX",
             "UNDERLYING_SYMBOL": "NIFTY", "EXPIRY_DATE": "2026-11-24"},
        ])
        result = parse_fno_universe(data.getvalue(), date(2026, 11, 12))
        self.assertEqual(result, [{"symbol": "RELIANCE", "security_id": "2885",
                                    "nearest_expiry": "2026-11-24", "exchange_segment": "NSE_EQ"}])

    def test_drops_in_progress_and_malformed_candles(self):
        ist = ZoneInfo("Asia/Kolkata")
        a = int(datetime(2026, 11, 11, 15, 30, tzinfo=ist).timestamp())
        b = int(datetime(2026, 11, 12, 11, 0, tzinfo=ist).timestamp())
        payload = {"data": {"timestamp": [a, b], "open": [101, 111],
                            "high": [106, 115], "low": [99, 110],
                            "close": [104, 114], "volume": [500, 100]}}
        rows = normalize_daily_candles(payload, date(2026, 11, 12))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["close"], 104)

    def _candles(self, direction):
        first = date(2025, 1, 1)
        rows = []
        for i in range(280):
            base = 500 + direction * i * 0.4
            rows.append({"date": str(first + timedelta(days=i)), "open": base - direction * 0.2,
                         "high": base + 1, "low": base - 1, "close": base,
                         "volume": 1500 if i == 279 else 500})
        return rows

    def test_bullish_has_underlying_levels_only(self):
        result = evaluate_stock("TEST", self._candles(1))
        self.assertEqual(result["bias"], "BULLISH")
        self.assertEqual(result["news_status"], "NOT_CONNECTED")
        self.assertEqual(result["status"], "TECHNICAL_WATCH")
        self.assertLess(result["plan"]["stop_loss"], result["plan"]["entry_trigger"])
        self.assertLess(result["plan"]["entry_trigger"], result["plan"]["target_1"])
        self.assertEqual(result["plan"]["level_type"], "UNDERLYING_STOCK_ONLY")
        self.assertFalse(result["execution_enabled"])

    def test_bearish_has_downside_levels(self):
        result = evaluate_stock("TEST", self._candles(-1))
        self.assertEqual(result["bias"], "BEARISH")
        self.assertGreater(result["plan"]["stop_loss"], result["plan"]["entry_trigger"])
        self.assertGreater(result["plan"]["entry_trigger"], result["plan"]["target_1"])

    def test_short_history_never_emits_signal(self):
        result = evaluate_stock("TEST", self._candles(1)[:50])
        self.assertEqual(result["status"], "INSUFFICIENT_DATA")
        self.assertNotIn("plan", result)


if __name__ == "__main__":
    unittest.main()
