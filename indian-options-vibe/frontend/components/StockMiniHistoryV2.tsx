'use client';

import { useEffect, useMemo, useState } from 'react';

type Candle = { date: string; close: number; volume: number };
type HistoryResponse = { status: string; symbol: string; source?: string; candles: Candle[]; summary?: { period_high: number; period_low: number; range_position_pct: number; latest_volume: number; avg_volume: number; volume_ratio: number; change_period_pct: number }; message?: string };

export function StockMiniHistoryV2({ symbol }: { symbol: string }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    setLoading(true);
    const response = await fetch(`http://localhost:8000/api/stocks/history/${encodeURIComponent(symbol)}?days=20`);
    setData(await response.json());
    setLoading(false);
  }

  useEffect(() => { loadHistory(); }, [symbol]);

  const candles = data?.candles || [];
  const closeRange = useMemo(() => {
    const values = candles.map((c) => c.close);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [candles]);
  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume), 0), [candles]);

  return <section className="px-8 pb-12 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Mini History View</h2>
          <p className="mt-1 text-sm text-slate-400">Last 20 daily candles with visible close and volume bars.</p>
        </div>
        <button onClick={loadHistory} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Refresh History</button>
      </div>

      {loading ? <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">Loading candle history...</div> : null}
      {!loading && data?.status !== 'success' ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-100">{data?.message || 'No candle history found.'}</div> : null}

      {!loading && data?.status === 'success' ? <>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <MiniMetric label="20D Change" value={`${data.summary?.change_period_pct ?? 0}%`} good={Number(data.summary?.change_period_pct || 0) >= 0} />
          <MiniMetric label="20D High" value={money(data.summary?.period_high || 0)} />
          <MiniMetric label="20D Low" value={money(data.summary?.period_low || 0)} />
          <MiniMetric label="Range Pos" value={`${data.summary?.range_position_pct ?? 0}%`} good />
          <MiniMetric label="Vol Ratio" value={`${data.summary?.volume_ratio ?? 0}x`} good={Number(data.summary?.volume_ratio || 0) >= 1.2} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartBox title="Close Trend" right={data.source || 'history'}>
            {candles.map((c) => <div key={c.date} className="flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-emerald-400" style={{ height: `${height(c.close, closeRange.min, closeRange.max)}%` }} />
            </div>)}
          </ChartBox>

          <ChartBox title="Volume Trend" right={`Latest ${formatNumber(data.summary?.latest_volume || 0)}`}>
            {candles.map((c) => <div key={c.date} className="flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-blue-400" style={{ height: `${height(c.volume, 0, maxVolume)}%` }} />
            </div>)}
          </ChartBox>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">20D low {money(data.summary?.period_low || 0)}</span><span className="font-bold text-emerald-300">Current position {data.summary?.range_position_pct}%</span><span className="text-slate-400">20D high {money(data.summary?.period_high || 0)}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, data.summary?.range_position_pct || 0))}%` }} /></div>
        </div>
      </> : null}
    </div>
  </section>;
}

function ChartBox({ title, right, children }: { title: string; right: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">{title}</h3><div className="text-xs text-slate-500">{right}</div></div><div className="mt-5 flex h-44 items-end gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 pb-4 pt-6">{children}</div></div>;
}
function MiniMetric({ label, value, good }: { label: string; value: string; good?: boolean }) { return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className={`mt-2 text-lg font-bold ${good ? 'text-emerald-300' : 'text-white'}`}>{value}</div></div>; }
function height(value: number, min: number, max: number) { if (!max || max === min) return 50; return Math.max(16, Math.min(100, ((value - min) / (max - min)) * 84 + 16)); }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
function formatNumber(value: number) { return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
