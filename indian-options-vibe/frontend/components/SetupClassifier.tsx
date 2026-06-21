'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type StockRow = { symbol: string; name: string; sector: string; close: number; change_1d_pct: number; return_5d_pct: number; return_20d_pct: number; volume_ratio: number; position_20d_pct: number; quant_score: number; tag: string; ai_reason: string };
type ApiResponse = { count: number; stocks: StockRow[]; mode?: string; source?: string };
type LiveQuote = { symbol: string; ltp: number | null; change_pct: number | null };
type LiveQuoteResponse = { status: string; count: number; quotes: LiveQuote[] };
type SetupName = 'Breakout Retest' | 'Momentum Continuation' | 'Volume Expansion' | 'Extended / Avoid' | 'Weak / Ignore';
type ClassifiedSetup = { setup: SetupName; score: number; reason: string; action: string; tone: 'win' | 'warn' | 'loss' | 'neutral' };

export function classifySetup(row: StockRow, quote?: LiveQuote): ClassifiedSetup {
  const livePct = Number(quote?.change_pct ?? 0);
  const isNearHigh = row.position_20d_pct >= 85;
  const isExtended = row.position_20d_pct >= 95 || (row.position_20d_pct >= 92 && livePct >= 1);
  const hasVolume = row.volume_ratio >= 1.5;
  const hasMomentum = row.return_5d_pct >= 2 && row.change_1d_pct >= 0;
  const isWeak = row.quant_score < 45 || row.return_5d_pct < -1 || livePct <= -0.75;

  if (isWeak) {
    return { setup: 'Weak / Ignore', score: 25, tone: 'loss', action: 'Avoid fresh long plans', reason: 'Momentum or live movement is weak. Keep this away from active watchlist unless structure recovers.' };
  }

  if (isExtended) {
    return { setup: 'Extended / Avoid', score: 45, tone: 'warn', action: 'Do not chase', reason: `Price is high in the 20D range at ${row.position_20d_pct}% and may be stretched. Wait for pullback or breakout retest.` };
  }

  if (isNearHigh && hasVolume) {
    return { setup: 'Breakout Retest', score: 85, tone: 'win', action: 'Wait for retest confirmation', reason: `Price is near the 20D high zone at ${row.position_20d_pct}% with ${row.volume_ratio}x volume. Best plan is breakout retest, not chase.` };
  }

  if (hasMomentum && row.quant_score >= 65) {
    return { setup: 'Momentum Continuation', score: 78, tone: 'win', action: 'Watch VWAP continuation', reason: `5D momentum is ${row.return_5d_pct}% and quant score is ${row.quant_score}. Look for controlled continuation with valid RR.` };
  }

  if (hasVolume) {
    return { setup: 'Volume Expansion', score: 70, tone: 'win', action: 'Watch for structure confirmation', reason: `Volume is expanding at ${row.volume_ratio}x. Need price structure confirmation before planning entry.` };
  }

  return { setup: 'Momentum Continuation', score: 55, tone: 'neutral', action: 'Wait', reason: 'Some strength is present, but setup is not clean enough. Keep as research only until confirmation appears.' };
}

export function SetupClassifierPanel() {
  const pathname = usePathname();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [quotes, setQuotes] = useState<LiveQuote[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [stocksRes, liveRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
      ]);
      const stocksJson: ApiResponse = await stocksRes.json();
      const liveJson: LiveQuoteResponse = await liveRes.json();
      setStocks(stocksJson.stocks || []);
      setQuotes(liveJson.quotes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (pathname === '/stocks') load(); }, [pathname]);
  if (pathname !== '/stocks') return null;

  const liveBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  const classified = stocks.map((row) => ({ row, result: classifySetup(row, liveBySymbol.get(row.symbol)) }));
  const counts = getCounts(classified.map((x) => x.result));
  const top = classified
    .filter((x) => x.result.setup !== 'Weak / Ignore')
    .sort((a, b) => b.result.score - a.result.score || b.row.quant_score - a.row.quant_score)
    .slice(0, 6);

  return <section className="px-8 pb-12 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">Setup Classifier v1</h2>
          <p className="mt-1 text-sm text-slate-400">Classifies each stock into a setup type. Research only, not an entry trigger.</p>
        </div>
        <button onClick={load} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Refresh Classifier</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <ClassMetric label="Breakout Retest" value={counts['Breakout Retest']} tone="win" />
        <ClassMetric label="Momentum Continuation" value={counts['Momentum Continuation']} tone="win" />
        <ClassMetric label="Volume Expansion" value={counts['Volume Expansion']} tone="win" />
        <ClassMetric label="Extended / Avoid" value={counts['Extended / Avoid']} tone="warn" />
        <ClassMetric label="Weak / Ignore" value={counts['Weak / Ignore']} tone="loss" />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">Loading classifier...</div> : top.map(({ row, result }) => <SetupCard key={row.symbol} symbol={row.symbol} name={row.name} result={result} />)}
      </div>
    </div>
  </section>;
}

