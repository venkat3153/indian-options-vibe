'use client';

import { useEffect, useMemo, useState } from 'react';

type StockRow = {
  symbol: string;
  name: string;
  sector: string;
  close: number;
  change_1d_pct: number;
  return_5d_pct: number;
  return_20d_pct: number;
  volume_ratio: number;
  position_20d_pct: number;
  quant_score: number;
  tag: string;
  ai_reason: string;
};

type ApiResponse = { mode: string; universe?: string; count: number; stocks: StockRow[]; note?: string; error?: string };
type LiveQuote = { symbol: string; ltp: number | null; change_pct: number | null };
type LiveQuoteResponse = { status: string; count: number; quotes: LiveQuote[]; message?: string };
type WatchlistItem = { symbol: string; name?: string; sector?: string; quant_score?: number; live_signal?: string; reason?: string; status?: string; action_tag?: string; outcome?: string; source?: string };
type BatchFinalItem = {
  symbol: string;
  signal: string;
  live_strength: number;
  final_status: string;
  tone: 'win' | 'warn' | 'loss' | 'neutral';
  reason: string;
  vwap_status?: string;
  above_vwap?: boolean;
  vwap?: number;
  retest_status?: string;
  retest_result?: string;
  retest_low?: number;
  retest_high?: number;
};
type BatchFinalResponse = {
  status: string;
  count: number;
  breadth_supportive: boolean;
  breadth_message?: string;
  counts: { ready: number; wait: number; avoid: number };
  items: BatchFinalItem[];
  note?: string;
};

type ResearchFilter = 'All' | 'Saved Watchlist' | 'Ready' | 'Wait' | 'Avoid' | 'Live Watch' | 'Retest Failed' | 'Below VWAP' | 'Volume Breakout' | 'Near 20D High' | 'Weak / Avoid';

const FILTERS: ResearchFilter[] = ['All', 'Saved Watchlist', 'Ready', 'Wait', 'Avoid', 'Live Watch', 'Retest Failed', 'Below VWAP', 'Volume Breakout', 'Near 20D High', 'Weak / Avoid'];

