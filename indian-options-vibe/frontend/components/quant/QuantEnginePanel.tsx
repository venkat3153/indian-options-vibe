"use client";

import { useState } from "react";

type QuantResult = {
  symbol: string;
  side: "BUY_CE" | "BUY_PE" | "NO_SIDE";
  decision: "CANDIDATE" | "WATCH" | "NO_TRADE";
  score: number;
  setup: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  warnings: string[];
  manual_only: boolean;
  auto_order_allowed: boolean;
};

type FormState = {
  symbol: string;
  trend_score: number;
  breadth_score: number;
  vwap_score: number;
  retest_score: number;
  liquidity_score: number;
  option_momentum_score: number;
  volatility_score: number;
  risk_penalty: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function QuantEnginePanel() {
  const [form, setForm] = useState<FormState>({
    symbol: "NIFTY",
    trend_score: 70,
    breadth_score: 65,
    vwap_score: 70,
    retest_score: 65,
    liquidity_score: 60,
    option_momentum_score: 70,
    volatility_score: 50,
    risk_penalty: 5,
  });

  const [result, setResult] = useState<QuantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function evaluate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/quant/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Quant API failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate quant model.");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(type: "bullish" | "bearish" | "weak") {
    if (type === "bullish") {
      setForm({
        symbol: "NIFTY",
        trend_score: 75,
        breadth_score: 70,
        vwap_score: 78,
        retest_score: 72,
        liquidity_score: 65,
        option_momentum_score: 76,
        volatility_score: 55,
        risk_penalty: 5,
      });
    }

    if (type === "bearish") {
      setForm({
        symbol: "NIFTY",
        trend_score: 72,
        breadth_score: 68,
        vwap_score: -78,
        retest_score: 70,
        liquidity_score: 66,
        option_momentum_score: -76,
        volatility_score: 55,
        risk_penalty: 5,
      });
    }

    if (type === "weak") {
      setForm({
        symbol: "NIFTY",
        trend_score: 45,
        breadth_score: 42,
        vwap_score: 30,
        retest_score: 35,
        liquidity_score: 45,
        option_momentum_score: 32,
        volatility_score: 45,
        risk_penalty: 15,
      });
    }
  }

  const resultColor =
    result?.decision === "CANDIDATE"
      ? "bg-emerald-950 text-emerald-100 border-emerald-800"
      : result?.decision === "WATCH"
        ? "bg-yellow-950 text-yellow-100 border-yellow-800"
        : "bg-red-950 text-red-100 border-red-900";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Small Quant Model · Core v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Quant Engine Lab
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This is a read-only signal scoring engine. It creates CANDIDATE / WATCH / NO_TRADE
              decisions only. It never places orders.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-center text-slate-100">
            <div className="text-xs font-black uppercase tracking-widest">Execution</div>
            <div className="mt-2 text-3xl font-black">MANUAL ONLY</div>
            <div className="mt-2 text-xs">No auto-order route</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => applyPreset("bullish")}
              className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm font-black text-emerald-100"
            >
              Bullish Preset
            </button>

            <button
              type="button"
              onClick={() => applyPreset("bearish")}
              className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm font-black text-red-100"
            >
              Bearish Preset
            </button>

            <button
              type="button"
              onClick={() => applyPreset("weak")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200"
            >
              Weak / No Trade
            </button>
          </div>

          <label className="block text-sm font-bold text-slate-300">
            Symbol
            <input
              value={form.symbol}
              onChange={(event) => update("symbol", event.target.value.toUpperCase())}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["trend_score", "Trend Score"],
              ["breadth_score", "Breadth Score"],
              ["vwap_score", "VWAP Score"],
              ["retest_score", "Retest Score"],
              ["liquidity_score", "Liquidity Score"],
              ["option_momentum_score", "Option Momentum Score"],
              ["volatility_score", "Volatility Score"],
              ["risk_penalty", "Risk Penalty"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm font-bold text-slate-300">
                {label}
                <input
                  type="number"
                  value={form[key as keyof FormState]}
                  onChange={(event) =>
                    update(key as keyof FormState, Number(event.target.value) as never)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={evaluate}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Evaluating..." : "Evaluate Quant Candidate"}
          </button>

          {error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Quant Result</h2>

          {!result ? (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              Run evaluation to see the model output.
            </div>
          ) : (
            <>
              <div className={`rounded-2xl border p-5 ${resultColor}`}>
                <div className="text-xs font-black uppercase tracking-widest">
                  Decision
                </div>
                <div className="mt-2 text-4xl font-black">{result.decision}</div>
                <div className="mt-2 text-sm">
                  {result.symbol} · {result.side} · Score {result.score}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  Setup: <span className="font-black text-white">{result.setup}</span>
                </div>

                <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  Confidence: <span className="font-black text-white">{result.confidence}</span>
                </div>

                <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  Manual only: <span className="font-black text-emerald-200">{String(result.manual_only)}</span>
                </div>

                <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  Auto order: <span className="font-black text-red-200">{String(result.auto_order_allowed)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300">
                  Reasons
                </h3>

                <div className="mt-3 space-y-2">
                  {result.reasons.map((reason) => (
                    <div key={reason} className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-100">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-yellow-300">
                  Warnings
                </h3>

                <div className="mt-3 space-y-2">
                  {result.warnings.map((warning) => (
                    <div key={warning} className="rounded-xl bg-yellow-950/40 p-3 text-sm text-yellow-100">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
