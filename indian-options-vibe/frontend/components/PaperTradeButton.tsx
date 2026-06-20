'use client';

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
  status: 'Planned';
  source: 'Screener';
  createdAt: string;
  brokerSnapshot?: any;
  marketSnapshot?: any;
  fundsSnapshot?: any;
};

export function PaperTradeButton({ trade }: { trade: Omit<PaperTrade, 'id' | 'status' | 'source' | 'createdAt'> }) {
  const router = useRouter();

  async function safeJson(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function addPaperTrade() {
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
  }

  return (
    <button onClick={addPaperTrade} className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">
      Add Paper Trade
    </button>
  );
}

function inferContract(symbol: string, bias: string) {
  if (bias.toLowerCase().includes('bear')) return `${symbol} PE`;
  return `${symbol} CE`;
}
