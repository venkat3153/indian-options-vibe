"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DailyCloseState,
  defaultDailyCloseState,
  loadDailyCloseState,
  saveDailyCloseState,
} from "@/lib/dailyCloseState";
import { loadDailyRiskState } from "@/lib/dailyRiskState";

export default function DailyCloseReview() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<DailyCloseState>(() => defaultDailyCloseState());
  const [savedLabel, setSavedLabel] = useState("");

  useEffect(() => {
    setState(loadDailyCloseState());
    setMounted(true);
  }, []);

  const risk = mounted ? loadDailyRiskState() : null;

  const score = useMemo(() => {
    let value = 0;

    if (state.followedPlan) value += 25;
    if (state.respectedOneQty) value += 20;
    if (state.respectedManualOnly) value += 20;
    if (!state.overtraded) value += 15;
    if (!state.revengeOrFomo) value += 15;
    if (state.stoppedOnRule) value += 5;

    return value;
  }, [state]);

  const verdict =
    score >= 85 ? "CLEAN DAY" : score >= 65 ? "ACCEPTABLE" : "REVIEW REQUIRED";

  function update<K extends keyof DailyCloseState>(key: K, value: DailyCloseState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function saveReview() {
    saveDailyCloseState(state);
    setSavedLabel(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }

  function resetReview() {
    const fresh = defaultDailyCloseState();
    setState(fresh);
    saveDailyCloseState(fresh);
    setSavedLabel("");
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Loading daily close...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
              Full Model v2 · Daily Close Review
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Daily Close Review
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Open this after market. This is not for signals. This is for truth, discipline,
              and deciding tomorrow's risk mode.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              score >= 85
                ? "bg-emerald-950 text-emerald-100"
                : score >= 65
                  ? "bg-yellow-950 text-yellow-100"
                  : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">Close Verdict</div>
            <div className="mt-2 text-3xl font-black">{verdict}</div>
            <div className="mt-2 text-xs">Score {score}/100</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["followedPlan", "I followed my plan"],
              ["respectedOneQty", "I respected 1 quantity / 1 lot"],
              ["respectedManualOnly", "I used manual Dhan only"],
              ["stoppedOnRule", "I stopped when rule said stop"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={Boolean(state[key as keyof DailyCloseState])}
                  onChange={(e) =>
                    update(key as keyof DailyCloseState, e.target.checked as never)
                  }
                  className="mr-2"
                />
                {label}
              </label>
            ))}

            {[
              ["overtraded", "I overtraded"],
              ["revengeOrFomo", "I had revenge / FOMO"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100"
              >
                <input
                  type="checkbox"
                  checked={Boolean(state[key as keyof DailyCloseState])}
                  onChange={(e) =>
                    update(key as keyof DailyCloseState, e.target.checked as never)
                  }
                  className="mr-2"
                />
                {label}
              </label>
            ))}
          </div>

          <label className="block text-sm font-bold text-slate-300">
            One lesson from today
            <textarea
              value={state.lesson}
              onChange={(e) => update("lesson", e.target.value)}
              placeholder="Example: I waited well, but entered too early after VWAP rejection."
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div>
            <div className="text-sm font-bold text-slate-300">Tomorrow Mode</div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["NORMAL", "Normal"],
                ["REDUCED", "Reduced Risk"],
                ["NO_TRADE", "No-Trade"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update("tomorrowMode", mode as DailyCloseState["tomorrowMode"])}
                  className={`rounded-xl border px-4 py-3 text-sm font-black ${
                    state.tomorrowMode === mode
                      ? "border-emerald-700 bg-emerald-950 text-emerald-100"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveReview}
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300"
            >
              Save Daily Close
            </button>

            <button
              type="button"
              onClick={resetReview}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Reset Review
            </button>
          </div>

          {savedLabel ? (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Saved: {savedLabel}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-black text-white">Today Risk Summary</h2>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-900 p-4">
                Trades today:{" "}
                <span className="font-black text-white">
                  {risk?.todayTrades ?? 0}/{risk?.maxTrades ?? 1}
                </span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4">
                Today R:{" "}
                <span className="font-black text-white">{risk?.todayLossR ?? 0}R</span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4">
                Manual lock:{" "}
                <span className={risk?.lockedManually ? "font-black text-red-200" : "font-black text-emerald-200"}>
                  {risk?.lockedManually ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-black text-white">Next Action</h2>

            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              {score >= 85
                ? "Good. You followed discipline. Tomorrow can stay normal if market is clean."
                : score >= 65
                  ? "Acceptable, but reduce aggression tomorrow. One clean setup only."
                  : "Review required. Tomorrow should be reduced risk or no-trade."}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <a
                href="/daily/startup"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
              >
                Open Daily Startup
              </a>

              <a
                href="/discipline/lock"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
              >
                Open Discipline Lock
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
