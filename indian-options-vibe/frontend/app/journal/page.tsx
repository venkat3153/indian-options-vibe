'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

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

type Filter = 'All' | 'Open' | 'Target Hit' | 'SL Hit' | 'Cancelled' | 'Manual P&L';
type Period = 'Today' | 'This Week' | 'This Month' | 'All Time';

type Row = { label: string; value: number; pct: number };

type ScoreParts = {
  winRate: number;
  profitFactor: number;
  drawdownControl: number;
  discipline: number;
  completion: number;
};

const RISK_PER_TRADE = 1000;
const FILTERS: Filter[] = ['All', 'Open', 'Target Hit', 'SL Hit', 'Cancelled', 'Manual P&L'];
const PERIODS: Period[] = ['Today', 'This Week', 'This Month', 'All Time'];

export default function JournalPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [mode, setMode] = useState('checking');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [period, setPeriod] = useState<Period>('All Time');

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

  const periodTrades = useMemo(() => filterByPeriod(trades, period), [trades, period]);
  const stats = useMemo(() => getStats(periodTrades), [periodTrades]);
  const filteredTrades = useMemo(() => filterTrades(periodTrades, filter), [periodTrades, filter]);

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">Trading Journal</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Trading Journal Dashboard</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Paper trade analytics with broker, market, Dhan funds snapshots, discipline tags, outcome tracking, and period filters.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={loadTrades} className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400">Refresh</button>
            <Link href="/scanner" className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Open Scanner</Link>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">Notice: {error}</div> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button key={item} onClick={() => setPeriod(item)} className={`rounded-xl border px-4 py-2 text-sm ${period === item ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{item}</button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Performance Score</h2>
                <p className="mt-1 text-sm text-slate-400">Mode: {mode} • {period} • Paper only • Live orders locked</p>
              </div>
              <div className={`rounded-2xl border px-6 py-4 text-4xl font-bold ${stats.score >= 70 ? 'border-emerald-800 text-emerald-300' : stats.score >= 40 ? 'border-yellow-800 text-yellow-300' : 'border-red-900 text-red-300'}`}>{stats.score}</div>
            </div>
          </div>

          <ScoreBreakdown parts={stats.scoreParts} />
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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartPanel title="Daily P&L" subtitle="Fixed-width bars so one day does not fill the whole chart">
            <BarChart rows={stats.dailyRows} />
          </ChartPanel>
          <ChartPanel title="Equity Curve" subtitle="Clean line curve of running paper P&L">
            <EquityCurve points={stats.equityPoints} />
          </ChartPanel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <ChartPanel title="Win / Loss Distribution" subtitle="Completed paper trades">
            <Distribution wins={stats.wins} losses={stats.losses} neutral={stats.neutral} />
          </ChartPanel>
          <ChartPanel title="CE vs PE Split" subtitle="Contract direction split">
            <Distribution wins={stats.ce} losses={stats.pe} neutral={0} winLabel="CE" lossLabel="PE" />
          </ChartPanel>
          <ChartPanel title="Symbol Profitability" subtitle="P&L by symbol">
            <BarList rows={stats.symbolRows} />
          </ChartPanel>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-white">Paper Trade Journal</h2>
              <p className="mt-1 text-sm text-slate-400">Clean trade cards with outcome, notes, mistake, emotion, market status, and broker snapshot.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={`rounded-xl border px-3 py-2 text-xs ${filter === item ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{item}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {filteredTrades.length === 0 ? <Empty text="No trades match this filter and period. Open Scanner and click Add Paper Trade." /> : filteredTrades.map((trade) => <TradeCard key={trade.id} trade={trade} onUpdate={updateTrade} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function TradeCard({ trade, onUpdate }: { trade: PaperTrade; onUpdate: (trade: PaperTrade, patch: Partial<PaperTrade>) => void }) {
  const [manualPnl, setManualPnl] = useState(trade.paperPnl == null ? '' : String(trade.paperPnl));
  const [notes, setNotes] = useState(trade.notes || '');
  const [mistake, setMistake] = useState(trade.mistake || '');
  const [emotion, setEmotion] = useState(trade.emotion || '');

  return (
    <details className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4" open>
      <summary className="cursor-pointer list-none">
        <div className="grid gap-3 md:grid-cols-7 md:items-center">
          <div><div className="text-xs text-slate-500">Symbol</div><div className="font-bold text-white">{trade.symbol}</div></div>
          <div><div className="text-xs text-slate-500">Contract</div><div>{trade.contract || getContract(trade)}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusPill status={trade.status} /></div>
          <div><div className="text-xs text-slate-500">P&L</div><div className={getPnl(trade) >= 0 ? 'font-bold text-emerald-300' : 'font-bold text-red-300'}>{isOpenTrade(trade) ? 'Open' : money(getPnl(trade))}</div></div>
          <div><div className="text-xs text-slate-500">Market</div><div>{trade.marketSnapshot?.status || 'unknown'}</div></div>
          <div><div className="text-xs text-slate-500">Dhan Funds</div><div>{money(trade.fundsSnapshot?.data?.availableBalance || trade.fundsSnapshot?.data?.available || 0)}</div></div>
          <div className="text-right text-xs text-slate-500 group-open:hidden">Click to expand</div>
        </div>
      </summary>

      <div className="mt-5 grid gap-4 border-t border-slate-800 pt-5 lg:grid-cols-3">
        <Info label="Created" value={trade.createdAt} />
        <Info label="Bias" value={trade.bias} />
        <Info label="Setup" value={trade.setup} />
        <Info label="Entry Plan" value={trade.entry} />
        <Info label="Stop Loss" value={trade.stopLoss} tone="loss" />
        <Info label="Target" value={trade.target} tone="win" />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-white">Outcome Controls</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onUpdate(trade, { status: 'Target Hit', rResult: 2, paperPnl: RISK_PER_TRADE * 2 })} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Target Hit</button>
          <button onClick={() => onUpdate(trade, { status: 'SL Hit', rResult: -1, paperPnl: -RISK_PER_TRADE })} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">SL Hit</button>
          <button onClick={() => onUpdate(trade, { status: 'Cancelled', rResult: 0, paperPnl: 0 })} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancelled</button>
          <input value={manualPnl} onChange={(event) => setManualPnl(event.target.value)} placeholder="Manual ₹ P&L" className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          <button onClick={() => onUpdate(trade, { status: 'Manual P&L', paperPnl: Number(manualPnl || 0), rResult: Number(manualPnl || 0) / RISK_PER_TRADE })} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white">Save Manual</button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <label className="block text-sm text-slate-400">Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => onUpdate(trade, { notes })} placeholder="What happened?" className="mt-2 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
        </label>
        <label className="block text-sm text-slate-400">Mistake
          <select value={mistake} onChange={(e) => { setMistake(e.target.value); onUpdate(trade, { mistake: e.target.value }); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white">
            <option value="">None</option><option>FOMO</option><option>Late Entry</option><option>Oversize</option><option>Ignored SL</option><option>Early Exit</option><option>Revenge Trade</option>
          </select>
        </label>
        <label className="block text-sm text-slate-400">Emotion
          <select value={emotion} onChange={(e) => { setEmotion(e.target.value); onUpdate(trade, { emotion: e.target.value }); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white">
            <option value="">Neutral</option><option>Calm</option><option>Fear</option><option>Greed</option><option>FOMO</option><option>Revenge</option><option>Confident</option>
          </select>
        </label>
      </div>
    </details>
  );
}

function getStats(trades: PaperTrade[]) {
  const completed = trades.filter((trade) => !isOpenTrade(trade));
  const wins = completed.filter((trade) => getPnl(trade) > 0).length;
  const losses = completed.filter((trade) => getPnl(trade) < 0).length;
  const neutral = completed.filter((trade) => getPnl(trade) === 0).length;
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
  const completionRate = trades.length ? Math.round((completed.length / trades.length) * 100) : 0;
  const scoreParts = getScoreParts({ winRate, profitFactor, maxDrawdown, closedAdds, completionRate });
  const score = Math.round((scoreParts.winRate + scoreParts.profitFactor + scoreParts.drawdownControl + scoreParts.discipline + scoreParts.completion) / 5);
  return { total: trades.length, completed: completed.length, wins, losses, neutral, netPnl, winRate, profitFactor, maxDrawdown, avgWinLoss, ce, pe, closedAdds, score, scoreParts, dailyRows: groupRows(completed, dayKey), symbolRows: groupRows(completed, (t) => t.symbol), equityPoints: equityPoints(completed) };
}

function getScoreParts({ winRate, profitFactor, maxDrawdown, closedAdds, completionRate }: { winRate: number; profitFactor: number; maxDrawdown: number; closedAdds: number; completionRate: number }): ScoreParts {
  return {
    winRate: clamp(winRate),
    profitFactor: clamp((Math.min(profitFactor, 3) / 3) * 100),
    drawdownControl: clamp(100 - Math.min(100, Math.abs(maxDrawdown) / RISK_PER_TRADE * 25)),
    discipline: closedAdds === 0 ? 100 : Math.max(20, 100 - closedAdds * 25),
    completion: clamp(completionRate),
  };
}

function filterTrades(trades: PaperTrade[], filter: Filter) {
  if (filter === 'All') return trades;
  if (filter === 'Open') return trades.filter(isOpenTrade);
  return trades.filter((trade) => trade.status === filter);
}

function filterByPeriod(trades: PaperTrade[], period: Period) {
  if (period === 'All Time') return trades;
  const now = new Date();
  return trades.filter((trade) => {
    const date = parseCreatedDate(trade.createdAt);
    if (!date) return true;
    if (period === 'Today') return isSameDay(date, now);
    if (period === 'This Week') return startOfWeek(date).getTime() === startOfWeek(now).getTime();
    if (period === 'This Month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    return true;
  });
}

function groupRows(trades: PaperTrade[], keyFn: (trade: PaperTrade) => string): Row[] {
  const map = new Map<string, number>();
  trades.forEach((trade) => map.set(keyFn(trade), (map.get(keyFn(trade)) || 0) + getPnl(trade)));
  const maxAbs = Math.max(1, ...Array.from(map.values()).map(Math.abs));
  return Array.from(map.entries()).map(([label, value]) => ({ label, value, pct: Math.round((Math.abs(value) / maxAbs) * 100) }));
}

function equityPoints(trades: PaperTrade[]) {
  let running = 0;
  return trades.slice().reverse().map((trade) => {
    running += getPnl(trade);
    return running;
  });
}

function dayKey(trade: PaperTrade) {
  return String(trade.createdAt || '').split(',')[0] || 'Unknown';
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

function isOpenTrade(trade: PaperTrade) {
  return trade.paperPnl == null && !['Target Hit', 'SL Hit', 'Cancelled', 'Manual P&L'].includes(trade.status);
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

function parseCreatedDate(value: string) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function Card({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function ScoreBreakdown({ parts }: { parts: ScoreParts }) {
  const rows = [
    ['Win Rate', parts.winRate],
    ['Profit Factor', parts.profitFactor],
    ['Drawdown Control', parts.drawdownControl],
    ['Discipline', parts.discipline],
    ['Completion', parts.completion],
  ] as const;

  return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-lg font-bold text-white">Score Breakdown</h2><div className="mt-4 space-y-3">{rows.map(([label, value]) => <MiniScore key={label} label={label} value={value} />)}</div></div>;
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return <div><div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value}/100</span></div><div className="h-2 rounded-full bg-slate-800"><div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(4, value)}%` }} /></div></div>;
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{subtitle}</p>{children}</div>;
}

