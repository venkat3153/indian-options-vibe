"use client";

import { useEffect, useState } from "react";

type GroupSummary = {
  total: number;
  target_hit: number;
  sl_hit: number;
  no_move: number;
  avoided: number;
  good_filter: number;
  bad_filter: number;
  resolved: number;
  win_rate: number;
};

type CalibrationReport = {
  total_reviews: number;
  minimum_reviews_for_threshold_change: number;
  suggested_candidate_threshold: number;
  threshold_reason: string;
  edge_summary: Record<string, GroupSummary>;
  symbol_summary: Record<string, GroupSummary>;
  side_summary: Record<string, GroupSummary>;
  decision_summary: Record<string, GroupSummary>;
  automation_allowed: boolean;
  message: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function SummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, GroupSummary>;
}) {
  const entries = Object.entries(rows || {});

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
      <h2 className="text-xl font-black text-white">{title}</h2>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
          No data yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="p-3">Group</th>
                <th className="p-3">Total</th>
                <th className="p-3">Target</th>
                <th className="p-3">SL</th>
                <th className="p-3">No Move</th>
                <th className="p-3">Resolved</th>
                <th className="p-3">Win Rate</th>
              </tr>
            </thead>

            <tbody>
              {entries.map(([name, row]) => (
                <tr key={name} className="border-t border-slate-800">
                  <td className="p-3 font-black text-white">{name}</td>
                  <td className="p-3 text-slate-300">{row.total}</td>
                  <td className="p-3 text-emerald-200">{row.target_hit}</td>
                  <td className="p-3 text-red-200">{row.sl_hit}</td>
                  <td className="p-3 text-yellow-200">{row.no_move}</td>
                  <td className="p-3 text-slate-300">{row.resolved}</td>
                  <td className="p-3 font-black text-cyan-200">{row.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function QuantCalibrationPanel() {
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/quant/scanner/calibration`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Calibration API failed: ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calibration report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const enoughData =
    (report?.total_reviews || 0) >=
    (report?.minimum_reviews_for_threshold_change || 30);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Small Quant Model · Calibration v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Quant Calibration Report
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This page uses your scanner review outcomes to judge whether thresholds,
              symbols, sides, and decisions are working. This is research only.
            </p>
          </div>

          <div className="rounded-3xl bg-red-950 px-6 py-5 text-center text-red-100">
            <div className="text-xs font-black uppercase tracking-widest">Automation</div>
            <div className="mt-2 text-3xl font-black">LOCKED</div>
            <div className="mt-2 text-xs">Not enough proof yet</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Calibration"}
          </button>

          <a
            href="/quant/review"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Review Loop
          </a>

          <a
            href="/quant/scanner"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Scanner
          </a>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Total Reviews
          </div>
          <div className="mt-2 text-4xl font-black text-white">
            {report?.total_reviews ?? 0}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            enoughData
              ? "border-emerald-800 bg-emerald-950/40"
              : "border-yellow-800 bg-yellow-950/40"
          }`}
        >
          <div className="text-xs font-black uppercase tracking-widest text-slate-400">
            Data Status
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {enoughData ? "ENOUGH" : "EARLY"}
          </div>
          <div className="mt-2 text-xs text-slate-300">
            Need {report?.minimum_reviews_for_threshold_change ?? 30}+ reviews
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-800 bg-cyan-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
            Suggested Threshold
          </div>
          <div className="mt-2 text-4xl font-black text-cyan-100">
            {report?.suggested_candidate_threshold ?? 72}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-red-300">
            Auto Order
          </div>
          <div className="mt-2 text-4xl font-black text-red-100">
            {report?.automation_allowed ? "ON" : "OFF"}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-900 bg-yellow-950/30 p-6">
        <h2 className="text-xl font-black text-yellow-100">
          Threshold Decision
        </h2>

        <p className="mt-3 text-sm text-yellow-100">
          {report?.threshold_reason || "Load report to see threshold reasoning."}
        </p>

        <p className="mt-3 text-sm text-yellow-100">
          {report?.message ||
            "Calibration is research only. We do not automate execution from early stats."}
        </p>
      </section>

      <SummaryTable title="Edge Score Buckets" rows={report?.edge_summary || {}} />
      <SummaryTable title="Side Performance" rows={report?.side_summary || {}} />
      <SummaryTable title="Decision Performance" rows={report?.decision_summary || {}} />
      <SummaryTable title="Symbol Performance" rows={report?.symbol_summary || {}} />
    </main>
  );
}
