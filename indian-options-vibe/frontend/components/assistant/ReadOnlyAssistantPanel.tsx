"use client";

import { useMemo, useState } from "react";
import {
  ReadOnlyAssistantInput,
  reviewTradeIdea,
} from "@/lib/readOnlyAssistant";

export default function ReadOnlyAssistantPanel() {
  const [input, setInput] = useState<ReadOnlyAssistantInput>({
    symbol: "",
    direction: "",
    setup: "",
    marketContext: "",
    entryPlan: "",
    stopLoss: "",
    target: "",
    emotion: "",
  });

  const result = useMemo(() => reviewTradeIdea(input), [input]);

  function update(key: keyof ReadOnlyAssistantInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  const color =
    result.decision === "PASS"
      ? "border-emerald-700 bg-emerald-950 text-emerald-100"
      : result.decision === "WAIT"
        ? "border-yellow-700 bg-yellow-950 text-yellow-100"
        : "border-red-800 bg-red-950 text-red-100";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="text-xs font-black uppercase tracking-[0.35em] text-purple-300">
          Full Model v2 · MCP Read-Only Assistant
        </div>

        <h1 className="mt-3 text-3xl font-black text-white">
          Read-Only Trade Assistant
        </h1>

        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          This assistant reviews your trade idea only. It cannot place orders, modify orders,
          or execute anything in Dhan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-400">Symbol</label>
              <input
                value={input.symbol}
                onChange={(e) => update("symbol", e.target.value.toUpperCase())}
                placeholder="NIFTY 24500 CE"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Direction</label>
              <input
                value={input.direction}
                onChange={(e) => update("direction", e.target.value)}
                placeholder="Bullish / Bearish / CE / PE"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {[
            ["setup", "Setup", "Liquidity sweep + retest / VWAP reclaim / breadth support"],
            ["marketContext", "Market Context", "Trend, breadth, VWAP, retest zone, option behaviour"],
            ["entryPlan", "Entry Plan", "Exact trigger before entry"],
            ["stopLoss", "Stop-Loss", "Exact invalidation / SL level"],
            ["target", "Target / Exit", "Target, trail, CTC, or exit logic"],
            ["emotion", "Emotion Check", "Calm / rushed / fear / FOMO / revenge"],
          ].map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="text-xs font-bold text-slate-400">{label}</label>
              <textarea
                value={input[key as keyof ReadOnlyAssistantInput]}
                onChange={(e) => update(key as keyof ReadOnlyAssistantInput, e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className={`rounded-3xl border p-6 ${color}`}>
            <div className="text-xs font-black uppercase tracking-widest">
              Assistant Decision
            </div>

            <div className="mt-2 text-4xl font-black">
              {result.decision}
            </div>

            <div className="mt-2 text-sm">
              Score {result.score}/8
            </div>

            <p className="mt-4 text-sm">
              {result.finalMessage}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-lg font-black text-white">Checklist</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {result.checklist.map((item) => (
                <div key={item} className="rounded-xl bg-slate-900 p-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {result.reasons.length > 0 ? (
            <div className="rounded-3xl border border-red-900 bg-red-950/60 p-6">
              <h2 className="text-lg font-black text-red-100">Why not yet?</h2>

              <div className="mt-4 space-y-2 text-sm text-red-100">
                {result.reasons.map((reason) => (
                  <div key={reason} className="rounded-xl bg-black/20 p-3">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            Rule: even on PASS, execution is manual Dhan only and strictly 1 quantity / 1 lot.
          </div>
        </section>
      </div>
    </div>
  );
}
