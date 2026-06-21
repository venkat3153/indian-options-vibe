'use client';

import { useEffect, useMemo, useState } from 'react';

type StockRow = { symbol: string; close: number; position_20d_pct: number; volume_ratio: number };
type ApiResponse = { stocks: StockRow[] };
type LiveQuote = { symbol: string; ltp: number | null; change_pct: number | null };
type LiveQuoteResponse = { quotes: LiveQuote[] };

export function RiskRewardValidator({ symbol }: { symbol?: string }) {
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [side, setSide] = useState<'Long' | 'Short'>('Long');
  const [stock, setStock] = useState<StockRow | null>(null);
  const [quote, setQuote] = useState<LiveQuote | null>(null);

  async function loadSuggestionData() {
    if (!symbol) return;
    try {
      const [stocksRes, liveRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
      ]);
      const stocksJson: ApiResponse = await stocksRes.json();
      const liveJson: LiveQuoteResponse = await liveRes.json();
      const clean = symbol.toUpperCase();
      setStock((stocksJson.stocks || []).find((row) => row.symbol.toUpperCase() === clean) || null);
      setQuote((liveJson.quotes || []).find((row) => row.symbol.toUpperCase() === clean) || null);
    } catch {
      // Keep validator usable manually even if suggestion data fails.
    }
  }

  useEffect(() => { loadSuggestionData(); }, [symbol]);

  function storageKey() {
    return `iov_rr_plan_${(symbol || 'unknown').toUpperCase()}`;
  }

  function savePlan(payload: unknown) {
    if (typeof window === 'undefined' || !symbol) return;
    window.localStorage.setItem(storageKey(), JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('iov-rr-plan-updated', { detail: { symbol: symbol.toUpperCase() } }));
  }

  function clearPlan() {
    setEntry('');
    setStop('');
    setTarget('');
    if (typeof window !== 'undefined' && symbol) {
      window.localStorage.removeItem(storageKey());
      window.dispatchEvent(new CustomEvent('iov-rr-plan-updated', { detail: { symbol: symbol.toUpperCase() } }));
    }
  }

  function useSuggestedPlan() {
    const base = Number(quote?.ltp || stock?.close || 0);
    if (!base) return;
    const stopBufferPct = stock?.position_20d_pct && stock.position_20d_pct >= 90 ? 0.01 : 0.008;
    const plannedRisk = base * stopBufferPct;
    const suggestedEntry = base;
    const suggestedStop = side === 'Long' ? base - plannedRisk : base + plannedRisk;
    const suggestedTarget = side === 'Long' ? base + plannedRisk * 2 : base - plannedRisk * 2;
    setEntry(formatPrice(suggestedEntry));
    setStop(formatPrice(suggestedStop));
    setTarget(formatPrice(suggestedTarget));
  }

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
      side,
      entry: e,
      stop: s,
      target: t,
      risk: Number(risk.toFixed(2)),
      reward: Number(reward.toFixed(2)),
      rr: Number(rr.toFixed(2)),
      validStructure,
      isReady,
      saved_at: new Date().toISOString(),
      message: !validStructure
        ? 'Invalid plan: stop/target are not placed correctly for this direction.'
        : rr >= 2
          ? 'RR is valid. Still wait for setup confirmation and discipline lock.'
          : 'RR is below 1:2. Skip or wait for a better entry.'
    };
  }, [entry, stop, target, side]);

  useEffect(() => {
    if (!symbol) return;
    if (result) savePlan(result);
    else if (!entry && !stop && !target && typeof window !== 'undefined') window.localStorage.removeItem(storageKey());
  }, [result, symbol]);

  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">RR Validator v3</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Check if the trade is really 1:2</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Use this before marking an idea Ready. Valid RR is saved locally so the Auto Checklist can verify the RR gate automatically.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${result?.isReady ? 'border-emerald-700 bg-emerald-500/10' : result ? 'border-red-800 bg-red-500/10' : 'border-slate-700 bg-slate-950'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
          <div className={`mt-1 text-xl font-bold ${result?.isReady ? 'text-emerald-300' : result ? 'text-red-300' : 'text-white'}`}>{result ? (result.isReady ? 'Trade-ready RR' : 'Not ready') : 'Enter plan'}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={useSuggestedPlan} disabled={!stock && !quote} className="rounded-xl border border-blue-700 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50">Use Suggested 2R Plan</button>
        <button onClick={clearPlan} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Clear</button>
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
        {result.message} {result.isReady ? 'Auto Checklist RR gate will now turn Auto Pass.' : ''}
      </div> : <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
        Enter planned entry, stop, and target to calculate RR. Suggested plan uses LTP/close and a small buffer; do not treat it as an actual trade signal.
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

function formatPrice(value: number) {
  return String(Number(value.toFixed(2)));
}
