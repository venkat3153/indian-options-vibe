"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildBlankEvidence,
  calculateEvidenceGate,
  loadEvidenceList,
  PreTradeEvidence,
  saveEvidence,
} from "@/lib/preTradeEvidence";
import { loadTradeCandidate } from "@/lib/tradeCandidate";

const sideOptions = [
  { value: "BUY_CE", label: "Buy CE" },
  { value: "BUY_PE", label: "Buy PE" },
  { value: "SELL_CE", label: "Sell CE" },
  { value: "SELL_PE", label: "Sell PE" },
  { value: "STOCK_BUY", label: "Stock Buy" },
  { value: "STOCK_SELL", label: "Stock Sell" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-500">{children}</label>;
}

export default function PreTradeEvidenceRecorder() {
  const [evidence, setEvidence] = useState<PreTradeEvidence>(() => buildBlankEvidence());
  const [savedAt, setSavedAt] = useState<string>("");
  const [history, setHistory] = useState<PreTradeEvidence[]>([]);

  useEffect(() => {
    const candidate = loadTradeCandidate();

    if (!candidate) return;

    setEvidence((current) => ({
      ...current,
      symbol: current.symbol || candidate.symbol,
      side: current.side || candidate.side,
      setupName: current.setupName || candidate.setup,
      entryPlan: current.entryPlan || candidate.notes,
      marketContext:
        current.marketContext ||
        `Candidate source: ${candidate.source}. Confidence: ${candidate.confidence}.`,
    }));
  }, []);

  const gate = useMemo(() => calculateEvidenceGate(evidence), [evidence]);

  function update<K extends keyof PreTradeEvidence>(key: K, value: PreTradeEvidence[K]) {
    setEvidence((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const cleanEvidence: PreTradeEvidence = {
      ...evidence,
      quantity: 1,
      createdAt: new Date().toISOString(),
    };

    saveEvidence(cleanEvidence);
    setSavedAt(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    setHistory(loadEvidenceList());
  }

  function handleNew() {
    setEvidence(buildBlankEvidence());
    setSavedAt("");
  }

  function handleLoad(item: PreTradeEvidence) {
    setEvidence(item);
    setSavedAt("Loaded previous evidence");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Full Model v2 · Manual Dhan Only
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Pre-Trade Evidence Recorder
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Record evidence before entry. This does not place orders. It only creates a manual permission gate.
            </p>
            <p className="mt-2 text-xs font-bold text-cyan-300">
              Same-day evidence guard: old evidence is ignored after the IST day changes.
            </p>
            <p className="mt-2 text-xs font-bold text-cyan-300">
              Candidate prefill is active: saved Trade Candidate can auto-fill symbol, side, setup, and notes.
            </p>
          </div>

          <div
            className={`rounded-2xl px-5 py-4 text-center ${
              gate.allowed ? "bg-emerald-900 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide">Evidence Gate</div>
            <div className="mt-1 text-3xl font-black">{gate.status}</div>
            <div className="mt-1 text-xs">Score {gate.score}/{gate.total}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FieldLabel>Trade date</FieldLabel>
              <input
                type="date"
                value={evidence.tradeDate}
                onChange={(event) => update("tradeDate", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <FieldLabel>Symbol</FieldLabel>
              <input
                value={evidence.symbol}
                placeholder="Example: NIFTY 24500 CE"
                onChange={(event) => update("symbol", event.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <FieldLabel>Instrument</FieldLabel>
              <input
                value={evidence.instrument}
                onChange={(event) => update("instrument", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <FieldLabel>Side</FieldLabel>
              <select
                value={evidence.side}
                onChange={(event) => update("side", event.target.value as PreTradeEvidence["side"])}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="">Select side</option>
                {sideOptions.map((side) => (
                  <option key={side.value} value={side.value}>
                    {side.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Quantity</FieldLabel>
              <input
                value={1}
                disabled
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
              />
              <p className="mt-1 text-xs text-slate-500">Locked to 1 quantity / 1 lot discipline.</p>
            </div>

            <div>
              <FieldLabel>Timeframe</FieldLabel>
              <input
                value={evidence.timeframe}
                onChange={(event) => update("timeframe", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Setup name</FieldLabel>
            <input
              value={evidence.setupName}
              placeholder="Liquidity sweep + retest / VWAP reclaim / etc."
              onChange={(event) => update("setupName", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <FieldLabel>Market context</FieldLabel>
            <textarea
              value={evidence.marketContext}
              rows={3}
              placeholder="Trend, breadth, VWAP, retest zone, option behaviour..."
              onChange={(event) => update("marketContext", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <FieldLabel>Entry plan</FieldLabel>
            <textarea
              value={evidence.entryPlan}
              rows={3}
              placeholder="Exact condition before entry."
              onChange={(event) => update("entryPlan", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Stop-loss plan</FieldLabel>
              <textarea
                value={evidence.stopLossPlan}
                rows={3}
                onChange={(event) => update("stopLossPlan", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <FieldLabel>Target / exit plan</FieldLabel>
              <textarea
                value={evidence.targetPlan}
                rows={3}
                onChange={(event) => update("targetPlan", event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Invalidation reason</FieldLabel>
            <textarea
              value={evidence.invalidationReason}
              rows={3}
              placeholder="What proves this trade idea wrong?"
              onChange={(event) => update("invalidationReason", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <FieldLabel>Emotional state</FieldLabel>
            <input
              value={evidence.emotionalState}
              placeholder="Calm / rushed / fear / revenge / confident"
              onChange={(event) => update("emotionalState", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["dhanReadOnlyChecked", "I checked Dhan manually / read-only. No auto-order is being used."],
              ["videoRecorded", "I recorded pre-trade video evidence before entry."],
              ["voiceRecorded", "I recorded voice reasoning before entry."],
              ["screenshotReady", "I saved / prepared chart screenshot evidence."],
              ["mcpReadOnlyReviewDone", "MCP assistant review is read-only only. No execution permission."],
              ["oneQtyOnlyConfirmed", "I confirm this trade is strictly 1 quantity / 1 lot only."],
              ["noAutoOrderConfirmed", "I confirm execution remains manual Dhan only. No auto-order."],
              ["finalSelfPermission", "I give final self-permission only after evidence is complete."],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(evidence[key as keyof PreTradeEvidence])}
                  onChange={(event) => update(key as keyof PreTradeEvidence, event.target.checked as never)}
                  className="mt-1"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 md:flex-row">
            <button
              onClick={handleSave}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Save Evidence + Update Gate
            </button>

            <button
              onClick={handleNew}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-900"
            >
              New Evidence
            </button>

            {savedAt ? (
              <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-300">
                Saved: {savedAt}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-white">Gate Result</h2>

            {gate.allowed ? (
              <div className="mt-4 rounded-xl bg-emerald-950 p-4 text-sm text-emerald-100">
                PASS. You may continue to manual live permission. This system still does not place any order.
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-red-950 p-4 text-sm text-red-100">
                BLOCK. Do not take the trade yet.
              </div>
            )}

            {gate.reasons.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {gate.reasons.map((reason) => (
                  <li key={reason} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    {reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Recent Evidence</h2>
              <button
                onClick={() => setHistory(loadEvidenceList())}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">No history loaded yet. Save evidence or click refresh.</p>
              ) : (
                history.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoad(item)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-left hover:bg-slate-800"
                  >
                    <div className="text-sm font-bold text-white">
                      {item.symbol || "No symbol"} · {item.side || "No side"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
