'use client';

import { useEffect, useState } from 'react';

type Breadth = {
  supportive: boolean;
  positive?: number;
  negative?: number;
  positive_pct?: number;
  avg_change_pct?: number;
  message?: string;
};

export function FinalResearchGate({ symbol }: { symbol: string }) {
  const [breadth, setBreadth] = useState<Breadth | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/market/breadth?symbol=${encodeURIComponent(symbol)}`);
      setBreadth(await res.json());
    } catch {
      setBreadth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol]);

  const breadthOk = Boolean(breadth?.supportive);
  const ready = breadthOk;

  return <section className="px-8 pb-6 md:px-12">
    <div className={`mx-auto max-w-7xl rounded-3xl border p-6 ${ready ? 'border-emerald-800 bg-emerald-950/20' : 'border-red-900 bg-red-950/20'}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">Final Research Gate</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Final decision before marking Ready</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            This gate prevents the terminal from showing Ready when broader market breadth is weak. It overrides the earlier Auto Checklist OK status.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${ready ? 'border-emerald-700 bg-emerald-500/10' : 'border-red-700 bg-red-500/10'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Final Status</div>
          <div className={`mt-1 text-xl font-bold ${ready ? 'text-emerald-300' : 'text-red-300'}`}>{loading ? 'Checking...' : ready ? 'Ready to watch' : 'Not ready'}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Box label="Breadth" value={breadthOk ? 'Supportive' : 'Weak'} />
        <Box label="Positive" value={breadth?.positive ?? '-'} />
        <Box label="Negative" value={breadth?.negative ?? '-'} />
        <Box label="Avg Change" value={breadth?.avg_change_pct != null ? `${breadth.avg_change_pct}%` : '-'} />
      </div>

      <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${ready ? 'border-emerald-800 bg-emerald-950/30 text-emerald-100' : 'border-red-900 bg-red-950/30 text-red-100'}`}>
        {ready
          ? 'Market breadth supports continuing the plan. Still no automatic order.'
          : `Do not mark Ready. Market breadth is weak. ${breadth?.message || ''}`}
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
