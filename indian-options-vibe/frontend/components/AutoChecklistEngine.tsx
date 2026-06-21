'use client';

import { useEffect, useMemo, useState } from 'react';

type StockRow = {
  symbol: string;
  close: number;
  volume_ratio: number;
  position_20d_pct: number;
  quant_score: number;
  return_5d_pct: number;
  change_1d_pct: number;
};

type LiveQuote = { symbol: string; ltp: number | null; change_pct: number | null };
type ApiResponse = { stocks: StockRow[] };
type LiveQuoteResponse = { quotes: LiveQuote[] };
type RRPlan = { side: 'Long' | 'Short'; entry: number; stop: number; target: number; risk: number; reward: number; rr: number; isReady: boolean; saved_at: string };
type DisciplineStatus = { status: 'clear' | 'locked'; locked: boolean; trades_today: number; pnl_today: number; loss_count: number; reason: string; mode: string };
type VwapStatus = { status: 'success' | 'unknown'; ltp: number | null; vwap: number | null; above_vwap: boolean; distance_pct: number | null; source: string; message: string };

type AutoCheck = {
  label: string;
  status: 'pass' | 'fail' | 'manual' | 'unknown';
  detail: string;
  auto: boolean;
};

export function AutoChecklistEngine({ symbol }: { symbol: string }) {
  const [stock, setStock] = useState<StockRow | null>(null);
  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [rrPlan, setRrPlan] = useState<RRPlan | null>(null);
  const [discipline, setDiscipline] = useState<DisciplineStatus | null>(null);
  const [vwap, setVwap] = useState<VwapStatus | null>(null);
  const [loading, setLoading] = useState(true);

  function rrStorageKey() {
    return `iov_rr_plan_${symbol.toUpperCase()}`;
  }

  function loadRrPlan() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(rrStorageKey());
      setRrPlan(raw ? JSON.parse(raw) : null);
    } catch {
      setRrPlan(null);
    }
  }

  async function load() {
    try {
      setLoading(true);
      const [stocksRes, liveRes, disciplineRes, vwapRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
        fetch('http://localhost:8000/api/discipline/status'),
        fetch(`http://localhost:8000/api/intraday/vwap/${encodeURIComponent(symbol)}`),
      ]);
      const stocksJson: ApiResponse = await stocksRes.json();
      const liveJson: LiveQuoteResponse = await liveRes.json();
      const disciplineJson: DisciplineStatus = await disciplineRes.json();
      const vwapJson: VwapStatus = await vwapRes.json();
      const clean = symbol.toUpperCase();
      setStock((stocksJson.stocks || []).find((row) => row.symbol.toUpperCase() === clean) || null);
      setQuote((liveJson.quotes || []).find((row) => row.symbol.toUpperCase() === clean) || null);
      setDiscipline(disciplineJson);
      setVwap(vwapJson);
      loadRrPlan();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol]);

  useEffect(() => {
    function onPlanUpdated(event: Event) {
      const detail = (event as CustomEvent).detail as { symbol?: string } | undefined;
      if (!detail?.symbol || detail.symbol === symbol.toUpperCase()) loadRrPlan();
    }
    if (typeof window !== 'undefined') {
      loadRrPlan();
      window.addEventListener('iov-rr-plan-updated', onPlanUpdated);
      window.addEventListener('storage', onPlanUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('iov-rr-plan-updated', onPlanUpdated);
        window.removeEventListener('storage', onPlanUpdated);
      }
    };
  }, [symbol]);

  const checks = useMemo(() => buildChecks(stock, quote, rrPlan, discipline, vwap), [stock, quote, rrPlan, discipline, vwap]);
  const autoChecks = checks.filter((x) => x.auto);
  const autoPassed = autoChecks.filter((x) => x.status === 'pass').length;
  const autoFailed = autoChecks.filter((x) => x.status === 'fail').length;
  const manualCount = checks.filter((x) => x.status === 'manual').length;
  const readiness = autoFailed === 0 && autoPassed >= 6 ? 'Auto checks OK' : 'Auto checks not ready';

  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Auto Checklist Engine v4</div>
          <h2 className="mt-2 text-2xl font-bold text-white">System checks what it can verify</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            RR, discipline, and VWAP status are now connected. Retest and market breadth still need separate engines before they become automatic.
          </p>
        </div>
        <div className={`rounded-2xl border px-6 py-4 text-center ${autoFailed === 0 && autoPassed >= 6 ? 'border-emerald-700 bg-emerald-500/10' : 'border-yellow-800 bg-yellow-500/10'}`}>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Auto Status</div>
          <div className={`mt-1 text-xl font-bold ${autoFailed === 0 && autoPassed >= 6 ? 'text-emerald-300' : 'text-yellow-300'}`}>{loading ? 'Checking...' : readiness}</div>
          <div className="mt-1 text-xs text-slate-400">{autoPassed}/{autoChecks.length} auto passed • {manualCount} manual</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => <AutoCheckCard key={check.label} check={check} />)}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
        <span className="font-bold text-cyan-300">Teacher rule:</span> VWAP Engine v1 uses an estimated VWAP proxy until true intraday candles are connected. Treat it as a filter, not final permission to enter.
      </div>
    </div>
  </section>;
}

