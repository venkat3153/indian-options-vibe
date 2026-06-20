'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type PaperTrade = {
  id: string;
  symbol: string;
  contract?: string;
  setup: string;
  bias: string;
  entry: string;
  stopLoss: string;
  target: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt?: string;
  rResult?: number | null;
  paperPnl?: number | null;
  notes?: string;
  mistake?: string;
  emotion?: string;
  marketSnapshot?: any;
  fundsSnapshot?: any;
};

const RISK_PER_TRADE = 1000;

export default function JournalPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [mode, setMode] = useState('checking');
  const [error, setError] = useState<string | null>(null);

  async function loadTrades() {
    try {
      const response = await fetch('http://localhost:8000/api/paper-trades');
      if (!response.ok) throw new Error(`Paper trade API returned ${response.status}`);
      const data = await response.json();
      setTrades(data.trades || []);
      setMode(data.mode || 'backend');
      setError(null);
    } catch (err) {
      const local = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
      setTrades(local);
      setMode('localStorage fallback');
      setError(err instanceof Error ? err.message : 'Could not load backend journal');
    }
  }

  async function updateTrade(trade: PaperTrade, patch: Partial<PaperTrade>) {
    const updatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const finalPatch = { ...patch, updatedAt };

    setTrades((current) => current.map((item) => (item.id === trade.id ? { ...item, ...finalPatch } : item)));

    const local = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
    window.localStorage.setItem('paperTrades', JSON.stringify(local.map((item) => (item.id === trade.id ? { ...item, ...finalPatch } : item))));

    try {
      const response = await fetch(`http://localhost:8000/api/paper-trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPatch),
      });
      if (!response.ok) throw new Error(`Update failed: ${response.status}`);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend update failed. Local state updated only.');
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  const stats = useMemo(() => getStats(trades), [trades]);

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">Trading Journal</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Trading Journal Dashboard</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Paper trade analytics with broker, market, and Dhan funds snapshots. Live orders remain locked.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadTrades} className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400">Refresh</button>
            <Link href="/scanner" className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Open Scanner</Link>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Notice: {error}</div> : null}

        <div className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Performance Score</h2>
              <p className="mt-1 text-sm text-slate-400">Mode: {mode} • Paper only • Built from scanner journal records</p>
            </div>
            <div className={`rounded-2xl border px-6 py-4 text-4xl font-bold ${stats.score >= 70 ? 'border-emerald-800 text-emerald-300' : stats.score >= 40 ? 'border-yellow-800 text-yellow-300' : 'border-red-900 text-red-300'}`}>{stats.score}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <Card label="Net P&L" value={money(stats.netPnl)} hint={`${stats.wins} wins / ${stats.losses} losses`} tone={stats.netPnl >= 0 ? 'win' : 'loss'} />
          <Card label="Total Trades" value={`${stats.total}`} hint={`${stats.completed} completed`} />
          <Card label="Win Rate" value={`${stats.winRate}%`} hint="Completed trades" />
          <Card label="Profit Factor" value={`${stats.profitFactor}x`} hint="Gross win / gross loss" tone={stats.profitFactor >= 1 ? 'win' : 'loss'} />
          <Card label="Max Drawdown" value={money(stats.maxDrawdown)} hint="Paper equity DD" tone="loss" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Card label="CE Trades" value={`${stats.ce}`} hint="Call-side signals" />
          <Card label="PE Trades" value={`${stats.pe}`} hint="Put-side signals" />
          <Card label="Market-Closed Adds" value={`${stats.closedAdds}`} hint="Discipline warning" tone={stats.closedAdds > 0 ? 'loss' : 'win'} />
          <Card label="Avg Win/Loss" value={`${stats.avgWinLoss}x`} hint="Reward quality" />
        </div>

        <JournalTable trades={trades} onUpdate={updateTrade} />
      </div>
    </section>
  );
}

function JournalTable({ trades, onUpdate }: { trades: PaperTrade[]; onUpdate: (trade: PaperTrade, patch: Partial<PaperTrade>) => void }) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-2xl font-bold text-white">History of Paper Trades</h2>
      <p className="mt-1 text-sm text-slate-400">Mark Target Hit, SL Hit, Cancelled, or enter manual P&L. Live orders remain locked.</p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[1450px] text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>{['Time', 'Symbol', 'Contract', 'Status', 'Entry', 'SL', 'Target', 'P&L', 'Outcome Controls', 'Notes', 'Mistake', 'Emotion', 'Market', 'Dhan Funds'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {trades.length === 0 ? <tr><td colSpan={14} className="p-6 text-center text-slate-400">No journal trades yet. Open Scanner and click Add Paper Trade.</td></tr> : trades.map((trade) => <TradeRow key={trade.id} trade={trade} onUpdate={onUpdate} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradeRow({ trade, onUpdate }: { trade: PaperTrade; onUpdate: (trade: PaperTrade, patch: Partial<PaperTrade>) => void }) {
  const [manualPnl, setManualPnl] = useState(trade.paperPnl == null ? '' : String(trade.paperPnl));
  const [notes, setNotes] = useState(trade.notes || '');
  const [mistake, setMistake] = useState(trade.mistake || '');
  const [emotion, setEmotion] = useState(trade.emotion || '');

  return (
    <tr className="border-t border-slate-800 text-slate-300 align-top hover:bg-slate-800/40">
      <td className="p-3">{trade.createdAt}</td>
      <td className="p-3 font-semibold text-white">{trade.symbol}</td>
      <td className="p-3">{trade.contract || getContract(trade)}</td>
      <td className="p-3"><span className="rounded-full border border-slate-700 px-2 py-1 text-xs">{trade.status}</span></td>
      <td className="p-3">{trade.entry}</td>
      <td className="p-3 text-red-300">{trade.stopLoss}</td>
      <td className="p-3 text-emerald-300">{trade.target}</td>
      <td className={`p-3 font-semibold ${getPnl(trade) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{trade.paperPnl == null && !['Target Hit', 'SL Hit', 'Cancelled'].includes(trade.status) ? 'Open' : money(getPnl(trade))}</td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onUpdate(trade, { status: 'Target Hit', rResult: 2, paperPnl: RISK_PER_TRADE * 2 })} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950">Target</button>
          <button onClick={() => onUpdate(trade, { status: 'SL Hit', rResult: -1, paperPnl: -RISK_PER_TRADE })} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white">SL</button>
          <button onClick={() => onUpdate(trade, { status: 'Cancelled', rResult: 0, paperPnl: 0 })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Cancel</button>
          <div className="flex gap-2">
            <input value={manualPnl} onChange={(event) => setManualPnl(event.target.value)} placeholder="Manual ₹" className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white" />
            <button onClick={() => onUpdate(trade, { status: 'Manual P&L', paperPnl: Number(manualPnl || 0), rResult: Number(manualPnl || 0) / RISK_PER_TRADE })} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white">Save</button>
          </div>
        </div>
      </td>
      <td className="p-3"><input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => onUpdate(trade, { notes })} placeholder="Notes" className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white" /></td>
      <td className="p-3"><select value={mistake} onChange={(e) => { setMistake(e.target.value); onUpdate(trade, { mistake: e.target.value }); }} className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"><option value="">None</option><option>FOMO</option><option>Late Entry</option><option>Oversize</option><option>Ignored SL</option><option>Early Exit</option><option>Revenge Trade</option></select></td>
      <td className="p-3"><select value={emotion} onChange={(e) => { setEmotion(e.target.value); onUpdate(trade, { emotion: e.target.value }); }} className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white"><option value="">Neutral</option><option>Calm</option><option>Fear</option><option>Greed</option><option>FOMO</option><option>Revenge</option><option>Confident</option></select></td>
      <td className="p-3">{trade.marketSnapshot?.status || 'unknown'}</td>
      <td className="p-3">{money(trade.fundsSnapshot?.data?.availableBalance || trade.fundsSnapshot?.data?.available || 0)}</td>
    </tr>
  );
}

function getStats(trades: PaperTrade[]) {
  const completed = trades.filter((trade) => ['Target Hit', 'SL Hit', 'Cancelled', 'Manual P&L'].includes(trade.status) || trade.paperPnl != null);
  const wins = completed.filter((trade) => getPnl(trade) > 0).length;
  const losses = completed.filter((trade) => getPnl(trade) < 0).length;
  const netPnl = completed.reduce((sum, trade) => sum + getPnl(trade), 0);
  const grossWin = completed.reduce((sum, trade) => sum + Math.max(0, getPnl(trade)), 0);
  const grossLoss = Math.abs(completed.reduce((sum, trade) => sum + Math.min(0, getPnl(trade)), 0));
  const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0;
  const profitFactor = grossLoss ? Number((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 99 : 0;
  const avgWinLoss = grossLoss ? Number(((grossWin / Math.max(1, wins)) / (grossLoss / Math.max(1, losses))).toFixed(2)) : 0;
  const ce = trades.filter((trade) => getContract(trade).includes('CE')).length;
  const pe = trades.filter((trade) => getContract(trade).includes('PE')).length;
  const closedAdds = trades.filter((trade) => trade.marketSnapshot?.is_open === false).length;
  const maxDrawdown = getMaxDrawdown(completed);
  const score = Math.max(0, Math.min(100, Math.round(winRate * 0.4 + Math.min(profitFactor, 3) * 15 + (Math.abs(maxDrawdown) <= 2000 ? 20 : 5) + (closedAdds === 0 ? 15 : 0))));
  return { total: trades.length, completed: completed.length, wins, losses, netPnl, winRate, profitFactor, maxDrawdown, avgWinLoss, ce, pe, closedAdds, score };
}

function getMaxDrawdown(trades: PaperTrade[]) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  trades.slice().reverse().forEach((trade) => {
    equity += getPnl(trade);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  });
  return maxDrawdown;
}

function getPnl(trade: PaperTrade) {
  if (trade.paperPnl != null) return Number(trade.paperPnl);
  if (trade.status === 'Target Hit') return RISK_PER_TRADE * 2;
  if (trade.status === 'SL Hit') return -RISK_PER_TRADE;
  return 0;
}

function getContract(trade: Pick<PaperTrade, 'symbol' | 'bias' | 'setup' | 'contract'>) {
  if (trade.contract) return trade.contract;
  const text = `${trade.bias} ${trade.setup}`.toLowerCase();
  return text.includes('bear') || text.includes('pe') ? `${trade.symbol} PE` : `${trade.symbol} CE`;
}

function Card({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
