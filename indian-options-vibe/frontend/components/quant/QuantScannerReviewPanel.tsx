"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type ScannerItem = {
  symbol: string;
  side: string;
  decision: string;
  edge_score: number;
  setup: string;
  reasons: string[];
  warnings: string[];
};

type ReviewSummary = {
  total_reviews: number;
  target_hit: number;
  sl_hit: number;
  no_move: number;
  avoided: number;
  good_filter: number;
  bad_filter: number;
  resolved_trades: number;
  simple_win_rate: number;
  message: string;
};

type ReviewRow = {
  created_at: string;
  symbol: string;
  side: string;
  edge_score: number;
  decision: string;
  outcome: string;
  notes: string;
};

const outcomes = [
  "TARGET_HIT",
  "SL_HIT",
  "NO_MOVE",
  "AVOIDED",
  "GOOD_FILTER",
  "BAD_FILTER",
];

export default function QuantScannerReviewPanel() {
  const [scanner, setScanner] = useState<ScannerItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setError("");

    try {
      const scannerResponse = await apiFetch("/api/quant/scanner/sample", {
        cache: "no-store",
      });

      if (!scannerResponse.ok) {
        throw new Error(`Scanner API failed: ${scannerResponse.status}`);
      }

      const scannerData = await scannerResponse.json();
      setScanner(Array.isArray(scannerData.scanner) ? scannerData.scanner : []);

      const reviewResponse = await apiFetch("/api/quant/scanner/reviews", {
        cache: "no-store",
      });

      if (!reviewResponse.ok) {
        throw new Error(`Review API failed: ${reviewResponse.status}`);
      }

      const reviewData = await reviewResponse.json();
      setSummary(reviewData.summary || null);
      setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scanner review data.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveReview(item: ScannerItem, outcome: string) {
    setError("");
    setSaved("");

    try {
      const response = await apiFetch("/api/quant/scanner/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: item.symbol,
          side: item.side,
          edge_score: item.edge_score,
          decision: item.decision,
          outcome,
          notes: notes[item.symbol] || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Save review failed: ${response.status}`);
      }

      setSaved(`${item.symbol} marked as ${outcome}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Small Quant Model · Review Loop v1
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Scanner Result Review
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Mark scanner outputs after market. This is how we calibrate the model and later decide
              whether the scanner has real edge. No order execution exists here.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-center text-slate-100">
            <div className="text-xs font-black uppercase tracking-widest">Purpose</div>
            <div className="mt-2 text-3xl font-black">MODEL FEEDBACK</div>
            <div className="mt-2 text-xs">Research only</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
          >
            Refresh Review Data
          </button>

          <a
            href="/quant/scanner"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Scanner
          </a>

          <a
            href="/full-model"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Full Model
          </a>
        </div>

        {saved ? (
          <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-100">
            {saved}
          </div>
        ) : null}

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
            {summary?.total_reviews ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-300">
            Target Hit
          </div>
          <div className="mt-2 text-4xl font-black text-emerald-100">
            {summary?.target_hit ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-red-300">
            SL Hit
          </div>
          <div className="mt-2 text-4xl font-black text-red-100">
            {summary?.sl_hit ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-800 bg-cyan-950/40 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-cyan-300">
            Simple Win Rate
          </div>
          <div className="mt-2 text-4xl font-black text-cyan-100">
            {summary?.simple_win_rate ?? 0}%
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-900 bg-yellow-950/30 p-6">
        <h2 className="text-xl font-black text-yellow-100">
          Important rule
        </h2>

        <p className="mt-2 text-sm text-yellow-100">
          These reviews are research data only. We need many reviewed samples before trusting
          automation. Early stats can be misleading.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Review Current Scanner Results</h2>

        {scanner.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No scanner results loaded. Start backend and refresh review data.
          </div>
        ) : (
          scanner.map((item) => (
            <div key={`${item.symbol}-${item.side}`} className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {item.symbol} · {item.side}
                  </h3>

                  <p className="mt-2 text-sm text-slate-300">
                    Decision: <span className="font-black text-white">{item.decision}</span> · Edge:{" "}
                    <span className="font-black text-white">{item.edge_score}</span>
                  </p>

                  <p className="mt-2 text-sm text-slate-400">{item.setup}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
                  {outcomes.map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => saveReview(item, outcome)}
                      className="rounded-xl border border-slate-700 px-3 py-3 text-xs font-black text-slate-200 hover:bg-slate-900"
                    >
                      {outcome}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={notes[item.symbol] || ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [item.symbol]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Review notes: what happened after signal? Did it move to target/SL? Was spread bad? Was timing bad?"
                className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Recent Reviews</h2>

        {reviews.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No reviews saved yet.
          </div>
        ) : (
          reviews.slice(0, 10).map((review, index) => (
            <div key={`${review.created_at}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="font-black text-white">
                {review.symbol} · {review.side} · {review.outcome}
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Decision {review.decision} · Edge {review.edge_score} ·{" "}
                {new Date(review.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </div>

              {review.notes ? (
                <div className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                  {review.notes}
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
