"use client";

import { useMemo, useState } from "react";
import { calculateTradeDisciplineLock } from "@/lib/tradeDisciplineLock";

export default function TradeDisciplineLockPanel() {
  const [todayTrades, setTodayTrades] = useState(0);
  const [maxTrades, setMaxTrades] = useState(1);
  const [todayLossR, setTodayLossR] = useState(0);
  const [maxLossR, setMaxLossR] = useState(2);
  const [hasOpenPosition, setHasOpenPosition] = useState(false);
  const [emotion, setEmotion] = useState("");
  const [oneQtyConfirmed, setOneQtyConfirmed] = useState(true);
  const [manualOnlyConfirmed, setManualOnlyConfirmed] = useState(true);

  const result = useMemo(
    () =>
      calculateTradeDisciplineLock({
        todayTrades,
        maxTrades,
        todayLossR,
        maxLossR,
        hasOpenPosition,
        emotion,
        oneQtyConfirmed,
        manualOnlyConfirmed,
      }),
    [
      todayTrades,
      maxTrades,
      todayLossR,
      maxLossR,
      hasOpenPosition,
      emotion,
      oneQtyConfirmed,
      manualOnlyConfirmed,
    ]
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-red-300">
              Full Model v2 · Trade Discipline Lock
            </div>
            <h1 className="mt-3 text-3xl font-black text-white">
              Trade Discipline Lock
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This page protects you from overtrading, revenge trades, position stacking,
              and breaking the one-quantity rule. It never places orders.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              result.allowed ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">Discipline</div>
            <div className="mt-2 text-4xl font-black">{result.status}</div>
            <div className="mt-2 text-xs">Manual Dhan only</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Today Trades
              <input
                type="number"
                value={todayTrades}
                onChange={(e) => setTodayTrades(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Max Trades / Day
              <input
                type="number"
                value={maxTrades}
                onChange={(e) => setMaxTrades(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Today Loss R
              <input
                type="number"
                value={todayLossR}
                onChange={(e) => setTodayLossR(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Max Loss R
              <input
                type="number"
                value={maxLossR}
                onChange={(e) => setMaxLossR(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Emotion Check
            <textarea
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder="Calm / FOMO / revenge / rushed / panic / confident"
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={hasOpenPosition}
                onChange={(e) => setHasOpenPosition(e.target.checked)}
                className="mr-2"
              />
              Open position exists
            </label>

            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={oneQtyConfirmed}
                onChange={(e) => setOneQtyConfirmed(e.target.checked)}
                className="mr-2"
              />
              One quantity only
            </label>

            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={manualOnlyConfirmed}
                onChange={(e) => setManualOnlyConfirmed(e.target.checked)}
                className="mr-2"
              />
              Manual Dhan only
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Lock Result</h2>

          {result.allowed ? (
            <div className="mt-4 rounded-2xl border border-emerald-800 bg-emerald-950/60 p-5 text-emerald-100">
              Discipline clear. You may continue to Manual Live Permission.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/60 p-5 text-red-100">
              Blocked. Do not trade.
            </div>
          )}

          {result.reasons.length > 0 ? (
            <div className="mt-4 space-y-3">
              {result.reasons.map((reason) => (
                <div key={reason} className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  {reason}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            <a
              href="/live/permission"
              className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Open Manual Live Permission
            </a>

            <a
              href="/broker/dhan-readonly"
              className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Open Dhan Read-Only
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
