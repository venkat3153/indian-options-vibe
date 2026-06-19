import { SystemStatusPanel } from '@/components/SystemStatusPanel';

const brokers = ['Dhan', 'Zerodha Kite', 'Angel One SmartAPI', 'Upstox', 'Shoonya'];

export default function BrokerPage() {
  return (
    <section className="p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">Broker Connect</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Broker Connect</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Connectors are planned. Order placement stays locked until backend status, risk gates, and paper workflow are stable.</p>
        </div>

        <div className="mt-8">
          <SystemStatusPanel />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {brokers.map((broker) => (
            <div key={broker} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="font-semibold text-white">{broker}</div>
              <div className="mt-2 text-sm text-slate-500">Status: planned / paper-first</div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">Live order module locked. Use paper trading until risk gates are complete.</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
