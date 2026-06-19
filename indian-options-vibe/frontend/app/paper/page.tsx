'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type TradeStatus = 'Planned' | 'Entered' | 'Target Hit' | 'SL Hit' | 'Cancelled';

type PaperTrade = {
  id: string;
  symbol: string;
  setup: string;
  bias: string;
  entry: string;
  stopLoss: string;
  target: string;
  status: TradeStatus;
  source: 'Screener';
  createdAt: string;
  updatedAt?: string;
};

export default function PaperPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);

  useEffect(() => {
    const saved = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
    setTrades(saved.map((trade) => ({ ...trade, status: trade.status || 'Planned' })));
  }, []);

  const counts = useMemo(() => {
    return trades.reduce(
      (acc, trade) => {
        acc[trade.status] = (acc[trade.status] || 0) + 1;
        return acc;
      },
      { Planned: 0, Entered: 0, 'Target Hit': 0, 'SL Hit': 0, Cancelled: 0 } as Record<TradeStatus, number>,
    );
  }, [trades]);

  function persist(nextTrades: PaperTrade[]) {
    setTrades(nextTrades);
    window.localStorage.setItem('paperTrades', JSON.stringify(nextTrades));
  }

  function updateStatus(id: string, status: TradeStatus) {
    const nextTrades = trades.map((trade) =>
      trade.id === id
        ? {
            ...trade,
            status,
            updatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          }
        : trade,
    );
    persist(nextTrades);
  }

  function deleteTrade(id: string) {
    persist(trades.filter((trade) => trade.id !== id));
  }

  function clearTrades() {
    window.localStorage.removeItem('paperTrades');
    setTrades([]);
  }

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Paper Trading</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Paper Trade Management</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Manage screener trades through Planned → Entered → Target Hit / SL Hit / Cancelled. No broker orders are placed.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/scanner" className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800">Back to Screener</Link>
            {trades.length > 0 ? <button onClick={clearTrades} className="rounded-xl border border-red-900 px-4 py-3 text-sm text-red-300 hover:bg-red-950/30">Clear All</button> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <SummaryCard label="Planned" value={`${counts.Planned}`} hint="Waiting entry" />
          <SummaryCard label="Entered" value={`${counts.Entered}`} hint="Active paper trades" />
          <SummaryCard label="Target Hit" value={`${counts['Target Hit']}`} hint="Paper wins" />
          <SummaryCard label="SL Hit" value={`${counts['SL Hit']}`} hint="Paper losses" />
          <SummaryCard label="Cancelled" value={`${counts.Cancelled}`} hint="Skipped trades" />
        </div>

        {trades.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-emerald-900 bg-emerald-950/20 p-6">
            <h2 className="text-xl font-bold text-white">No paper trades yet</h2>
            <p className="mt-2 text-slate-300">Go to Market Screener, open NIFTY/SENSEX/BANKNIFTY detail, then click Add Paper Trade.</p>
            <Link href="/scanner" className="mt-5 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Open Market Screener</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {trades.map((trade) => (
              <div key={trade.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{trade.symbol}</h2>
                      <StatusBadge status={trade.status} />
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{trade.source}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Added: {trade.createdAt}{trade.updatedAt ? ` • Updated: ${trade.updatedAt}` : ''}</p>
                    <p className="mt-3 text-slate-300">{trade.setup}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Mark Entered" disabled={trade.status !== 'Planned'} onClick={() => updateStatus(trade.id, 'Entered')} />
                    <ActionButton label="Target Hit" disabled={trade.status !== 'Entered'} onClick={() => updateStatus(trade.id, 'Target Hit')} />
                    <ActionButton label="SL Hit" disabled={trade.status !== 'Entered'} onClick={() => updateStatus(trade.id, 'SL Hit')} />
                    <ActionButton label="Cancel" disabled={trade.status === 'Target Hit' || trade.status === 'SL Hit' || trade.status === 'Cancelled'} onClick={() => updateStatus(trade.id, 'Cancelled')} />
                    <button onClick={() => deleteTrade(trade.id)} className="rounded-xl border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30">Delete</button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <TradeBox label="Bias" value={trade.bias} />
                  <TradeBox label="Entry Plan" value={trade.entry} />
                  <TradeBox label="Stop Loss" value={trade.stopLoss} tone="loss" />
                  <TradeBox label="Target" value={trade.target} tone="win" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function TradeBox({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' }) {
  const toneClass = tone === 'win' ? 'text-emerald-300' : tone === 'loss' ? 'text-red-300' : 'text-white';
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-sm font-medium ${toneClass}`}>{value}</div>
    </div>
  );
}

function ActionButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35">
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: TradeStatus }) {
  const styles: Record<TradeStatus, string> = {
    Planned: 'border-yellow-800 bg-yellow-950/30 text-yellow-300',
    Entered: 'border-blue-800 bg-blue-950/30 text-blue-300',
    'Target Hit': 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
    'SL Hit': 'border-red-800 bg-red-950/40 text-red-300',
    Cancelled: 'border-slate-700 bg-slate-950 text-slate-300',
  };
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles[status]}`}>{status}</span>;
}
