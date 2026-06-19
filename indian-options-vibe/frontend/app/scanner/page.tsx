'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ScreenerRow = {
  symbol: string;
  market: 'NSE' | 'BSE';
  segment: 'Index Options' | 'Stock Options' | 'Intraday Stocks';
  spot: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral' | 'Weak';
  score: number;
  setup: string;
  signal: string;
  risk: 'Low' | 'Medium' | 'High';
  action: string;
};

type FilterKey = 'All' | 'Index Options' | 'Stock Options' | 'Intraday Stocks' | 'High Score' | 'NIFTY/SENSEX Focus' | 'Bullish' | 'Bearish' | 'Neutral/Weak';

type ScreenerResponse = {
  mode: 'mock';
  rows: ScreenerRow[];
};

const fallbackRows: ScreenerRow[] = [
  { symbol: 'NIFTY', market: 'NSE', segment: 'Index Options', spot: '23,520', bias: 'Bullish', score: 84, setup: 'ATM CE pullback above VWAP', signal: 'OI buildup + volume expansion', risk: 'Medium', action: 'Paper CE setup' },
  { symbol: 'SENSEX', market: 'BSE', segment: 'Index Options', spot: '77,850', bias: 'Neutral', score: 62, setup: 'Wait near VWAP', signal: 'Mixed OI, no clean direction', risk: 'High', action: 'Wait' },
  { symbol: 'BANKNIFTY', market: 'NSE', segment: 'Index Options', spot: '51,420', bias: 'Bearish', score: 78, setup: 'ATM PE breakout below VWAP', signal: 'Put OI + price breakdown', risk: 'Medium', action: 'Paper PE setup' },
];

const filters: FilterKey[] = ['All', 'Index Options', 'Stock Options', 'Intraday Stocks', 'High Score', 'NIFTY/SENSEX Focus', 'Bullish', 'Bearish', 'Neutral/Weak'];
const focusSymbols = ['NIFTY', 'SENSEX', 'BANKNIFTY'];

export default function ScannerPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');
  const [rows, setRows] = useState<ScreenerRow[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'backend' | 'fallback'>('fallback');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRows() {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/scanner/market');
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data = (await response.json()) as ScreenerResponse;
        setRows(data.rows);
        setSource('backend');
        setError(null);
      } catch (err) {
        setRows(fallbackRows);
        setSource('fallback');
        setError(err instanceof Error ? err.message : 'Could not connect to scanner backend');
      } finally {
        setLoading(false);
      }
    }

    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    if (activeFilter === 'All') return rows;
    if (activeFilter === 'Index Options') return rows.filter((row) => row.segment === 'Index Options');
    if (activeFilter === 'Stock Options') return rows.filter((row) => row.segment === 'Stock Options');
    if (activeFilter === 'Intraday Stocks') return rows.filter((row) => row.segment === 'Intraday Stocks');
    if (activeFilter === 'High Score') return rows.filter((row) => row.score >= 70);
    if (activeFilter === 'NIFTY/SENSEX Focus') return rows.filter((row) => focusSymbols.includes(row.symbol));
    if (activeFilter === 'Bullish') return rows.filter((row) => row.bias === 'Bullish');
    if (activeFilter === 'Bearish') return rows.filter((row) => row.bias === 'Bearish');
    if (activeFilter === 'Neutral/Weak') return rows.filter((row) => row.bias === 'Neutral' || row.bias === 'Weak');
    return rows;
  }, [activeFilter, rows]);

  const bestRow = filteredRows.reduce<ScreenerRow | null>((best, row) => (!best || row.score > best.score ? row : best), null);
  const priorityRows = filteredRows.filter((row) => focusSymbols.includes(row.symbol));
  const otherRows = filteredRows.filter((row) => !focusSymbols.includes(row.symbol));

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Market Screener MVP</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Indian Options + Intraday Screener</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Filter NIFTY, SENSEX, BANKNIFTY, stock options, and intraday stocks. Data now comes from the FastAPI scanner endpoint.</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">Paper signals only • Live orders locked</div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">
            Backend scanner fallback active: {error}. Start backend on http://localhost:8000 to use API data.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Active Filter" value={activeFilter} hint="Current screener view" />
          <SummaryCard label="Matches" value={`${filteredRows.length}`} hint={loading ? 'Loading API...' : 'Filtered setups'} />
          <SummaryCard label="Best Score" value={bestRow ? `${bestRow.score}` : '-'} hint={bestRow ? `${bestRow.symbol} ${bestRow.setup}` : 'No match'} />
          <SummaryCard label="Data Source" value={source === 'backend' ? 'Backend API' : 'Fallback'} hint="Mock data for now" />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Screener Filters</h2>
              <p className="mt-1 text-sm text-slate-400">Start with NIFTY/SENSEX Focus or High Score during market hours.</p>
            </div>
            <button onClick={() => setActiveFilter('All')} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Reset</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button key={filter} onClick={() => setActiveFilter(filter)} className={activeFilter === filter ? 'rounded-full border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-sm text-emerald-300' : 'rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800'}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        {priorityRows.length > 0 ? <ScreenerSection title="Priority Index Options" subtitle="NIFTY, SENSEX, and BANKNIFTY stay on top when available in the current filter." rows={priorityRows} /> : null}
        <ScreenerSection title={priorityRows.length > 0 ? 'Filtered Opportunities' : 'Filtered Results'} subtitle="Only rows matching the selected filter are shown here." rows={otherRows.length > 0 ? otherRows : priorityRows.length > 0 ? [] : filteredRows} />
      </div>
    </section>
  );
}

