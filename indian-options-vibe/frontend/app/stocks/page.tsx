'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type StockRow = {
  symbol: string;
  tag?: string;
  name: string;
  sector: string;
  close: number;
  return_5d_pct: number;
  volume_ratio: number;
  position_20d_pct: number;
  quant_score: number;
};

type ApiResponse = { mode: string; universe?: string; count: number; stocks: StockRow[] };
type LiveQuote = { symbol: string; ltp: number | null; change_pct: number | null };
type LiveQuoteResponse = { status: string; count: number; quotes: LiveQuote[]; message?: string };
type WatchlistItem = { symbol: string; name?: string; sector?: string; action_tag?: string };
type WatchPlan = {
  entry_trigger?: string;
  invalidation?: string;
  target_1_2rr?: string;
  reason_to_avoid?: string;
  teacher_action?: string;
};

type FinalItem = {
  watch_plan?: WatchPlan;
  symbol: string;
  signal: string;
  live_strength: number;
  final_status: string;
  tone: 'win' | 'warn' | 'loss' | 'neutral';
  reason: string;
  above_vwap?: boolean;
  vwap?: number;
  retest_status?: string;
  retest_result?: string;
  retest_low?: number;
  retest_high?: number;
};
type FinalBatch = {
  status: string;
  count: number;
  breadth_supportive: boolean;
  breadth_message?: string;
  counts: { ready: number; wait: number; avoid: number };
  items: FinalItem[];
  note?: string;
};
type Filter = 'All' | 'Saved Watchlist' | 'Ready' | 'Wait' | 'Avoid' | 'Live Watch' | 'Retest Failed' | 'Below VWAP' | 'Volume Breakout' | 'Near 20D High';

const FILTERS: Filter[] = ['All', 'Saved Watchlist', 'Ready', 'Wait', 'Avoid', 'Live Watch', 'Retest Failed', 'Below VWAP', 'Volume Breakout', 'Near 20D High'];

