import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import { DownloadCsvButton } from '@/components/DownloadCsvButton';

const run = {
  id: 'demo-run-001',
  title: 'NIFTY VWAP + RSI ATM CE Backtest',
  symbol: 'NIFTY',
  timeframe: '5m',
  mode: 'Paper Backtest',
  prompt: 'Backtest NIFTY ATM CE buying above VWAP with RSI > 60, SL 20%, target 40%, last 90 days.',
  startedAt: '19/6/2026, 1:18:42 pm',
  status: 'Completed',
};

const metrics = {
  netPnl: 42850,
  winRate: 54.2,
  profitFactor: 1.71,
  maxDrawdown: -8200,
  totalTrades: 86,
  charges: 6120,
  avgWin: 2335,
  avgLoss: -1425,
};

const equityPoints = ['₹0', '₹7.4K', '₹13.1K', '₹8.6K', '₹18.9K', '₹25.2K', '₹21.4K', '₹31.7K', '₹42.9K'];

const trades = [
  { time: '09:25', symbol: 'NIFTY 23500 CE', side: 'BUY', entry: '124.5', exit: '171.2', pnl: 2335, result: 'Target' },
  { time: '10:40', symbol: 'NIFTY 23500 CE', side: 'BUY', entry: '138.0', exit: '109.5', pnl: -1425, result: 'SL' },
  { time: '11:35', symbol: 'NIFTY 23600 CE', side: 'BUY', entry: '102.0', exit: '141.5', pnl: 1975, result: 'Target' },
  { time: '13:10', symbol: 'NIFTY 23550 CE', side: 'BUY', entry: '91.0', exit: '126.0', pnl: 1750, result: 'Target' },
  { time: '14:05', symbol: 'NIFTY 23600 CE', side: 'BUY', entry: '112.0', exit: '101.5', pnl: -525, result: 'Time Exit' },
];

const csvRows = trades.map((trade) => ({
  run_id: run.id,
  strategy: run.title,
  symbol: trade.symbol,
  time: trade.time,
  side: trade.side,
  entry: trade.entry,
  exit: trade.exit,
  pnl: trade.pnl,
  result: trade.result,
  timeframe: run.timeframe,
  mode: run.mode,
}));

const assumptions = [
  'ATM option selected from nearest strike to spot at signal time.',
  'Entry only after 5-minute candle close above VWAP and RSI > 60.',
  'Stop loss fixed at 20% option premium from entry.',
  'Target fixed at 40% option premium from entry.',
  'No fresh trades after 2:30 PM IST.',
  'Charges and slippage are estimated for MVP review only.',
];

export default function RunDetailPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <Link href="/agent" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to Agent</Link>
            <div className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Run Detail</div>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">{run.title}</h1>
            <p className="mt-2 max-w-4xl text-slate-400">{run.prompt}</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
            {run.status} • Live orders locked
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Net P&L" value={`₹${metrics.netPnl.toLocaleString('en-IN')}`} hint="after estimated charges" />
          <MetricCard label="Win Rate" value={`${metrics.winRate}%`} hint={`${metrics.totalTrades} trades`} />
          <MetricCard label="Profit Factor" value={`${metrics.profitFactor}`} hint="gross wins / gross losses" />
          <MetricCard label="Max Drawdown" value={`₹${metrics.maxDrawdown.toLocaleString('en-IN')}`} hint="worst dip" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <MetricCard label="Charges" value={`₹${metrics.charges.toLocaleString('en-IN')}`} hint="brokerage + taxes mock" />
          <MetricCard label="Avg Win" value={`₹${metrics.avgWin.toLocaleString('en-IN')}`} />
          <MetricCard label="Avg Loss" value={`₹${metrics.avgLoss.toLocaleString('en-IN')}`} />
          <MetricCard label="Mode" value={run.mode} hint={`${run.symbol} • ${run.timeframe}`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-bold text-white">Equity Curve Placeholder</h2>
                <p className="mt-1 text-sm text-slate-400">Mock run curve. Real chart will be generated from backend trade results later.</p>
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Run ID: {run.id}</div>
            </div>
            <div className="mt-5 flex h-72 items-end gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              {equityPoints.map((point, index) => (
                <div key={`${point}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-xl bg-emerald-500/30" style={{ height: `${28 + index * 7 + (index % 3) * 18}px` }} />
                  <span className="text-[10px] text-slate-500">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-xl font-bold text-white">Risk Report</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <RiskLine status="pass" text="Daily loss guard respected" />
              <RiskLine status="pass" text="No trade after 2:30 PM" />
              <RiskLine status="pass" text="Max 3 trades per day rule respected" />
              <RiskLine status="warn" text="Live execution disabled until risk gates are complete" />
              <RiskLine status="warn" text="Backtest uses dummy data, not real NSE/BSE feed yet" />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-bold text-white">Trade Table</h2>
              <p className="mt-1 text-sm text-slate-400">Sample trades returned by the dummy backend backtest.</p>
            </div>
            <DownloadCsvButton filename="demo-run-001-trades.csv" rows={csvRows} />
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>{['Time', 'Contract', 'Side', 'Entry', 'Exit', 'P&L', 'Result'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={`${trade.time}-${trade.symbol}`} className="border-t border-slate-800 text-slate-300">
                    <td className="p-3">{trade.time}</td>
                    <td className="p-3 font-medium text-white">{trade.symbol}</td>
                    <td className="p-3">{trade.side}</td>
                    <td className="p-3">{trade.entry}</td>
                    <td className="p-3">{trade.exit}</td>
                    <td className={trade.pnl >= 0 ? 'p-3 text-emerald-300' : 'p-3 text-red-300'}>{trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}</td>
                    <td className="p-3">{trade.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-xl font-bold text-white">Strategy Assumptions</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {assumptions.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <h2 className="text-xl font-bold text-white">Generated Strategy Logic</h2>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-emerald-200">{`if candle.close > vwap and rsi(14) > 60:
    contract = select_atm_call(symbol='NIFTY')
    enter_paper_trade(contract)
    stop_loss = entry_price * 0.80
    target = entry_price * 1.40

if time >= '14:30':
    close_open_positions()`}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskLine({ status, text }: { status: 'pass' | 'warn'; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <span className={status === 'pass' ? 'text-emerald-300' : 'text-yellow-300'}>{status === 'pass' ? '✅' : '⚠️'}</span>{' '}{text}
    </div>
  );
}
