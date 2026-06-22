'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StockRow = { symbol: string; name: string; sector: string; close: number; change_1d_pct: number; return_5d_pct: number; return_20d_pct: number; volume_ratio: number; position_20d_pct: number; quant_score: number; tag: string; ai_reason: string };
type ApiResponse = { mode: string; source?: string; universe?: string; count: number; stocks: StockRow[]; note?: string; error?: string };
type LiveQuote = { symbol: string; security_id: string; ltp: number | null; prev_close: number | null; change: number | null; change_pct: number | null };
type LiveQuoteResponse = { status: string; mode: string; source: string; count: number; quotes: LiveQuote[]; message?: string };
type LiveSignal = { label: 'Live Watch' | 'Extended / Avoid' | 'Wait' | 'Weak Live'; reason: string; tone: 'win' | 'warn' | 'loss' | 'neutral' };
type ScoreRow = { label: string; value: number; reason: string; tone?: 'win' | 'warn' | 'loss' };
type VwapStatus = { status: string; source: string; above_vwap: boolean; ltp?: number | null; vwap?: number | null; distance_pct?: number | null; message?: string };
type RetestStatus = { status: 'success' | 'failed' | 'waiting' | 'unknown'; result: string; retest_held: boolean; source: string; message: string; retest_low?: number; retest_high?: number; breakout_floor?: number; prior_high?: number; session_high?: number; session_low?: number; latest_close?: number; vwap?: number | null; volume_ratio?: number | null };
type BreadthStatus = { status: string; supportive: boolean; sector_supportive?: boolean; positive?: number; negative?: number; avg_change_pct?: number; message?: string };
type FinalDecision = { label: string; reason: string; tone: 'win' | 'warn' | 'loss' | 'neutral' };

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol || '').toUpperCase();
  const [stocksData, setStocksData] = useState<ApiResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveQuoteResponse | null>(null);
  const [vwap, setVwap] = useState<VwapStatus | null>(null);
  const [retest, setRetest] = useState<RetestStatus | null>(null);
  const [breadth, setBreadth] = useState<BreadthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [stocksRes, liveRes, vwapRes, retestRes, breadthRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
        fetch(`http://localhost:8000/api/intraday/vwap/${encodeURIComponent(symbol)}`),
        fetch(`http://localhost:8000/api/intraday/retest-v2/${encodeURIComponent(symbol)}`),
        fetch(`http://localhost:8000/api/market/breadth?symbol=${encodeURIComponent(symbol)}`),
      ]);
      if (!stocksRes.ok) throw new Error(`Research API returned ${stocksRes.status}`);
      if (!liveRes.ok) throw new Error(`Live API returned ${liveRes.status}`);
      setStocksData(await stocksRes.json());
      setLiveData(await liveRes.json());
      setVwap(await vwapRes.json());
      setRetest(await retestRes.json());
      setBreadth(await breadthRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stock detail');
    } finally {
      setLoading(false);
    }
  }

  async function addToWatchlist() {
    if (!stock) return;
    const signal = getLiveSignal(stock, quote);
    const finalDecision = getFinalDecision(signal, vwap, retest, breadth);
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      const payload = {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        quant_score: stock.quant_score,
        live_signal: signal.label,
        reason: `${finalDecision.label}: ${finalDecision.reason}. ${getResearchReason(stock)} ${signal.reason}`,
        status: 'Watching',
        action_tag: finalDecision.tone === 'win' ? 'Ready' : finalDecision.tone === 'loss' ? 'Avoid' : 'Wait',
        outcome: 'Pending',
        entry_idea: getEntryIdea(stock),
        invalidation: getInvalidation(stock),
        target_idea: getTargetIdea(stock),
        notes: `Stock detail research page. Buyer zone: ${getBuyerZone(stock, quote, retest, vwap)}. Seller zone: ${getSellerZone(stock, quote, retest, vwap)}. Final: ${finalDecision.label}.`,
        source: 'stock_detail_page',
      };
      const r = await fetch('http://localhost:8000/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok || j.status === 'error') throw new Error(j.error || `Watchlist save returned ${r.status}`);
      setMessage(`${stock.symbol} added to watchlist as ${payload.action_tag}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to watchlist');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stock = useMemo(() => (stocksData?.stocks || []).find((row) => row.symbol.toUpperCase() === symbol), [stocksData, symbol]);
  const quote = useMemo(() => (liveData?.quotes || []).find((row) => row.symbol.toUpperCase() === symbol), [liveData, symbol]);
  const signal = stock ? getLiveSignal(stock, quote) : null;
  const finalDecision = signal ? getFinalDecision(signal, vwap, retest, breadth) : null;
  const strength = stock ? getLiveStrength(stock, quote) : 0;
  const breakdown = stock ? getScoreBreakdown(stock, quote) : [];

  if (loading) return <section className="p-8 md:p-12"><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">Loading stock research...</div></section>;
  if (!stock) return <section className="p-8 md:p-12"><div className="mx-auto max-w-5xl rounded-3xl border border-red-900 bg-red-950/20 p-8"><h1 className="text-3xl font-bold text-white">Stock not found</h1><p className="mt-2 text-slate-300">{symbol} is not available in the current research universe.</p><Link href="/stocks" className="mt-5 inline-block rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Back to Stocks</Link></div></section>;

  return <section className="p-8 md:p-12"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/stocks" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Stocks Research</Link>
            <a href="/paper" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">Paper Trading</a>
            <a href="/paper/discipline" className="rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950/50">Discipline Lock</a>
            <a href="/paper/rules" className="rounded-xl border border-purple-800 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20">Rules</a>
            <a href="/paper/today" className="rounded-xl border border-yellow-800 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-500/20">Today Review</a>
            <a href="/paper/analytics" className="rounded-xl border border-emerald-800 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">Analytics</a>
          </div>
          <div className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Stock Detail Research</div>
          <h1 className="mt-3 text-4xl font-bold text-white">{stock.symbol}</h1>
          <p className="mt-2 text-slate-400">{stock.name} • {stock.sector} • Research only. No live orders.</p>
        </div>
      <div className="flex flex-wrap gap-3"><button onClick={load} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button><button onClick={addToWatchlist} disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{saving ? 'Adding...' : 'Add to Watchlist'}</button></div>
    </div>

    {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
    {message ? <div className="mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{message}</div> : null}

    <div className="mt-6 grid gap-4 md:grid-cols-6"><Metric label="Close" value={money(stock.close)} hint="Research close" /><Metric label="Live LTP" value={quote?.ltp != null ? money(quote.ltp) : '-'} hint="Dhan snapshot" tone="win" /><Metric label="Live %" value={quote?.change_pct != null ? `${quote.change_pct}%` : '-'} hint="vs reference close" tone={Number(quote?.change_pct || 0) >= 0 ? 'win' : 'loss'} /><Metric label="Live Strength" value={String(strength)} hint="0–100 score" tone={strength >= 70 ? 'win' : strength < 45 ? 'loss' : undefined} /><Metric label="Quant Score" value={String(stock.quant_score)} hint={stock.tag} tone={stock.quant_score >= 70 ? 'win' : undefined} /><Metric label="Execution" value="Locked" hint="Research only" tone="loss" /></div>

    <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><h2 className="text-2xl font-bold text-white">Research Breakdown</h2><p className="mt-1 text-sm text-slate-400">Transparent score components. Final decision now reads VWAP, retest, and breadth gates.</p></div>{finalDecision ? <FinalDecisionBadge decision={finalDecision} /> : null}</div><div className="mt-5 grid gap-4 md:grid-cols-5">{breakdown.map((row) => <BreakdownCard key={row.label} row={row} />)}</div></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-white">Live Decision</h2><p className="mt-1 text-sm text-slate-400">This is a research decision, not automatic execution.</p></div>{finalDecision ? <FinalDecisionSmall decision={finalDecision} /> : signal ? <SignalBadge signal={signal} /> : null}</div><p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-6 text-slate-300">{finalDecision?.reason || signal?.reason}</p><div className="mt-5 grid gap-3 md:grid-cols-3"><Box title="Entry Idea" text={getEntryIdea(stock)} /><Box title="Invalidation" text={getInvalidation(stock)} tone="loss" /><Box title="Target Idea" text={getTargetIdea(stock)} tone="win" /></div></div><div className="mt-6"><DisciplineStatusCard />

        <RRPlanCard stock={stock} quote={quote} retest={retest} vwap={vwap} /></div><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-2xl font-bold text-white">Buyer / Seller Zones</h2><p className="mt-1 text-sm text-slate-400">Real retest/VWAP zones from Dhan 5-minute structure when available. Volume profile and order book depth come later.</p><div className="mt-5 grid gap-3"><Zone title="Real retest buyer zone" text={getBuyerZone(stock, quote, retest, vwap)} tone="win" /><Zone title="Seller / supply zone" text={getSellerZone(stock, quote, retest, vwap)} tone="loss" /><Zone title="No-trade warning" text={getNoTradeWarning(stock, quote, retest, vwap)} /></div></div></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3"><TeacherTradePlanCard stock={stock} quote={quote} retest={retest} vwap={vwap} finalDecision={finalDecision} /><ResearchBox title="Why selected" text={getResearchReason(stock)} /><ResearchBox title="News layer" text="Company news connector is not added yet. Before live trading, check corporate news, results date, and any sector event." /><ResearchBox title="Financial layer" text="Financial snapshot comes next: revenue growth, profit trend, debt, ROE, and valuation risk. Current version is price-volume based." /></div>
    <div className="mt-6 rounded-3xl border border-yellow-900 bg-yellow-950/20 p-5 text-sm text-yellow-100"><span className="font-bold">Safety rule:</span> Final Decision can block Live Watch when retest, VWAP, breadth, RR, or discipline is not clean. This page is still research only.</div>
  </div></section>;
}

function getFinalDecision(signal: LiveSignal, vwap: VwapStatus | null, retest: RetestStatus | null, breadth: BreadthStatus | null): FinalDecision {
  if (retest?.status === 'failed') return { label: 'Wait: Retest Failed', tone: 'loss', reason: `${retest.message} Do not mark Ready until 5-minute structure reclaims the retest zone.` };
  if (vwap && vwap.above_vwap === false) return { label: 'Wait: Below VWAP', tone: 'warn', reason: `${vwap.message || 'Price is below VWAP.'} Wait for reclaim before planning a long entry.` };
  const breadthOk = !breadth
    ? true
    : Boolean(
        breadth.supportive ??
        (breadth.sector_supportive !== false)
      );

  if (breadth && !breadthOk) return { label: 'Wait: Breadth Weak', tone: 'warn', reason: `Market breadth is weak: ${breadth.positive ?? '-'} positive, ${breadth.negative ?? '-'} negative, avg ${breadth.avg_change_pct ?? '-'}%. Strong stock remains watch only.` };
  if (retest?.status === 'waiting') return { label: 'Wait for Retest', tone: 'warn', reason: `${retest.message} Do not chase; wait for a clean 5-minute hold.` };
  if (signal.label === 'Weak Live') return { label: 'Avoid: Weak Live', tone: 'loss', reason: signal.reason };
  if (signal.label === 'Extended / Avoid') return { label: 'Wait: Extended', tone: 'warn', reason: signal.reason };
  if (signal.label === 'Live Watch') return { label: 'Live Watch', tone: 'win', reason: `${signal.reason} VWAP/retest/breadth gates are not blocking this idea. Still use RR and discipline confirmation.` };
  return { label: 'Wait', tone: 'neutral', reason: signal.reason };
}

function FinalDecisionBadge({ decision }: { decision: FinalDecision }) { const cls = decision.tone === 'win' ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300' : decision.tone === 'loss' ? 'border-red-800 bg-red-500/10 text-red-300' : decision.tone === 'warn' ? 'border-yellow-800 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <div className={`rounded-2xl border px-5 py-3 text-center ${cls}`}><div className="text-xs uppercase tracking-[0.18em] opacity-80">Final Decision</div><div className="mt-1 text-lg font-bold text-white">{decision.label}</div></div>; }
function FinalDecisionSmall({ decision }: { decision: FinalDecision }) { const cls = decision.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : decision.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : decision.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <span className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold ${cls}`}>{decision.label}</span>; }
function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>; }
function BreakdownCard({ row }: { row: ScoreRow }) { const cls = row.tone === 'win' ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300' : row.tone === 'loss' ? 'border-red-800 bg-red-500/10 text-red-300' : 'border-yellow-800 bg-yellow-500/10 text-yellow-300'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-center justify-between gap-3"><div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{row.label}</div><div className={`rounded-xl border px-3 py-1 text-sm font-bold ${cls}`}>{row.value}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${row.value}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-400">{row.reason}</p></div>; }
function SignalBadge({ signal }: { signal: LiveSignal }) { const cls = signal.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : signal.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : signal.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <span className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold ${cls}`}>{signal.label}</span>; }
function Box({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className={`text-xs font-bold uppercase tracking-[0.18em] ${cls}`}>{title}</div><div className="mt-3 text-sm leading-6 text-slate-300">{text}</div></div>; }
function Zone({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'border-emerald-900 bg-emerald-950/20 text-emerald-200' : tone === 'loss' ? 'border-red-900 bg-red-950/20 text-red-200' : 'border-slate-800 bg-slate-950 text-slate-300'; return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">{title}</div><div className="mt-2 text-sm leading-6">{text}</div></div>; }

function TeacherTradePlanCard({
  stock,
  quote,
  retest,
  vwap,
  finalDecision,
}: {
  stock: StockRow;
  quote?: LiveQuote;
  retest?: RetestStatus | null;
  vwap?: VwapStatus | null;
  finalDecision?: FinalDecision | null;
}) {
  const rows = [
    { label: 'Decision', value: finalDecision?.label || 'Wait', tone: 'warn' },
    { label: 'Entry Trigger', value: getEntryIdea(stock), tone: 'neutral' },
    { label: 'Stop / Invalidation', value: getInvalidation(stock), tone: 'loss' },
    { label: 'Target / RR Logic', value: getTargetIdea(stock), tone: 'win' },
    { label: 'No-Trade Warning', value: getNoTradeWarning(stock, quote, retest, vwap), tone: 'warn' },
    { label: 'Buyer Zone', value: getBuyerZone(stock, quote, retest, vwap), tone: 'win' },
    { label: 'Seller Zone', value: getSellerZone(stock, quote, retest, vwap), tone: 'loss' },
  ];

  const toneClass = (tone: string) => {
    if (tone === 'win') return 'text-emerald-300';
    if (tone === 'loss') return 'text-red-300';
    if (tone === 'warn') return 'text-yellow-300';
    return 'text-slate-200';
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h3 className="text-2xl font-bold text-white">Teacher Trade Plan</h3>
      <p className="mt-1 text-sm text-slate-400">
        Structured research plan. No live orders. Use this only after chart confirmation.
      </p>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{row.label}</div>
            <div className={`mt-2 text-sm leading-6 font-semibold ${toneClass(row.tone)}`}>{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ResearchBox({ title, text }: { title: string; text: string }) { return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{text}</p></div>; }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function tone(value: number): 'win' | 'warn' | 'loss' { return value >= 70 ? 'win' : value >= 45 ? 'warn' : 'loss'; }
function getScoreBreakdown(row: StockRow, quote?: LiveQuote): ScoreRow[] { const liveChange = Number(quote?.change_pct ?? 0); const momentum = clamp(50 + row.change_1d_pct * 4 + row.return_5d_pct * 6 + row.return_20d_pct * 1.5); const volume = clamp(row.volume_ratio >= 1.5 ? 85 + Math.min(15, (row.volume_ratio - 1.5) * 10) : row.volume_ratio * 55); const breakout = clamp(row.position_20d_pct); const live = getLiveStrength(row, quote); let risk = 85; if (row.position_20d_pct >= 95 && liveChange >= 1) risk -= 35; if (row.volume_ratio < 0.8) risk -= 20; if (liveChange < 0) risk -= 20; if (row.quant_score < 45) risk -= 25; risk = clamp(risk); return [{ label: 'Momentum', value: momentum, tone: tone(momentum), reason: `1D ${row.change_1d_pct}%, 5D ${row.return_5d_pct}%, 20D ${row.return_20d_pct}%.` }, { label: 'Volume', value: volume, tone: tone(volume), reason: `Current volume ratio is ${row.volume_ratio}x versus recent average.` }, { label: 'Breakout', value: breakout, tone: tone(breakout), reason: `Price is at ${row.position_20d_pct}% of its 20-day range.` }, { label: 'Live', value: live, tone: tone(live), reason: `Live move is ${liveChange}% versus reference close.` }, { label: 'Risk Control', value: risk, tone: tone(risk), reason: risk >= 70 ? 'No major extension warning. Still wait for chart confirmation.' : 'Extension, weak volume, or weak live move needs caution.' }]; }
function getLiveStrength(row: StockRow, quote?: LiveQuote) { const liveChange = Number(quote?.change_pct ?? 0); let score = 35; score += Math.min(25, Math.max(-15, liveChange * 8)); score += Math.min(20, row.quant_score * 0.2); if (row.volume_ratio >= 1.5) score += 15; else if (row.volume_ratio >= 1.1) score += 8; if (row.position_20d_pct >= 85 && row.position_20d_pct < 95) score += 12; if (row.return_5d_pct > 2) score += 8; if (row.position_20d_pct >= 95 && liveChange >= 1) score -= 18; if (row.quant_score < 45 || liveChange <= -0.75) score -= 25; return clamp(score); }
function getLiveSignal(row: StockRow, quote?: LiveQuote): LiveSignal { const liveChange = Number(quote?.change_pct ?? 0); const strength = getLiveStrength(row, quote); const hasLive = quote?.ltp != null; const hasSetup = row.volume_ratio >= 1.5 || row.position_20d_pct >= 85 || row.quant_score >= 70; if (row.position_20d_pct >= 92 && liveChange >= 1) return { label: 'Extended / Avoid', tone: 'warn', reason: `Live strength ${strength}/100, but price is already extended near the top of its 20D range. Do not chase; wait for pullback or breakout retest.` }; if (hasLive && strength >= 70 && liveChange >= 0.35 && hasSetup) return { label: 'Live Watch', tone: 'win', reason: `Live strength ${strength}/100. LTP is positive and historical setup is present. Add to watchlist only; wait for chart confirmation.` }; if (hasLive && (strength < 35 || liveChange <= -0.75)) return { label: 'Weak Live', tone: 'loss', reason: `Live strength ${strength}/100. Live move is weak. Avoid fresh long planning unless structure improves.` }; return { label: 'Wait', tone: 'neutral', reason: `Live strength ${strength}/100. No clean live confirmation yet. Keep it as research only.` }; }
function getResearchReason(row: StockRow) { const parts: string[] = []; if (row.quant_score >= 70) parts.push(`quant score ${row.quant_score}/100`); if (row.volume_ratio >= 1.5) parts.push(`volume expansion ${row.volume_ratio}x`); if (row.position_20d_pct >= 85) parts.push(`price near 20D high zone at ${row.position_20d_pct}% range position`); if (row.return_5d_pct > 1) parts.push(`5D momentum ${row.return_5d_pct}%`); if (row.return_20d_pct > 2) parts.push(`20D momentum ${row.return_20d_pct}%`); if (parts.length === 0) parts.push(row.ai_reason || 'No strong research trigger yet.'); return `${row.symbol}: ${parts.join(' + ')}.`; }
function getEntryIdea(row: StockRow) { if (row.position_20d_pct >= 92) return 'Do not chase. Wait for pullback or breakout retest, then enter only if price holds above VWAP with volume.'; if (row.position_20d_pct >= 85) return 'Wait for breakout confirmation or retest near the 20D high zone with strong candle close.'; if (row.volume_ratio >= 1.5) return 'Watch for VWAP continuation with volume staying above average.'; return 'Wait for clean intraday structure before planning any trade.'; }
function getInvalidation(row: StockRow) { if (row.position_20d_pct >= 85) return 'Invalid if price rejects the breakout zone, loses VWAP, or falls below the retest level.'; return 'Invalid if momentum weakens, market breadth turns negative, or price loses VWAP.'; }
function getTargetIdea(row: StockRow) { return 'Target previous high / measured move with minimum 1:2 RR. Trail only if momentum continues.'; }
function getBuyerZone(row: StockRow, quote?: LiveQuote, retest?: RetestStatus | null, vwap?: VwapStatus | null) { const price = Number(quote?.ltp || row.close || 0); if (retest?.retest_low && retest?.retest_high) { const reclaim = retest.retest_held ? 'Retest is holding now.' : retest.status === 'failed' ? 'Price must reclaim this zone before Ready.' : 'Wait for pullback/hold confirmation inside this zone.'; const realVwap = vwap?.vwap ? ` Real VWAP: ${money(vwap.vwap)}.` : ''; return `Real 5m retest zone: ${money(retest.retest_low)}–${money(retest.retest_high)}. ${reclaim}${realVwap}`; } if (!price) return 'Waiting for live price.'; return `Fallback zone near VWAP/retest area below current price around ${money(price * 0.995)}–${money(price * 0.99)}. Confirm with volume and candle hold.`; }
function getSellerZone(row: StockRow, quote?: LiveQuote, retest?: RetestStatus | null, vwap?: VwapStatus | null) { const price = Number(quote?.ltp || row.close || 0); if (retest?.retest_high) { const supplyHigh = Math.max(retest.retest_high, price || 0); const upper = supplyHigh * 1.006; return `Supply/rejection watch above real retest zone: ${money(supplyHigh)}–${money(upper)}. If price rejects here or loses VWAP ${vwap?.vwap ? `(${money(vwap.vwap)})` : ''}, keep it Wait/Avoid.`; } if (!price) return 'Waiting for live price.'; if (row.position_20d_pct >= 90) return `Supply risk is near current/upper range. Watch rejection near ${money(price)}–${money(price * 1.01)}.`; return `First supply zone can appear near ${money(price * 1.01)}–${money(price * 1.02)} or previous high.`; }
function getNoTradeWarning(row: StockRow, quote?: LiveQuote, retest?: RetestStatus | null, vwap?: VwapStatus | null) { const liveChange = Number(quote?.change_pct || 0); if (retest?.status === 'failed') return `No trade. Real 5m retest failed. Wait until price reclaims ${money(retest.retest_low || 0)}–${money(retest.retest_high || 0)} and holds above VWAP.`; if (vwap && vwap.above_vwap === false) return 'No trade. Price is below real VWAP. Wait for reclaim and confirmation.'; if (row.position_20d_pct >= 95 && liveChange >= 1) return 'Price is extended. Avoid chasing. Wait for retest or skip.'; if (row.volume_ratio < 0.8) return 'Volume confirmation is weak. Avoid forced trades.'; if (liveChange < 0) return 'Live move is negative. Avoid fresh long setup unless structure recovers.'; return 'No automatic trade. Wait for confirmation, valid RR, and discipline lock clearance.'; }

function getRRPlan(stock: StockRow, quote?: LiveQuote, retest?: RetestStatus | null, vwap?: VwapStatus | null) {
  const entry = Number(quote?.ltp || stock.close || 0);

  let stop = 0;
  if (retest?.retest_low) {
    stop = Number(retest.retest_low);
  } else if (vwap?.vwap) {
    stop = Math.min(Number(vwap.vwap), entry * 0.99);
  } else if (entry > 0) {
    stop = entry * 0.99;
  }

  const risk = entry > 0 && stop > 0 ? entry - stop : 0;
  const oneR = risk > 0 ? entry + risk : 0;
  const twoR = risk > 0 ? entry + risk * 2 : 0;

  const blocked =
    !entry ||
    !stop ||
    risk <= 0 ||
    retest?.status === 'failed' ||
    vwap?.above_vwap === false;

  const status = blocked ? 'Not valid yet' : 'Valid only if chart target supports 2R';
  const tone = blocked ? 'warn' : 'win';

  return {
    entry,
    stop,
    risk,
    oneR,
    twoR,
    status,
    tone,
  };
}


function DisciplineStatusCard() {
  const [status, setStatus] = useState({
    locked: false,
    reason: 'Checking discipline rules...',
    tone: 'warn',
  });

  useEffect(() => {
    try {
      const trades = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');
      const maxPlans = Number(window.localStorage.getItem('disciplineMaxPlans') || 3);
      const maxSl = Number(window.localStorage.getItem('disciplineMaxSl') || 1);
      const cooldownOn = window.localStorage.getItem('disciplineCooldown') === 'true';

      const getIstDateKey = (value: unknown) => {
        const date = value ? new Date(String(value)) : new Date();

        if (Number.isNaN(date.getTime())) {
          return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        }

        return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      };

      const todayKey = getIstDateKey(new Date().toISOString());
      const todayTrades = Array.isArray(trades)
        ? trades.filter((item: any) => {
            const stamp = item.createdAt || item.updatedAt || item.marketSnapshot?.savedAt;
            return getIstDateKey(stamp) === todayKey;
          })
        : [];

      const todaySlHits = todayTrades.filter((item: any) =>
        String(item.result || item.status || '').toLowerCase().includes('sl')
      ).length;

      if (cooldownOn) {
        setStatus({
          locked: true,
          reason: 'Cooldown is ON. New paper plans are blocked.',
          tone: 'loss',
        });
        return;
      }

      if (todayTrades.length >= maxPlans) {
        setStatus({
          locked: true,
          reason: `Daily plan limit reached: ${todayTrades.length}/${maxPlans}.`,
          tone: 'loss',
        });
        return;
      }

      if (todaySlHits >= maxSl) {
        setStatus({
          locked: true,
          reason: `Daily SL limit reached: ${todaySlHits}/${maxSl}.`,
          tone: 'loss',
        });
        return;
      }

      setStatus({
        locked: false,
        reason: `Allowed. Today plans: ${todayTrades.length}/${maxPlans}. SL hits: ${todaySlHits}/${maxSl}.`,
        tone: 'win',
      });
    } catch {
      setStatus({
        locked: false,
        reason: 'Allowed. Discipline data not found yet.',
        tone: 'warn',
      });
    }
  }, []);

  const cls =
    status.tone === 'win'
      ? 'border-emerald-800 bg-emerald-500/10 text-emerald-300'
      : status.tone === 'loss'
        ? 'border-red-900 bg-red-950/20 text-red-300'
        : 'border-yellow-800 bg-yellow-500/10 text-yellow-300';

  return (
    <div className={`mt-6 rounded-3xl border p-5 ${cls}`}>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] opacity-70">Discipline Lock</div>
          <div className="mt-2 text-2xl font-black">{status.locked ? 'LOCKED' : 'ALLOWED'}</div>
          <p className="mt-2 text-sm leading-6 opacity-90">{status.reason}</p>
        </div>

        <a
          href="/paper/discipline"
          className="rounded-2xl border border-slate-700 bg-slate-950/50 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-slate-900"
        >
          Open Discipline
        </a>
      </div>
    </div>
  );
}


function RRPlanCard({ stock, quote, retest, vwap }: { stock: StockRow; quote?: LiveQuote; retest?: RetestStatus | null; vwap?: VwapStatus | null }) {
  const rr = getRRPlan(stock, quote, retest, vwap);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const cls =
    rr.tone === 'win'
      ? 'border-emerald-800 bg-emerald-500/10 text-emerald-200'
      : 'border-yellow-800 bg-yellow-500/10 text-yellow-200';

    const copyPaperPlan = async () => {
    const lines = [
      `PAPER TRADE PLAN — ${stock.symbol}`,
      `Name: ${stock.name}`,
      `Sector: ${stock.sector}`,
      ``,
      `Entry Ref: ${rr.entry ? money(rr.entry) : '-'}`,
      `Stop Ref: ${rr.stop ? money(rr.stop) : '-'}`,
      `Risk: ${rr.risk > 0 ? money(rr.risk) : '-'}`,
      `1R Target: ${rr.oneR ? money(rr.oneR) : '-'}`,
      `2R Target: ${rr.twoR ? money(rr.twoR) : '-'}`,
      `RR Status: ${rr.status}`,
      ``,
      `Entry Idea: ${getEntryIdea(stock)}`,
      `Invalidation: ${getInvalidation(stock)}`,
      `Target Logic: ${getTargetIdea(stock)}`,
      `No-Trade Warning: ${getNoTradeWarning(stock, quote, retest, vwap)}`,
      `Buyer Zone: ${getBuyerZone(stock, quote, retest, vwap)}`,
      `Seller Zone: ${getSellerZone(stock, quote, retest, vwap)}`,
      ``,
      `Mode: Research only / Paper trade only / No live order`,
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    alert('Paper trade plan copied');
  };

  const round2 = (value: number) => Math.round(Number(value || 0) * 100) / 100;

  const openPaperPage = () => {
    window.location.href = '/paper';
  };

  const savePaperPlan = () => {
    const existing = JSON.parse(window.localStorage.getItem('paperTrades') || '[]');

    const getIstDateKey = (value: unknown) => {
      const date = value ? new Date(String(value)) : new Date();

      if (Number.isNaN(date.getTime())) {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      }

      return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    const todayKey = getIstDateKey(new Date().toISOString());
    const todayTrades = existing.filter((item: any) => {
      const stamp = item.createdAt || item.updatedAt || item.marketSnapshot?.savedAt;
      return getIstDateKey(stamp) === todayKey;
    });

    const maxPlans = Number(window.localStorage.getItem('disciplineMaxPlans') || 3);
    const maxSl = Number(window.localStorage.getItem('disciplineMaxSl') || 1);
    const cooldownOn = window.localStorage.getItem('disciplineCooldown') === 'true';

    const todaySlHits = todayTrades.filter((item: any) =>
      String(item.result || item.status || '').toLowerCase().includes('sl')
    ).length;

    const openExistingPlanForSameStock = existing.some((item: any) =>
      item.symbol === stock.symbol &&
      item.source === 'stock_detail_rr_plan' &&
      ['Entered', 'Planned', 'Open'].includes(item.status)
    );

    let disciplineLockReason = '';

    if (cooldownOn) {
      disciplineLockReason = 'Cooldown is ON. No new paper plans allowed.';
    } else if (!openExistingPlanForSameStock && todayTrades.length >= maxPlans) {
      disciplineLockReason = `Daily plan limit reached: ${todayTrades.length}/${maxPlans}.`;
    } else if (todaySlHits >= maxSl) {
      disciplineLockReason = `Daily SL limit reached: ${todaySlHits}/${maxSl}.`;
    }

    if (disciplineLockReason) {
      setSaveMessage(`Discipline Lock active ⚠️ ${disciplineLockReason}`);
      return;
    }

    const trade = {
      id: `plan-${stock.symbol}-${Date.now()}`,
      trade_id: `plan-${stock.symbol}-${Date.now()}`,
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      status: 'Entered',
      source: 'stock_detail_rr_plan',
      setup: '1:2 RR research plan',
      entry: round2(rr.entry),
      entryPlan: round2(rr.entry),
      entryRef: round2(rr.entry),
      stop: round2(rr.stop),
      stopLoss: round2(rr.stop),
      stopRef: round2(rr.stop),
      risk: round2(rr.risk),
      target1R: round2(rr.oneR),
      target2R: round2(rr.twoR),
      target: round2(rr.twoR),
      bias: rr.status,
      rrStatus: rr.status,
      paperPnl: null,
      rResult: null,
      notes: `Entry: ${getEntryIdea(stock)} | Stop: ${getInvalidation(stock)} | Target: ${getTargetIdea(stock)} | No-trade: ${getNoTradeWarning(stock, quote, retest, vwap)} | Buyer: ${getBuyerZone(stock, quote, retest, vwap)} | Seller: ${getSellerZone(stock, quote, retest, vwap)}`,
      marketSnapshot: {
        decision: 'Research plan',
        entry: round2(rr.entry),
        stop: round2(rr.stop),
        risk: round2(rr.risk),
        target1R: round2(rr.oneR),
        target2R: round2(rr.twoR),
        rrStatus: rr.status,
        noTradeWarning: getNoTradeWarning(stock, quote, retest, vwap),
        buyerZone: getBuyerZone(stock, quote, retest, vwap),
        sellerZone: getSellerZone(stock, quote, retest, vwap),
        savedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    const existingOpenPlanIndex = existing.findIndex((item: any) =>
      item.symbol === stock.symbol &&
      item.source === 'stock_detail_rr_plan' &&
      ['Entered', 'Planned', 'Open'].includes(item.status)
    );

    if (existingOpenPlanIndex >= 0) {
      const nextTrades = [...existing];
      nextTrades[existingOpenPlanIndex] = {
        ...nextTrades[existingOpenPlanIndex],
        ...trade,
        id: nextTrades[existingOpenPlanIndex].id,
        trade_id: nextTrades[existingOpenPlanIndex].trade_id || nextTrades[existingOpenPlanIndex].id,
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem('paperTrades', JSON.stringify(nextTrades));
      setSaveMessage(`Updated in Paper Trading ✅ ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
      return;
    }

    window.localStorage.setItem('paperTrades', JSON.stringify([trade, ...existing]));
    setSaveMessage(`Saved to Paper Trading ✅ ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
  };

return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">1:2 RR Calculator</h2>
          <p className="mt-1 text-sm text-slate-400">
            Research-only risk/reward check. This does not place orders.
          </p>
        </div>
        <span className={`rounded-2xl border px-4 py-2 text-sm font-bold ${cls}`}>
          {rr.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Entry Ref</div>
          <div className="mt-2 text-lg font-bold text-white">{rr.entry ? money(rr.entry) : '-'}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Stop Ref</div>
          <div className="mt-2 text-lg font-bold text-red-300">{rr.stop ? money(rr.stop) : '-'}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk</div>
          <div className="mt-2 text-lg font-bold text-yellow-300">{rr.risk > 0 ? money(rr.risk) : '-'}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">1R Target</div>
          <div className="mt-2 text-lg font-bold text-emerald-300">{rr.oneR ? money(rr.oneR) : '-'}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">2R Target</div>
          <div className="mt-2 text-lg font-bold text-emerald-300">{rr.twoR ? money(rr.twoR) : '-'}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
        Rule: only consider paper-watch when entry is clear, stop is below entry, setup is not below VWAP,
        retest has not failed, and the chart has enough room to reach the 2R target.
      </div>
      <button onClick={copyPaperPlan} className="mt-4 rounded-2xl border border-emerald-800 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
        Copy Plan
      </button>
      <button onClick={savePaperPlan} className="ml-2 mt-4 rounded-2xl border border-blue-800 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/20">
        Save Paper Plan
      </button>
      <button onClick={openPaperPage} className="ml-2 mt-4 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
        Open Paper Trading
      </button>
      {saveMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
          {saveMessage}
        </div>
      ) : null}


    </div>
  );
}


function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
