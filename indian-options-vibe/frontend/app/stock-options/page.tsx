'use client';

import { useCallback, useEffect, useState } from 'react';

type Plan = {
  entry_trigger: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  rr_to_target_1: number;
  level_type: string;
  reason: string;
};
type Oi = {
  max_call_oi_strike: string | null;
  max_put_oi_strike: string | null;
  pcr_oi: number | null;
  change_call_oi_vs_previous: number;
  change_put_oi_vs_previous: number;
  retrieved_at_ist: string;
};
type Stock = {
  symbol: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  status: string;
  technical_score: number;
  as_of_candle: string;
  previous_close: number;
  nearest_option_expiry: string;
  volume_ratio_5d: number | null;
  atr14: number;
  ema: Record<string, number>;
  reasons: string[];
  plan: Plan | null;
  option_oi_status: string;
  option_oi?: Oi;
  news_status: string;
};
type Report = {
  status: string;
  message?: string;
  generated_at_ist?: string;
  price_data_through?: string | null;
  universe_count?: number;
  selected_count?: number;
  evaluated_count?: number;
  skipped_count?: number;
  is_pilot_subset?: boolean;
  news_status?: string;
  warning?: string;
  bullish?: Stock[];
  bearish?: Stock[];
  candidates?: Stock[];
};
type Status = {
  dhan_credentials_present: boolean;
  news_feed_connected: boolean;
  scan: { state: string; processed?: number; total?: number; symbol?: string; error?: string };
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const money = (v: number | undefined) => v === undefined ? '—' : '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const tone = (bias: string) => bias === 'BULLISH' ? 'text-emerald-400' : bias === 'BEARISH' ? 'text-rose-400' : 'text-slate-400';

export default function StockOptionsIntelligencePage() {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch(API + '/api/stock-intel/latest', { cache: 'no-store' }),
        fetch(API + '/api/stock-intel/status', { cache: 'no-store' }),
      ]);
      if (!a.ok || !b.ok) throw new Error('Backend unavailable. Check port 8000.');
      setReport(await a.json());
      setStatus(await b.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load research');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => { void refresh(); }, 10000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const start = async (pilot: boolean) => {
    setError('');
    setBusy(true);
    try {
      const query = pilot ? '?max_symbols=10&oi_top=2' : '?max_symbols=0&oi_top=5';
      const response = await fetch(API + '/api/stock-intel/scan' + query, { method: 'POST' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || ('Scan returned HTTP ' + response.status));
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start scan');
    } finally {
      setBusy(false);
    }
  };

  const list = (report?.candidates || []).filter(s => view === 'ALL' || s.bias === view);
  const selected = (report?.candidates || []).find(s => s.symbol === picked) || list[0] || null;
  const scanning = ['RUNNING', 'QUEUED'].includes(status?.scan.state || '');

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-10">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Indian Options Vibe</div>
        <h1 className="text-3xl font-black text-white">Stock Options Intelligence</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Read-only NSE stock research. Price levels refer to the underlying share, not option premiums.
          You independently choose any option contract and execute manually.
        </p>
      </header>

      <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-200">
        Phase 1: technical research only. News, brokerage targets and event verification are not yet connected.
        Scores are rule-based and uncalibrated; no BUY/SELL claim or execution signal is issued.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => start(true)} disabled={busy || scanning}
          className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
          Test 10 stocks
        </button>
        <button onClick={() => start(false)} disabled={busy || scanning}
          className="rounded-xl border border-slate-600 px-4 py-2 font-semibold text-slate-100 disabled:opacity-50">
          Scan all F&O stocks
        </button>
        <button onClick={() => void refresh()} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300">Refresh report</button>
        <span className="text-sm text-slate-400">
          Job: {status?.scan.state || 'UNKNOWN'}
          {scanning ? ' · ' + (status?.scan.processed || 0) + '/' + (status?.scan.total || '?') + ' · ' + (status?.scan.symbol || '') : ''}
        </span>
      </div>
      {error && <div className="rounded-xl border border-red-900 p-4 text-sm text-red-300">{error}</div>}
      {!status?.dhan_credentials_present && <p className="text-sm text-amber-300">Dhan credentials are not configured in the backend; scan cannot start.</p>}
      {status?.scan.state === 'FAILED' && <p className="text-sm text-rose-300">Scan failed: {status.scan.error || 'Unknown backend error'}. Review backend logs.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['F&O universe', report?.universe_count ?? '—'],
          ['Scanned', report?.selected_count ?? '—'],
          ['Qualified watchlist', report?.evaluated_count ?? '—'],
          ['Unusable / skipped', report?.skipped_count ?? '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500">
        Latest run: {report?.generated_at_ist || 'Never'} · Underlying candles through: {report?.price_data_through || 'Unknown'}
        {report?.is_pilot_subset ? ' · Pilot sample (not full market)' : ''}
        {report?.status === 'PARTIAL' ? ' · Partial coverage; some symbols lacked valid data' : ''}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Ranked technical candidates</h2>
            <div className="flex gap-2 text-xs">
              {(['ALL', 'BULLISH', 'BEARISH'] as const).map(choice => (
                <button key={choice} onClick={() => { setView(choice); setPicked(null); }}
                  className={'rounded-lg border px-3 py-1.5 ' + (view === choice ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-400')}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {!list.length ? <p className="py-8 text-sm text-slate-500">No verified technical candidates in the stored report. Run a scan to populate this table.</p> :
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 text-xs text-slate-400">
                  <tr><th className="py-2">Stock</th><th>Bias</th><th>Score</th><th>Close</th><th>Volume</th></tr>
                </thead>
                <tbody>
                  {list.map(item => (
                    <tr key={item.symbol} onClick={() => setPicked(item.symbol)}
                      className={'cursor-pointer border-b border-slate-800 hover:bg-slate-800/60 ' + (selected?.symbol === item.symbol ? 'bg-slate-800/70' : '')}>
                      <td className="py-3 font-bold">{item.symbol}</td>
                      <td className={tone(item.bias)}>{item.bias}</td>
                      <td>{item.technical_score}</td>
                      <td>{money(item.previous_close)}</td>
                      <td>{item.volume_ratio_5d ?? '—'}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          {!selected ? <p className="text-sm text-slate-500">Select a candidate to see its underlying-stock research plan.</p> :
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div><h2 className="text-2xl font-bold">{selected.symbol}</h2>
                  <p className="text-xs text-slate-400">Daily candle: {selected.as_of_candle} · Expiry: {selected.nearest_option_expiry}</p></div>
                <span className={'font-semibold ' + tone(selected.bias)}>{selected.bias}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Entry trigger', selected.plan?.entry_trigger],
                  ['Stop-loss', selected.plan?.stop_loss],
                  ['Target 1 (2.5R)', selected.plan?.target_1],
                  ['Target 2 (4R)', selected.plan?.target_2],
                  ['200 EMA', selected.ema['200']],
                  ['250 EMA', selected.ema['250']],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-semibold">{money(value as number | undefined)}</p>
                  </div>
                ))}
              </div>
              <h3 className="font-semibold">Why the stock is on the watchlist</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {selected.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
              </ul>
              <div className="rounded-xl border border-slate-700 p-3 text-xs text-slate-300">
                <p>OI: {selected.option_oi_status}</p>
                {selected.option_oi && <p>Largest call OI strike: {selected.option_oi.max_call_oi_strike || '—'} ·
                  Largest put OI strike: {selected.option_oi.max_put_oi_strike || '—'} · PCR: {selected.option_oi.pcr_oi ?? '—'}</p>}
                <p>News: {selected.news_status}</p>
              </div>
              <p className="text-xs text-amber-300">
                Wait for an actual breakout and independently verify corporate news, liquidity and expiry risk.
                The targets are ATR-based scenarios, not forecasts of future share or option prices.
              </p>
            </div>}
        </div>
      </div>
    </section>
  );
}