function buildChecks(stock: StockRow | null, quote: LiveQuote | null, rrPlan: RRPlan | null, discipline: DisciplineStatus | null, vwap: VwapStatus | null): AutoCheck[] {
  const vwapCheck: AutoCheck = {
    label: 'Price above VWAP',
    status: vwap ? (vwap.above_vwap ? 'pass' : 'fail') : 'unknown',
    detail: vwap ? `${vwap.message} LTP: ${vwap.ltp ?? '-'}, VWAP: ${vwap.vwap ?? '-'} (${vwap.source}).` : 'Waiting for VWAP status.',
    auto: Boolean(vwap),
  };

  if (!stock) {
    return [
      { label: 'Stock data', status: 'unknown', detail: 'Stock research data not loaded yet.', auto: true },
      { label: 'Volume confirmation', status: 'unknown', detail: 'Waiting for volume ratio.', auto: true },
      { label: 'RR minimum 1:2', status: rrPlan?.isReady ? 'pass' : 'manual', detail: rrPlan?.isReady ? `Saved RR plan is 1:${rrPlan.rr}.` : 'RR Validator must be checked after selecting entry/stop/target.', auto: Boolean(rrPlan?.isReady) },
      { label: 'Discipline lock clear', status: discipline && !discipline.locked ? 'pass' : discipline?.locked ? 'fail' : 'unknown', detail: discipline?.reason || 'Waiting for discipline status.', auto: Boolean(discipline) },
      vwapCheck,
      { label: 'Retest held', status: 'manual', detail: 'Needs intraday structure detection.', auto: false },
      { label: 'Market breadth', status: 'manual', detail: 'Needs index and sector breadth feed.', auto: false },
    ];
  }

  const livePct = Number(quote?.change_pct ?? 0);
  const volumePass = stock.volume_ratio >= 1.2;
  const setupPass = stock.quant_score >= 65 && stock.position_20d_pct >= 70;
  const livePass = quote?.ltp != null && livePct >= 0;
  const notExtended = !(stock.position_20d_pct >= 95 && livePct >= 1);
  const rrReady = Boolean(rrPlan?.isReady && rrPlan.rr >= 2);
  const disciplineClear = Boolean(discipline && !discipline.locked);

  return [
    {
      label: 'Volume confirmation',
      status: volumePass ? 'pass' : 'fail',
      detail: volumePass ? `Volume ratio ${stock.volume_ratio}x is acceptable.` : `Volume ratio ${stock.volume_ratio}x is weak. Do not force the setup.`,
      auto: true,
    },
    {
      label: 'Historical setup quality',
      status: setupPass ? 'pass' : 'fail',
      detail: setupPass ? `Quant score ${stock.quant_score} and 20D position ${stock.position_20d_pct}% support watchlist research.` : `Quant score/20D position are not strong enough yet.`,
      auto: true,
    },
    {
      label: 'Live direction',
      status: livePass ? 'pass' : 'fail',
      detail: livePass ? `Live move is ${livePct}%, not against the long idea.` : `Live move is ${livePct}%. Avoid fresh long planning unless it recovers.`,
      auto: true,
    },
    {
      label: 'Extension risk',
      status: notExtended ? 'pass' : 'fail',
      detail: notExtended ? 'No major auto extension block detected.' : 'Price is extended near upper range. Wait for retest; do not chase.',
      auto: true,
    },
    {
      label: 'RR minimum 1:2',
      status: rrReady ? 'pass' : 'manual',
      detail: rrReady ? `Saved ${rrPlan?.side} plan: entry ${rrPlan?.entry}, stop ${rrPlan?.stop}, target ${rrPlan?.target}, RR 1:${rrPlan?.rr}.` : 'Use RR Validator. When RR is 1:2 or better, this will become Auto Pass.',
      auto: rrReady,
    },
    {
      label: 'Discipline lock clear',
      status: discipline ? (disciplineClear ? 'pass' : 'fail') : 'unknown',
      detail: discipline ? `${discipline.reason} Trades today: ${discipline.trades_today}, P&L: ${discipline.pnl_today}, losses: ${discipline.loss_count}.` : 'Waiting for discipline status from journal/paper trades.',
      auto: Boolean(discipline),
    },
    vwapCheck,
    {
      label: 'Retest held',
      status: 'manual',
      detail: 'Manual for now. Needs breakout/retest structure detection from intraday candles.',
      auto: false,
    },
    {
      label: 'Market breadth supportive',
      status: 'manual',
      detail: 'Manual for now. Needs NIFTY/sector breadth engine.',
      auto: false,
    },
  ];
}

function AutoCheckCard({ check }: { check: AutoCheck }) {
  const cls = check.status === 'pass'
    ? 'border-emerald-800 bg-emerald-500/10'
    : check.status === 'fail'
      ? 'border-red-900 bg-red-950/20'
      : check.status === 'manual'
        ? 'border-blue-900 bg-blue-950/20'
        : 'border-slate-800 bg-slate-950';
  const labelCls = check.status === 'pass'
    ? 'text-emerald-300'
    : check.status === 'fail'
      ? 'text-red-300'
      : check.status === 'manual'
        ? 'text-blue-300'
        : 'text-slate-300';
  const badge = check.status === 'pass' ? 'Auto Pass' : check.status === 'fail' ? 'Auto Fail' : check.status === 'manual' ? 'Manual' : 'Unknown';

  return <div className={`rounded-2xl border p-4 ${cls}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="font-bold text-white">{check.label}</div>
      <div className={`rounded-full border border-current px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${labelCls}`}>{badge}</div>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-400">{check.detail}</p>
  </div>;
}
