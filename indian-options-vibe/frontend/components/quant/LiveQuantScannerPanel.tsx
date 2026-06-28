"use client";

import { useEffect, useState } from "react";

type LiveResult = {
  symbol: string;
  side: string;
  decision: string;
  edge_score: number;
  setup: string;
  reasons: string[];
  warnings: string[];
  option_pricing_score?: number;
  option_pricing_side?: string;
  model_score?: number;
  model_decision?: string;
  model_side?: string;
  model_features?: {
    model_score: number;
    model_decision: string;
    model_side: string;
    structure?: {
      has_price: boolean;
      has_structure: boolean;
      structure_side: string;
      structure_score: number;
      structure_warning?: string | null;
    };
    alignment?: {
      option_has_signal: boolean;
      structure_has_signal: boolean;
      agrees: boolean;
      conflicts: boolean;
      alignment_score: number;
      alignment_message: string;
    };
    entry_plan?: string | null;
    stop_loss_plan?: string | null;
    target_plan?: string | null;
  };
  auto_order_allowed: boolean;
  manual_only: boolean;
};

type LiveSnapshot = {
  symbol: string;
  ltp: number;
  day_change_pct: number;
  trend_strength: number;
  vwap_distance_pct: number;
  breadth_support: number;
  retest_quality: number;
  liquidity_sweep_score: number;
  option_ce_momentum: number;
  option_pe_momentum: number;
  option_pricing_score: number;
  option_pricing_side: string;
};