export default function StocksResearchPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveQuoteResponse | null>(null);
  const [finalBatch, setFinalBatch] = useState<BatchFinalResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);
  const [savingSymbol, setSavingSymbol] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [filter, setFilter] = useState<ResearchFilter>('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  async function loadLiveQuotes() {
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

  async function loadFinalBatch() {
    try {
      setFinalLoading(true);
      const res = await fetch('http://localhost:8000/api/final-status/batch?limit=50');
      if (!res.ok) throw new Error(`Final status API returned ${res.status}`);
      setFinalBatch(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load final status batch');
    } finally {
      setFinalLoading(false);
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

  async function refreshAll() {
    await Promise.all([loadStocks(), loadLiveQuotes(), loadFinalBatch(), loadWatchlist()]);
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
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch Dhan daily candles');
    } finally {
      setIngesting(false);
    }
  }

  async function saveWatchlist(row: StockRow, finalItem?: BatchFinalItem) {
    try {
      setSavingSymbol(row.symbol);
      const status = finalItem?.final_status || 'Wait';
      const res = await fetch('http://localhost:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          quant_score: row.quant_score,
          live_signal: finalItem?.signal || 'Wait',
          reason: `${status}: ${finalItem?.reason || 'Saved from main research table.'}`,
          status: 'Watching',
          action_tag: status === 'Ready to Watch' ? 'Ready' : status.startsWith('Avoid') ? 'Avoid' : 'Wait',
          outcome: 'Pending',
          source: 'stocks_dashboard_final_batch',
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.error || `Watchlist save returned ${res.status}`);
      await loadWatchlist();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save watchlist');
    } finally {
      setSavingSymbol(null);
    }
  }

  async function removeFromWatchlist(symbol: string) {
    try {
      setSavingSymbol(symbol);
      const res = await fetch(`http://localhost:8000/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Watchlist remove returned ${res.status}`);
      await loadWatchlist();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove from watchlist');
    } finally {
      setSavingSymbol(null);
    }
  }

  useEffect(() => {
    refreshAll();
    const timer = window.setInterval(() => {
      loadLiveQuotes();
      loadFinalBatch();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const stocks = data?.stocks || [];
  const liveBySymbol = useMemo(() => new Map((liveData?.quotes || []).map((q) => [q.symbol, q])), [liveData]);
  const finalBySymbol = useMemo(() => new Map((finalBatch?.items || []).map((item) => [item.symbol, item])), [finalBatch]);
  const watchlistSet = useMemo(() => new Set(watchlist.map((item) => item.symbol)), [watchlist]);
  const rows = useMemo(() => {
    return stocks
      .filter((row) => matchesFilter(row, filter, watchlistSet, finalBySymbol.get(row.symbol)))
      .filter((row) => !query || `${row.symbol} ${row.name} ${row.sector}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (finalBySymbol.get(b.symbol)?.live_strength || 0) - (finalBySymbol.get(a.symbol)?.live_strength || 0) || b.quant_score - a.quant_score);
  }, [stocks, filter, watchlistSet, finalBySymbol, query]);

  const liveOk = liveData?.status === 'success';
  const liveStrongCount = (finalBatch?.items || []).filter((item) => item.live_strength >= 70).length;
  const counts = finalBatch?.counts || { ready: 0, wait: 0, avoid: 0 };

  return <section className="p-8 md:p-12">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Quant Research</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Stocks Research Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-400">NIFTY 50 research with real VWAP, real 5m retest, market breadth, final status labels, and watchlist planning. Research only.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={refreshAll} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
          <button onClick={() => { loadLiveQuotes(); loadFinalBatch(); }} disabled={liveLoading || finalLoading} className="rounded-xl border border-blue-800 px-5 py-3 font-semibold text-blue-200 hover:bg-blue-950 disabled:opacity-50">{liveLoading || finalLoading ? 'Scanning...' : 'Refresh Live + Final'}</button>
          <button onClick={fetchDhanDaily} disabled={ingesting} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{ingesting ? 'Fetching Dhan...' : 'Fetch Dhan Daily'}</button>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}
      {finalBatch?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-200">{finalBatch.note}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint="Start small, then expand" />
        <Metric label="Stocks Loaded" value={loading ? '...' : String(data?.count || 0)} hint={`Mode: ${data?.mode || 'checking'}`} />
        <Metric label="Live Feed" value={liveOk ? 'Connected' : 'Checking'} hint={`${liveData?.count || 0} LTP snapshots`} tone={liveOk ? 'win' : undefined} />
        <Metric label="Live Strength" value={String(liveStrongCount)} hint="Score 70+" tone="win" />
        <Metric label="Final Ready / Wait" value={`${counts.ready}/${counts.wait}`} hint="Batch final labels" tone={counts.ready > 0 ? 'win' : undefined} />
        <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <InsightCard title="Ready" value={String(counts.ready)} hint="All major gates clear" onClick={() => setFilter('Ready')} active={filter === 'Ready'} />
        <InsightCard title="Wait" value={String(counts.wait)} hint="Blocked by one or more gates" onClick={() => setFilter('Wait')} active={filter === 'Wait'} />
        <InsightCard title="Avoid" value={String(counts.avoid)} hint="Weak live / avoid" onClick={() => setFilter('Avoid')} active={filter === 'Avoid'} tone="loss" />
        <InsightCard title="Saved Watchlist" value={String(watchlist.length)} hint="Your saved stocks" onClick={() => setFilter('Saved Watchlist')} active={filter === 'Saved Watchlist'} />
        <InsightCard title="Breadth" value={finalBatch?.breadth_supportive ? 'OK' : 'Weak'} hint="Main market filter" onClick={() => setFilter('All')} active={false} tone={finalBatch?.breadth_supportive ? undefined : 'loss'} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-white">{filter === 'All' ? 'Top Quant Picks' : filter}</h2>
              <p className="mt-1 text-sm text-slate-400">Final Status now comes from the backend batch engine: real VWAP + real 5m retest + breadth.</p>
            </div>
            <div className="flex flex-wrap gap-2">{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3 py-2 text-xs ${filter === f ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{f}</button>)}</div>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol, company, or sector" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1800px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500"><tr className="border-b border-slate-800"><th className="py-3">Symbol</th><th>Sector</th><th>Close</th><th>Live LTP</th><th>Live %</th><th>Live Strength</th><th>Signal</th><th>Final Status</th><th>VWAP</th><th>Retest</th><th>5D</th><th>Vol x</th><th>20D Pos</th><th>Score</th><th>Watchlist</th><th>Reason</th></tr></thead>
              <tbody>
                {loading || finalLoading ? <tr><td colSpan={16} className="py-10 text-center text-slate-500">Loading final research data...</td></tr> : null}
                {!loading && !finalLoading && rows.length === 0 ? <tr><td colSpan={16} className="py-10 text-center text-slate-500">No stocks found for this filter.</td></tr> : null}
                {!loading && !finalLoading && rows.map((row) => <StockTableRow key={row.symbol} row={row} quote={liveBySymbol.get(row.symbol)} finalItem={finalBySymbol.get(row.symbol)} isSaved={watchlistSet.has(row.symbol)} saving={savingSymbol === row.symbol} onAdd={saveWatchlist} onRemove={removeFromWatchlist} />)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Decision Summary</h2>
          <p className="mt-1 text-sm text-slate-400">Use this before saving ideas. The backend now scans final status in batch.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><MiniStat label="Ready" value={counts.ready} tone="win" /><MiniStat label="Wait" value={counts.wait} /><MiniStat label="Avoid" value={counts.avoid} tone="loss" /><MiniStat label="Breadth" valueText={finalBatch?.breadth_supportive ? 'Supportive' : 'Weak'} tone={finalBatch?.breadth_supportive ? 'win' : undefined} /></div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">{finalBatch?.breadth_message || 'Waiting for breadth data.'}</div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Saved Watchlist</h3>
          <div className="mt-3 grid gap-3">{watchlist.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">No saved ideas yet.</div> : null}{watchlist.slice(0, 6).map((item) => <WatchlistMiniCard key={item.symbol} item={item} quote={liveBySymbol.get(item.symbol)} saving={savingSymbol === item.symbol} onRemove={removeFromWatchlist} />)}</div>
        </div>
      </div>
    </div>
  </section>;
}

function StockTableRow({ row, quote, finalItem, isSaved, saving, onAdd, onRemove }: { row: StockRow; quote?: LiveQuote; finalItem?: BatchFinalItem; isSaved: boolean; saving: boolean; onAdd: (row: StockRow, finalItem?: BatchFinalItem) => void; onRemove: (symbol: string) => void }) {
  const strength = finalItem?.live_strength ?? 0;
  const signal = finalItem?.signal || 'Wait';
  return <tr className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/40">
    <td className="py-4"><a href={`/stocks/${row.symbol}`} className="font-bold text-white hover:text-emerald-300">{row.symbol}</a><div className="text-xs text-slate-500">{row.name}</div></td>
    <td>{row.sector}</td><td>{money(row.close)}</td><td className="font-bold text-white">{quote?.ltp != null ? money(quote.ltp) : '-'}</td><td className={Number(quote?.change_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{quote?.change_pct != null ? `${quote.change_pct}%` : '-'}</td>
    <td><StrengthPill value={strength} /></td><td><SignalText label={signal} /></td><td><FinalStatusBadge item={finalItem} /></td><td>{finalItem?.vwap ? money(finalItem.vwap) : '-'}</td><td>{finalItem?.retest_low && finalItem?.retest_high ? `${money(finalItem.retest_low)}–${money(finalItem.retest_high)}` : finalItem?.retest_result || '-'}</td>
    <td className={row.return_5d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_5d_pct}%</td><td>{row.volume_ratio}x</td><td>{row.position_20d_pct}%</td><td><span className={row.quant_score >= 70 ? 'font-bold text-emerald-300' : row.quant_score >= 45 ? 'font-bold text-yellow-300' : 'font-bold text-red-300'}>{row.quant_score}</span></td>
    <td>{isSaved ? <button disabled={saving} onClick={() => onRemove(row.symbol)} className="rounded-xl border border-red-800 px-3 py-2 text-xs text-red-200 hover:bg-red-950 disabled:opacity-60">{saving ? 'Removing...' : 'Remove'}</button> : <button disabled={saving} onClick={() => onAdd(row, finalItem)} className="rounded-xl border border-emerald-800 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950 disabled:opacity-60">{saving ? 'Saving...' : 'Add'}</button>}</td>
    <td className="max-w-[320px] text-xs text-slate-400">{finalItem?.reason || 'Waiting for batch final status.'}</td>
  </tr>;
}

function FinalStatusBadge({ item }: { item?: BatchFinalItem }) { const tone = item?.tone || 'neutral'; const cls = tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <span title={item?.reason} className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{item?.final_status || 'Checking'}</span>; }
function SignalText({ label }: { label: string }) { const cls = label === 'Live Watch' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : label.includes('Avoid') ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : label.includes('Weak') ? 'border-red-700 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{label}</span>; }
function StrengthPill({ value }: { value: number }) { const cls = value >= 70 ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : value >= 50 ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-red-700 bg-red-500/10 text-red-300'; return <span className={`inline-flex min-w-12 justify-center rounded-full border px-2 py-1 text-xs font-bold ${cls}`}>{value}</span>; }
function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>; }
function InsightCard({ title, value, hint, active, tone, onClick }: { title: string; value: string; hint: string; active: boolean; tone?: 'loss'; onClick: () => void }) { return <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800/60'}`}><div className="text-sm text-slate-400">{title}</div><div className={`mt-2 text-2xl font-bold ${tone === 'loss' ? 'text-red-300' : 'text-emerald-300'}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></button>; }
function MiniStat({ label, value, valueText, tone }: { label: string; value?: number; valueText?: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-slate-500">{label}</div><div className={`mt-1 text-sm font-bold ${cls}`}>{valueText ?? value ?? 0}</div></div>; }
function WatchlistMiniCard({ item, quote, saving, onRemove }: { item: WatchlistItem; quote?: LiveQuote; saving: boolean; onRemove: (symbol: string) => void }) { const action = item.action_tag || 'Wait'; const tone = action === 'Ready' ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300' : action === 'Avoid' ? 'border-red-800 bg-red-500/10 text-red-300' : 'border-yellow-800 bg-yellow-500/10 text-yellow-300'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-white">{item.symbol}</div><div className="text-xs text-slate-500">{item.name || item.sector || 'Saved idea'}</div></div><div className="text-right"><div className="text-sm font-bold text-emerald-300">{quote?.ltp != null ? money(quote.ltp) : '-'}</div><div className={Number(quote?.change_pct || 0) >= 0 ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>{quote?.change_pct != null ? `${quote.change_pct}%` : ''}</div></div></div><div className="mt-3 flex items-center justify-between gap-2"><span className={`rounded-full border px-2 py-1 text-xs ${tone}`}>{action}</span><button disabled={saving} onClick={() => onRemove(item.symbol || '')} className="rounded-xl border border-red-900 px-3 py-2 text-xs text-red-200 hover:bg-red-950 disabled:opacity-60">Remove</button></div></div>; }
function matchesFilter(row: StockRow, filter: ResearchFilter, watchlistSet: Set<string>, finalItem?: BatchFinalItem) { if (filter === 'All') return true; if (filter === 'Saved Watchlist') return watchlistSet.has(row.symbol); if (filter === 'Ready') return finalItem?.final_status === 'Ready to Watch'; if (filter === 'Wait') return Boolean(finalItem?.final_status?.startsWith('Wait')); if (filter === 'Avoid') return Boolean(finalItem?.final_status?.startsWith('Avoid')); if (filter === 'Live Watch') return finalItem?.signal === 'Live Watch'; if (filter === 'Retest Failed') return finalItem?.retest_status === 'failed'; if (filter === 'Below VWAP') return finalItem?.above_vwap === false; if (filter === 'Volume Breakout') return row.volume_ratio >= 1.5; if (filter === 'Near 20D High') return row.position_20d_pct >= 85; if (filter === 'Weak / Avoid') return row.quant_score < 45 || row.return_5d_pct < -1 || row.return_20d_pct < -2 || finalItem?.signal === 'Weak Live'; return true; }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
