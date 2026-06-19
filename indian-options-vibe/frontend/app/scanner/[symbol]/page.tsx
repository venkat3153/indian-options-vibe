'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PaperTradeButton } from '@/components/PaperTradeButton';

type SymbolDetail = {
  symbol: string;
  market: 'NSE' | 'BSE';
  segment: 'Index Options' | 'Stock Options' | 'Intraday Stocks';
  spot: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral' | 'Weak';
  score: number;
  setup: string;
  tradePlan: string;
  bestCe: string;
  bestPe: string;
  entry: string;
  stopLoss: string;
  target: string;
  risk: 'Low' | 'Medium' | 'High';
};

type OptionChainRow = {
  strike: string;
  ceLtp: string;
  ceVolume: string;
  ceOi: string;
  ceOiChange: string;
  ceIv: string;
  peLtp: string;
  peVolume: string;
  peOi: string;
  peOiChange: string;
  peIv: string;
  signal: string;
};

type SymbolResponse = {
  mode: 'mock';
  detail: SymbolDetail;
  optionChain: OptionChainRow[];
};

const fallbackDetail: SymbolDetail = {
  symbol: 'NIFTY',
  market: 'NSE',
  segment: 'Index Options',
  spot: '23,520',
  bias: 'Bullish',
  score: 84,
  setup: 'ATM CE pullback above VWAP',
  tradePlan: 'Wait for price to hold above VWAP. Enter paper CE only after bullish 5-minute close with volume confirmation.',
  bestCe: '23500 CE',
  bestPe: '23500 PE',
  entry: 'Above 23,560 spot confirmation',
  stopLoss: 'Below VWAP or -20% option premium',
  target: '+40% option premium or trail above 1:2 RR',
  risk: 'Medium',
};

const fallbackOptionChain: OptionChainRow[] = [
  { strike: 'ATM - 200', ceLtp: '252.40', ceVolume: '18.2L', ceOi: '42.1L', ceOiChange: '+8.2%', ceIv: '13.4', peLtp: '54.80', peVolume: '9.1L', peOi: '31.8L', peOiChange: '-3.1%', peIv: '14.0', signal: 'ITM CE strength' },
  { strike: 'ATM - 100', ceLtp: '185.20', ceVolume: '24.7L', ceOi: '51.4L', ceOiChange: '+12.0%', ceIv: '13.8', peLtp: '96.40', peVolume: '14.8L', peOi: '38.2L', peOiChange: '-4.0%', peIv: '14.1', signal: 'Call buildup' },
  { strike: 'ATM', ceLtp: '124.50', ceVolume: '31.6L', ceOi: '68.7L', ceOiChange: '+18.0%', ceIv: '14.2', peLtp: '121.80', peVolume: '28.4L', peOi: '62.5L', peOiChange: '+7.0%', peIv: '14.5', signal: 'Best liquid strike' },
  { strike: 'ATM + 100', ceLtp: '82.10', ceVolume: '21.3L', ceOi: '44.9L', ceOiChange: '+9.0%', ceIv: '14.7', peLtp: '178.30', peVolume: '18.2L', peOi: '53.6L', peOiChange: '+15.0%', peIv: '15.0', signal: 'Put hedge zone' },
  { strike: 'ATM + 200', ceLtp: '48.70', ceVolume: '13.9L', ceOi: '35.2L', ceOiChange: '+5.4%', ceIv: '15.1', peLtp: '248.90', peVolume: '10.4L', peOi: '40.3L', peOiChange: '+9.8%', peIv: '15.4', signal: 'OTM lottery avoid' },
];

export default function SymbolDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const [detail, setDetail] = useState<SymbolDetail>({ ...fallbackDetail, symbol });
  const [optionChain, setOptionChain] = useState<OptionChainRow[]>(fallbackOptionChain);
  const [source, setSource] = useState<'backend' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSymbol() {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/scanner/symbol/${symbol}`);
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data = (await response.json()) as SymbolResponse;
        setDetail(data.detail);
        setOptionChain(data.optionChain);
        setSource('backend');
        setError(null);
      } catch (err) {
        setDetail({ ...fallbackDetail, symbol });
        setOptionChain(fallbackOptionChain);
        setSource('fallback');
        setError(err instanceof Error ? err.message : 'Could not connect to scanner backend');
      } finally {
        setLoading(false);
      }
    }

    loadSymbol();
  }, [symbol]);

  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/scanner" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to Market Screener</Link>

        {error ? (
          <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4 text-sm text-yellow-200">
            Symbol backend fallback active: {error}. Start backend on http://localhost:8000 to use API symbol data.
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Symbol Detail</div>
              <h1 className="mt-3 text-4xl font-bold text-white">{detail.symbol}</h1>
              <p className="mt-2 text-slate-400">{detail.market} • {detail.segment} • Spot {detail.spot}</p>
            </div>
            <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              Data: {loading ? 'Loading...' : source === 'backend' ? 'Backend API' : 'Fallback'} • Live locked
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Metric label="Bias" value={detail.bias} />
            <Metric label="Score" value={`${detail.score}`} />
            <Metric label="Best CE" value={detail.bestCe} />
            <Metric label="Best PE" value={detail.bestPe} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
            <h2 className="text-xl font-bold text-white">Trade Plan</h2>
            <p className="mt-3 text-slate-300">{detail.tradePlan}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <PlanBox label="Entry" value={detail.entry} />
              <PlanBox label="Stop Loss" value={detail.stopLoss} />
              <PlanBox label="Target" value={detail.target} />
            </div>
            <PaperTradeButton trade={{ symbol: detail.symbol, setup: detail.setup, bias: detail.bias, entry: detail.entry, stopLoss: detail.stopLoss, target: detail.target }} />
          </div>

          <div className="rounded-3xl border border-red-900/60 bg-red-950/20 p-5">
            <h2 className="text-xl font-bold text-white">Risk Warning</h2>
            <p className="mt-3 text-sm text-red-200">Risk level: {detail.risk}. This is mock screener output for paper trading only. Do not place live orders from this MVP.</p>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">Rule: max 1 paper signal per symbol until we add journal and daily loss guard.</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-bold text-white">Mock Option Chain</h2>
              <p className="mt-1 text-sm text-slate-400">Realistic structure for NSE/BSE option-chain data. Real adapters will replace backend mock values later.</p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Use liquid ATM/ITM strikes only</div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  {['Strike', 'CE LTP', 'CE Vol', 'CE OI', 'CE OI Chg', 'CE IV', 'PE LTP', 'PE Vol', 'PE OI', 'PE OI Chg', 'PE IV', 'Signal'].map((h) => <th key={h} className="p-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {optionChain.map((row) => (
                  <tr key={row.strike} className="border-t border-slate-800 text-slate-300 hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-white">{row.strike}</td>
                    <td className="p-3">{row.ceLtp}</td>
                    <td className="p-3">{row.ceVolume}</td>
                    <td className="p-3">{row.ceOi}</td>
                    <td className="p-3 text-emerald-300">{row.ceOiChange}</td>
                    <td className="p-3">{row.ceIv}</td>
                    <td className="p-3">{row.peLtp}</td>
                    <td className="p-3">{row.peVolume}</td>
                    <td className="p-3">{row.peOi}</td>
                    <td className={row.peOiChange.startsWith('-') ? 'p-3 text-red-300' : 'p-3 text-emerald-300'}>{row.peOiChange}</td>
                    <td className="p-3">{row.peIv}</td>
                    <td className="p-3 font-medium text-emerald-300">{row.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>;
}

function PlanBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-2 text-sm font-medium text-white">{value}</div></div>;
}