type LiveState = {
  running: boolean;
  last_updated: string | null;
  interval_seconds: number;
  latest_snapshot: LiveSnapshot | null;
  latest_result: LiveResult | null;
  last_error: string | null;
  auto_order_allowed: boolean;
  manual_only: boolean;
  structure_agrees?: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function statusColor(decision?: string) {
  if (decision === "CANDIDATE") return "border-emerald-800 bg-emerald-950/50 text-emerald-100";
  if (decision === "WATCH") return "border-yellow-800 bg-yellow-950/50 text-yellow-100";
  return "border-red-900 bg-red-950/50 text-red-100";
}

export default function LiveQuantScannerPanel() {
  const [state, setState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  async function loadLatest() {
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/quant/live/latest`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Live latest API failed: ${response.status}`);
      }

      const data = await response.json();
      setState(data.state || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live scanner.");
    }
  }

  async function runAction(path: string, message: string) {
    setLoading(true);
    setActionMessage("");
    setError("");

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${response.status}`);
      }

      await response.json();
      setActionMessage(message);
      await loadLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLatest();

    const timer = window.setInterval(() => {
      loadLatest();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const result = state?.latest_result;
  const snapshot = state?.latest_snapshot;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Live Quant Engine v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Live Quant Scanner
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Reads the backend live engine result. This is a live scanner brain only.
              No order execution, no buy/sell/modify button.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              state?.running ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">Engine</div>
            <div className="mt-2 text-3xl font-black">
              {state?.running ? "RUNNING" : "STOPPED"}
            </div>
            <div className="mt-2 text-xs">Manual only · no auto-order</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction("/api/quant/live/run-once", "One live scan completed.")}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            Run Once
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runAction("/api/quant/live/start", "Live Quant Engine started.")}
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            Start Engine
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runAction("/api/quant/live/stop", "Live Quant Engine stop requested.")}
            className="rounded-xl bg-red-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-red-300 disabled:opacity-50"
          >
            Stop Engine
          </button>

          <button
            type="button"
            onClick={loadLatest}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>

        {actionMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {error || state?.last_error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
            {error || state?.last_error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Last Updated
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {state?.last_updated
              ? new Date(state.last_updated).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "-"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Interval
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {state?.interval_seconds ?? 60}s
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Structure Agrees
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {String(state?.structure_agrees ?? false)}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-red-300">
            Auto Order
          </div>
          <div className="mt-2 text-3xl font-black text-red-100">
            OFF
          </div>
        </div>
      </section>

      {!result ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
          No live scanner result yet. Click Run Once or Start Engine.
        </section>
      ) : (
        <section className={`rounded-3xl border p-6 ${statusColor(result.decision)}`}>
          <div className="text-xs font-black uppercase tracking-[0.35em]">
            Current Live Signal
          </div>

          <div className="mt-3 text-4xl font-black">
            {result.symbol} · {result.decision} · {result.side}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Edge Score
              </div>
              <div className="mt-1 text-3xl font-black">{result.edge_score}</div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Option Score
              </div>
              <div className="mt-1 text-3xl font-black">
                {result.option_pricing_score ?? "-"}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Option Side
              </div>
              <div className="mt-1 text-3xl font-black">
                {result.option_pricing_side || "-"}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-70">
                Setup
              </div>
              <div className="mt-1 text-sm font-black">{result.setup}</div>
            </div>
          </div>
        </section>
      )}

      {result?.model_features ? (
        <section className="rounded-3xl border border-purple-800 bg-purple-950/30 p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-purple-300">
            Model Feature Engine
          </div>

          <h2 className="mt-3 text-2xl font-black text-white">
            {result.model_features.model_decision} · {result.model_features.model_side}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-purple-200">
                Model Score
              </div>
              <div className="mt-1 text-3xl font-black text-white">
                {result.model_features.model_score}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-purple-200">
                Structure Score
              </div>
              <div className="mt-1 text-3xl font-black text-white">
                {result.model_features.structure?.structure_score ?? "-"}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-purple-200">
                Structure Side
              </div>
              <div className="mt-1 text-3xl font-black text-white">
                {result.model_features.structure?.structure_side ?? "-"}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-purple-200">
                Alignment
              </div>
              <div className="mt-1 text-3xl font-black text-white">
                {result.model_features.alignment?.alignment_score ?? "-"}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-purple-100">
            {result.model_features.alignment?.alignment_message}
          </div>

          {result.model_features.structure?.structure_warning ? (
            <div className="mt-3 rounded-xl border border-yellow-800 bg-yellow-950/50 p-4 text-sm font-bold text-yellow-100">
              {result.model_features.structure.structure_warning}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Entry Plan:{" "}
              <span className="font-black text-white">
                {result.model_features.entry_plan || "No entry plan yet"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              SL Plan:{" "}
              <span className="font-black text-white">
                {result.model_features.stop_loss_plan || "No SL plan yet"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Target Plan:{" "}
              <span className="font-black text-white">
                {result.model_features.target_plan || "No target plan yet"}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Live Feature Snapshot</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              LTP: <span className="font-black text-white">{snapshot.ltp}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Day Change: <span className="font-black text-white">{snapshot.day_change_pct}%</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Trend: <span className="font-black text-white">{snapshot.trend_strength}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              VWAP Dist: <span className="font-black text-white">{snapshot.vwap_distance_pct}%</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Breadth: <span className="font-black text-white">{snapshot.breadth_support}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Retest: <span className="font-black text-white">{snapshot.retest_quality}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              CE Momentum: <span className="font-black text-white">{snapshot.option_ce_momentum}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              PE Momentum: <span className="font-black text-white">{snapshot.option_pe_momentum}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Model Score: <span className="font-black text-white">{snapshot.model_score ?? "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Model Decision: <span className="font-black text-white">{snapshot.model_decision ?? "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Structure Score: <span className="font-black text-white">{snapshot.structure_score ?? "-"}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
              Alignment: <span className="font-black text-white">{snapshot.alignment_message ?? "-"}</span>
            </div>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-800 bg-emerald-950/30 p-6">
            <h2 className="text-xl font-black text-emerald-100">Reasons</h2>
            <div className="mt-4 space-y-3">
              {result.reasons?.length ? (
                result.reasons.map((reason) => (
                  <div key={reason} className="rounded-xl bg-black/20 p-3 text-sm text-emerald-100">
                    {reason}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                  No strong reasons.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-800 bg-yellow-950/30 p-6">
            <h2 className="text-xl font-black text-yellow-100">Warnings</h2>
            <div className="mt-4 space-y-3">
              {result.warnings?.length ? (
                result.warnings.map((warning) => (
                  <div key={warning} className="rounded-xl bg-black/20 p-3 text-sm text-yellow-100">
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                  No warnings.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