export function StockSetupClassifier({ symbol }: { symbol: string }) {
  const [stock, setStock] = useState<StockRow | null>(null);
  const [quote, setQuote] = useState<LiveQuote | undefined>();
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [stocksRes, liveRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
      ]);
      const stocksJson: ApiResponse = await stocksRes.json();
      const liveJson: LiveQuoteResponse = await liveRes.json();
      const clean = symbol.toUpperCase();
      setStock((stocksJson.stocks || []).find((x) => x.symbol.toUpperCase() === clean) || null);
      setQuote((liveJson.quotes || []).find((x) => x.symbol.toUpperCase() === clean));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol]);
  if (loading || !stock) return null;

  const result = classifySetup(stock, quote);
  return <section className="px-8 pb-6 md:px-12">
    <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">Setup Classifier</h2>
          <p className="mt-1 text-sm text-slate-400">Exact setup type for this stock. Use it to decide how to watch, not to blindly enter.</p>
        </div>
        <SetupBadge result={result} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Setup Score</div><div className="mt-2 text-3xl font-bold text-emerald-300">{result.score}</div><div className="mt-1 text-xs text-slate-500">0–100 quality score</div></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Why this setup?</div><p className="mt-3 text-sm leading-6 text-slate-300">{result.reason}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Action</div><div className="mt-3 text-lg font-bold text-white">{result.action}</div><p className="mt-2 text-xs text-slate-500">Still follow chart confirmation and discipline lock.</p></div>
      </div>
    </div>
  </section>;
}

function getCounts(results: ClassifiedSetup[]) {
  return {
    'Breakout Retest': results.filter((x) => x.setup === 'Breakout Retest').length,
    'Momentum Continuation': results.filter((x) => x.setup === 'Momentum Continuation').length,
    'Volume Expansion': results.filter((x) => x.setup === 'Volume Expansion').length,
    'Extended / Avoid': results.filter((x) => x.setup === 'Extended / Avoid').length,
    'Weak / Ignore': results.filter((x) => x.setup === 'Weak / Ignore').length,
  };
}

function SetupCard({ symbol, name, result }: { symbol: string; name: string; result: ClassifiedSetup }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
    <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-white">{symbol}</div><div className="text-xs text-slate-500">{name}</div></div><SetupBadge result={result} compact /></div>
    <p className="mt-3 text-xs leading-5 text-slate-400">{result.reason}</p>
    <div className="mt-3 text-xs font-semibold text-emerald-300">Action: {result.action}</div>
  </div>;
}

function SetupBadge({ result, compact }: { result: ClassifiedSetup; compact?: boolean }) {
  const cls = result.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : result.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : result.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-300';
  return <div className={`rounded-2xl border ${cls} ${compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'}`}><div className="font-bold">{result.setup}</div><div className="mt-0.5 opacity-80">Score {result.score}</div></div>;
}

function ClassMetric({ label, value, tone }: { label: string; value: number; tone: 'win' | 'warn' | 'loss' }) {
  const cls = tone === 'win' ? 'text-emerald-300' : tone === 'warn' ? 'text-yellow-300' : 'text-red-300';
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div><div className={`mt-2 text-2xl font-bold ${cls}`}>{value}</div></div>;
}
