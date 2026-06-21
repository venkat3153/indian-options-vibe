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

type ApiResponse = {
  mode: string;
  source?: string;
  universe?: string;
  count: number;
  stocks: StockRow[];
  note?: string;
  error?: string;
};

type LiveQuote = {
  symbol: string;
  security_id: string;
  ltp: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
};

type LiveQuoteResponse = {
  status: string;
  mode: string;
  source: string;
  count: number;
  quotes: LiveQuote[];
  message?: string;
};

type WatchlistItem = {
  symbol: string;
  name?: string;
  sector?: string;
  quant_score?: number;
  live_signal?: string;
  reason?: string;
  status?: string;
  action_tag?: string;
  outcome?: string;
  source?: string;
};

type BreadthResponse = {
  status: string;
  supportive: boolean;
  positive?: number;
  negative?: number;
  flat?: number;
  positive_pct?: number;
  avg_change_pct?: number;
  message?: string;
};

type ResearchFilter =
  | 'All'
  | 'Saved Watchlist'
  | 'Live Watch'
  | 'Extended / Avoid'
  | 'Volume Breakout'
  | 'Near 20D High'
  | 'Weak / Avoid'
  | 'Strong watchlist'
  | 'Improving'
  | 'Neutral';

type LiveSignal = {
  label: 'Live Watch' | 'Extended / Avoid' | 'Wait' | 'Weak Live';
  reason: string;
  tone: 'win' | 'warn' | 'loss' | 'neutral';
};

type FinalStatus = {
  label: 'Ready to Watch' | 'Wait: Breadth Weak' | 'Wait: Extended' | 'Avoid: Weak Live' | 'Wait';
  reason: string;
  tone: 'win' | 'warn' | 'loss' | 'neutral';
};

const FILTERS: ResearchFilter[] = [
  'All',
  'Saved Watchlist',
  'Live Watch',
  'Extended / Avoid',
  'Volume Breakout',
  'Near 20D High',
  'Weak / Avoid',
  'Strong watchlist',
  'Improving',
  'Neutral',
];

