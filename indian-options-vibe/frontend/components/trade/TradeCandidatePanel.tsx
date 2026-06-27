"use client";

import { useEffect, useState } from "react";
import {
  clearTradeCandidate,
  defaultTradeCandidate,
  loadTradeCandidate,
  saveTradeCandidate,
  TradeCandidate,
} from "@/lib/tradeCandidate";

export default function TradeCandidatePanel() {
  const [candidate, setCandidate] = useState<TradeCandidate>(() => defaultTradeCandidate());
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const saved = loadTradeCandidate();

    if (saved) {
      setCandidate(saved);
    }
  }, []);

  function update<K extends keyof TradeCandidate>(key: K, value: TradeCandidate[K]) {
    setCandidate((current) => ({ ...current, [key]: value }));
  }

  function saveCandidate() {
    saveTradeCandidate(candidate);
    setSavedAt(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  }

  function resetCandidate() {
    const fresh = defaultTradeCandidate();
    clearTradeCandidate();
    setCandidate(fresh);
    setSavedAt("");
  }

  const ready = Boolean(candidate.symbol.trim() && candidate.side && candidate.setup.trim());

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Full Model v2 · Signal-to-Permission Bridge
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Trade Candidate
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Save the one setup you are considering. This does not execute anything.
              It only tells Full Model what idea is being evaluated.
            </p>
            <p className="mt-2 text-xs font-bold text-cyan-300">
              Same-day guard: old candidates are ignored after the IST day changes.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              ready ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">Candidate</div>
            <div className="mt-2 text-4xl font-black">{ready ? "READY" : "EMPTY"}</div>
            <div className="mt-2 text-xs">Manual Dhan only</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Symbol
              <input
                value={candidate.symbol}
                onChange={(e) => update("symbol", e.target.value.toUpperCase())}
                placeholder="Example: NIFTY 24500PE"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>

            <label className="text-sm font-bold text-slate-300">
              Side
              <select
                value={candidate.side}
                onChange={(e) => update("side", e.target.value as TradeCandidate["side"])}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="">Select side</option>
                <option value="BUY_CE">BUY CE</option>
                <option value="BUY_PE">BUY PE</option>
                <option value="STOCK_BUY">STOCK BUY</option>
                <option value="STOCK_SELL">STOCK SELL</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Setup
            <input
              value={candidate.setup}
              onChange={(e) => update("setup", e.target.value)}
              placeholder="VWAP reclaim / liquidity sweep / retest / breadth support"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Source
              <select
                value={candidate.source}
                onChange={(e) => update("source", e.target.value as TradeCandidate["source"])}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="MANUAL">Manual</option>
                <option value="SCREENER">Screener</option>
                <option value="STOCK_DETAIL">Stock Detail</option>
                <option value="FULL_MODEL">Full Model</option>
              </select>
            </label>

            <label className="text-sm font-bold text-slate-300">
              Confidence
              <select
                value={candidate.confidence}
                onChange={(e) => update("confidence", e.target.value as TradeCandidate["confidence"])}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Notes
            <textarea
              value={candidate.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
              placeholder="Why this setup? What must happen before entry?"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveCandidate}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              Save Candidate
            </button>

            <button
              type="button"
              onClick={resetCandidate}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Clear Candidate
            </button>
          </div>

          {savedAt ? (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Saved: {savedAt}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Candidate Summary</h2>

          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-xl bg-slate-900 p-4">
              Symbol: <span className="font-black text-white">{candidate.symbol || "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Side: <span className="font-black text-white">{candidate.side || "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Setup: <span className="font-black text-white">{candidate.setup || "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Source: <span className="font-black text-white">{candidate.source}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Confidence: <span className="font-black text-white">{candidate.confidence}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <a
              href="/full-model"
              className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Open Full Model
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
