'use client';

import { useMemo, useState } from 'react';

type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  critical?: boolean;
};

const ITEMS: ChecklistItem[] = [
  { key: 'aboveVwap', label: 'Price above VWAP', detail: 'Price should be trading above VWAP for long setups.', critical: true },
  { key: 'retestHeld', label: 'Retest held', detail: 'Breakout/retest zone should hold. Do not chase first spike.', critical: true },
  { key: 'volumeConfirm', label: 'Volume confirmation', detail: 'Volume should support the move, not dry up at entry.', critical: true },
  { key: 'breadthSupport', label: 'Market breadth supportive', detail: 'NIFTY/sector breadth should not be clearly against the trade.' },
  { key: 'rrValid', label: 'RR minimum 1:2', detail: 'RR Validator must show at least 1:2 before marking Ready.', critical: true },
  { key: 'disciplineClear', label: 'Discipline lock clear', detail: 'No max trades hit, no daily loss lock, no revenge-trade state.', critical: true },
];

export function SetupConfirmationChecklist({ symbol }: { symbol?: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  const completeCount = useMemo(() => ITEMS.filter((item) => checked[item.key]).length, [checked]);
  const criticalMissing = useMemo(() => ITEMS.filter((item) => item.critical && !checked[item.key]), [checked]);
  const allComplete = completeCount === ITEMS.length;
  const ready = allComplete && criticalMissing.length === 0;

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function reset() {
    setChecked({});
    setNote('');
  }

  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-purple-300">Setup Confirmation Checklist v1</div>
          <h2 className="mt-2 text-2xl font-bold text-white">RR is not enough — confirm the setup</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Use this before marking {symbol ? `${symbol} ` : ''}Ready. This checklist blocks emotional entries where RR looks good but the market structure is not confirmed.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${ready ? 'border-emerald-700 bg-emerald-500/10' : 'border-yellow-800 bg-yellow-500/10'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Checklist Status</div>
          <div className={`mt-1 text-xl font-bold ${ready ? 'text-emerald-300' : 'text-yellow-300'}`}>{ready ? 'Ready to watch' : 'Not ready'}</div>
          <div className="mt-1 text-xs text-slate-400">{completeCount}/{ITEMS.length} confirmed</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map((item) => {
          const active = Boolean(checked[item.key]);
          return <button key={item.key} onClick={() => toggle(item.key)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-700 bg-emerald-500/10' : item.critical ? 'border-yellow-900 bg-yellow-950/10 hover:bg-yellow-950/20' : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60'}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${active ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-600 text-slate-500'}`}>{active ? '✓' : ''}</div>
              <div>
                <div className="font-bold text-white">{item.label}</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                {item.critical ? <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-300">Critical</div> : null}
              </div>
            </div>
          </button>;
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <label className="text-sm text-slate-400">Confirmation note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: Retest held above VWAP, volume expanding, RR 1:2.1, no daily lock." className="mt-2 min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-500" />
        </label>
        <div className={`rounded-2xl border p-5 ${ready ? 'border-emerald-800 bg-emerald-950/20 text-emerald-100' : 'border-yellow-900 bg-yellow-950/20 text-yellow-100'}`}>
          <div className="font-bold">Teacher check</div>
          <p className="mt-2 text-sm leading-6">
            {ready
              ? 'Checklist is complete. This only means the idea is ready to watch or mark Ready — it still does not mean automatic entry.'
              : criticalMissing.length
                ? `Do not mark Ready yet. Missing critical checks: ${criticalMissing.map((x) => x.label).join(', ')}.`
                : 'Some non-critical checks are missing. Stay cautious and avoid forcing the trade.'}
          </p>
          <button onClick={reset} className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Reset Checklist</button>
        </div>
      </div>
    </div>
  </section>;
}
