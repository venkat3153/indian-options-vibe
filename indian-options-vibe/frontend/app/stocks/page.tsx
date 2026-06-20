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
  universe?: string;
  count: number;
  stocks: StockRow[];
  note?: string;
  error?: string;
};

const SCORE_FILTERS = ['All', 'Strong watchlist', 'Improving', 'Neutral', 'Weak / avoid'];

export default function StocksResearchPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
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

  async function seedData() {
    try {
      setSeeding(true);
      const response = await fetch('http://localhost:8000/api/research/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'nifty50' }),
      });
      if (!response.ok) throw new Error(`Seed API returned ${response.status}`);
      await loadStocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not seed research data');
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => { loadStocks(); }, []);

  const rows = useMemo(() => {
    const stocks = data?.stocks || [];
    return stocks.filter((row) => {
      const matchesFilter = filter === 'All' || row.tag === filter;
      const text = `${row.symbol} ${row.name} ${row.sector}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [data, filter, query]);

  const leaders = rows.slice(0, 5);
  const sectorRows = useMemo(() => getSectorRows(rows), [rows]);

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Quant Research</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Stocks Research Dashboard</h1>
            <p className="mt-2 max-w-3xl text-slate-400">NIFTY 50 first. This is the data warehouse and quant scoring layer before algo execution. Research only. No live orders.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={loadStocks} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
            <button onClick={seedData} disabled={seeding} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{seeding ? 'Seeding...' : 'Seed NIFTY 50'}</button>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}
        {data?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-200">{data.note}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint="Start small, then expand" />
          <Metric label="Stocks Loaded" value={loading ? '...' : String(data?.count || 0)} hint={`Mode: ${data?.mode || 'checking'}`} />
          <Metric label="Top Score" value={leaders[0] ? `${leaders[0].quant_score}` : '0'} hint={leaders[0]?.symbol || 'No data'} tone="win" />
          <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">Top Quant Picks</h2>
                <p className="mt-1 text-sm text-slate-400">Score combines 20-day momentum, volume expansion, and breakout position.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SCORE_FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl border px-3 py-2 text-xs ${filter === item ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{item}</button>)}
              </div>
            </div>

            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, company, or sector" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-3">Symbol</th>
                    <th>Sector</th>
                    <th>Close</th>
                    <th>1D</th>
                    <th>5D</th>
                    <th>20D</th>
                    <th>Vol x</th>
                    <th>20D Pos</th>
                    <th>Score</th>
                    <th>Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={10} className="py-10 text-center text-slate-500">Loading research data...</td></tr> : rows.length === 0 ? <tr><td colSpan={10} className="py-10 text-center text-slate-500">No stocks found. Click Seed NIFTY 50.</td></tr> : rows.map((row) => <StockTableRow key={row.symbol} row={row} />)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-xl font-bold text-white">AI Research Notes</h2>
              <div className="mt-4 space-y-3">
                {leaders.map((row) => <div key={row.symbol} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-center justify-between"><div className="font-bold text-white">{row.symbol}</div><div className="text-lg font-bold text-emerald-300">{row.quant_score}</div></div><p className="mt-2 text-sm text-slate-400">{row.ai_reason}</p></div>)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-xl font-bold text-white">Sector Strength</h2>
              <div className="mt-4 space-y-4">{sectorRows.map((row) => <SectorBar key={row.sector} row={row} />)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StockTableRow({ row }: { row: StockRow }) {
  return (
    <tr className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/40">
      <td className="py-4"><div className="font-bold text-white">{row.symbol}</div><div className="text-xs text-slate-500">{row.name}</div></td>
      <td>{row.sector}</td>
      <td>{money(row.close)}</td>
      <td className={row.change_1d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.change_1d_pct}%</td>
      <td className={row.return_5d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_5d_pct}%</td>
      <td className={row.return_20d_pct >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.return_20d_pct}%</td>
      <td>{row.volume_ratio}x</td>
      <td>{row.position_20d_pct}%</td>
      <td><span className={row.quant_score >= 70 ? 'font-bold text-emerald-300' : row.quant_score >= 45 ? 'font-bold text-yellow-300' : 'font-bold text-red-300'}>{row.quant_score}</span></td>
      <td><span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{row.tag}</span></td>
    </tr>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-2xl font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function SectorBar({ row }: { row: { sector: string; score: number; count: number } }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span>{row.sector}</span><span className="text-slate-400">{row.score} • {row.count} stocks</span></div><div className="h-3 rounded-full bg-slate-800"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.max(4, row.score)}%` }} /></div></div>;
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
