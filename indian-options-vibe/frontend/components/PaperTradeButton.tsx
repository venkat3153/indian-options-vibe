'use client';

import { useRouter } from 'next/navigation';

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

export function PaperTradeButton({ trade }: { trade: Omit<PaperTrade, 'id' | 'status' | 'source' | 'createdAt'> }) {
  const router = useRouter();

  function addPaperTrade() {
    const nextTrade: PaperTrade = {
      ...trade,
      id: `${trade.symbol}-${Date.now()}`,
      status: 'Planned',
      source: 'Screener',
      createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    const current = JSON.parse(window.localStorage.getItem('paperTrades') || '[]') as PaperTrade[];
    window.localStorage.setItem('paperTrades', JSON.stringify([nextTrade, ...current]));
    router.push('/paper');
  }

  return (
    <button onClick={addPaperTrade} className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">
      Add Paper Trade
    </button>
  );
}
