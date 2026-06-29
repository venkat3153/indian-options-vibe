"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { saveTradeCandidate, TradeCandidate } from "@/lib/tradeCandidate";

type ScannerItem = {
  symbol: string;
  side: "BUY_CE" | "BUY_PE" | "NO_SIDE";
  decision: "CANDIDATE" | "WATCH" | "NO_TRADE";
  edge_score: number;
  setup: string;
  reasons: string[];
  warnings: string[];
  auto_order_allowed: boolean;
  manual_only: boolean;
  option_pricing_score?: number;
  option_pricing_side?: string;
};

export default function QuantScannerPanel() {
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedSymbol, setSavedSymbol] = useState("");
  const [snapshotSource, setSnapshotSource] = useState("");
  const [snapshotCreatedAt, setSnapshotCreatedAt] = useState("");

  async function loadScanner() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/quant/scanner/latest", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Scanner API failed: ${response.status}`);
      }

      const data = await response.json();
      setItems(Array.isArray(data.scanner) ? data.scanner : []);
      setSnapshotSource(data.snapshot_source || "");
      setSnapshotCreatedAt(data.snapshot_created_at || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scanner.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScanner();
  }, []);

  function sendToCandidate(item: ScannerItem) {
    if (item.decision !== "CANDIDATE") return;
    if (item.side === "NO_SIDE") return;

    const candidate: TradeCandidate = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      symbol: item.symbol,
      side: item.side,
      setup: item.setup,
      source: "SCREENER",
      confidence:
        item.edge_score >= 80 ? "HIGH" : item.edge_score >= 65 ? "MEDIUM" : "LOW",
      notes: [
        `Quant edge score: ${item.edge_score}`,
        ...item.reasons,
        ...item.warnings.map((warning) => `Warning: ${warning}`),
      ].join("\\n"),
    };

    saveTradeCandidate(candidate);
    setSavedSymbol(item.symbol);
  }

  const candidates = items.filter((item) => item.decision === "CANDIDATE");
  const watch = items.filter((item) => item.decision === "WATCH");
  const noTrade = items.filter((item) => item.decision === "NO_TRADE");

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Small Quant Model · Scanner v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Quant Stock Scanner
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This scanner ranks latest saved market snapshots using trend, breadth, VWAP, retest,
              liquidity, option momentum, IV, and spread quality. It creates candidates only.
              It never places orders.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-center text-slate-100">
            <div className="text-xs font-black uppercase tracking-widest">Execution</div>
            <div className="mt-2 text-3xl font-black">NO AUTO-ORDER</div>
            <div className="mt-2 text-xs">Manual Dhan only</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadScanner}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Refresh Scanner"}
          </button>

          <a
            href="/trade/candidate"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Trade Candidate
          </a>

          <a
            href="/full-model"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Full Model
          </a>
        </div>

        {savedSymbol ? (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-100">
            <div className="font-black">{savedSymbol} saved as Trade Candidate.</div>
            <div className="mt-1 text-xs">Next step: open Evidence Recorder, then Live Permission.</div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
            Candidates
          </div>
          <div className="mt-2 text-4xl font-black text-emerald-100">
            {candidates.length}
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-800 bg-yellow-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-yellow-300">
            Watch
          </div>
          <div className="mt-2 text-4xl font-black text-yellow-100">
            {watch.length}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-red-300">
            No Trade
          </div>
          <div className="mt-2 text-4xl font-black text-red-100">
            {noTrade.length}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
          Scanner Data Source
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
            Source: <span className="font-black text-white">{snapshotSource || "unknown"}</span>
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
            Snapshot Time:{" "}
            <span className="font-black text-white">
              {snapshotCreatedAt
                ? new Date(snapshotCreatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                : "-"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
            Mode: <span className="font-black text-red-200">No auto-order</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No scanner results yet. Start backend and refresh scanner.
          </div>
        ) : (
          items.map((item, index) => {
            const color =
              item.decision === "CANDIDATE"
                ? "border-emerald-800 bg-emerald-950/40"
                : item.decision === "WATCH"
                  ? "border-yellow-800 bg-yellow-950/40"
                  : "border-red-900 bg-red-950/40";

            return (
              <div key={`${item.symbol}-${index}`} className={`rounded-3xl border p-6 ${color}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Rank #{index + 1}
                    </div>

                    <h2 className="mt-2 text-2xl font-black text-white">
                      {item.symbol} · {item.side}
                    </h2>

                    <div className="mt-2 text-sm text-slate-300">
                      {item.setup}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 md:min-w-[620px]">
                    <div className="rounded-xl bg-black/20 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Decision
                      </div>
                      <div className="mt-1 font-black text-white">
                        {item.decision}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Edge
                      </div>
                      <div className="mt-1 font-black text-white">
                        {item.edge_score}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Auto Order
                      </div>
                      <div className="mt-1 font-black text-red-200">
                        {String(item.auto_order_allowed)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Option Pricing Score
                      </div>
                      <div className="mt-1 font-black text-cyan-200">
                        {item.option_pricing_score ?? "-"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Option Side
                      </div>
                      <div className="mt-1 font-black text-cyan-200">
                        {item.option_pricing_side || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Reasons
                    </div>

                    <div className="mt-3 space-y-2">
                      {item.reasons.length === 0 ? (
                        <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                          No strong reasons.
                        </div>
                      ) : (
                        item.reasons.map((reason) => (
                          <div key={reason} className="rounded-xl bg-black/20 p-3 text-sm text-emerald-100">
                            {reason}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-yellow-300">
                      Warnings
                    </div>

                    <div className="mt-3 space-y-2">
                      {item.warnings.length === 0 ? (
                        <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                          No warnings.
                        </div>
                      ) : (
                        item.warnings.map((warning) => (
                          <div key={warning} className="rounded-xl bg-black/20 p-3 text-sm text-yellow-100">
                            {warning}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {item.decision === "CANDIDATE" && item.side !== "NO_SIDE" ? (
                  <button
                    type="button"
                    onClick={() => sendToCandidate(item)}
                    className="mt-5 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
                  >
                    Send to Trade Candidate
                  </button>
                ) : (
                  <div className="mt-5 rounded-xl bg-black/20 p-3 text-sm font-bold text-slate-400">
                    Not eligible for Trade Candidate.
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
