'use client';

import { useEffect, useState } from 'react';

type MarketRegime = {
  label: string;
  score: number;
  avg_1d_pct?: number;
  avg_5d_pct?: number;
  strong_count?: number;
  weak_count?: number;
  reason: string;
};

type SectorRow = {
  sector: string;
  count: number;
  avg_score: number;
  avg_5d_pct: number;
  leaders: string[];
};

type DailyPlan = {
  symbol: string;
  name?: string;
  sector?: string;
  close?: number;
  quant_score: number;
  action_tag: string;
  setup?: string;
  reason: string;
  risk_warning: string;
  entry_idea: string;
  invalidation: string;
  target_idea: string;
  news_note: string;
  financial_note: string;
  metrics: {
    change_1d_pct?: number;
    return_5d_pct?: number;
    return_20d_pct?: number;
    volume_ratio?: number;
    position_20d_pct?: number;
  };
};

type DailyPlanResponse = {
  status: string;
  mode: string;
  source: string;
  date: string;
  universe: string;
  live_orders_enabled: boolean;
  market_regime: MarketRegime;
  top_sectors: SectorRow[];
  count: number;
  plans: DailyPlan[];
  note?: string;
};

export default function DailyPlanPage() {
  const [data, setData] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlan() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch('http://localhost:8000/api/research/daily-plan?limit=10');
      if (!r.ok) throw new Error(`Daily plan API returned ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load daily research plan');
    } finally {
      setLoading(false);
    }
  }

  async function addToWatchlist(plan: DailyPlan) {
    try {
      setSaving(plan.symbol);
      setMessage(null);
      setError(null);
      const payload = {
        symbol: plan.symbol,
        name: plan.name,
        sector: plan.sector,
        quant_score: plan.quant_score,
        live_signal: 'Daily Plan',
        reason: `${plan.reason} Risk: ${plan.risk_warning}`,
        status: 'Watching',
        action_tag: plan.action_tag || 'Wait',
        outcome: 'Pending',
        entry_idea: plan.entry_idea,
        invalidation: plan.invalidation,
        target_idea: plan.target_idea,
        notes: `${plan.news_note}\n${plan.financial_note}`,
        source: 'daily_research_plan',
      };
      const r = await fetch('http://localhost:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j.status === 'error') throw new Error(j.error || `Watchlist save returned ${r.status}`);
      setMessage(`${plan.symbol} added to watchlist as ${plan.action_tag}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to watchlist');
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => { loadPlan(); }, []);

  const regime = data?.market_regime;
  const plans = data?.plans || [];

  return <section className="min-h-screen bg-slate-950 p-8 text-white md:p-12">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Daily Research Pipeline v1</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Today&apos;s Quant Research Plan</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Morning shortlist built from historical candles, volume, momentum, breakout position, sector strength, and risk warnings. Research only. No live orders.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/stocks" className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Back to Stocks</a>
          <button onClick={loadPlan} disabled={loading} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{loading ? 'Generating...' : 'Generate Today Research'}</button>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
      {message ? <div className="mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{message}</div> : null}
      {data?.note ? <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/30 p-4 text-sm text-blue-200">{data.note}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <Metric label="Date" value={data?.date || '-'} hint="Research day" />
        <Metric label="Universe" value={data?.universe || 'NIFTY50'} hint={`Mode: ${data?.mode || 'checking'}`} />
        <Metric label="Data Source" value={data?.source || '-'} hint="Candles source" />
        <Metric label="Plans" value={loading ? '...' : String(data?.count || 0)} hint="Top candidates" tone="win" />
        <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Market Regime</h2>
              <p className="mt-1 text-sm text-slate-400">Broad condition before selecting trades.</p>
            </div>
            <div className={regimeTone(regime?.score || 0)}>{regime?.score ?? '-'}</div>
          </div>
          <div className="mt-5 text-3xl font-bold text-white">{regime?.label || 'Loading...'}</div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{regime?.reason || 'Generating market regime...'}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Mini label="Avg 1D" value={`${regime?.avg_1d_pct ?? 0}%`} />
            <Mini label="Avg 5D" value={`${regime?.avg_5d_pct ?? 0}%`} />
            <Mini label="Strong" value={String(regime?.strong_count ?? 0)} />
            <Mini label="Weak" value={String(regime?.weak_count ?? 0)} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold">Top Sector Strength</h2>
          <p className="mt-1 text-sm text-slate-400">Sector ranking from current research universe.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(data?.top_sectors || []).map((s) => <div key={s.sector} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3"><div className="font-bold text-white">{s.sector}</div><div className="text-emerald-300">{s.avg_score}</div></div>
              <div className="mt-1 text-xs text-slate-500">Avg 5D {s.avg_5d_pct}% • {s.count} stocks</div>
              <div className="mt-3 flex flex-wrap gap-2">{s.leaders.map((x) => <span key={x} className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{x}</span>)}</div>
            </div>)}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold">Top 10 Daily Plans</h2>
        <p className="mt-1 text-sm text-slate-400">Use these as watchlist inputs. Trade only after intraday confirmation and discipline rules.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {loading ? <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">Generating daily research...</div> : plans.length === 0 ? <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">No candidates found. Fetch Dhan daily candles first.</div> : plans.map((plan) => <PlanCard key={plan.symbol} plan={plan} saving={saving === plan.symbol} onAdd={addToWatchlist} />)}
        </div>
      </div>
    </div>
  </section>;
}

function PlanCard({ plan, saving, onAdd }: { plan: DailyPlan; saving: boolean; onAdd: (plan: DailyPlan) => void }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-white">{plan.symbol}</h3>
          <span className={actionBadge(plan.action_tag)}>{plan.action_tag}</span>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">Score {plan.quant_score}</span>
        </div>
        <div className="mt-1 text-sm text-slate-500">{plan.name || plan.sector} • {plan.sector}</div>
      </div>
      <div className="text-right"><div className="text-sm text-slate-400">Close</div><div className="font-bold text-emerald-300">{money(plan.close || 0)}</div></div>
    </div>

    <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
      <Mini label="1D" value={`${plan.metrics.change_1d_pct ?? 0}%`} />
      <Mini label="5D" value={`${plan.metrics.return_5d_pct ?? 0}%`} />
      <Mini label="20D" value={`${plan.metrics.return_20d_pct ?? 0}%`} />
      <Mini label="Vol" value={`${plan.metrics.volume_ratio ?? 0}x`} />
      <Mini label="20D Pos" value={`${plan.metrics.position_20d_pct ?? 0}%`} />
    </div>

    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300"><span className="font-semibold text-white">Reason: </span>{plan.reason}</div>
    <div className="mt-3 rounded-xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-100"><span className="font-semibold">Risk: </span>{plan.risk_warning}</div>

    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
      <Box title="Entry" text={plan.entry_idea} />
      <Box title="Invalidation" text={plan.invalidation} tone="loss" />
      <Box title="Target" text={plan.target_idea} tone="win" />
    </div>

    <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">{plan.news_note}</div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">{plan.financial_note}</div>
    </div>

    <button disabled={saving} onClick={() => onAdd(plan)} className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{saving ? 'Adding...' : 'Add to Watchlist'}</button>
  </div>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-1 font-bold text-white">{value}</div></div>; }
function Box({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><div className={`text-xs font-bold uppercase tracking-[0.16em] ${cls}`}>{title}</div><div className="mt-2 text-slate-300">{text}</div></div>; }
function regimeTone(score: number) { if (score >= 65) return 'rounded-2xl border border-emerald-700 bg-emerald-500/10 px-5 py-3 text-2xl font-bold text-emerald-300'; if (score <= 40) return 'rounded-2xl border border-red-700 bg-red-500/10 px-5 py-3 text-2xl font-bold text-red-300'; return 'rounded-2xl border border-yellow-700 bg-yellow-500/10 px-5 py-3 text-2xl font-bold text-yellow-300'; }
function actionBadge(action: string) { if (action === 'Ready') return 'rounded-full border border-emerald-700 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300'; if (action === 'Avoid') return 'rounded-full border border-red-700 bg-red-500/10 px-2 py-1 text-xs text-red-300'; if (action === 'Review') return 'rounded-full border border-blue-700 bg-blue-500/10 px-2 py-1 text-xs text-blue-300'; return 'rounded-full border border-yellow-700 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-300'; }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
