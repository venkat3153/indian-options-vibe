import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';

export default function Home() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-12">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Indian Options AI Terminal</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Build, backtest, and paper-trade NIFTY/BANKNIFTY strategies with natural language.</h1>
          <p className="mt-5 max-w-2xl text-slate-400">A Vibe-Trading style website for Indian options, stock options, and intraday research. Live execution stays locked until paper results and risk gates are ready.</p>
          <Link href="/agent" className="mt-8 inline-block rounded-2xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400">Open Strategy Agent</Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Mode" value="Paper" hint="Live locked" />
          <MetricCard label="Markets" value="NSE F&O" hint="NIFTY, BANKNIFTY, stocks" />
          <MetricCard label="Risk" value="Guarded" hint="Daily loss + kill switch" />
          <MetricCard label="MVP" value="Backtest" hint="Dummy data first" />
        </div>
      </div>
    </section>
  );
}