export default function StocksResearchPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveQuoteResponse | null>(null);
  const [finalBatch, setFinalBatch] = useState<FinalBatch | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);
  const [savingSymbol, setSavingSymbol] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const finalRunning = useRef(false);

  async function loadStocks() {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/research/stocks');
      if (!res.ok) throw new Error(`Research API returned ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stocks');
    } finally {
      setLoading(false);
    }
  }

  async function loadLive() {
    try {
      setLiveLoading(true);
      const res = await fetch('http://localhost:8000/api/live/quotes?limit=50');
      if (!res.ok) throw new Error(`Live API returned ${res.status}`);
      setLiveData(await res.json());
    } catch (e) {
      setLiveData({ status: 'error', count: 0, quotes: [], message: e instanceof Error ? e.message : 'Could not load live quotes' });
    } finally {
      setLiveLoading(false);
    }
  }

  async function loadWatchlist() {
    try {
      const res = await fetch('http://localhost:8000/api/watchlist');
      if (!res.ok) throw new Error(`Watchlist API returned ${res.status}`);
      const json = await res.json();
      setWatchlist(json.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load watchlist');
    }
  }

  async function refreshTable() {
    await Promise.all([loadStocks(), loadLive(), loadWatchlist()]);
  }

  async function runFinalScan() {
    if (finalRunning.current) return;
    finalRunning.current = true;
    try {
      setFinalLoading(true);
      const res = await fetch('http://localhost:8000/api/final-status/batch?limit=50');
      if (!res.ok) throw new Error(`Final status API returned ${res.status}`);
      setFinalBatch(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run final scan');
    } finally {
      finalRunning.current = false;
      setFinalLoading(false);
    }
  }

  async function fetchDhanDaily() {
    try {
      setIngesting(true);
      const res = await fetch('http://localhost:8000/api/research/ingest/dhan-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nifty50', days: 180, limit: 50 }),
      });
      if (!res.ok) throw new Error(`Dhan ingest API returned ${res.status}`);
      await refreshTable();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch Dhan daily candles');
    } finally {
      setIngesting(false);
    }
  }

  async function saveWatchlist(row: StockRow, item?: FinalItem) {
    try {
      setSavingSymbol(row.symbol);
      const status = item?.final_status || 'Wait';
      const res = await fetch('http://localhost:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          quant_score: row.quant_score,
          live_signal: item?.signal || 'Wait',
          reason: `${status}: ${item?.reason || 'Saved from stocks research table.'}`,
          status: 'Watching',
          action_tag: status === 'Ready to Watch' ? 'Ready' : status.startsWith('Avoid') ? 'Avoid' : 'Wait',
          outcome: 'Pending',
          source: 'stocks_dashboard_manual_final_scan',
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.error || `Watchlist save returned ${res.status}`);
      await loadWatchlist();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save watchlist');
    } finally {
      setSavingSymbol(null);
    }
  }

  async function removeWatchlist(symbol: string) {
    try {
      setSavingSymbol(symbol);
      const res = await fetch(`http://localhost:8000/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Watchlist remove returned ${res.status}`);
      await loadWatchlist();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove watchlist item');
    } finally {
      setSavingSymbol(null);
    }
  }

  useEffect(() => {
    refreshTable();
    const timer = window.setInterval(loadLive, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const stocks = data?.stocks || [];
  const liveMap = useMemo(() => new Map((liveData?.quotes || []).map((q) => [q.symbol, q])), [liveData]);
  const finalMap = useMemo(() => new Map((finalBatch?.items || []).map((x) => [x.symbol, x])), [finalBatch]);
  const watchlistSet = useMemo(() => new Set(watchlist.map((item) => item.symbol)), [watchlist]);
  const rows = useMemo(() => stocks
    .filter((row) => matchesFilter(row, filter, watchlistSet, finalMap.get(row.symbol)))
    .filter((row) => !query || `${row.symbol} ${row.name} ${row.sector}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (finalMap.get(b.symbol)?.live_strength || 0) - (finalMap.get(a.symbol)?.live_strength || 0) || b.quant_score - a.quant_score),
    [stocks, finalMap, filter, query, watchlistSet]);

  const counts = finalBatch?.counts || { ready: 0, wait: 0, avoid: 0 };
  const liveOk = liveData?.status === 'success';

  return <section className="p-8 md:p-12">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Quant Research</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Stocks Research Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Table loads immediately. Click Manual Final Scan when you want real VWAP, real 5m retest, and breadth status for all stocks. Research only.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={refreshTable} disabled={loading} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">{loading ? 'Refreshing...' : 'Refresh Table'}</button>
          <button onClick={runFinalScan} disabled={finalLoading} className="rounded-xl border border-blue-800 px-5 py-3 font-semibold text-blue-200 hover:bg-blue-950 disabled:opacity-50">{finalLoading ? 'Final Scan Running...' : 'Manual Final Scan'}</button>
              <a href="/paper" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800">Paper Trading</a>
              <a href="/paper/today" className="rounded-xl border border-yellow-800 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-500/20">Today Review</a>
              <a href="/paper/analytics" className="rounded-xl border border-emerald-800 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">Analytics</a>
              <a href="/paper/export" className="rounded-xl border border-blue-800 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20">Export</a>
          <button onClick={fetchDhanDaily} disabled={ingesting || finalLoading} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{ingesting ? 'Fetching Dhan...' : 'Fetch Dhan Daily'}</button>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}
      {finalLoading ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-100">Final scan is running in the background. Existing rows stay visible. This can take 30–90 seconds.</div> : null}
      {finalBatch?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-200">{finalBatch.note}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint="Start small, then expand" />
        <Metric label="Stocks Loaded" value={loading ? '...' : String(data?.count || 0)} hint={`Mode: ${data?.mode || 'checking'}`} />
        <Metric label="Live Feed" value={liveOk ? 'Connected' : 'Checking'} hint={`${liveData?.count || 0} LTP snapshots`} tone={liveOk ? 'win' : undefined} />
        <Metric label="Final Ready" value={String(counts.ready)} hint={finalBatch ? 'Last manual scan' : 'Not scanned yet'} tone={counts.ready > 0 ? 'win' : undefined} />
        <Metric label="Final Wait" value={String(counts.wait)} hint={finalBatch ? 'Last manual scan' : 'Not scanned yet'} />
        <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <InsightCard title="Ready" value={String(counts.ready)} hint="After manual scan" onClick={() => setFilter('Ready')} active={filter === 'Ready'} />
        <InsightCard title="Wait" value={String(counts.wait)} hint="After manual scan" onClick={() => setFilter('Wait')} active={filter === 'Wait'} />
        <InsightCard title="Avoid" value={String(counts.avoid)} hint="After manual scan" onClick={() => setFilter('Avoid')} active={filter === 'Avoid'} tone="loss" />
        <InsightCard title="Saved Watchlist" value={String(watchlist.length)} hint="Your saved stocks" onClick={() => setFilter('Saved Watchlist')} active={filter === 'Saved Watchlist'} />
        <InsightCard title="Breadth" value={finalBatch ? (finalBatch.breadth_supportive ? 'OK' : 'Weak') : 'Not scanned'} hint="From manual final scan" onClick={() => setFilter('All')} active={false} tone={finalBatch && !finalBatch.breadth_supportive ? 'loss' : undefined} />
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-white">{filter === 'All' ? 'Top Quant Picks' : filter}</h2>
            <p className="mt-1 text-sm text-slate-400">Final Status is manual/cached. The table will not keep resetting or spam the backend.</p>
          </div>
          <div className="flex flex-wrap gap-2">{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3 py-2 text-xs ${filter === f ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{f}</button>)}</div>
        </div>

        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol, company, or sector" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[2200px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500"><tr className="border-b border-slate-800"><th className="py-3">Symbol</th><th>Sector</th><th>Close</th><th>Live LTP</th><th>Live %</th><th>Strength</th><th>Signal</th><th className="min-w-[150px]">Final Status</th><th className="min-w-[220px] px-3">Next Action</th><th className="min-w-[300px] px-3">Watch Plan</th><th className="min-w-[110px]">VWAP</th><th>Retest</th><th>5D</th><th>Vol x</th><th>20D Pos</th><th>Score</th><th>Watchlist</th><th>Reason</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={17} className="py-10 text-center text-slate-500">Loading stock table...</td></tr> : null}
              {!loading && rows.length === 0 ? <tr><td colSpan={17} className="py-10 text-center text-slate-500">No stocks found.</td></tr> : null}
              {!loading && rows.map((row) => <Row key={row.symbol} row={row} quote={liveMap.get(row.symbol)} finalItem={finalMap.get(row.symbol)} isSaved={watchlistSet.has(row.symbol)} saving={savingSymbol === row.symbol} onAdd={saveWatchlist} onRemove={removeWatchlist} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>;
}

function Row({ row, quote, finalItem, isSaved, saving, onAdd, onRemove }: { row: StockRow; quote?: LiveQuote; finalItem?: FinalItem; isSaved: boolean; saving: boolean; onAdd: (row: StockRow, finalItem?: FinalItem) => void; onRemove: (symbol: string) => void }) {
  return <tr className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/40">
    <td className="py-4"><a href={`/stocks/${row.symbol}`} className="font-bold text-white hover:text-emerald-300">{row.symbol}</a><div className="text-xs text-slate-500">{row.name}</div></td>
    <td>{row.sector}</td>
    <td>{money(row.close)}</td>
    <td className="font-bold text-white">{quote?.ltp != null ? money(quote.ltp) : '-'}</td>
    <td className={Number(quote?.change_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{quote?.change_pct != null ? `${quote.change_pct}%` : '-'}</td>
    <td><Pill text={finalItem?.live_strength ? String(finalItem.live_strength) : '-'} tone={finalItem?.live_strength && finalItem.live_strength >= 70 ? 'win' : 'neutral'} /></td>
    <td><Pill text={finalItem?.signal || 'Not scanned'} tone={finalItem?.signal === 'Live Watch' ? 'win' : 'neutral'} /></td>
    <td><Pill text={finalItem?.final_status || 'Not scanned'} tone={finalItem?.tone || 'neutral'} /></td>
      <td className="min-w-[260px] px-3 text-xs font-semibold text-slate-200 whitespace-normal">{getNextAction(row, quote, finalItem)}</td>
      <td className="min-w-[300px] px-3"><WatchPlanCell plan={getWatchPlan(finalItem)} /></td>
    <td>{finalItem?.vwap ? money(finalItem.vwap) : '-'}</td>
    <td>{finalItem?.retest_low && finalItem?.retest_high ? `${money(finalItem.retest_low)}–${money(finalItem.retest_high)}` : finalItem?.retest_result || '-'}</td>
    <td className={row.return_5d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_5d_pct}%</td>
    <td>{row.volume_ratio}x</td>
    <td>{row.position_20d_pct}%</td>
    <td className={row.quant_score >= 70 ? 'font-bold text-emerald-300' : row.quant_score >= 45 ? 'font-bold text-yellow-300' : 'font-bold text-red-300'}>{row.quant_score}</td>
    <td>{isSaved ? <button disabled={saving} onClick={() => onRemove(row.symbol)} className="rounded-xl border border-red-800 px-3 py-2 text-xs text-red-200 hover:bg-red-950 disabled:opacity-60">{saving ? 'Removing...' : 'Remove'}</button> : <button disabled={saving} onClick={() => onAdd(row, finalItem)} className="rounded-xl border border-emerald-800 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950 disabled:opacity-60">{saving ? 'Saving...' : 'Add'}</button>}</td>
    <td className="max-w-[360px] text-xs text-slate-400">{finalItem?.reason || 'Click Manual Final Scan to calculate final gates.'}</td>
  </tr>;
}

function getNextAction(row: StockRow, quote?: LiveQuote, finalItem?: FinalItem): string {
  const status = finalItem?.final_status || '';
  const signal = finalItem?.signal || row.tag || '';
  const ltp = Number(quote?.ltp || 0);
  const vwap = Number(finalItem?.vwap || 0);
  const pos20 = Number(row.position_20d_pct || 0);

  if (!finalItem) return 'Run Manual Final Scan';

  if (status === 'Ready to Watch') return 'Wait trigger + valid 1:2 RR';
  if (status.includes('Below VWAP')) {
    if (vwap > 0) return `Reclaim VWAP above ${money(vwap)}`;
    return 'Wait for VWAP reclaim';
  }
  if (status.includes('Retest Failed')) return 'Avoid until retest resets';
  if (status.includes('Breadth Weak')) return 'Watch only; wait breadth';
  if (status.includes('Extended') || pos20 >= 90) return 'Do not chase; wait pullback';
  if (status.startsWith('Avoid')) return 'Skip for now';
  if (signal === 'Live Watch') {
    if (vwap > 0 && ltp > vwap) return 'Watch retest hold above VWAP';
    return 'Watch for confirmation';
  }
  if (status.startsWith('Wait')) return 'Wait for cleaner setup';

  return 'Research only';
}


function getWatchPlan(finalItem?: FinalItem): WatchPlan {
  return finalItem?.watch_plan || {
    entry_trigger: 'Run Manual Final Scan first',
    invalidation: 'Unknown until scan completes',
    target_1_2rr: 'Unknown until setup is valid',
    reason_to_avoid: finalItem?.reason || 'Click Manual Final Scan to calculate gates',
    teacher_action: 'Research only',
  };
}

function WatchPlanCell({ plan }: { plan: WatchPlan }) {
  return (
    <details className="min-w-[280px] max-w-[360px] rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
      <summary className="cursor-pointer list-none font-semibold text-yellow-300">
        Teacher: {plan.teacher_action || 'Research only'}
      </summary>

      <div className="mt-2 space-y-1 border-t border-slate-800 pt-2">
        <div>
          <span className="text-slate-500">Entry: </span>
          <span className="text-slate-200">{plan.entry_trigger || '-'}</span>
        </div>
        <div>
          <span className="text-slate-500">Stop: </span>
          <span className="text-slate-300">{plan.invalidation || '-'}</span>
        </div>
        <div>
          <span className="text-slate-500">Target: </span>
          <span className="text-emerald-300">{plan.target_1_2rr || '-'}</span>
        </div>
        <div>
          <span className="text-slate-500">Avoid: </span>
          <span className="text-slate-400">{plan.reason_to_avoid || '-'}</span>
        </div>
      </div>
    </details>
  );
}


function Pill({ text, tone }: { text: string; tone: 'win' | 'warn' | 'loss' | 'neutral' }) {
  const cls = tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300';
  return <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{text}</span>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function InsightCard({ title, value, hint, active, tone, onClick }: { title: string; value: string; hint: string; active: boolean; tone?: 'loss'; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800/60'}`}><div className="text-sm text-slate-400">{title}</div><div className={`mt-2 text-2xl font-bold ${tone === 'loss' ? 'text-red-300' : 'text-emerald-300'}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></button>;
}

function matchesFilter(row: StockRow, filter: Filter, watchlistSet: Set<string>, item?: FinalItem) {
  if (filter === 'All') return true;
  if (filter === 'Saved Watchlist') return watchlistSet.has(row.symbol);
  if (filter === 'Ready') return item?.final_status === 'Ready to Watch';
  if (filter === 'Wait') return Boolean(item?.final_status?.startsWith('Wait'));
  if (filter === 'Avoid') return Boolean(item?.final_status?.startsWith('Avoid'));
  if (filter === 'Live Watch') return item?.signal === 'Live Watch';
  if (filter === 'Retest Failed') return item?.retest_status === 'failed';
  if (filter === 'Below VWAP') return item?.above_vwap === false;
  if (filter === 'Volume Breakout') return row.volume_ratio >= 1.5;
  if (filter === 'Near 20D High') return row.position_20d_pct >= 85;
  return true;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
