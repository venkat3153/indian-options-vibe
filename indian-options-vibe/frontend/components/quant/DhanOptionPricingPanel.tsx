"use client";

import { useState } from "react";

type OptionSnapshot = {
  underlying_price: number;
  atm_strike: number | null;
  atm_ce_ltp: number;
  atm_pe_ltp: number;
  atm_straddle: number;
  pcr_oi: number;
  pcr_volume: number;
  total_ce_oi: number;
  total_pe_oi: number;
  total_ce_volume: number;
  total_pe_volume: number;
  rows_count: number;
  near_atm_rows: Array<Record<string, number>>;
  auto_order_allowed: boolean;
  manual_only: boolean;
};

type PricingSignal = {
  side: "BUY_CE" | "BUY_PE" | "NO_SIDE";
  decision: "CANDIDATE" | "WATCH" | "NO_TRADE";
  option_pricing_score: number;
  reasons: string[];
  warnings: string[];
  auto_order_allowed: boolean;
  manual_only: boolean;
};

type ApiResult = {
  status: string;
  expiry: string;
  underlying: string;
  status_code: number;
  auto_order_allowed: boolean;
  manual_only: boolean;
  option_snapshot: OptionSnapshot;
  pricing_signal: PricingSignal;
  error?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export default function DhanOptionPricingPanel() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCombined, setSavingCombined] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [combinedSaveMessage, setCombinedSaveMessage] = useState("");
  const [error, setError] = useState("");

  async function saveCombinedToScanner() {
    setSavingCombined(true);
    setCombinedSaveMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/dhan-data/nifty/save-combined-snapshot`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Save combined snapshot failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.error || "Failed to save combined snapshot.");
      }

      setCombinedSaveMessage(
        `Combined NIFTY snapshot saved. Structure agrees: ${String(data.structure_agrees)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save combined snapshot.");
    } finally {
      setSavingCombined(false);
    }
  }

  async function saveToScanner() {
    setSaving(true);
    setSaveMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/dhan-data/nifty/save-option-snapshot`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Save option snapshot failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.error || "Failed to save option snapshot.");
      }

      setSaveMessage("NIFTY option-pricing snapshot saved to Quant Scanner.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to scanner.");
    } finally {
      setSaving(false);
    }
  }

  async function loadOptionSnapshot() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/dhan-data/nifty/option-pricing-snapshot`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Option snapshot API failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.error || "Dhan option snapshot failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load option pricing snapshot.");
    } finally {
      setLoading(false);
    }
  }

  const signalColor =
    result?.pricing_signal.decision === "CANDIDATE"
      ? "border-emerald-800 bg-emerald-950/50 text-emerald-100"
      : result?.pricing_signal.decision === "WATCH"
        ? "border-yellow-800 bg-yellow-950/50 text-yellow-100"
        : "border-red-900 bg-red-950/50 text-red-100";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Dhan Data API · Option Pricing v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              NIFTY Option Pricing Snapshot
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Pulls read-only Dhan option-chain data, extracts ATM premiums, PCR,
              straddle value, and creates an option-pricing signal. No orders.
            </p>
          </div>

          <div className="rounded-3xl bg-red-950 px-6 py-5 text-center text-red-100">
            <div className="text-xs font-black uppercase tracking-widest">Execution</div>
            <div className="mt-2 text-3xl font-black">NO ORDER</div>
            <div className="mt-2 text-xs">Read-only data</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadOptionSnapshot}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Loading Dhan Data..." : "Load Option Pricing Snapshot"}
          </button>

          <button
            type="button"
            onClick={saveToScanner}
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Option Only"}
          </button>

          <button
            type="button"
            onClick={saveCombinedToScanner}
            disabled={savingCombined}
            className="rounded-xl bg-purple-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-purple-300 disabled:opacity-50"
          >
            {savingCombined ? "Saving..." : "Save Combined Snapshot"}
          </button>

          <a
            href="/quant/scanner"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Quant Scanner
          </a>

          <a
            href="/full-model"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Full Model
          </a>
        </div>

        {saveMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-100">
            {saveMessage}
          </div>
        ) : null}

        {combinedSaveMessage ? (
          <div className="mt-4 rounded-xl border border-purple-800 bg-purple-950/50 p-4 text-sm font-bold text-purple-100">
            {combinedSaveMessage}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      {!result ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
          Click “Load Option Pricing Snapshot” to pull live read-only Dhan option-chain data.
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Underlying
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {result.underlying}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Expiry {result.expiry}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Underlying Price
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {result.option_snapshot.underlying_price}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                ATM Strike
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {result.option_snapshot.atm_strike ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-800 bg-cyan-950/40 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
                ATM Straddle
              </div>
              <div className="mt-2 text-3xl font-black text-cyan-100">
                {result.option_snapshot.atm_straddle}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
                ATM CE
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-100">
                {result.option_snapshot.atm_ce_ltp}
              </div>
            </div>

            <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-red-300">
                ATM PE
              </div>
              <div className="mt-2 text-3xl font-black text-red-100">
                {result.option_snapshot.atm_pe_ltp}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                PCR OI
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {result.option_snapshot.pcr_oi}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                PCR Volume
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {result.option_snapshot.pcr_volume}
              </div>
            </div>
          </section>

          <section className={`rounded-3xl border p-6 ${signalColor}`}>
            <div className="text-xs font-black uppercase tracking-[0.35em]">
              Option Pricing Signal
            </div>

            <div className="mt-3 text-4xl font-black">
              {result.pricing_signal.decision} · {result.pricing_signal.side}
            </div>

            <div className="mt-2 text-sm">
              Score: {result.pricing_signal.option_pricing_score} · Manual only:{" "}
              {String(result.pricing_signal.manual_only)} · Auto order:{" "}
              {String(result.pricing_signal.auto_order_allowed)}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-800 bg-emerald-950/30 p-6">
              <h2 className="text-xl font-black text-emerald-100">Reasons</h2>
              <div className="mt-4 space-y-3">
                {result.pricing_signal.reasons.length === 0 ? (
                  <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                    No strong reasons.
                  </div>
                ) : (
                  result.pricing_signal.reasons.map((reason) => (
                    <div key={reason} className="rounded-xl bg-black/20 p-3 text-sm text-emerald-100">
                      {reason}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-800 bg-yellow-950/30 p-6">
              <h2 className="text-xl font-black text-yellow-100">Warnings</h2>
              <div className="mt-4 space-y-3">
                {result.pricing_signal.warnings.length === 0 ? (
                  <div className="rounded-xl bg-black/20 p-3 text-sm text-slate-400">
                    No warnings.
                  </div>
                ) : (
                  result.pricing_signal.warnings.map((warning) => (
                    <div key={warning} className="rounded-xl bg-black/20 p-3 text-sm text-yellow-100">
                      {warning}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-black text-white">Near ATM Option Chain Rows</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-3">Strike</th>
                    <th className="p-3">CE LTP</th>
                    <th className="p-3">PE LTP</th>
                    <th className="p-3">CE OI</th>
                    <th className="p-3">PE OI</th>
                    <th className="p-3">CE Vol</th>
                    <th className="p-3">PE Vol</th>
                    <th className="p-3">CE IV</th>
                    <th className="p-3">PE IV</th>
                  </tr>
                </thead>

                <tbody>
                  {result.option_snapshot.near_atm_rows.map((row) => (
                    <tr key={row.strike} className="border-t border-slate-800">
                      <td className="p-3 font-black text-white">{row.strike}</td>
                      <td className="p-3 text-emerald-200">{row.ce_ltp}</td>
                      <td className="p-3 text-red-200">{row.pe_ltp}</td>
                      <td className="p-3 text-slate-300">{row.ce_oi}</td>
                      <td className="p-3 text-slate-300">{row.pe_oi}</td>
                      <td className="p-3 text-slate-300">{row.ce_volume}</td>
                      <td className="p-3 text-slate-300">{row.pe_volume}</td>
                      <td className="p-3 text-slate-300">{row.ce_iv}</td>
                      <td className="p-3 text-slate-300">{row.pe_iv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
