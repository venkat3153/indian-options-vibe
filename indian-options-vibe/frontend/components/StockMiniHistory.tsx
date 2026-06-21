'use client';

import { useEffect, useMemo, useState } from 'react';

type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number; source?: string };
type HistoryResponse = {
  status: string;
  symbol: string;
  mode?: string;
  source?: string;
  count?: number;
  candles: Candle[];
  summary?: {
    latest_close: number;
    period_high: number;
    period_low: number;
    range_position_pct: number;
    avg_volume: number;
    latest_volume: number;
    volume_ratio: number;
    change_period_pct: number;
  };
  message?: string;
};

export function StockMiniHistory({ symbol }: { symbol: string }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`http://localhost:8000/api/stocks/history/${encodeURIComponent(symbol)}?days=20`);
      if (!r.ok) throw new Error(`History API returned ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load mini history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, [symbol]);

  const candles = data?.candles || [];
  const closeStats = useMemo(() => {
    const closes = candles.map((c) => c.close).filter(Boolean);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 };
  }, [candles]);
  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume || 0), 0), [candles]);

  return <section className="px-8 pb-12 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">Mini History View</h2>
          <p className="mt-1 text-sm text-slate-400">Last 20 daily candles, close trend, volume trend, and 20D range position. Research only.</p>
        </div>
        <button onClick={loadHistory} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Refresh History</button>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">Loading candle history...</div> : null}
      {!loading && data?.status !== 'success' ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-100">{data?.message || 'No candle history found.'}</div> : null}

      {!loading && data?.status === 'success' ? <>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <MiniMetric label="20D Change" value={`${data.summary?.change_period_pct ?? 0}%`} tone={Number(data.summary?.change_period_pct || 0) >= 0 ? 'win' : 'loss'} />
          <MiniMetric label="20D High" value={money(data.summary?.period_high || 0)} />
          <MiniMetric label="20D Low" value={money(data.summary?.period_low || 0)} />
          <MiniMetric label="Range Pos" value={`${data.summary?.range_position_pct ?? 0}%`} tone={Number(data.summary?.range_position_pct || 0) >= 80 ? 'win' : undefined} />
          <MiniMetric label="Vol Ratio" value={`${data.summary?.volume_ratio ?? 0}x`} tone={Number(data.summary?.volume_ratio || 0) >= 1.2 ? 'win' : undefined} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">Close Trend</h3><div className="text-xs text-slate-500">{data.source}</div></div>
            <div className="mt-5 flex h-40 items-end gap-2 border-b border-slate-800 pb-2">
              {candles.map((c) => <div key={c.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div title={`${c.date}: ${money(c.close)}`} className="w-full rounded-t bg-emerald-400/80" style={{ height: `${barHeight(c.close, closeStats.min, closeStats.max)}%` }} />
              </div>)}
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{candles[0]?.date}</span><span>{candles[candles.length - 1]?.date}</span></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">Volume Trend</h3><div className="text-xs text-slate-500">Latest {formatNumber(data.summary?.latest_volume || 0)}</div></div>
            <div className="mt-5 flex h-40 items-end gap-2 border-b border-slate-800 pb-2">
              {candles.map((c) => <div key={c.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div title={`${c.date}: ${formatNumber(c.volume)}`} className="w-full rounded-t bg-blue-400/70" style={{ height: `${barHeight(c.volume, 0, maxVolume)}%` }} />
              </div>)}
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>Avg {formatNumber(data.summary?.avg_volume || 0)}</span><span>Ratio {data.summary?.volume_ratio}x</span></div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">20D low {money(data.summary?.period_low || 0)}</span><span className="font-bold text-emerald-300">Current position {data.summary?.range_position_pct}%</span><span className="text-slate-400">20D high {money(data.summary?.period_high || 0)}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, data.summary?.range_position_pct || 0))}%` }} /></div>
        </div>
      </> : null}
    </div>
  </section>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div></div>; }
function barHeight(value: number, min: number, max: number) { if (!max || max === min) return 45; return Math.max(8, Math.min(100, ((value - min) / (max - min)) * 92 + 8)); }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
function formatNumber(value: number) { return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
