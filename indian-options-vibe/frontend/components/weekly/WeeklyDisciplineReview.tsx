"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WeeklyReviewState,
  defaultWeeklyReviewState,
  loadWeeklyReviewState,
  saveWeeklyReviewState,
} from "@/lib/weeklyReviewState";

export default function WeeklyDisciplineReview() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WeeklyReviewState>(() => defaultWeeklyReviewState());
  const [savedLabel, setSavedLabel] = useState("");

  useEffect(() => {
    setState(loadWeeklyReviewState());
    setMounted(true);
  }, []);

  const score = useMemo(() => {
    let value = 100;

    value -= state.ruleBreaks * 15;
    value -= state.fomoTrades * 10;
    value -= state.revengeTrades * 20;

    if (!state.oneQtyRespected) value -= 25;
    if (!state.manualOnlyRespected) value -= 25;
    if (!state.bestTradeLesson.trim()) value -= 5;
    if (!state.worstTradeLesson.trim()) value -= 5;
    if (!state.nextWeekFocus.trim()) value -= 5;

    return Math.max(0, Math.min(100, value));
  }, [state]);

  const verdict =
    score >= 85 ? "DISCIPLINED WEEK" : score >= 65 ? "NEEDS CONTROL" : "RESET REQUIRED";

  function update<K extends keyof WeeklyReviewState>(key: K, value: WeeklyReviewState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function saveReview() {
    saveWeeklyReviewState(state);
    setSavedLabel(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }

  function resetReview() {
    const fresh = defaultWeeklyReviewState();
    setState(fresh);
    saveWeeklyReviewState(fresh);
    setSavedLabel("");
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Loading weekly review...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-purple-300">
              Full Model v2 · Weekly Discipline Review
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Weekly Discipline Review
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Use this once a week. The goal is not more trades. The goal is clean behaviour,
              one-quantity discipline, and no revenge trading.
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
            <div className="text-xs font-black uppercase tracking-widest">Weekly Verdict</div>
            <div className="mt-2 text-3xl font-black">{verdict}</div>
            <div className="mt-2 text-xs">Score {score}/100</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <label className="text-sm font-bold text-slate-300">
            Week Label
            <input
              value={state.weekLabel}
              onChange={(e) => update("weekLabel", e.target.value)}
              placeholder="Example: July Week 1"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Total Trades
              <input
                type="number"
                value={state.totalTrades}
                onChange={(e) => update("totalTrades", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Rule Breaks
              <input
                type="number"
                value={state.ruleBreaks}
                onChange={(e) => update("ruleBreaks", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              FOMO Trades
              <input
                type="number"
                value={state.fomoTrades}
                onChange={(e) => update("fomoTrades", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Revenge Trades
              <input
                type="number"
                value={state.revengeTrades}
                onChange={(e) => update("revengeTrades", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={state.oneQtyRespected}
                onChange={(e) => update("oneQtyRespected", e.target.checked)}
                className="mr-2"
              />
              I respected 1 quantity / 1 lot
            </label>

            <label className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={state.manualOnlyRespected}
                onChange={(e) => update("manualOnlyRespected", e.target.checked)}
                className="mr-2"
              />
              I used manual Dhan only
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Best trade lesson
            <textarea
              value={state.bestTradeLesson}
              onChange={(e) => update("bestTradeLesson", e.target.value)}
              rows={3}
              placeholder="What did I do well?"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <label className="block text-sm font-bold text-slate-300">
            Worst trade lesson
            <textarea
              value={state.worstTradeLesson}
              onChange={(e) => update("worstTradeLesson", e.target.value)}
              rows={3}
              placeholder="What mistake must I not repeat?"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <label className="block text-sm font-bold text-slate-300">
            Next week focus
            <textarea
              value={state.nextWeekFocus}
              onChange={(e) => update("nextWeekFocus", e.target.value)}
              rows={3}
              placeholder="Example: Only VWAP reclaim + no second trade after loss."
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div>
            <div className="text-sm font-bold text-slate-300">Next Week Mode</div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["NORMAL", "Normal"],
                ["REDUCED", "Reduced"],
                ["NO_TRADE_FIRST_DAY", "No-Trade First Day"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update("nextWeekMode", mode as WeeklyReviewState["nextWeekMode"])}
                  className={`rounded-xl border px-4 py-3 text-sm font-black ${
                    state.nextWeekMode === mode
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
              className="rounded-xl bg-purple-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-purple-300"
            >
              Save Weekly Review
            </button>

            <button
              type="button"
              onClick={resetReview}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Reset Weekly Review
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
            <h2 className="text-xl font-black text-white">Weekly Result</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-slate-900 p-4 text-slate-300">
                Rule breaks: <span className="font-black text-white">{state.ruleBreaks}</span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-slate-300">
                FOMO trades: <span className="font-black text-white">{state.fomoTrades}</span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-slate-300">
                Revenge trades: <span className="font-black text-white">{state.revengeTrades}</span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-slate-300">
                Next week: <span className="font-black text-white">{state.nextWeekMode}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-black text-white">Next Action</h2>

            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              {score >= 85
                ? "Good week. Continue normal mode but still obey one-trade discipline."
                : score >= 65
                  ? "Reduce aggression next week. One clean setup only."
                  : "Reset required. Start next week with reduced risk or no-trade first day."}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <a
                href="/daily/startup"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
              >
                Open Daily Startup
              </a>

              <a
                href="/daily/close"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
              >
                Open Daily Close
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
