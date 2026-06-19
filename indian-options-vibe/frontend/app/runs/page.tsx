'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
  risk: string;
  summary: string;
};

type RunsResponse = {
  mode: 'memory';
  count: number;
  runs: SavedRun[];
};

const mockRuns: SavedRun[] = [
  { id: 'demo-run-001', title: 'NIFTY VWAP + RSI ATM CE Backtest', symbol: 'NIFTY', timeframe: '5m', mode: 'Paper Backtest', status: 'Completed', createdAt: '19/6/2026, 1:18:42 pm', netPnl: 42850, winRate: 54.2, profitFactor: 1.71, maxDrawdown: -8200, totalTrades: 86, risk: 'Medium', summary: 'ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.' },
  { id: 'demo-run-002', title: 'BANKNIFTY Opening Range PE Breakout', symbol: 'BANKNIFTY', timeframe: '5m', mode: 'Paper Backtest', status: 'Review', createdAt: '19/6/2026, 1:05:11 pm', netPnl: 18400, winRate: 48.7, profitFactor: 1.32, maxDrawdown: -11200, totalTrades: 64, risk: 'High', summary: 'Opening range breakdown with ATM PE, avoid trades after 2:30 PM, charges included.' },
  { id: 'demo-run-003', title: 'SENSEX VWAP Reclaim CE Watch', symbol: 'SENSEX', timeframe: '3m', mode: 'Paper Backtest', status: 'Draft', createdAt: '19/6/2026, 12:42:30 pm', netPnl: -3600, winRate: 41.5, profitFactor: 0.92, maxDrawdown: -14500, totalTrades: 53, risk: 'High', summary: 'SENSEX CE paper setup after VWAP reclaim. Needs more filters before use.' },
];

export default function RunsPage() {
  const [backendRuns, setBackendRuns] = useState<SavedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'backend' | 'localFallback' | 'offline'>('offline');
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/runs');
      if (!response.ok) throw new Error(`Run history API returned ${response.status}`);
      const data = (await response.json()) as RunsResponse;
      setBackendRuns(data.runs);
      setSource('backend');
      setError(null);
    } catch (err) {
      const local = JSON.parse(window.localStorage.getItem('backtestRuns') || '[]') as SavedRun[];
      setBackendRuns(local);
      setSource(local.length ? 'localFallback' : 'offline');
      setError(err instanceof Error ? err.message : 'Could not connect to run history backend');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const runs = useMemo(() => {
    const savedIds = new Set(backendRuns.map((run) => run.id));
    return [...backendRuns, ...mockRuns.filter((run) => !savedIds.has(run.id))];
  }, [backendRuns]);

  const completedRuns = runs.filter((run) => run.status === 'Completed' || run.status === 'Review');
  const profitableRuns = runs.filter((run) => run.netPnl > 0).length;
  const totalPnl = runs.reduce((sum, run) => sum + run.netPnl, 0);
  const avgWinRate = runs.length ? runs.reduce((sum, run) => sum + run.winRate, 0) / runs.length : 0;
  const bestRun = runs.reduce((best, run) => (run.netPnl > best.netPnl ? run : best), runs[0]);

  async function deleteBackendRun(id: string) {
    const nextRuns = backendRuns.filter((run) => run.id !== id);
    setBackendRuns(nextRuns);
    window.localStorage.setItem('backtestRuns', JSON.stringify(nextRuns));

    try {
      await fetch(`http://localhost:8000/api/runs/${id}`, { method: 'DELETE' });
    } catch {
      setError('Deleted locally, but backend delete failed because API is offline.');
    }
  }

  async function clearBackendRuns() {
    setBackendRuns([]);
    window.localStorage.removeItem('backtestRuns');
    try {
      await fetch('http://localhost:8000/api/runs', { method: 'DELETE' });
    } catch {
      setError('Cleared locally, but backend clear failed because API is offline.');
    }
  }

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Runs</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Backtest Runs</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Agent backtests are now stored through the backend Run History API. This is in-memory for now and will move to Supabase next.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {backendRuns.length > 0 ? <button onClick={clearBackendRuns} className="rounded-xl border border-red-900 px-4 py-3 text-sm text-red-300 hover:bg-red-950/30">Clear Backend Runs</button> : null}
            <button onClick={loadRuns} className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
            <Link href="/agent" className="rounded-xl border border-emerald-800 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-950/30">Create New Run</Link>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Run history fallback active: {error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <SummaryCard label="Total Runs" value={`${runs.length}`} hint={`${backendRuns.length} from ${source}`} />
          <SummaryCard label="Reviewed" value={`${completedRuns.length}`} hint="Completed/review state" />
          <SummaryCard label="Profitable" value={`${profitableRuns}`} hint="Positive P&L runs" />
          <SummaryCard label="Total P&L" value={`₹${totalPnl.toLocaleString('en-IN')}`} hint="Backend + mock runs" tone={totalPnl >= 0 ? 'win' : 'loss'} />
          <SummaryCard label="Avg Win Rate" value={`${avgWinRate.toFixed(1)}%`} hint={loading ? 'Loading...' : `Best: ${bestRun?.symbol || '-'}`} />
        </div>

        {backendRuns.length > 0 ? <RunSection title="Backend Agent Runs" subtitle="These were created by the Agent and stored in the backend memory Run History API." runs={backendRuns} canDelete onDelete={deleteBackendRun} /> : null}
        <RunSection title="Mock Run History" subtitle="Fallback demo runs used until backend database persistence is added." runs={mockRuns} />
      </div>
    </section>
  );
}