function BarChart({ rows }: { rows: Row[] }) {
  if (!rows.length) return <Empty text="No completed trades yet" />;
  const slots = [...rows].slice(-12);
  return <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex h-56 items-end justify-start gap-4 overflow-x-auto border-b border-slate-700 px-2">{slots.map((row) => <div key={row.label} className="flex min-w-16 flex-col items-center gap-2"><div className={row.value >= 0 ? 'w-10 rounded-t bg-emerald-500' : 'w-10 rounded-t bg-red-500'} style={{ height: `${Math.max(16, row.pct * 1.55)}px` }} /><div className="text-xs text-slate-500">{row.label}</div></div>)}</div></div>;
}

function EquityCurve({ points }: { points: number[] }) {
  if (!points.length) return <Empty text="No equity curve yet" />;
  const width = 640;
  const height = 220;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible">
        {[0.25, 0.5, 0.75].map((tick) => <line key={tick} x1="0" x2={width} y1={height * tick} y2={height * tick} stroke="rgb(51 65 85)" strokeDasharray="6 6" strokeWidth="1" />)}
        <line x1="0" x2={width} y1={zeroY} y2={zeroY} stroke="rgb(71 85 105)" strokeDasharray="4 4" strokeWidth="1" />
        <polyline fill="none" stroke="rgb(59 130 246)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" points={coords} />
        {points.map((point, index) => {
          const [x, y] = coords.split(' ')[index].split(',').map(Number);
          return <circle key={`${point}-${index}`} cx={x} cy={y} r="5" fill="rgb(96 165 250)" />;
        })}
      </svg>
      <div className="mt-3 flex justify-between text-sm text-slate-400"><span>Current equity: {money(points[points.length - 1] || 0)}</span><span>Range: {money(min)} to {money(max)}</span></div>
    </div>
  );
}

