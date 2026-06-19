'use client';

import { useState } from 'react';

type BacktestResult = {
  run_id: string;
  symbol: string;
  timeframe: string;
  prompt: string;
  metrics: {
    net_pnl: number;
    win_rate: number;
    profit_factor: number;
    max_drawdown: number;
    total_trades: number;
    charges: number;
  };
  trades: Array<{
    time: string;
    symbol: string;
    side: string;
    entry: number;
    exit: number;
    pnl: number;
    exit_reason: string;
  }>;
  risk: {
    paper_mode: boolean;
    live_orders_enabled: boolean;
    daily_loss_guard: boolean;
    kill_switch: boolean;
  };
};

const examples = [
  'Backtest NIFTY ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.',
  'Backtest BANKNIFTY opening range breakout option buying with max daily loss ₹2000.',
  'Scan NIFTY options for OI buildup and paper-trade only low-risk signals.',
];

const demoSteps = [
  'Parsing strategy prompt',
  'Sending request to FastAPI backend',
  'Selecting Indian options contract universe',
  'Running dummy paper backtest',
  'Calculating charges and slippage',
  'Generating risk report',
];

export function PromptBox() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [symbol, setSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState('5m');
  const [steps, setSteps] = useState<string[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runBacktest() {
    setLoading(true);
    setSteps([]);
    setResult(null);
    setError(null);

    demoSteps.forEach((step, i) => {
      setTimeout(() => setSteps((current) => [...current, step]), 300 * (i + 1));
    });

    try {
      const response = await fetch('http://localhost:8000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, symbol, timeframe, mode: 'paper' }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = (await response.json()) as BacktestResult;
      setResult(data);
      setSteps((current) => [...current, 'Backtest result received from backend']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to backend');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0b0f17] p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Symbol
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-500">
            <option>NIFTY</option>
            <option>BANKNIFTY</option>
            <option>FINNIFTY</option>
            <option>RELIANCE</option>
            <option>HDFCBANK</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Timeframe
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-500">
            <option>1m</option>
            <option>3m</option>
            <option>5m</option>
            <option>15m</option>
          </select>
        </label>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mt-4 min-h-32 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-emerald-500"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button key={ex} onClick={() => setPrompt(ex)} className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
            {ex.slice(0, 42)}...
          </button>
        ))}
      </div>

      <button disabled={loading} onClick={runBacktest} className="mt-4 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Running Paper Backtest...' : 'Run Paper Backtest'}
      </button>

      {steps.length > 0 && (
        <div className="mt-5 space-y-2">
          {steps.map((step, i) => (
            <div key={`${step}-${i}`} className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
              Step {i + 1}: {step}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          Backend error: {error}. Make sure the FastAPI server is running on http://localhost:8000.
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-3xl border border-emerald-900/70 bg-emerald-950/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-emerald-400">Backtest Complete</div>
              <h2 className="mt-2 text-2xl font-bold text-white">{result.symbol} paper result</h2>
              <p className="mt-1 text-sm text-slate-400">Run ID: {result.run_id} • Timeframe: {result.timeframe}</p>
            </div>
            <div className="rounded-full border border-emerald-800 px-4 py-2 text-sm text-emerald-300">Live Orders Locked</div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="Net P&L" value={`₹${result.metrics.net_pnl.toLocaleString('en-IN')}`} />
            <Metric label="Win Rate" value={`${result.metrics.win_rate}%`} />
            <Metric label="Profit Factor" value={`${result.metrics.profit_factor}`} />
            <Metric label="Max Drawdown" value={`₹${result.metrics.max_drawdown.toLocaleString('en-IN')}`} />
            <Metric label="Total Trades" value={`${result.metrics.total_trades}`} />
            <Metric label="Charges" value={`₹${result.metrics.charges.toLocaleString('en-IN')}`} />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Contract</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Entry</th>
                  <th className="p-3">Exit</th>
                  <th className="p-3">P&L</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((trade, index) => (
                  <tr key={`${trade.symbol}-${index}`} className="border-t border-slate-800 text-slate-300">
                    <td className="p-3">{trade.time}</td>
                    <td className="p-3">{trade.symbol}</td>
                    <td className="p-3">{trade.side}</td>
                    <td className="p-3">{trade.entry}</td>
                    <td className="p-3">{trade.exit}</td>
                    <td className={trade.pnl >= 0 ? 'p-3 text-emerald-400' : 'p-3 text-red-400'}>₹{trade.pnl.toLocaleString('en-IN')}</td>
                    <td className="p-3">{trade.exit_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
