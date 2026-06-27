"use client";

import { useEffect, useState } from "react";
import {
  DhanReadOnlySnapshot,
  loadDhanReadOnlySnapshot,
} from "@/lib/dhanReadOnly";

export default function DhanReadOnlyCockpit() {
  const [snapshot, setSnapshot] = useState<DhanReadOnlySnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      const data = await loadDhanReadOnlySnapshot();
      setSnapshot(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const connected = snapshot?.status.connected ?? false;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Full Model v2 · Dhan Read-Only Sync
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Dhan Read-Only Cockpit
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This screen is only for visibility. It cannot place orders. It cannot modify orders.
              It cannot close positions. Manual Dhan execution only.
            </p>
          </div>

          <div
            className={`rounded-2xl px-5 py-4 text-center ${
              connected ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">
              Dhan Status
            </div>
            <div className="mt-1 text-2xl font-black">
              {connected ? "CONNECTED" : "NOT WIRED"}
            </div>
            <div className="mt-1 text-xs">READ ONLY</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Read-Only Data"}
          </button>

          <div className="rounded-xl border border-slate-800 px-5 py-3 text-sm text-slate-400">
            No auto-order. No execution. No hidden trade action.
          </div>
        </div>

        {snapshot ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            {snapshot.status.message}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Open Positions</h2>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400">
              Read only
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!snapshot || snapshot.positions.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
                No positions found from read-only endpoint.
              </div>
            ) : (
              snapshot.positions.map((position, index) => (
                <div
                  key={`${position.symbol}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-white">{position.symbol}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {position.productType || "Product not shown"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-white">
                        Qty {position.quantity}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        LTP {position.ltp || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-slate-500">Avg</div>
                      <div className="font-bold text-slate-200">
                        {position.averagePrice || "-"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-slate-500">PnL</div>
                      <div className="font-bold text-slate-200">
                        {position.pnl || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Orders</h2>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400">
              Read only
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!snapshot || snapshot.orders.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
                No orders found from read-only endpoint.
              </div>
            ) : (
              snapshot.orders.map((order, index) => (
                <div
                  key={`${order.orderId}-${index}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-white">{order.symbol}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {order.side || "Side not shown"} · Qty {order.quantity}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 px-3 py-2 text-xs font-black text-slate-200">
                      {order.status}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Price: {order.price || "-"} · {order.createdAt || "Time not shown"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
