import { MetricCard } from '@/components/MetricCard';

const trades = [
  ['09:25', 'NIFTY 23500 CE', 'BUY', '124.5', '171.2', '+₹2,335', 'Target'],
  ['10:40', 'NIFTY 23500 CE', 'BUY', '138.0', '109.5', '-₹1,425', 'SL'],
  ['13:10', 'NIFTY 23550 CE', 'BUY', '91.0', '126.0', '+₹1,750', 'Target'],
];

export default function RunDetailPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Run Detail: NIFTY VWAP Option Buying</h1>
        <p className="mt-2 text-slate-400">Dummy backtest report for the first MVP frontend.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Net P&L" value="+₹42,850" hint="after charges" />
          <MetricCard label="Win Rate" value="54.2%" />
          <MetricCard label="Profit Factor" value="1.71" />
          <MetricCard label="Max Drawdown" value="-₹8,200" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold">Chart</h2>
            <div className="mt-4 flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-slate-500">Candlestick chart placeholder</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold">Risk Audit</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>✅ Daily loss guard respected</li>
              <li>✅ No trade after 2:30 PM</li>
              <li>✅ Max 3 trades per day</li>
              <li>⚠️ Live execution disabled</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="font-semibold">Trades</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400"><tr>{['Time','Symbol','Side','Entry','Exit','P&L','Exit'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
              <tbody>{trades.map((row) => <tr key={row.join('-')} className="border-t border-slate-800">{row.map(cell => <td key={cell} className="p-3">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-semibold">Generated Strategy Code</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-emerald-200">{`if close > vwap and rsi > 60:\n    buy_atm_call(sl_pct=20, target_pct=40)\nexit_after = '14:30'`}</pre>
        </div>
      </div>
    </section>
  );
}
