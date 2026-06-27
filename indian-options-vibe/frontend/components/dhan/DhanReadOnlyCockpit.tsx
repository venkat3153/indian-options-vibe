"use client";

import { useEffect, useState } from "react";
import {
  DhanReadOnlySnapshot,
  getDhanReadOnlySnapshot,
} from "@/lib/dhanReadOnly";

export default function DhanReadOnlyCockpit() {
  const [data, setData] = useState<DhanReadOnlySnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setData(await getDhanReadOnlySnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const connected = data?.connected ?? false;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Full Model v2 · Dhan Read-Only Sync
            </div>
            <h1 className="mt-3 text-3xl font-black text-white">
              Dhan Read-Only Cockpit
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Visibility only. No buy button. No sell button. No modify order. No auto execution.
            </p>
          </div>

          <div className={`rounded-2xl px-5 py-4 text-center ${connected ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
            <div className="text-xs font-black uppercase tracking-widest">Dhan Status</div>
            <div className="mt-1 text-2xl font-black">{connected ? "CONNECTED" : "NOT WIRED"}</div>
            <div className="mt-1 text-xs">READ ONLY</div>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Read-Only Data"}
        </button>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          {data?.message || "Loading Dhan read-only status..."}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Open Positions</h2>
          <div className="mt-4 space-y-3">
            {!data || data.positions.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
                No open positions shown.
              </div>
            ) : (
              data.positions.map((p, i) => (
                <div key={`${p.symbol}-${i}`} className="rounded-2xl bg-slate-900 p-4">
                  <div className="font-black text-white">{p.symbol}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    Qty {p.qty} · Avg {p.avgPrice || "-"} · LTP {p.ltp || "-"} · PnL {p.pnl || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Orders</h2>
          <div className="mt-4 space-y-3">
            {!data || data.orders.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
                No orders shown.
              </div>
            ) : (
              data.orders.map((o, i) => (
                <div key={`${o.symbol}-${i}`} className="rounded-2xl bg-slate-900 p-4">
                  <div className="font-black text-white">{o.symbol}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {o.side} · Qty {o.qty} · Price {o.price || "-"} · Status {o.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