export default function StocksResearchPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveQuoteResponse | null>(null);
  const [breadth, setBreadth] = useState<BreadthResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
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
      setLiveData({
        status: 'error',
        mode: 'frontend_error',
        source: 'none',
        count: 0,
        quotes: [],
        message: e instanceof Error ? e.message : 'Could not load live quotes',
      });
    } finally {
      setLiveLoading(false);
    }
  }

  async function loadBreadth() {
    try {
      const res = await fetch('http://localhost:8000/api/market/breadth');
      if (!res.ok) throw new Error(`Breadth API returned ${res.status}`);
      setBreadth(await res.json());
    } catch {
      setBreadth(null);
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

  async function fetchDhanDaily() {
    try {
      setIngesting(true);
      const res = await fetch('http://localhost:8000/api/research/ingest/dhan-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nifty50', days: 180, limit: 50 }),
      });
      if (!res.ok) throw new Error(`Dhan ingest API returned ${res.status}`);
      await loadStocks();
      await loadLiveQuotes();
      await loadBreadth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch Dhan daily candles');
    } finally {
      setIngesting(false);
    }
  }

  async function saveWatchlist(payload: WatchlistItem) {
    try {
      setSavingSymbol(payload.symbol);
      const res = await fetch('http://localhost:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  async function addToWatchlist(row: StockRow, quote?: LiveQuote) {
    const signal = getLiveSignal(row, quote);
    const status = getFinalStatus(row, quote, breadth);
    await saveWatchlist({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      quant_score: row.quant_score,
      live_signal: signal.label,
      reason: `${status.label}: ${status.reason}. ${signal.reason}`,
      status: 'Watching',
      action_tag: status.label === 'Ready to Watch' ? 'Ready' : status.label.startsWith('Avoid') ? 'Avoid' : 'Wait',
      outcome: 'Pending',
      source: 'stocks_dashboard',
    });
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
    loadStocks();
    loadLiveQuotes();
    loadBreadth();
    loadWatchlist();
    const liveTimer = window.setInterval(loadLiveQuotes, 15000);
    const breadthTimer = window.setInterval(loadBreadth, 15000);
    return () => {
      window.clearInterval(liveTimer);
      window.clearInterval(breadthTimer);
    };
  }, []);

  const stocks = data?.stocks || [];
  const liveBySymbol = useMemo(() => new Map((liveData?.quotes || []).map((q) => [q.symbol, q])), [liveData]);
  const watchlistSet = useMemo(() => new Set(watchlist.map((item) => item.symbol)), [watchlist]);
  const counts = useMemo(() => getFilterCounts(stocks, liveBySymbol, watchlistSet), [stocks, liveBySymbol, watchlistSet]);
  const liveStrongCount = useMemo(() => stocks.filter((row) => getLiveStrength(row, liveBySymbol.get(row.symbol)) >= 70).length, [stocks, liveBySymbol]);
  const finalCounts = useMemo(() => getFinalCounts(stocks, liveBySymbol, breadth), [stocks, liveBySymbol, breadth]);
  const rows = useMemo(() => {
    return stocks
      .filter((row) => matchesFilter(row, filter, liveBySymbol.get(row.symbol), watchlistSet))
      .filter((row) => !query || `${row.symbol} ${row.name} ${row.sector}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => getLiveStrength(b, liveBySymbol.get(b.symbol)) - getLiveStrength(a, liveBySymbol.get(a.symbol)) || b.quant_score - a.quant_score);
  }, [stocks, filter, liveBySymbol, watchlistSet, query]);

  const liveOk = liveData?.status === 'success';
  const actionCounts = getActionCounts(watchlist);

  return <section className="p-8 md:p-12">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Quant Research</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Stocks Research Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-400">NIFTY 50 research with Dhan candles, live LTP, live strength, final status labels, and watchlist planning. Research only.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { loadStocks(); loadLiveQuotes(); loadBreadth(); loadWatchlist(); }} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
          <button onClick={loadLiveQuotes} disabled={liveLoading} className="rounded-xl border border-blue-800 px-5 py-3 font-semibold text-blue-200 hover:bg-blue-950 disabled:opacity-50">{liveLoading ? 'Live...' : 'Refresh Live'}</button>
          <button onClick={fetchDhanDaily} disabled={ingesting} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{ingesting ? 'Fetching Dhan...' : 'Fetch Dhan Daily'}</button>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}
      {data?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-200">{data.note}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint="Start small, then expand" />
        <Metric label="Stocks Loaded" value={loading ? '...' : String(data?.count || 0)} hint={`Mode: ${data?.mode || 'checking'}`} />
        <Metric label="Live Feed" value={liveOk ? 'Connected' : 'Checking'} hint={`${liveData?.count || 0} LTP snapshots`} tone={liveOk ? 'win' : undefined} />
        <Metric label="Live Strength" value={String(liveStrongCount)} hint="Score 70+" tone="win" />
        <Metric label="Ready / Wait" value={`${finalCounts.ready}/${finalCounts.wait}`} hint="Final status" tone={finalCounts.ready > 0 ? 'win' : undefined} />
        <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <InsightCard title="Saved Watchlist" value={String(watchlist.length)} hint="Your saved stocks" onClick={() => setFilter('Saved Watchlist')} active={filter === 'Saved Watchlist'} />
        <InsightCard title="Live Watch" value={String(counts['Live Watch'])} hint="LTP positive + setup" onClick={() => setFilter('Live Watch')} active={filter === 'Live Watch'} />
        <InsightCard title="Volume Breakout" value={String(counts['Volume Breakout'])} hint="Volume 1.5x+" onClick={() => setFilter('Volume Breakout')} active={filter === 'Volume Breakout'} />
        <InsightCard title="Near 20D High" value={String(counts['Near 20D High'])} hint="Breakout zone" onClick={() => setFilter('Near 20D High')} active={filter === 'Near 20D High'} />
        <InsightCard title="Weak / Avoid" value={String(counts['Weak / Avoid'])} hint="Weak momentum" onClick={() => setFilter('Weak / Avoid')} active={filter === 'Weak / Avoid'} tone="loss" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-white">{filter === 'All' ? 'Top Quant Picks' : filter}</h2>
              <p className="mt-1 text-sm text-slate-400">Final Status now includes market breadth. Strong stock + weak breadth stays Wait.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-xl border px-3 py-2 text-xs ${filter === f ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{f}</button>)}
            </div>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol, company, or sector" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3">Symbol</th>
                  <th>Sector</th>
                  <th>Close</th>
                  <th>Live LTP</th>
                  <th>Live %</th>
                  <th>Live Strength</th>
                  <th>Signal</th>
                  <th>Final Status</th>
                  <th>1D</th>
                  <th>5D</th>
                  <th>Vol x</th>
                  <th>20D Pos</th>
                  <th>Score</th>
                  <th>Watchlist</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={15} className="py-10 text-center text-slate-500">Loading research data...</td></tr> : null}
                {!loading && rows.length === 0 ? <tr><td colSpan={15} className="py-10 text-center text-slate-500">No stocks found for this filter.</td></tr> : null}
                {!loading && rows.map((row) => <StockTableRow key={row.symbol} row={row} quote={liveBySymbol.get(row.symbol)} breadth={breadth} isSaved={watchlistSet.has(row.symbol)} saving={savingSymbol === row.symbol} onAdd={addToWatchlist} onRemove={removeFromWatchlist} />)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Decision Summary</h2>
          <p className="mt-1 text-sm text-slate-400">Use this before saving ideas. Breadth weak means wait even if stock-level data is strong.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <MiniStat label="Ready" value={finalCounts.ready} tone="win" />
            <MiniStat label="Wait" value={finalCounts.wait} />
            <MiniStat label="Avoid" value={finalCounts.avoid} tone="loss" />
            <MiniStat label="Breadth" valueText={breadth?.supportive ? 'Supportive' : breadth ? 'Weak' : 'Checking'} tone={breadth?.supportive ? 'win' : undefined} />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            {breadth?.message || 'Waiting for breadth data.'}
          </div>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Saved Watchlist</h3>
          <div className="mt-3 grid gap-3">
            {watchlist.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">No saved ideas yet.</div> : null}
            {watchlist.slice(0, 6).map((item) => <WatchlistMiniCard key={item.symbol} item={item} quote={liveBySymbol.get(item.symbol)} saving={savingSymbol === item.symbol} onRemove={removeFromWatchlist} />)}
          </div>
        </div>
      </div>
    </div>
  </section>;
}

function StockTableRow({ row, quote, breadth, isSaved, saving, onAdd, onRemove }: { row: StockRow; quote?: LiveQuote; breadth: BreadthResponse | null; isSaved: boolean; saving: boolean; onAdd: (row: StockRow, quote?: LiveQuote) => void; onRemove: (symbol: string) => void }) {
  const signal = getLiveSignal(row, quote);
  const strength = getLiveStrength(row, quote);
  const finalStatus = getFinalStatus(row, quote, breadth);

  return <tr className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/40">
    <td className="py-4"><a href={`/stocks/${row.symbol}`} className="font-bold text-white hover:text-emerald-300">{row.symbol}</a><div className="text-xs text-slate-500">{row.name}</div></td>
    <td>{row.sector}</td>
    <td>{money(row.close)}</td>
    <td className="font-bold text-white">{quote?.ltp != null ? money(quote.ltp) : '-'}</td>
    <td className={Number(quote?.change_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{quote?.change_pct != null ? `${quote.change_pct}%` : '-'}</td>
    <td><StrengthPill value={strength} /></td>
    <td><SignalBadge signal={signal} /></td>
    <td><FinalStatusBadge status={finalStatus} /></td>
    <td className={row.change_1d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.change_1d_pct}%</td>
    <td className={row.return_5d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_5d_pct}%</td>
    <td>{row.volume_ratio}x</td>
    <td>{row.position_20d_pct}%</td>
    <td><span className={row.quant_score >= 70 ? 'font-bold text-emerald-300' : row.quant_score >= 45 ? 'font-bold text-yellow-300' : 'font-bold text-red-300'}>{row.quant_score}</span></td>
    <td>{isSaved ? <button disabled={saving} onClick={() => onRemove(row.symbol)} className="rounded-xl border border-red-800 px-3 py-2 text-xs text-red-200 hover:bg-red-950 disabled:opacity-60">{saving ? 'Removing...' : 'Remove'}</button> : <button disabled={saving} onClick={() => onAdd(row, quote)} className="rounded-xl border border-emerald-800 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950 disabled:opacity-60">{saving ? 'Saving...' : 'Add'}</button>}</td>
    <td className="max-w-[260px] text-xs text-slate-400">{finalStatus.reason}</td>
  </tr>;
}

function WatchlistMiniCard({ item, quote, saving, onRemove }: { item: WatchlistItem; quote?: LiveQuote; saving: boolean; onRemove: (symbol: string) => void }) {
  const action = item.action_tag || 'Wait';
  const tone = action === 'Ready' ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300' : action === 'Avoid' ? 'border-red-800 bg-red-500/10 text-red-300' : 'border-yellow-800 bg-yellow-500/10 text-yellow-300';
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="font-bold text-white">{item.symbol}</div><div className="text-xs text-slate-500">{item.name || item.sector || 'Saved idea'}</div></div>
      <div className="text-right"><div className="text-sm font-bold text-emerald-300">{quote?.ltp != null ? money(quote.ltp) : '-'}</div><div className={Number(quote?.change_pct || 0) >= 0 ? 'text-xs text-emerald-300' : 'text-xs text-red-300'}>{quote?.change_pct != null ? `${quote.change_pct}%` : ''}</div></div>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className={`rounded-full border px-2 py-1 text-xs ${tone}`}>{action}</span>
      <button disabled={saving} onClick={() => onRemove(item.symbol)} className="rounded-xl border border-red-900 px-3 py-2 text-xs text-red-200 hover:bg-red-950 disabled:opacity-60">Remove</button>
    </div>
  </div>;
}

function FinalStatusBadge({ status }: { status: FinalStatus }) {
  const cls = status.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : status.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : status.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300';
  return <span title={status.reason} className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{status.label}</span>;
}

function MiniStat({ label, value, valueText, tone }: { label: string; value?: number; valueText?: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-slate-500">{label}</div><div className={`mt-1 text-sm font-bold ${cls}`}>{valueText ?? value ?? 0}</div></div>;
}

function SignalBadge({ signal }: { signal: LiveSignal }) {
  const cls = signal.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : signal.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : signal.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-300';
  return <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{signal.label}</span>;
}

function StrengthPill({ value }: { value: number }) {
  const cls = value >= 70 ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : value >= 50 ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-red-700 bg-red-500/10 text-red-300';
  return <span className={`inline-flex min-w-12 justify-center rounded-full border px-2 py-1 text-xs font-bold ${cls}`}>{value}</span>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function InsightCard({ title, value, hint, active, tone, onClick }: { title: string; value: string; hint: string; active: boolean; tone?: 'loss'; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800/60'}`}><div className="text-sm text-slate-400">{title}</div><div className={`mt-2 text-2xl font-bold ${tone === 'loss' ? 'text-red-300' : 'text-emerald-300'}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></button>;
}

function matchesFilter(row: StockRow, filter: ResearchFilter, quote: LiveQuote | undefined, watchlistSet: Set<string>) {
  const signal = getLiveSignal(row, quote);
  if (filter === 'All') return true;
  if (filter === 'Saved Watchlist') return watchlistSet.has(row.symbol);
  if (filter === 'Live Watch') return signal.label === 'Live Watch';
  if (filter === 'Extended / Avoid') return signal.label === 'Extended / Avoid';
  if (filter === 'Volume Breakout') return row.volume_ratio >= 1.5;
  if (filter === 'Near 20D High') return row.position_20d_pct >= 85;
  if (filter === 'Weak / Avoid') return row.quant_score < 45 || row.return_5d_pct < -1 || row.return_20d_pct < -2 || signal.label === 'Weak Live';
  return row.tag === filter;
}

function getFilterCounts(rows: StockRow[], liveBySymbol: Map<string, LiveQuote>, watchlistSet: Set<string>) {
  return {
    'Saved Watchlist': watchlistSet.size,
    'Live Watch': rows.filter((row) => matchesFilter(row, 'Live Watch', liveBySymbol.get(row.symbol), watchlistSet)).length,
    'Extended / Avoid': rows.filter((row) => matchesFilter(row, 'Extended / Avoid', liveBySymbol.get(row.symbol), watchlistSet)).length,
    'Volume Breakout': rows.filter((row) => row.volume_ratio >= 1.5).length,
    'Near 20D High': rows.filter((row) => row.position_20d_pct >= 85).length,
    'Weak / Avoid': rows.filter((row) => matchesFilter(row, 'Weak / Avoid', liveBySymbol.get(row.symbol), watchlistSet)).length,
  };
}

function getFinalCounts(rows: StockRow[], liveBySymbol: Map<string, LiveQuote>, breadth: BreadthResponse | null) {
  const statuses = rows.map((row) => getFinalStatus(row, liveBySymbol.get(row.symbol), breadth));
  return {
    ready: statuses.filter((s) => s.label === 'Ready to Watch').length,
    wait: statuses.filter((s) => s.label.startsWith('Wait')).length,
    avoid: statuses.filter((s) => s.label.startsWith('Avoid')).length,
  };
}

function getActionCounts(items: WatchlistItem[]) {
  return {
    Wait: items.filter((item) => !item.action_tag || item.action_tag === 'Wait').length,
    Ready: items.filter((item) => item.action_tag === 'Ready').length,
    Avoid: items.filter((item) => item.action_tag === 'Avoid').length,
    Review: items.filter((item) => item.action_tag === 'Review').length,
  };
}

function getLiveStrength(row: StockRow, quote?: LiveQuote) {
  const liveChange = Number(quote?.change_pct ?? 0);
  let score = 35;
  score += Math.min(25, Math.max(-15, liveChange * 8));
  score += Math.min(20, row.quant_score * 0.2);
  if (row.volume_ratio >= 1.5) score += 12;
  if (row.position_20d_pct >= 85) score += 10;
  if (row.return_5d_pct > 2) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getLiveSignal(row: StockRow, quote?: LiveQuote): LiveSignal {
  const liveChange = Number(quote?.change_pct ?? 0);
  const strength = getLiveStrength(row, quote);
  if (liveChange < -1 || strength < 35) return { label: 'Weak Live', tone: 'loss', reason: 'Live move is weak or against the setup. Avoid fresh planning.' };
  if (row.position_20d_pct >= 95 && liveChange >= 1) return { label: 'Extended / Avoid', tone: 'warn', reason: 'Price is near the top of its range. Do not chase; wait for pullback or retest.' };
  if (liveChange >= 0 && strength >= 70) return { label: 'Live Watch', tone: 'win', reason: `Live strength ${strength}/100 setup is present. Add to watchlist only; wait for chart confirmation.` };
  return { label: 'Wait', tone: 'neutral', reason: `Live strength ${strength}/100. Keep as research only.` };
}

function getFinalStatus(row: StockRow, quote: LiveQuote | undefined, breadth: BreadthResponse | null): FinalStatus {
  const signal = getLiveSignal(row, quote);
  const strength = getLiveStrength(row, quote);
  if (breadth && !breadth.supportive) {
    return { label: 'Wait: Breadth Weak', tone: 'warn', reason: `Market breadth is weak: ${breadth.positive ?? '-'} positive, ${breadth.negative ?? '-'} negative, avg ${breadth.avg_change_pct ?? '-'}%.` };
  }
  if (signal.label === 'Weak Live') return { label: 'Avoid: Weak Live', tone: 'loss', reason: signal.reason };
  if (signal.label === 'Extended / Avoid') return { label: 'Wait: Extended', tone: 'warn', reason: signal.reason };
  if (signal.label === 'Live Watch' && strength >= 70) return { label: 'Ready to Watch', tone: 'win', reason: 'Stock-level setup and market filter are supportive. Still wait for chart confirmation.' };
  return { label: 'Wait', tone: 'neutral', reason: 'Setup is not strong enough for Ready. Keep on research watch only.' };
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}
