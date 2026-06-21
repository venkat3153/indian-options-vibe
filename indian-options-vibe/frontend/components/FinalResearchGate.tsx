'use client';

import { useEffect, useMemo, useState } from 'react';

type Breadth = {
  supportive: boolean;
  positive?: number;
  negative?: number;
  positive_pct?: number;
  avg_change_pct?: number;
  message?: string;
};

type Decision = {
  label: string;
  tone: 'ready' | 'wait' | 'avoid';
  headline: string;
  action: string;
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

  const decision = useMemo<Decision>(() => {
    if (loading) {
      return {
        label: 'Checking',
        tone: 'wait',
        headline: 'Checking market support',
        action: 'Wait for the terminal to finish reading breadth data.',
      };
    }

    if (!breadth) {
      return {
        label: 'Wait: Breadth Unknown',
        tone: 'wait',
        headline: 'Market breadth data is not loaded',
        action: 'Do not mark Ready until breadth data is available.',
      };
    }

    if (!breadth.supportive) {
      return {
        label: 'Wait: Market Breadth Weak',
        tone: 'wait',
        headline: 'Stock may be strong, but market support is weak',
        action: 'Keep on watch only. Do not chase or mark Ready while broader breadth is weak.',
      };
    }

    return {
      label: 'Ready to Watch',
      tone: 'ready',
      headline: 'Market breadth supports the stock idea',
      action: 'You may continue to watch the setup. Still no automatic order and no entry without chart confirmation.',
    };
  }, [breadth, loading]);

  const toneClass = decision.tone === 'ready'
    ? 'border-emerald-800 bg-emerald-950/20'
    : decision.tone === 'avoid'
      ? 'border-red-900 bg-red-950/20'
      : 'border-yellow-800 bg-yellow-950/20';

  const statusClass = decision.tone === 'ready'
    ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300'
    : decision.tone === 'avoid'
      ? 'border-red-700 bg-red-500/10 text-red-300'
      : 'border-yellow-700 bg-yellow-500/10 text-yellow-300';

  return <section className="px-8 pb-6 md:px-12">
    <div className={`mx-auto max-w-7xl rounded-3xl border p-6 ${toneClass}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Final Research Gate v2</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Final decision before marking Ready</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Final labels explain why the stock is Ready, Waiting, or Avoid. This overrides any earlier checklist that looks too optimistic.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${statusClass}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Final Status</div>
          <div className="mt-1 text-xl font-bold">{decision.label}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Box label="Breadth" value={breadth?.supportive ? 'Supportive' : breadth ? 'Weak' : '-'} />
        <Box label="Positive" value={breadth?.positive ?? '-'} />
        <Box label="Negative" value={breadth?.negative ?? '-'} />
        <Box label="Avg Change" value={breadth?.avg_change_pct != null ? `${breadth.avg_change_pct}%` : '-'} />
      </div>

      <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${statusClass}`}>
        <div className="font-bold text-white">{decision.headline}</div>
        <div className="mt-1">{decision.action}</div>
        {breadth?.message ? <div className="mt-3 text-slate-300">{breadth.message}</div> : null}
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
