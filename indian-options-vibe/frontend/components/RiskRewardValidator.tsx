'use client';

import { useMemo, useState } from 'react';

export function RiskRewardValidator() {
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [side, setSide] = useState<'Long' | 'Short'>('Long');

  const result = useMemo(() => {
    const e = Number(entry);
    const s = Number(stop);
    const t = Number(target);
    if (!e || !s || !t) return null;

    const risk = side === 'Long' ? e - s : s - e;
    const reward = side === 'Long' ? t - e : e - t;
    const rr = risk > 0 ? reward / risk : 0;
    const validStructure = risk > 0 && reward > 0;
    const isReady = validStructure && rr >= 2;

    return {
      risk: Number(risk.toFixed(2)),
      reward: Number(reward.toFixed(2)),
      rr: Number(rr.toFixed(2)),
      validStructure,
      isReady,
      message: !validStructure
        ? 'Invalid plan: stop/target are not placed correctly for this direction.'
        : rr >= 2
          ? 'RR is valid. Still wait for setup confirmation and discipline lock.'
          : 'RR is below 1:2. Skip or wait for a better entry.'
    };
  }, [entry, stop, target, side]);

  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">RR Validator v1</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Check if the trade is really 1:2</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Use this before marking an idea Ready. If the RR is below 1:2, do not force the trade. Wait for a better entry or skip.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${result?.isReady ? 'border-emerald-700 bg-emerald-500/10' : result ? 'border-red-800 bg-red-500/10' : 'border-slate-700 bg-slate-950'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
          <div className={`mt-1 text-xl font-bold ${result?.isReady ? 'text-emerald-300' : result ? 'text-red-300' : 'text-white'}`}>{result ? (result.isReady ? 'Trade-ready RR' : 'Not ready') : 'Enter plan'}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <label className="text-sm text-slate-400">Direction
          <select value={side} onChange={(e) => setSide(e.target.value as 'Long' | 'Short')} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500">
            <option>Long</option>
            <option>Short</option>
          </select>
        </label>
        <Input label="Entry" value={entry} onChange={setEntry} placeholder="Example 3038.4" />
        <Input label="Stop" value={stop} onChange={setStop} placeholder="Example 3008" />
        <Input label="Target" value={target} onChange={setTarget} placeholder="Example 3099" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <ResultBox label="Risk" value={result ? String(result.risk) : '-'} tone="loss" />
        <ResultBox label="Reward" value={result ? String(result.reward) : '-'} tone="win" />
        <ResultBox label="RR" value={result ? `1:${result.rr}` : '-'} tone={result?.isReady ? 'win' : result ? 'loss' : undefined} />
        <ResultBox label="Rule" value="Minimum 1:2" />
      </div>

      {result ? <div className={`mt-5 rounded-2xl border p-4 text-sm ${result.isReady ? 'border-emerald-800 bg-emerald-950/20 text-emerald-100' : 'border-red-900 bg-red-950/20 text-red-100'}`}>
        {result.message}
      </div> : <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        Enter planned entry, stop, and target to calculate RR.
      </div>}
    </div>
  </section>;
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <label className="text-sm text-slate-400">{label}
    <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" />
  </label>;
}

function ResultBox({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className={`mt-2 text-xl font-bold ${cls}`}>{value}</div>
  </div>;
}
