'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PaperTrade = {
  id: string;
  symbol: string;
  setup: string;
  bias: string;
  entry: string;
  stopLoss: string;
  target: string;
  status: 'Planned';
  source: 'Screener';
  createdAt: string;
};

export default function PaperPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);

  useEffect(() => {
    const saved = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
    setTrades(saved);
  }, []);

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
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">Planned Paper Trades</h1>
            <p className="mt-2 max-w-3xl text-slate-400">Trades added from the Market Screener are saved locally in your browser for MVP testing. No broker orders are placed.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/scanner" className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800">Back to Screener</Link>
            {trades.length > 0 ? <button onClick={clearTrades} className="rounded-xl border border-red-900 px-4 py-3 text-sm text-red-300 hover:bg-red-950/30">Clear</button> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Mode" value="Paper" hint="Live orders locked" />
          <SummaryCard label="Planned Trades" value={`${trades.length}`} hint="Saved in browser" />
          <SummaryCard label="Source" value="Screener" hint="MVP flow" />
          <SummaryCard label="Risk Guard" value="Manual" hint="Automation later" />
        </div>

        {trades.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-emerald-900 bg-emerald-950/20 p-6">
            <h2 className="text-xl font-bold text-white">No paper trades yet</h2>
            <p className="mt-2 text-slate-300">Go to Market Screener, open NIFTY/SENSEX/BANKNIFTY detail, then click Add Paper Trade.</p>
            <Link href="/scanner" className="mt-5 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Open Market Screener</Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  {['Added', 'Symbol', 'Bias', 'Setup', 'Entry Plan', 'SL', 'Target', 'Status', 'Source'].map((header) => <th key={header} className="p-3 font-medium">{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-t border-slate-800 text-slate-300">
                    <td className="p-3 text-xs text-slate-500">{trade.createdAt}</td>
                    <td className="p-3 font-semibold text-white">{trade.symbol}</td>
                    <td className="p-3">{trade.bias}</td>
                    <td className="p-3">{trade.setup}</td>
                    <td className="p-3 text-slate-400">{trade.entry}</td>
                    <td className="p-3 text-red-300">{trade.stopLoss}</td>
                    <td className="p-3 text-emerald-300">{trade.target}</td>
                    <td className="p-3"><span className="rounded-full border border-yellow-800 bg-yellow-950/30 px-3 py-1 text-xs text-yellow-300">{trade.status}</span></td>
                    <td className="p-3 text-slate-400">{trade.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
