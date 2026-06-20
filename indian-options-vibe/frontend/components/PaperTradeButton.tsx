'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  brokerSnapshot?: any;
  marketSnapshot?: any;
  fundsSnapshot?: any;
};

type DisciplineGate = {
  loading: boolean;
  locked: boolean;
  warning: boolean;
  title: string;
  reason: string;
  tradesToday: number;
  slHits: number;
  dailyPnl: number;
  marketClosedAdds: number;
};

const RISK_PER_TRADE = 1000;
const MAX_TRADES_PER_DAY = 3;
const MAX_DAILY_LOSS = 2000;
const MAX_SL_HITS_PER_DAY = 2;

export function PaperTradeButton({ trade }: { trade: Omit<PaperTrade, 'id' | 'status' | 'source' | 'createdAt'> }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [gateLoading, setGateLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function safeJson(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadGate() {
    setGateLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/paper-trades');
      if (!response.ok) throw new Error(`Paper trade API returned ${response.status}`);
      const data = await response.json();
      setTrades(data.trades || []);
    } catch {
      const local = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
      setTrades(local);
    } finally {
      setGateLoading(false);
    }
  }

  useEffect(() => {
    loadGate();
  }, []);

  const gate = useMemo(() => getDisciplineGate(trades, gateLoading), [trades, gateLoading]);

  async function addPaperTrade() {
    if (gate.locked) {
      setNotice(gate.reason);
      return;
    }

    try {
      setSaving(true);
      setNotice(null);
      const createdAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const brokerSnapshot = await safeJson('http://localhost:8000/api/brokers/status');
      const marketSnapshot = await safeJson('http://localhost:8000/api/market/status');
      const fundsSnapshot = await safeJson('http://localhost:8000/api/brokers/dhan/funds');

      const nextTrade: PaperTrade = {
        ...trade,
        id: `${trade.symbol}-${Date.now()}`,
        contract: trade.contract || inferContract(trade.symbol, trade.bias),
        status: 'Planned',
        source: 'Screener',
        createdAt,
        brokerSnapshot,
        marketSnapshot,
        fundsSnapshot,
      };

      const current = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
      window.localStorage.setItem('paperTrades', JSON.stringify([nextTrade, ...current]));

      try {
        await fetch('http://localhost:8000/api/paper-trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextTrade),
        });
      } catch {
        // Keep localStorage fallback so paper trading never breaks when backend is offline.
      }

      router.push('/journal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Daily Discipline Gate</div>
          <div className={gate.locked ? 'mt-1 font-bold text-red-300' : gate.warning ? 'mt-1 font-bold text-yellow-300' : 'mt-1 font-bold text-emerald-300'}>
            {gate.title}
          </div>
          <div className="mt-1 text-xs text-slate-400">{gate.reason}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Trades: {gate.tradesToday}/{MAX_TRADES_PER_DAY}</span>
            <span>SL: {gate.slHits}/{MAX_SL_HITS_PER_DAY}</span>
            <span>P&L: {money(gate.dailyPnl)}</span>
            <span>Closed adds: {gate.marketClosedAdds}</span>
          </div>
        </div>

        <button
          onClick={addPaperTrade}
          disabled={gate.loading || gate.locked || saving}
          className={gate.locked || gate.loading || saving ? 'rounded-xl bg-slate-800 px-5 py-3 font-semibold text-slate-500 cursor-not-allowed' : 'rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400'}
        >
          {gate.loading ? 'Checking rules...' : saving ? 'Saving...' : gate.locked ? 'Paper Trade Locked' : 'Add Paper Trade'}
        </button>
      </div>

      {notice ? <div className="mt-3 rounded-xl border border-red-900 bg-red-950/20 p-3 text-sm text-red-200">{notice}</div> : null}
    </div>
  );
}

function getDisciplineGate(trades: PaperTrade[], loading: boolean): DisciplineGate {
  if (loading) {
    return {
      loading: true,
      locked: false,
      warning: false,
      title: 'Checking daily rules',
      reason: 'Loading today journal data before allowing a new paper trade.',
      tradesToday: 0,
      slHits: 0,
      dailyPnl: 0,
      marketClosedAdds: 0,
    };
  }

  const todayTrades = filterToday(trades);
  const completed = todayTrades.filter((item) => !isOpenTrade(item));
  const dailyPnl = completed.reduce((sum, item) => sum + getPnl(item), 0);
  const slHits = completed.filter((item) => item.status === 'SL Hit' || getPnl(item) <= -RISK_PER_TRADE).length;
  const marketClosedAdds = todayTrades.filter((item) => item.marketSnapshot?.is_open === false).length;

  if (todayTrades.length >= MAX_TRADES_PER_DAY) {
    return {
      loading: false,
      locked: true,
      warning: false,
      title: 'Paper trade locked',
      reason: `Max trades reached today: ${todayTrades.length}/${MAX_TRADES_PER_DAY}. Stop for today and review the journal.`,
      tradesToday: todayTrades.length,
      slHits,
      dailyPnl,
      marketClosedAdds,
    };
  }

  if (slHits >= MAX_SL_HITS_PER_DAY) {
    return {
      loading: false,
      locked: true,
      warning: false,
      title: 'Paper trade locked',
      reason: `SL limit reached today: ${slHits}/${MAX_SL_HITS_PER_DAY}. No more paper trades today.`,
      tradesToday: todayTrades.length,
      slHits,
      dailyPnl,
      marketClosedAdds,
    };
  }

  if (dailyPnl <= -MAX_DAILY_LOSS) {
    return {
      loading: false,
      locked: true,
      warning: false,
      title: 'Paper trade locked',
      reason: `Daily loss guard hit: ${money(dailyPnl)}. Stop for today.`,
      tradesToday: todayTrades.length,
      slHits,
      dailyPnl,
      marketClosedAdds,
    };
  }

  if (marketClosedAdds > 0) {
    return {
      loading: false,
      locked: false,
      warning: true,
      title: 'Paper warning active',
      reason: 'Market-closed paper logging was detected today. Paper testing is allowed, but live execution stays locked.',
      tradesToday: todayTrades.length,
      slHits,
      dailyPnl,
      marketClosedAdds,
    };
  }

  return {
    loading: false,
    locked: false,
    warning: false,
    title: 'Paper trade allowed',
    reason: 'Normal daily discipline checks are passing for paper testing.',
    tradesToday: todayTrades.length,
    slHits,
    dailyPnl,
    marketClosedAdds,
  };
}

function filterToday(trades: PaperTrade[]) {
  const now = new Date();
  return trades.filter((trade) => {
    const date = parseCreatedDate(trade.createdAt);
    return date ? isSameDay(date, now) : false;
  });
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

function isOpenTrade(trade: PaperTrade) {
  return trade.paperPnl == null && !['Target Hit', 'SL Hit', 'Cancelled', 'Manual P&L'].includes(trade.status);
}

function getPnl(trade: PaperTrade) {
  if (trade.paperPnl != null) return Number(trade.paperPnl);
  if (trade.status === 'Target Hit') return RISK_PER_TRADE * 2;
  if (trade.status === 'SL Hit') return -RISK_PER_TRADE;
  return 0;
}

function inferContract(symbol: string, bias: string) {
  if (bias.toLowerCase().includes('bear')) return `${symbol} PE`;
  return `${symbol} CE`;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