function Distribution({ wins, losses, neutral, winLabel = 'Wins', lossLabel = 'Losses' }: { wins: number; losses: number; neutral: number; winLabel?: string; lossLabel?: string }) {
  const total = Math.max(1, wins + losses + neutral);
  return <div className="mt-6 space-y-4"><DistBar label={winLabel} value={wins} pct={(wins / total) * 100} tone="win" /><DistBar label={lossLabel} value={losses} pct={(losses / total) * 100} tone="loss" />{neutral > 0 ? <DistBar label="Neutral" value={neutral} pct={(neutral / total) * 100} /> : null}</div>;
}

function DistBar({ label, value, pct, tone }: { label: string; value: number; pct: number; tone?: 'win' | 'loss' }) {
  const color = tone === 'win' ? 'bg-emerald-500' : tone === 'loss' ? 'bg-red-500' : 'bg-slate-500';
  return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{value}</span></div><div className="h-4 rounded-full bg-slate-800"><div className={`h-4 rounded-full ${color}`} style={{ width: `${Math.max(4, pct)}%` }} /></div></div>;
}

function BarList({ rows }: { rows: Row[] }) {
  if (!rows.length) return <Empty text="No symbol P&L yet" />;
  return <div className="mt-6 space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-2 flex justify-between text-sm"><span>{row.label}</span><span className={row.value >= 0 ? 'text-emerald-300' : 'text-red-300'}>{money(row.value)}</span></div><div className="h-3 rounded-full bg-slate-800"><div className={row.value >= 0 ? 'h-3 rounded-full bg-emerald-500' : 'h-3 rounded-full bg-red-500'} style={{ width: `${Math.max(4, row.pct)}%` }} /></div></div>)}</div>;
}

function Info({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-sm ${toneClass}`}>{value}</div></div>;
}

function StatusPill({ status }: { status: string }) {
  const cls = status === 'Target Hit' ? 'border-emerald-800 text-emerald-300' : status === 'SL Hit' ? 'border-red-800 text-red-300' : status === 'Cancelled' ? 'border-slate-700 text-slate-300' : 'border-blue-800 text-blue-300';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${cls}`}>{status}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-6 flex h-40 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-sm text-slate-500">{text}</div>;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