function RunSection({ title, subtitle, runs, canDelete = false, onDelete }: { title: string; subtitle: string; runs: SavedRun[]; canDelete?: boolean; onDelete?: (id: string) => void }) {
  return <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Paper backtests only • Live locked</div></div><div className="mt-5 space-y-4">{runs.map((run) => <RunCard key={run.id} run={run} canDelete={canDelete} onDelete={onDelete} />)}</div></div>;
}

function RunCard({ run, canDelete = false, onDelete }: { run: SavedRun; canDelete?: boolean; onDelete?: (id: string) => void }) {
  return <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-2xl font-bold text-white">{run.symbol}</h3><StatusBadge status={run.status} /><RiskBadge risk={run.risk} /><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{run.timeframe}</span></div><h4 className="mt-3 text-lg font-semibold text-slate-100">{run.title}</h4><p className="mt-2 max-w-4xl text-sm text-slate-400">{run.summary}</p><p className="mt-2 text-xs text-slate-500">Run ID: {run.id} • Created: {run.createdAt} • Mode: {run.mode}</p></div><div className="flex flex-wrap gap-2"><Link href={`/runs/${run.id}`} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Open Report</Link>{canDelete && onDelete ? <button onClick={() => onDelete(run.id)} className="rounded-xl border border-red-900 px-4 py-3 text-sm text-red-300 hover:bg-red-950/30">Delete</button> : null}</div></div><div className="mt-5 grid gap-3 md:grid-cols-5"><RunMetric label="Net P&L" value={`₹${run.netPnl.toLocaleString('en-IN')}`} tone={run.netPnl >= 0 ? 'win' : 'loss'} /><RunMetric label="Win Rate" value={`${run.winRate}%`} /><RunMetric label="Profit Factor" value={`${run.profitFactor}`} tone={run.profitFactor >= 1.2 ? 'win' : run.profitFactor < 1 ? 'loss' : undefined} /><RunMetric label="Max DD" value={`₹${run.maxDrawdown.toLocaleString('en-IN')}`} tone="loss" /><RunMetric label="Trades" value={`${run.totalTrades}`} /></div></div>;
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function RunMetric({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div><div className={`mt-2 text-lg font-semibold ${toneClass}`}>{value}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const style = status === 'Completed' ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : status === 'Review' ? 'border-yellow-800 bg-yellow-950/30 text-yellow-300' : 'border-slate-700 bg-slate-950 text-slate-300';
  return <span className={`rounded-full border px-3 py-1 text-xs ${style}`}>{status}</span>;
}

function RiskBadge({ risk }: { risk: string }) {
  const style = risk === 'High' ? 'border-red-800 bg-red-950/30 text-red-300' : risk === 'Medium' ? 'border-yellow-800 bg-yellow-950/30 text-yellow-300' : 'border-emerald-800 bg-emerald-950/30 text-emerald-300';
  return <span className={`rounded-full border px-3 py-1 text-xs ${style}`}>Risk: {risk}</span>;
}
