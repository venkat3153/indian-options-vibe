'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StockRow = { symbol: string; name: string; sector: string; close: number; change_1d_pct: number; return_5d_pct: number; return_20d_pct: number; volume_ratio: number; position_20d_pct: number; quant_score: number; tag: string; ai_reason: string };
type ApiResponse = { mode: string; source?: string; universe?: string; count: number; stocks: StockRow[]; note?: string; error?: string };
type LiveQuote = { symbol: string; security_id: string; ltp: number | null; prev_close: number | null; change: number | null; change_pct: number | null };
type LiveQuoteResponse = { status: string; mode: string; source: string; count: number; quotes: LiveQuote[]; message?: string };
type LiveSignal = { label: 'Live Watch' | 'Extended / Avoid' | 'Wait' | 'Weak Live'; reason: string; tone: 'win' | 'warn' | 'loss' | 'neutral' };

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol || '').toUpperCase();
  const [stocksData, setStocksData] = useState<ApiResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [stocksRes, liveRes] = await Promise.all([
        fetch('http://localhost:8000/api/research/stocks'),
        fetch('http://localhost:8000/api/live/quotes?limit=50'),
      ]);
      if (!stocksRes.ok) throw new Error(`Research API returned ${stocksRes.status}`);
      if (!liveRes.ok) throw new Error(`Live API returned ${liveRes.status}`);
      setStocksData(await stocksRes.json());
      setLiveData(await liveRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stock detail');
    } finally {
      setLoading(false);
    }
  }

  async function addToWatchlist() {
    if (!stock) return;
    const signal = getLiveSignal(stock, quote);
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
        reason: `${getResearchReason(stock)} ${signal.reason}`,
        status: 'Watching',
        action_tag: signal.label === 'Live Watch' ? 'Ready' : 'Wait',
        outcome: 'Pending',
        entry_idea: getEntryIdea(stock),
        invalidation: getInvalidation(stock),
        target_idea: getTargetIdea(stock),
        notes: `Stock detail research page. Buyer zone: ${getBuyerZone(stock, quote)}. Seller zone: ${getSellerZone(stock, quote)}.`,
        source: 'stock_detail_page',
      };
      const r = await fetch('http://localhost:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
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
  const strength = stock ? getLiveStrength(stock, quote) : 0;

  if (loading) {
    return <section className="p-8 md:p-12"><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">Loading stock research...</div></section>;
  }

  if (!stock) {
    return <section className="p-8 md:p-12"><div className="mx-auto max-w-5xl rounded-3xl border border-red-900 bg-red-950/20 p-8"><h1 className="text-3xl font-bold text-white">Stock not found</h1><p className="mt-2 text-slate-300">{symbol} is not available in the current research universe.</p><Link href="/stocks" className="mt-5 inline-block rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Back to Stocks</Link></div></section>;
  }

  return <section className="p-8 md:p-12"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <Link href="/stocks" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Stocks Research</Link>
        <div className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Stock Detail Research</div>
        <h1 className="mt-3 text-4xl font-bold text-white">{stock.symbol}</h1>
        <p className="mt-2 text-slate-400">{stock.name} • {stock.sector} • Research only. No live orders.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={load} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
        <button onClick={addToWatchlist} disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{saving ? 'Adding...' : 'Add to Watchlist'}</button>
      </div>
    </div>

    {error ? <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
    {message ? <div className="mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{message}</div> : null}

    <div className="mt-6 grid gap-4 md:grid-cols-6">
      <Metric label="Close" value={money(stock.close)} hint="Research close" />
      <Metric label="Live LTP" value={quote?.ltp != null ? money(quote.ltp) : '-'} hint="Dhan snapshot" tone="win" />
      <Metric label="Live %" value={quote?.change_pct != null ? `${quote.change_pct}%` : '-'} hint="vs reference close" tone={Number(quote?.change_pct || 0) >= 0 ? 'win' : 'loss'} />
      <Metric label="Live Strength" value={String(strength)} hint="0–100 score" tone={strength >= 70 ? 'win' : strength < 45 ? 'loss' : undefined} />
      <Metric label="Quant Score" value={String(stock.quant_score)} hint={stock.tag} tone={stock.quant_score >= 70 ? 'win' : undefined} />
      <Metric label="Execution" value="Locked" hint="Research only" tone="loss" />
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Live Decision</h2>
            <p className="mt-1 text-sm text-slate-400">This is a research decision, not automatic execution.</p>
          </div>
          {signal ? <SignalBadge signal={signal} /> : null}
        </div>
        <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-6 text-slate-300">{signal?.reason}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Box title="Entry Idea" text={getEntryIdea(stock)} />
          <Box title="Invalidation" text={getInvalidation(stock)} tone="loss" />
          <Box title="Target Idea" text={getTargetIdea(stock)} tone="win" />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-2xl font-bold text-white">Buyer / Seller Zones</h2>
        <p className="mt-1 text-sm text-slate-400">Estimated zones from current price and research levels. Volume profile and order book depth come later.</p>
        <div className="mt-5 grid gap-3">
          <Zone title="Buyer zone" text={getBuyerZone(stock, quote)} tone="win" />
          <Zone title="Seller / supply zone" text={getSellerZone(stock, quote)} tone="loss" />
          <Zone title="No-trade warning" text={getNoTradeWarning(stock, quote)} />
        </div>
      </div>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <ResearchBox title="Why selected" text={getResearchReason(stock)} />
      <ResearchBox title="News layer" text="Company news connector is not added yet. Before live trading, check corporate news, results date, and any sector event." />
      <ResearchBox title="Financial layer" text="Financial snapshot comes next: revenue growth, profit trend, debt, ROE, and valuation risk. Current version is price-volume based." />
    </div>

    <div className="mt-6 rounded-3xl border border-yellow-900 bg-yellow-950/20 p-5 text-sm text-yellow-100">
      <span className="font-bold">Safety rule:</span> Even if Live Strength is high, this page does not mean buy now. Use it to prepare a plan, then wait for intraday confirmation and daily discipline rules.
    </div>
  </div></section>;
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-lg font-bold ${cls}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>; }
function SignalBadge({ signal }: { signal: LiveSignal }) { const cls = signal.tone === 'win' ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : signal.tone === 'warn' ? 'border-yellow-700 bg-yellow-500/10 text-yellow-300' : signal.tone === 'loss' ? 'border-red-700 bg-red-500/10 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-300'; return <span className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold ${cls}`}>{signal.label}</span>; }
function Box({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white'; return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className={`text-xs font-bold uppercase tracking-[0.18em] ${cls}`}>{title}</div><div className="mt-3 text-sm leading-6 text-slate-300">{text}</div></div>; }
function Zone({ title, text, tone }: { title: string; text: string; tone?: 'win' | 'loss' }) { const cls = tone === 'win' ? 'border-emerald-900 bg-emerald-950/20 text-emerald-200' : tone === 'loss' ? 'border-red-900 bg-red-950/20 text-red-200' : 'border-slate-800 bg-slate-950 text-slate-300'; return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">{title}</div><div className="mt-2 text-sm leading-6">{text}</div></div>; }
function ResearchBox({ title, text }: { title: string; text: string }) { return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{text}</p></div>; }

function getLiveStrength(row: StockRow, quote?: LiveQuote) { const liveChange = Number(quote?.change_pct ?? 0); let score = 35; score += Math.min(25, Math.max(-15, liveChange * 8)); score += Math.min(20, row.quant_score * 0.2); if (row.volume_ratio >= 1.5) score += 15; else if (row.volume_ratio >= 1.1) score += 8; if (row.position_20d_pct >= 85 && row.position_20d_pct < 95) score += 12; if (row.return_5d_pct > 2) score += 8; if (row.position_20d_pct >= 95 && liveChange >= 1) score -= 18; if (row.quant_score < 45 || liveChange <= -0.75) score -= 25; return Math.max(0, Math.min(100, Math.round(score))); }
function getLiveSignal(row: StockRow, quote?: LiveQuote): LiveSignal { const liveChange = Number(quote?.change_pct ?? 0); const strength = getLiveStrength(row, quote); const hasLive = quote?.ltp != null; const hasSetup = row.volume_ratio >= 1.5 || row.position_20d_pct >= 85 || row.quant_score >= 70; if (row.position_20d_pct >= 92 && liveChange >= 1) return { label: 'Extended / Avoid', tone: 'warn', reason: `Live strength ${strength}/100, but price is already extended near the top of its 20D range. Do not chase; wait for pullback or breakout retest.` }; if (hasLive && strength >= 70 && liveChange >= 0.35 && hasSetup) return { label: 'Live Watch', tone: 'win', reason: `Live strength ${strength}/100. LTP is positive and historical setup is present. Add to watchlist only; wait for chart confirmation.` }; if (hasLive && (strength < 35 || liveChange <= -0.75)) return { label: 'Weak Live', tone: 'loss', reason: `Live strength ${strength}/100. Live move is weak. Avoid fresh long planning unless structure improves.` }; return { label: 'Wait', tone: 'neutral', reason: `Live strength ${strength}/100. No clean live confirmation yet. Keep it as research only.` }; }
function getResearchReason(row: StockRow) { const parts: string[] = []; if (row.quant_score >= 70) parts.push(`quant score ${row.quant_score}/100`); if (row.volume_ratio >= 1.5) parts.push(`volume expansion ${row.volume_ratio}x`); if (row.position_20d_pct >= 85) parts.push(`price near 20D high zone at ${row.position_20d_pct}% range position`); if (row.return_5d_pct > 1) parts.push(`5D momentum ${row.return_5d_pct}%`); if (row.return_20d_pct > 2) parts.push(`20D momentum ${row.return_20d_pct}%`); if (parts.length === 0) parts.push(row.ai_reason || 'No strong research trigger yet.'); return `${row.symbol}: ${parts.join(' + ')}.`; }
function getEntryIdea(row: StockRow) { if (row.position_20d_pct >= 92) return 'Do not chase. Wait for pullback or breakout retest, then enter only if price holds above VWAP with volume.'; if (row.position_20d_pct >= 85) return 'Wait for breakout confirmation or retest near the 20D high zone with strong candle close.'; if (row.volume_ratio >= 1.5) return 'Watch for VWAP continuation with volume staying above average.'; return 'Wait for clean intraday structure before planning any trade.'; }
function getInvalidation(row: StockRow) { if (row.position_20d_pct >= 85) return 'Invalid if price rejects the breakout zone, loses VWAP, or falls below the retest level.'; return 'Invalid if momentum weakens, market breadth turns negative, or price loses VWAP.'; }
function getTargetIdea(row: StockRow) { return 'Target previous high / measured move with minimum 1:1.5 to 1:2 RR. Trail only if momentum continues.'; }
function getBuyerZone(row: StockRow, quote?: LiveQuote) { const price = Number(quote?.ltp || row.close || 0); if (!price) return 'Waiting for live price.'; return `Near VWAP/retest area below current price around ${money(price * 0.995)}–${money(price * 0.99)}. Confirm with volume and candle hold.`; }
function getSellerZone(row: StockRow, quote?: LiveQuote) { const price = Number(quote?.ltp || row.close || 0); if (!price) return 'Waiting for live price.'; if (row.position_20d_pct >= 90) return `Supply risk is near current/upper range. Watch rejection near ${money(price)}–${money(price * 1.01)}.`; return `First supply zone can appear near ${money(price * 1.01)}–${money(price * 1.02)} or previous high.`; }
function getNoTradeWarning(row: StockRow, quote?: LiveQuote) { const liveChange = Number(quote?.change_pct || 0); if (row.position_20d_pct >= 95 && liveChange >= 1) return 'Price is extended. Avoid chasing. Wait for retest or skip.'; if (row.volume_ratio < 0.8) return 'Volume confirmation is weak. Avoid forced trades.'; if (liveChange < 0) return 'Live move is negative. Avoid fresh long setup unless structure recovers.'; return 'No automatic trade. Wait for confirmation, valid RR, and discipline lock clearance.'; }
function money(value: number) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
