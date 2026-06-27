"use client";

import { useEffect, useState } from "react";
import {
  calculateEvidenceGate,
  loadLatestEvidence,
  PreTradeEvidence,
} from "@/lib/preTradeEvidence";

export default function FinalPermissionEvidenceGate() {
  const [evidence, setEvidence] = useState<PreTradeEvidence | null>(null);

  useEffect(() => {
    function refresh() {
      setEvidence(loadLatestEvidence());
    }

    refresh();

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const gate = calculateEvidenceGate(evidence);

  return (
    <div
      className={`mb-5 rounded-2xl border p-5 ${
        gate.allowed
          ? "border-emerald-700 bg-emerald-950/70"
          : "border-red-800 bg-red-950/70"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Final Live Permission Evidence Lock
          </div>

          <h2
            className={`mt-2 text-2xl font-black ${
              gate.allowed ? "text-emerald-200" : "text-red-200"
            }`}
          >
            {gate.allowed
              ? "EVIDENCE PASS — Final manual permission can continue"
              : "EVIDENCE BLOCK — Final live permission is locked"}
          </h2>

          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            This is a read-only discipline gate. It does not place orders. Execution remains manual
            Dhan only. For July Manual Live-Test v1, one trade means strictly one quantity / one lot.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <div
            className={`rounded-xl px-4 py-3 text-center text-sm font-black ${
              gate.allowed
                ? "bg-emerald-500 text-slate-950"
                : "bg-red-500 text-white"
            }`}
          >
            {gate.status} · {gate.score}/{gate.total}
          </div>

          <a
            href="/paper/evidence"
            className="rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-bold text-slate-100 hover:bg-slate-900"
          >
            Open Evidence Recorder
          </a>
        </div>
      </div>

      {evidence ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-500">Evidence Symbol</div>
            <div className="mt-1 font-black text-white">{evidence.symbol || "-"}</div>
          </div>

          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-500">Side</div>
            <div className="mt-1 font-black text-white">{evidence.side || "-"}</div>
          </div>

          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-500">Qty</div>
            <div className="mt-1 font-black text-white">{evidence.quantity}</div>
          </div>

          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-500">Setup</div>
            <div className="mt-1 font-black text-white">{evidence.setupName || "-"}</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-black/20 p-3 text-sm text-red-100">
          No pre-trade evidence found. Open Evidence Recorder first.
        </div>
      )}

      {!gate.allowed && gate.reasons.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-900 bg-black/20 p-4">
          <div className="text-sm font-black text-red-100">
            Final permission remains blocked because:
          </div>

          <ul className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {gate.reasons.slice(0, 8).map((reason) => (
              <li key={reason} className="rounded-lg bg-slate-950/70 p-3">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
