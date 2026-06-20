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

type IngestResult = {
  status: string;
  mode: string;
  symbols_attempted?: number;
  candles_saved?: number;
  failed_count?: number;
  message?: string;
  note?: string;
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
  updated_at?: string;
  count: number;
  quotes: LiveQuote[];
  message?: string;
  note?: string;
  cache?: string;
};

type ResearchFilter =
  | 'All'
  | 'Live Watch'
  | 'Extended / Avoid'
  | 'Top Momentum'
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

const RESEARCH_FILTERS: ResearchFilter[] = [
  'All',
  'Live Watch',
  'Extended / Avoid',
  'Top Momentum',
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
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ResearchFilter>('All');
  const [query, setQuery] = useState('');

  async function loadStocks() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/research/stocks');
      if (!response.ok) throw new Error(`Research API returned ${response.status}`);
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load stocks research');
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveQuotes() {
    try {
      setLiveLoading(true);
      const response = await fetch('http://localhost:8000/api/live/quotes?limit=50');
      if (!response.ok) throw new Error(`Live API returned ${response.status}`);
      const json = await response.json();
      setLiveData(json);
    } catch (err) {
      setLiveData({
        status: 'error',
        mode: 'frontend_error',
        source: 'none',
        count: 0,
        quotes: [],
        message: err instanceof Error ? err.message : 'Could not load live quotes',
      });
    } finally {
      setLiveLoading(false);
    }
  }

  async function seedData() {
    try {
      setSeeding(true);
      setIngestResult(null);
      const response = await fetch('http://localhost:8000/api/research/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nifty50' }),
      });
      if (!response.ok) throw new Error(`Seed API returned ${response.status}`);
      await loadStocks();
      await loadLiveQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not seed research data');
    } finally {
      setSeeding(false);
    }
  }

  async function fetchDhanDaily() {
    try {
      setIngesting(true);
      setIngestResult(null);
      const response = await fetch('http://localhost:8000/api/research/ingest/dhan-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nifty50', days: 180, limit: 50 }),
      });
      if (!response.ok) throw new Error(`Dhan ingest API returned ${response.status}`);
      const json = await response.json();
      setIngestResult(json);
      await loadStocks();
      await loadLiveQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch Dhan daily candles');
    } finally {
      setIngesting(false);
    }
  }

  useEffect(() => {
    loadStocks();
    loadLiveQuotes();
    const timer = window.setInterval(loadLiveQuotes, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const allStocks = data?.stocks || [];
  const liveBySymbol = useMemo(() => {
    const map = new Map<string, LiveQuote>();
    (liveData?.quotes || []).forEach((quote) => map.set(quote.symbol, quote));
    return map;
  }, [liveData]);

  const filteredRows = useMemo(() => {
    return allStocks.filter((row) => {
      const quote = liveBySymbol.get(row.symbol);
      const matchesResearchFilter = matchesFilter(row, filter, quote);
      const text = `${row.symbol} ${row.name} ${row.sector}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      return matchesResearchFilter && matchesQuery;
    });
  }, [allStocks, liveBySymbol, filter, query]);

  const rows = useMemo(() => sortByFilter(filteredRows, filter, liveBySymbol), [filteredRows, filter, liveBySymbol]);
  const leaders = rows.slice(0, 5);
  const sectorRows = useMemo(() => getSectorRows(allStocks), [allStocks]);
  const filterCounts = useMemo(() => getFilterCounts(allStocks, liveBySymbol), [allStocks, liveBySymbol]);
  const strongestSector = sectorRows[0];
  const watchlistCount = allStocks.filter((row) => row.quant_score >= 70).length;
  const liveOk = liveData?.status === 'success';
  const liveWatchCount = filterCounts['Live Watch'];
  const extendedCount = filterCounts['Extended / Avoid'];

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Quant Research</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Stocks Research Dashboard</h1>
            <p className="mt-2 max-w-3xl text-slate-400">NIFTY 50 first. Daily Dhan historical candles power research. Live scanner badges use Dhan LTP snapshots. Full WebSocket scanner comes later.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { loadStocks(); loadLiveQuotes(); }} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
            <button onClick={loadLiveQuotes} disabled={liveLoading} className="rounded-xl border border-blue-800 px-5 py-3 font-semibold text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:text-slate-500">{liveLoading ? 'Live...' : 'Refresh Live'}</button>
            <button onClick={seedData} disabled={seeding || ingesting} className="rounded-xl border border-emerald-800 px-5 py-3 font-semibold text-emerald-200 hover:bg-emerald-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500">{seeding ? 'Seeding...' : 'Seed NIFTY 50'}</button>
            <button onClick={fetchDhanDaily} disabled={seeding || ingesting} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{ingesting ? 'Fetching Dhan...' : 'Fetch Dhan Daily'}</button>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}
        {ingestResult ? <div className="mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-200">Dhan ingest: {ingestResult.status} • Symbols: {ingestResult.symbols_attempted ?? 0} • Candles saved: {ingestResult.candles_saved ?? 0} • Failed: {ingestResult.failed_count ?? 0} {ingestResult.message ? `• ${ingestResult.message}` : ''}</div> : null}
        {liveData?.message ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Live feed: {liveData.message}</div> : null}
        {data?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-200">{data.note}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-6">
          <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint="Start small, then expand" />
          <Metric label="Stocks Loaded" value={loading ? '...' : String(data?.count || 0)} hint={`Mode: ${data?.mode || 'checking'}`} />
          <Metric label="Data Source" value={data?.source || 'checking'} hint="Historical daily candles" />
          <Metric label="Live Feed" value={liveOk ? 'Connected' : 'Checking'} hint={`${liveData?.count || 0} LTP snapshots`} tone={liveOk ? 'win' : undefined} />
          <Metric label="Live Watch" value={String(liveWatchCount)} hint="Live strength + setup" tone="win" />
          <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <InsightCard title="Live Watch" value={String(liveWatchCount)} hint="LTP positive + setup confirmed" onClick={() => setFilter('Live Watch')} active={filter === 'Live Watch'} />
          <InsightCard title="Extended / Avoid" value={String(extendedCount)} hint="Too extended; do not chase" onClick={() => setFilter('Extended / Avoid')} active={filter === 'Extended / Avoid'} tone="loss" />
          <InsightCard title="Volume Breakout" value={String(filterCounts['Volume Breakout'])} hint="Volume 1.5x+ vs 20D average" onClick={() => setFilter('Volume Breakout')} active={filter === 'Volume Breakout'} />
          <InsightCard title="Near 20D High" value={String(filterCounts['Near 20D High'])} hint="Price position 85%+ in range" onClick={() => setFilter('Near 20D High')} active={filter === 'Near 20D High'} />
          <InsightCard title="Weak / Avoid" value={String(filterCounts['Weak / Avoid'])} hint="Weak score or negative momentum" onClick={() => setFilter('Weak / Avoid')} active={filter === 'Weak / Avoid'} tone="loss" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">{filter === 'All' ? 'Top Quant Picks' : filter}</h2>
                <p className="mt-1 text-sm text-slate-400">Historical score + live LTP snapshot. Live scanner updates every 15 seconds.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {RESEARCH_FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl border px-3 py-2 text-xs ${filter === item ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{item}</button>)}
              </div>
            </div>

            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, company, or sector" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1380px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-3">Symbol</th>
                    <th>Sector</th>
                    <th>Close</th>
                    <th>Live LTP</th>
                    <th>Live %</th>
                    <th>Live Signal</th>
                    <th>1D</th>
                    <th>5D</th>
                    <th>20D</th>
                    <th>Vol x</th>
                    <th>20D Pos</th>
                    <th>Score</th>
                    <th>Setup</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={14} className="py-10 text-center text-slate-500">Loading research data...</td></tr> : rows.length === 0 ? <tr><td colSpan={14} className="py-10 text-center text-slate-500">No stocks found for this filter.</td></tr> : rows.map((row) => <StockTableRow key={row.symbol} row={row} quote={liveBySymbol.get(row.symbol)} />)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-xl font-bold text-white">Live Scanner Reasons</h2>
              <p className="mt-1 text-sm text-slate-400">Why the stock is showing up now. Research only, not a buy signal.</p>
              <div className="mt-4 space-y-3">
                {leaders.map((row) => <ReasonCard key={row.symbol} row={row} quote={liveBySymbol.get(row.symbol)} />)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-xl font-bold text-white">Sector Strength</h2>
              <p className="mt-1 text-sm text-slate-400">Strongest: {strongestSector ? strongestSector.sector : 'No data'}</p>
              <div className="mt-4 space-y-4">{sectorRows.map((row) => <SectorBar key={row.sector} row={row} />)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StockTableRow({ row, quote }: { row: StockRow; quote?: LiveQuote }) {
  const reason = getResearchReason(row);
  const signal = getLiveSignal(row, quote);
  return (
    <tr className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/40">
      <td className="py-4"><div className="font-bold text-white">{row.symbol}</div><div className="text-xs text-slate-500">{row.name}</div></td>
      <td>{row.sector}</td>
      <td>{money(row.close)}</td>
      <td className="font-bold text-white">{quote?.ltp !== null && quote?.ltp !== undefined ? money(quote.ltp) : '—'}</td>
      <td className={Number(quote?.change_pct || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{quote?.change_pct !== null && quote?.change_pct !== undefined ? `${quote.change_pct}%` : '—'}</td>
      <td><SignalBadge signal={signal} /></td>
      <td className={row.change_1d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.change_1d_pct}%</td>
      <td className={row.return_5d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_5d_pct}%</td>
      <td className={row.return_20d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_20d_pct}%</td>
      <td>{row.volume_ratio}x</td>
      <td>{row.position_20d_pct}%</td>
      <td><span className={row.quant_score >= 70 ? 'font-bold text-emerald-300' : row.quant_score >= 45 ? 'font-bold text-yellow-300' : 'font-bold text-red-300'}>{row.quant_score}</span></td>
      <td><span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{reason.setup}</span></td>
      <td className="max-w-[230px] text-xs text-slate-400">{signal.reason}</td>
    </tr>
  );
}

function ReasonCard({ row, quote }: { row: StockRow; quote?: LiveQuote }) {
  const reason = getResearchReason(row);
  const signal = getLiveSignal(row, quote);
  const liveText = quote?.ltp !== null && quote?.ltp !== undefined ? `Live LTP ${money(quote.ltp)} (${quote.change_pct ?? 0}%)` : 'Live LTP waiting';
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between"><div className="font-bold text-white">{row.symbol}</div><div className="text-lg font-bold text-emerald-300">{row.quant_score}</div></div>
      <div className="mt-2 flex items-center gap-2 text-xs text-blue-300"><span>{liveText}</span><SignalBadge signal={signal} /></div>
      <div className="mt-2 text-sm text-slate-300">{reason.reason}</div>
      <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">{signal.reason} No auto execution.</div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: LiveSignal }) {
  const cls = signal.tone === 'win'
    ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300'
    : signal.tone === 'warn'
      ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300'
      : signal.tone === 'loss'
        ? 'border-red-700 bg-red-500/10 text-red-300'
        : 'border-slate-700 bg-slate-800 text-slate-300';
  return <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs ${cls}`}>{signal.label}</span>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function InsightCard({ title, value, hint, active, tone, onClick }: { title: string; value: string; hint: string; active: boolean; tone?: 'loss'; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800/60'}`}>
      <div className="text-sm text-slate-400">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${tone === 'loss' ? 'text-red-300' : 'text-emerald-300'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </button>
  );
}

function SectorBar({ row }: { row: { sector: string; score: number; count: number } }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span>{row.sector}</span><span className="text-slate-400">{row.score} • {row.count} stocks</span></div><div className="h-3 rounded-full bg-slate-800"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.max(4, row.score)}%` }} /></div></div>;
}

function matchesFilter(row: StockRow, filter: ResearchFilter, quote?: LiveQuote) {
  const signal = getLiveSignal(row, quote);
  if (filter === 'All') return true;
  if (filter === 'Live Watch') return signal.label === 'Live Watch';
  if (filter === 'Extended / Avoid') return signal.label === 'Extended / Avoid';
  if (filter === 'Top Momentum') return row.return_5d_pct > 1 && row.return_20d_pct > 2 && row.quant_score >= 55;
  if (filter === 'Volume Breakout') return row.volume_ratio >= 1.5;
  if (filter === 'Near 20D High') return row.position_20d_pct >= 85;
  if (filter === 'Weak / Avoid') return row.quant_score < 45 || row.return_5d_pct < -1 || row.return_20d_pct < -2 || signal.label === 'Weak Live';
  return row.tag === filter;
}

function sortByFilter(rows: StockRow[], filter: ResearchFilter, liveBySymbol: Map<string, LiveQuote>) {
  const sorted = [...rows];
  if (filter === 'Live Watch') return sorted.sort((a, b) => liveStrengthScore(b, liveBySymbol.get(b.symbol)) - liveStrengthScore(a, liveBySymbol.get(a.symbol)));
  if (filter === 'Extended / Avoid') return sorted.sort((a, b) => b.position_20d_pct - a.position_20d_pct);
  if (filter === 'Top Momentum') return sorted.sort((a, b) => (b.return_20d_pct + b.return_5d_pct) - (a.return_20d_pct + a.return_5d_pct));
  if (filter === 'Volume Breakout') return sorted.sort((a, b) => b.volume_ratio - a.volume_ratio);
  if (filter === 'Near 20D High') return sorted.sort((a, b) => b.position_20d_pct - a.position_20d_pct);
  if (filter === 'Weak / Avoid') return sorted.sort((a, b) => a.quant_score - b.quant_score);
  return sorted.sort((a, b) => b.quant_score - a.quant_score);
}

function getFilterCounts(rows: StockRow[], liveBySymbol: Map<string, LiveQuote>) {
  return {
    'Live Watch': rows.filter((row) => matchesFilter(row, 'Live Watch', liveBySymbol.get(row.symbol))).length,
    'Extended / Avoid': rows.filter((row) => matchesFilter(row, 'Extended / Avoid', liveBySymbol.get(row.symbol))).length,
    'Top Momentum': rows.filter((row) => matchesFilter(row, 'Top Momentum', liveBySymbol.get(row.symbol))).length,
    'Volume Breakout': rows.filter((row) => matchesFilter(row, 'Volume Breakout', liveBySymbol.get(row.symbol))).length,
    'Near 20D High': rows.filter((row) => matchesFilter(row, 'Near 20D High', liveBySymbol.get(row.symbol))).length,
    'Weak / Avoid': rows.filter((row) => matchesFilter(row, 'Weak / Avoid', liveBySymbol.get(row.symbol))).length,
  };
}

function getLiveSignal(row: StockRow, quote?: LiveQuote): LiveSignal {
  const liveChange = Number(quote?.change_pct ?? 0);
  const hasLive = quote?.ltp !== null && quote?.ltp !== undefined;
  const hasSetup = row.volume_ratio >= 1.5 || row.position_20d_pct >= 85 || row.quant_score >= 70;
  const liveStrength = hasLive && liveChange >= 0.35;
  const positiveLive = hasLive && liveChange > 0;
  const extended = row.position_20d_pct >= 92 && liveChange >= 1;
  const weakLive = hasLive && liveChange <= -0.75;

  if (extended) {
    return { label: 'Extended / Avoid', tone: 'warn', reason: 'Price is already extended near the top of its 20D range. Do not chase; wait for pullback or clean breakout retest.' };
  }

  if (liveStrength && hasSetup) {
    return { label: 'Live Watch', tone: 'win', reason: 'Live LTP is positive and historical setup is present. Add to watchlist only; wait for chart confirmation.' };
  }

  if (weakLive) {
    return { label: 'Weak Live', tone: 'loss', reason: 'Live move is weak. Avoid fresh long planning unless structure improves.' };
  }

  if (positiveLive && hasSetup) {
    return { label: 'Wait', tone: 'neutral', reason: 'Setup exists but live strength is not strong enough yet. Wait for confirmation.' };
  }

  return { label: 'Wait', tone: 'neutral', reason: 'No live confirmation yet. Keep it as research only.' };
}

function liveStrengthScore(row: StockRow, quote?: LiveQuote) {
  const liveChange = Number(quote?.change_pct ?? 0);
  return liveChange * 10 + row.volume_ratio * 5 + row.position_20d_pct / 2 + row.quant_score;
}

function getResearchReason(row: StockRow) {
  const parts: string[] = [];
  if (row.volume_ratio >= 1.5) parts.push(`volume ${row.volume_ratio}x`);
  if (row.position_20d_pct >= 85) parts.push(`near 20D high at ${row.position_20d_pct}% range position`);
  if (row.return_5d_pct > 1) parts.push(`5D momentum ${row.return_5d_pct}%`);
  if (row.return_20d_pct > 2) parts.push(`20D momentum ${row.return_20d_pct}%`);
  if (parts.length === 0) parts.push(`score ${row.quant_score}/100 with no clean breakout trigger yet`);

  const setup = row.quant_score >= 70 ? 'Watchlist' : row.quant_score >= 55 ? 'Developing' : row.quant_score < 45 ? 'Avoid' : 'Neutral';
  const risk = row.position_20d_pct > 90 ? 'Avoid chasing. Wait for pullback or breakout confirmation.' : row.volume_ratio < 1 ? 'Volume confirmation missing.' : 'Wait for confirmation before planning trade.';
  return { setup, risk, reason: `${row.symbol}: ${parts.join(' + ')}.` };
}

function getSectorRows(rows: StockRow[]) {
  const map = new Map<string, { total: number; count: number }>();
  rows.forEach((row) => {
    const current = map.get(row.sector) || { total: 0, count: 0 };
    map.set(row.sector, { total: current.total + row.quant_score, count: current.count + 1 });
  });
  return Array.from(map.entries()).map(([sector, value]) => ({ sector, count: value.count, score: Math.round(value.total / Math.max(1, value.count)) })).sort((a, b) => b.score - a.score).slice(0, 8);
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
