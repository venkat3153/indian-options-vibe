"use client";

import { useEffect, useState } from "react";
import {
  calculateEvidenceGate,
  loadLatestEvidence,
  PreTradeEvidence,
} from "@/lib/preTradeEvidence";

export default function EvidenceGatePanel({ context = "Live Permission" }: { context?: string }) {
  const [evidence, setEvidence] = useState<PreTradeEvidence | null>(null);

  useEffect(() => {
    setEvidence(loadLatestEvidence());

    function refreshEvidence() {
      setEvidence(loadLatestEvidence());
    }

    window.addEventListener("storage", refreshEvidence);
    window.addEventListener("focus", refreshEvidence);

    return () => {
      window.removeEventListener("storage", refreshEvidence);
      window.removeEventListener("focus", refreshEvidence);
    };
  }, []);

  const gate = calculateEvidenceGate(evidence);

  return (
    <div
      className={`mb-5 rounded-2xl border p-4 shadow-sm ${
        gate.allowed
          ? "border-emerald-700 bg-emerald-950"
          : "border-red-800 bg-red-950"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Evidence Gate · {context}
          </p>
          <h2 className={`mt-1 text-xl font-black ${gate.allowed ? "text-emerald-100" : "text-red-100"}`}>
            {gate.allowed ? "PASS — Manual live permission can continue" : "BLOCK — Do not enter yet"}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Score {gate.score}/{gate.total}. Execution remains manual Dhan only. No auto-order.
          </p>
        </div>

        <a
          href="/paper/evidence"
          className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-950 hover:bg-white"
        >
          Open Evidence Recorder
        </a>
      </div>

      {evidence ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-400">Symbol</div>
            <div className="mt-1 font-bold text-white">{evidence.symbol || "-"}</div>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-400">Side</div>
            <div className="mt-1 font-bold text-white">{evidence.side || "-"}</div>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-400">Qty</div>
            <div className="mt-1 font-bold text-white">{evidence.quantity}</div>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <div className="text-xs font-bold text-slate-400">Setup</div>
            <div className="mt-1 font-bold text-white">{evidence.setupName || "-"}</div>
          </div>
        </div>
      ) : null}

      {!gate.allowed && gate.reasons.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-red-100">
          {gate.reasons.slice(0, 6).map((reason) => (
            <li key={reason} className="rounded-xl bg-black/20 p-3">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