function ScreenerSection({ title, subtitle, rows }: { title: string; subtitle: string; rows: ScreenerRow[] }) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Score: trend + volume + VWAP + OI + liquidity + risk</div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No additional rows for this filter.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>{['Symbol', 'Mkt', 'Segment', 'Spot', 'Bias', 'Score', 'Setup', 'Signal', 'Risk', 'Action'].map((header) => <th key={header} className="p-3 font-medium">{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.symbol}-${row.segment}`} className="border-t border-slate-800 text-slate-300 hover:bg-slate-800/50">
                  <td className="p-3 font-semibold text-white"><Link className="text-emerald-300 hover:text-emerald-200" href={`/scanner/${row.symbol}`}>{row.symbol}</Link></td>
                  <td className="p-3">{row.market}</td>
                  <td className="p-3 text-slate-400">{row.segment}</td>
                  <td className="p-3">{row.spot}</td>
                  <td className="p-3"><BiasBadge bias={row.bias} /></td>
                  <td className="p-3"><ScoreBadge score={row.score} /></td>
                  <td className="p-3">{row.setup}</td>
                  <td className="p-3 text-slate-400">{row.signal}</td>
                  <td className="p-3"><RiskBadge risk={row.risk} /></td>
                  <td className="p-3 font-medium text-emerald-300"><Link href={`/scanner/${row.symbol}`} className="hover:text-emerald-200">{row.action} →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function BiasBadge({ bias }: { bias: ScreenerRow['bias'] }) {
  const styles = { Bullish: 'border-emerald-800 bg-emerald-950/40 text-emerald-300', Bearish: 'border-red-800 bg-red-950/40 text-red-300', Neutral: 'border-slate-700 bg-slate-950 text-slate-300', Weak: 'border-yellow-800 bg-yellow-950/30 text-yellow-300' };
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles[bias]}`}>{bias}</span>;
}

function RiskBadge({ risk }: { risk: ScreenerRow['risk'] }) {
  const styles = { Low: 'text-emerald-300', Medium: 'text-yellow-300', High: 'text-red-300' };
  return <span className={styles[risk]}>{risk}</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-300' : score >= 60 ? 'text-yellow-300' : 'text-red-300';
  return <span className={`font-bold ${color}`}>{score}</span>;
}
