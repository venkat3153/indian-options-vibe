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
            <div className="mt-5 h-44 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <CloseSvg candles={candles} min={closeStats.min} max={closeStats.max} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{candles[0]?.date}</span><span>{candles[candles.length - 1]?.date}</span></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">Volume Trend</h3><div className="text-xs text-slate-500">Latest {formatNumber(data.summary?.latest_volume || 0)}</div></div>
            <div className="mt-5 h-44 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <VolumeSvg candles={candles} maxVolume={maxVolume} />
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

function CloseSvg({ candles, min, max }: { candles: Candle[]; min: number; max: number }) {
  const width = 760;
  const height = 150;
  const pad = 12;
  const points = candles.map((c, idx) => {
    const x = pad + (idx / Math.max(1, candles.length - 1)) * (width - pad * 2);
    const pct = max === min ? 0.5 : (c.close - min) / (max - min);
    const y = height - pad - pct * (height - pad * 2);
    return { x, y, candle: c };
  });
  const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = points.length ? `${path} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z` : '';

  return <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
    <path d={`M ${pad} ${pad} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.5" />
    <path d={`M ${pad} ${height / 2} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.45" />
    <path d={`M ${pad} ${height - pad} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.5" />
    {area ? <path d={area} fill="rgb(16 185 129)" opacity="0.12" /> : null}
    {path ? <path d={path} fill="none" stroke="rgb(52 211 153)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {points.map((p, idx) => <circle key={`${p.candle.date}-${idx}`} cx={p.x} cy={p.y} r="4" fill="rgb(52 211 153)"><title>{`${p.candle.date}: ${money(p.candle.close)}`}</title></circle>)}
  </svg>;
}

function VolumeSvg({ candles, maxVolume }: { candles: Candle[]; maxVolume: number }) {
  const width = 760;
  const height = 150;
  const pad = 12;
  const gap = 5;
  const barW = (width - pad * 2 - gap * Math.max(0, candles.length - 1)) / Math.max(1, candles.length);

  return <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
    <path d={`M ${pad} ${pad} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.45" />
    <path d={`M ${pad} ${height / 2} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.4" />
    <path d={`M ${pad} ${height - pad} H ${width - pad}`} stroke="rgb(51 65 85)" strokeWidth="1" opacity="0.55" />
    {candles.map((c, idx) => {
      const pct = maxVolume ? c.volume / maxVolume : 0.3;
      const h = Math.max(6, pct * (height - pad * 2));
      const x = pad + idx * (barW + gap);
      const y = height - pad - h;
      return <rect key={`${c.date}-${idx}`} x={x} y={y} width={barW} height={h} rx="3" fill="rgb(96 165 250)" opacity="0.85"><title>{`${c.date}: ${formatNumber(c.volume)}`}</title></rect>;
    })}
  </svg>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div></div>; }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
function formatNumber(value: number) { return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
