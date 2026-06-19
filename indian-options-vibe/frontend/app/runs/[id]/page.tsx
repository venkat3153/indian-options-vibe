'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { DownloadCsvButton } from '@/components/DownloadCsvButton';

type SavedRun = {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  mode: string;
  status: string;
  createdAt: string;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  charges?: number;
  risk: string;
  summary: string;
  prompt?: string;
  trades?: Array<{ time: string; symbol: string; side: string; entry: number | string; exit: number | string; pnl: number; result: string }>;
};

type RunResponse = {
  mode: 'memory';
  run: SavedRun;
};

const demoRun: SavedRun = {
  id: 'demo-run-001',
  title: 'NIFTY VWAP + RSI ATM CE Backtest',
  symbol: 'NIFTY',
  timeframe: '5m',
  mode: 'Paper Backtest',
  status: 'Completed',
  createdAt: '19/6/2026, 1:18:42 pm',
  netPnl: 42850,
  winRate: 54.2,
  profitFactor: 1.71,
  maxDrawdown: -8200,
  totalTrades: 86,
  charges: 6120,
  risk: 'Medium',
  summary: 'ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.',
  prompt: 'Backtest NIFTY ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.',
  trades: [
    { time: '09:25', symbol: 'NIFTY 23500 CE', side: 'BUY', entry: '124.5', exit: '171.2', pnl: 2335, result: 'Target' },
    { time: '10:40', symbol: 'NIFTY 23500 CE', side: 'BUY', entry: '138.0', exit: '109.5', pnl: -1425, result: 'SL' },
    { time: '11:35', symbol: 'NIFTY 23600 CE', side: 'BUY', entry: '102.0', exit: '141.5', pnl: 1975, result: 'Target' },
    { time: '13:10', symbol: 'NIFTY 23550 CE', side: 'BUY', entry: '91.0', exit: '126.0', pnl: 1750, result: 'Target' },
    { time: '14:05', symbol: 'NIFTY 23600 CE', side: 'BUY', entry: '112.0', exit: '101.5', pnl: -525, result: 'Time Exit' },
  ],
};

const mockRuns: SavedRun[] = [
  demoRun,
  { ...demoRun, id: 'demo-run-002', title: 'BANKNIFTY Opening Range PE Breakout', symbol: 'BANKNIFTY', status: 'Review', netPnl: 18400, winRate: 48.7, profitFactor: 1.32, maxDrawdown: -11200, totalTrades: 64, risk: 'High', summary: 'Opening range breakdown with ATM PE, avoid trades after 2:30 PM, charges included.', prompt: 'Backtest BANKNIFTY opening range breakout option buying with max daily loss ₹2000.' },
  { ...demoRun, id: 'demo-run-003', title: 'SENSEX VWAP Reclaim CE Watch', symbol: 'SENSEX', timeframe: '3m', status: 'Draft', netPnl: -3600, winRate: 41.5, profitFactor: 0.92, maxDrawdown: -14500, totalTrades: 53, risk: 'High', summary: 'SENSEX CE paper setup after VWAP reclaim. Needs more filters before use.', prompt: 'Backtest SENSEX CE after VWAP reclaim.' },
];

