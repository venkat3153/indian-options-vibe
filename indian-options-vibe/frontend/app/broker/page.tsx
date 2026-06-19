const brokers = ['Dhan', 'Zerodha Kite', 'Angel One SmartAPI', 'Upstox', 'Shoonya'];
export default function BrokerPage() {
  return <section className="p-8 md:p-12"><div className="mx-auto max-w-5xl"><h1 className="text-3xl font-bold">Broker Connect</h1><p className="mt-2 text-slate-400">Connectors are planned. Order placement is locked until risk gates are complete.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{brokers.map(b=><div key={b} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="font-semibold">{b}</div><div className="mt-2 text-sm text-slate-500">Status: planned / paper-first</div></div>)}</div></div></section>;
}
