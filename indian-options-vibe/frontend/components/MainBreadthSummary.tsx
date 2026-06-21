'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Breadth = {
  status: string;
  supportive: boolean;
  positive?: number;
  negative?: number;
  flat?: number;
  positive_pct?: number;
  avg_change_pct?: number;
  message?: string;
};

export function MainBreadthSummary() {
  const pathname = usePathname();
  const [breadth, setBreadth] = useState<Breadth | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/market/breadth');
      setBreadth(await res.json());
    } catch {
      setBreadth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pathname !== '/stocks') return;
    load();
  }, [pathname]);

  if (pathname !== '/stocks') return null;

  const ok = Boolean(breadth?.supportive);
  const tone = loading ? 'neutral' : ok ? 'win' : 'warn';
  const cardClass = tone === 'win'
    ? 'border-emerald-800 bg-emerald-950/20'
    : tone === 'warn'
      ? 'border-yellow-800 bg-yellow-950/20'
      : 'border-slate-800 bg-slate-900/70';
  const badgeClass = tone === 'win'
    ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300'
    : tone === 'warn'
      ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300'
      : 'border-slate-700 bg-slate-800 text-slate-300';

  return <section className="px-8 pt-6 md:px-12">
    <div className={`mx-auto max-w-7xl rounded-3xl border p-5 ${cardClass}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Market Breadth Summary</div>
          <h2 className="mt-2 text-xl font-bold text-white">Main market filter before picking stocks</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Use this as the first filter. If breadth is weak, strong stocks should remain Watch only.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={load} disabled={loading} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            {loading ? 'Checking...' : 'Refresh Breadth'}
          </button>
          <div className={`rounded-2xl border px-5 py-3 text-center ${badgeClass}`}>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Breadth Status</div>
            <div className="mt-1 text-lg font-bold">{loading ? 'Checking...' : ok ? 'Supportive' : 'Weak / Wait'}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Box label="Positive" value={breadth?.positive ?? '-'} />
        <Box label="Negative" value={breadth?.negative ?? '-'} />
        <Box label="Positive %" value={breadth?.positive_pct != null ? `${breadth.positive_pct}%` : '-'} />
        <Box label="Avg Change" value={breadth?.avg_change_pct != null ? `${breadth.avg_change_pct}%` : '-'} />
      </div>

      <div className={`mt-4 rounded-2xl border p-3 text-sm ${ok ? 'border-emerald-800 bg-emerald-950/20 text-emerald-100' : 'border-yellow-800 bg-yellow-950/20 text-yellow-100'}`}>
        {loading ? 'Checking breadth...' : ok ? 'Breadth supports looking for long-side watchlist ideas. Still no automatic orders.' : `Teacher action: wait. Market breadth is weak. ${breadth?.message || ''}`}
      </div>
    </div>
  </section>;
}

function Box({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className="mt-2 text-lg font-bold text-white">{value}</div>
  </div>;
}