const assumptions = [
  'ATM option selected from nearest strike to spot at signal time.',
  'Entry rules are parsed from the agent prompt.',
  'Stop loss and target are estimated by the backend MVP.',
  'No fresh trades after 2:30 PM IST.',
  'Charges and slippage are estimated for MVP review only.',
];

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<SavedRun | null>(null);
  const [source, setSource] = useState<'backend' | 'localFallback' | 'mock' | 'missing'>('missing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRun() {
      try {
        const response = await fetch(`http://localhost:8000/api/runs/${params.id}`);
        if (!response.ok) throw new Error(`Run detail API returned ${response.status}`);
        const data = (await response.json()) as RunResponse;
        setRun(data.run);
        setSource('backend');
        setError(null);
        return;
      } catch (err) {
        const savedRuns = JSON.parse(window.localStorage.getItem('backtestRuns') || '[]') as SavedRun[];
        const saved = savedRuns.find((item) => item.id === params.id);
        if (saved) {
          setRun(saved);
          setSource('localFallback');
          setError(err instanceof Error ? err.message : 'Backend run detail unavailable');
          return;
        }

        const mock = mockRuns.find((item) => item.id === params.id) || null;
        setRun(mock);
        setSource(mock ? 'mock' : 'missing');
        setError(mock ? null : 'Run not found in backend, local fallback, or mock runs.');
      }
    }

    loadRun();
  }, [params.id]);

  const trades = run?.trades?.length ? run.trades : demoRun.trades || [];
  const avgWin = useMemo(() => {
    const wins = trades.filter((trade) => trade.pnl > 0);
    return wins.length ? Math.round(wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length) : 0;
  }, [trades]);
  const avgLoss = useMemo(() => {
    const losses = trades.filter((trade) => trade.pnl < 0);
    return losses.length ? Math.round(losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length) : 0;
  }, [trades]);

  if (!run) {
    return <section className="p-8 md:p-12"><div className="mx-auto max-w-5xl rounded-3xl border border-red-900 bg-red-950/20 p-6"><h1 className="text-2xl font-bold text-white">Run not found</h1><p className="mt-2 text-red-200">{error || 'This run is not available.'}</p><Link href="/runs" className="mt-5 inline-block rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950">Back to Runs</Link></div></section>;
  }

  const csvRows = trades.map((trade) => ({ run_id: run.id, strategy: run.title, symbol: trade.symbol, time: trade.time, side: trade.side, entry: trade.entry, exit: trade.exit, pnl: trade.pnl, result: trade.result, timeframe: run.timeframe, mode: run.mode }));
  const equityPoints = ['₹0', '₹7.4K', '₹13.1K', '₹8.6K', '₹18.9K', '₹25.2K', '₹21.4K', '₹31.7K', `₹${Math.round(run.netPnl / 1000)}K`];

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <Link href="/runs" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to Runs</Link>
            <div className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Run Detail</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">{run.title}</h1>
            <p className="mt-2 max-w-4xl text-slate-400">{run.prompt || run.summary}</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">{run.status} • Source: {source} • Live locked</div>
        </div>

        {error && source === 'localFallback' ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Backend fallback active: {error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4"><MetricCard label="Net P&L" value={`₹${run.netPnl.toLocaleString('en-IN')}`} hint="after estimated charges" /><MetricCard label="Win Rate" value={`${run.winRate}%`} hint={`${run.totalTrades} trades`} /><MetricCard label="Profit Factor" value={`${run.profitFactor}`} hint="gross wins / gross losses" /><MetricCard label="Max Drawdown" value={`₹${run.maxDrawdown.toLocaleString('en-IN')}`} hint="worst dip" /></div>
        <div className="mt-4 grid gap-4 md:grid-cols-4"><MetricCard label="Charges" value={`₹${(run.charges || 0).toLocaleString('en-IN')}`} hint="brokerage + taxes mock" /><MetricCard label="Avg Win" value={`₹${avgWin.toLocaleString('en-IN')}`} /><MetricCard label="Avg Loss" value={`₹${avgLoss.toLocaleString('en-IN')}`} /><MetricCard label="Mode" value={run.mode} hint={`${run.symbol} • ${run.timeframe}`} /></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><h2 className="text-xl font-bold text-white">Equity Curve Placeholder</h2><p className="mt-1 text-sm text-slate-400">Run curve placeholder. Real chart will come from persisted backend trade results later.</p></div><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Run ID: {run.id}</div></div><div className="mt-5 flex h-72 items-end gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-5">{equityPoints.map((point, index) => <div key={`${point}-${index}`} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-xl bg-emerald-500/30" style={{ height: `${28 + index * 7 + (index % 3) * 18}px` }} /><span className="text-[10px] text-slate-500">{point}</span></div>)}</div></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold text-white">Risk Report</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><RiskLine status="pass" text="Paper mode only" /><RiskLine status="pass" text="Live orders locked" /><RiskLine status={run.maxDrawdown <= -10000 ? 'warn' : 'pass'} text={run.maxDrawdown <= -10000 ? 'Drawdown needs review' : 'Drawdown within review threshold'} /><RiskLine status="warn" text="Backend memory storage resets when server restarts; Supabase persistence is next" /></div></div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h2 className="text-xl font-bold text-white">Trade Table</h2><p className="mt-1 text-sm text-slate-400">Trades loaded from backend run history, local fallback, or mock report.</p></div><DownloadCsvButton filename={`${run.id}-trades.csv`} rows={csvRows} /></div><div className="mt-5 overflow-hidden rounded-2xl border border-slate-800"><table className="w-full text-left text-sm"><thead className="bg-slate-950 text-slate-400"><tr>{['Time', 'Contract', 'Side', 'Entry', 'Exit', 'P&L', 'Result'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{trades.map((trade, index) => <tr key={`${trade.time}-${trade.symbol}-${index}`} className="border-t border-slate-800 text-slate-300"><td className="p-3">{trade.time}</td><td className="p-3 font-medium text-white">{trade.symbol}</td><td className="p-3">{trade.side}</td><td className="p-3">{trade.entry}</td><td className="p-3">{trade.exit}</td><td className={trade.pnl >= 0 ? 'p-3 text-emerald-300' : 'p-3 text-red-300'}>{trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}</td><td className="p-3">{trade.result}</td></tr>)}</tbody></table></div></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold text-white">Strategy Assumptions</h2><ul className="mt-4 space-y-3 text-sm text-slate-300">{assumptions.map((item) => <li key={item}>• {item}</li>)}</ul></div><div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><h2 className="text-xl font-bold text-white">Generated Strategy Logic</h2><pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-emerald-200">{`prompt = ${JSON.stringify(run.prompt || run.summary)}\ncontract = select_atm_option(symbol='${run.symbol}')\nrun_paper_backtest(contract, timeframe='${run.timeframe}')\nkeep_live_orders_locked()`}</pre></div></div>
      </div>
    </section>
  );
}

function RiskLine({ status, text }: { status: 'pass' | 'warn'; text: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><span className={status === 'pass' ? 'text-emerald-300' : 'text-yellow-300'}>{status === 'pass' ? '✅' : '⚠️'}</span>{' '}{text}</div>;
}
