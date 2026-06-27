"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DailyRiskState,
  defaultDailyRiskState,
  loadDailyRiskState,
  saveDailyRiskState,
} from "@/lib/dailyRiskState";
import { clearTradeCandidate } from "@/lib/tradeCandidate";

type StartupMode = "TRADE_DAY" | "NO_TRADE_DAY";

export default function DailyStartupControl() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<StartupMode>("TRADE_DAY");
  const [risk, setRisk] = useState<DailyRiskState>(() => defaultDailyRiskState());
  const [oneQtyConfirmed, setOneQtyConfirmed] = useState(true);
  const [manualOnlyConfirmed, setManualOnlyConfirmed] = useState(true);
  const [dhanCheckConfirmed, setDhanCheckConfirmed] = useState(false);
  const [marketPlanWritten, setMarketPlanWritten] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    setRisk(loadDailyRiskState());
    setMounted(true);
  }, []);

  const emotionRisk = useMemo(() => {
    const e = risk.emotion.toLowerCase();
    return (
      e.includes("fomo") ||
      e.includes("revenge") ||
      e.includes("panic") ||
      e.includes("angry") ||
      e.includes("recover")
    );
  }, [risk.emotion]);

  const ready =
    mode === "TRADE_DAY" &&
    !risk.lockedManually &&
    risk.maxTrades >= 1 &&
    risk.maxLossR > 0 &&
    !emotionRisk &&
    oneQtyConfirmed &&
    manualOnlyConfirmed &&
    dhanCheckConfirmed &&
    marketPlanWritten.trim().length >= 10;

  function updateRisk<K extends keyof DailyRiskState>(key: K, value: DailyRiskState[K]) {
    setRisk((current) => ({ ...current, [key]: value }));
  }

  function saveStartup() {
    const nextRisk: DailyRiskState = {
      ...risk,
      lockedManually: mode === "NO_TRADE_DAY" ? true : risk.lockedManually,
      todayTrades: 0,
      todayLossR: 0,
    };

    saveDailyRiskState(nextRisk);
    setRisk(nextRisk);
    setSavedAt(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }

  function resetFreshDay() {
    const fresh = defaultDailyRiskState();
    setRisk(fresh);
    setMode("TRADE_DAY");
    setOneQtyConfirmed(true);
    setManualOnlyConfirmed(true);
    setDhanCheckConfirmed(false);
    setMarketPlanWritten("");
    saveDailyRiskState(fresh);
    clearTradeCandidate();
    setSavedAt(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Loading daily startup...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
              Full Model v2 · Daily Startup Control
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Daily Startup Control
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Open this before market. Decide whether today is a trade day, set risk limits,
              confirm one quantity, and block trading if your mind is not clean.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              ready ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">
              Startup Status
            </div>
            <div className="mt-2 text-4xl font-black">
              {ready ? "READY" : "BLOCK"}
            </div>
            <div className="mt-2 text-xs">
              Manual Dhan only
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("TRADE_DAY")}
              className={`rounded-2xl border px-5 py-4 text-left ${
                mode === "TRADE_DAY"
                  ? "border-emerald-700 bg-emerald-950 text-emerald-100"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <div className="text-lg font-black">Trade Day</div>
              <div className="mt-1 text-xs">Only if mind and risk are clean.</div>
            </button>

            <button
              type="button"
              onClick={() => setMode("NO_TRADE_DAY")}
              className={`rounded-2xl border px-5 py-4 text-left ${
                mode === "NO_TRADE_DAY"
                  ? "border-red-800 bg-red-950 text-red-100"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <div className="text-lg font-black">No-Trade Day</div>
              <div className="mt-1 text-xs">Use this when tired, emotional, or unclear.</div>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Max Trades Today
              <input
                type="number"
                value={risk.maxTrades}
                onChange={(e) => updateRisk("maxTrades", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Max Loss R Today
              <input
                type="number"
                value={risk.maxLossR}
                onChange={(e) => updateRisk("maxLossR", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Emotion Before Market
            <textarea
              value={risk.emotion}
              onChange={(e) => updateRisk("emotion", e.target.value)}
              placeholder="Calm / focused / tired / FOMO / revenge / panic"
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <label className="block text-sm font-bold text-slate-300">
            Simple Market Plan
            <textarea
              value={marketPlanWritten}
              onChange={(e) => setMarketPlanWritten(e.target.value)}
              placeholder="Example: Trade only VWAP reclaim or clean retest. No chase. One trade only."
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
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

            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={dhanCheckConfirmed}
                onChange={(e) => setDhanCheckConfirmed(e.target.checked)}
                className="mr-2"
              />
              Dhan checked
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveStartup}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              Save Startup Plan
            </button>

            <button
              type="button"
              onClick={resetFreshDay}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Reset Fresh Day
            </button>
          </div>

          {savedAt ? (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Saved: {savedAt}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Startup Gate</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className={`rounded-xl p-4 ${mode === "TRADE_DAY" ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
              Mode: {mode === "TRADE_DAY" ? "Trade Day" : "No-Trade Day"}
            </div>

            <div className={`rounded-xl p-4 ${emotionRisk ? "bg-red-950 text-red-100" : "bg-emerald-950 text-emerald-100"}`}>
              Emotion: {emotionRisk ? "Risk detected" : "Clean"}
            </div>

            <div className={`rounded-xl p-4 ${risk.maxTrades >= 1 ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
              Max trades: {risk.maxTrades}
            </div>

            <div className={`rounded-xl p-4 ${risk.maxLossR > 0 ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
              Max loss: {risk.maxLossR}R
            </div>

            <div className={`rounded-xl p-4 ${marketPlanWritten.trim().length >= 10 ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
              Market plan: {marketPlanWritten.trim().length >= 10 ? "Written" : "Missing"}
            </div>

            <div className={`rounded-xl p-4 ${dhanCheckConfirmed ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"}`}>
              Dhan check: {dhanCheckConfirmed ? "Confirmed" : "Missing"}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <a
              href="/discipline/lock"
              className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Open Discipline Lock
            </a>

            <a
              href="/live/permission"
              className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Open Live Permission
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
