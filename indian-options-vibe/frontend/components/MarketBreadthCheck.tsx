'use client';

import { useEffect, useState } from 'react';

type Breadth = {
  status: string;
  supportive: boolean;
  positive?: number;
  negative?: number;
  positive_pct?: number;
  avg_change_pct?: number;
  message?: string;
};

export function MarketBreadthCheck({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Breadth | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/market/breadth?symbol=${encodeURIComponent(symbol)}`);
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol]);

  const ok = Boolean(data?.supportive);
  const statusText = loading ? 'Checking...' : ok ? 'Supportive' : 'Not supportive';

  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Market Breadth Engine v1</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Check if the market supports the stock</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            This reads NIFTY50 live quote breadth. A strong stock inside a weak market should stay Watch/Avoid, not Ready.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${ok ? 'border-emerald-700 bg-emerald-500/10' : 'border-red-800 bg-red-500/10'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Breadth Status</div>
          <div className={`mt-1 text-xl font-bold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>{statusText}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Box label="Positive" value={data?.positive ?? '-'} />
        <Box label="Negative" value={data?.negative ?? '-'} />
        <Box label="Positive %" value={data?.positive_pct != null ? `${data.positive_pct}%` : '-'} />
        <Box label="Avg Change" value={data?.avg_change_pct != null ? `${data.avg_change_pct}%` : '-'} />
      </div>

      <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${ok ? 'border-emerald-800 bg-emerald-950/20 text-emerald-100' : 'border-red-900 bg-red-950/20 text-red-100'}`}>
        {data?.message || 'Waiting for market breadth data.'}
      </div>
    </div>
  </section>;
}

function Box({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className="mt-2 text-xl font-bold text-white">{value}</div>
  </div>;
}
