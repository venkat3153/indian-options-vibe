"use client";

import { useEffect, useState } from "react";
import {
  loadLatestEvidence,
  PreTradeEvidence,
} from "@/lib/preTradeEvidence";
import {
  calculateFinalLivePermission,
  FinalLivePermissionResult,
} from "@/lib/finalLivePermission";

export default function FinalPermissionEvidenceGate({
  baseStatus = "UNKNOWN",
}: {
  baseStatus?: string | null;
}) {
  const [evidence, setEvidence] = useState<PreTradeEvidence | null>(null);
  const [permission, setPermission] = useState<FinalLivePermissionResult>(() =>
    calculateFinalLivePermission({ baseStatus, evidence: null })
  );

  useEffect(() => {
    function refresh() {
      const latest = loadLatestEvidence();
      setEvidence(latest);
      setPermission(calculateFinalLivePermission({ baseStatus, evidence: latest }));
    }

    refresh();

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [baseStatus]);

  const allowed = permission.finalStatus === "ALLOWED";

  return (
    <div
      className={`mb-5 rounded-2xl border p-5 ${
        allowed
          ? "border-emerald-600 bg-emerald-950/70"
          : "border-red-800 bg-red-950/70"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Final Live Permission Engine v2
          </div>

          <h2
            className={`mt-2 text-2xl font-black ${
              allowed ? "text-emerald-200" : "text-red-200"
            }`}
          >
            {allowed
              ? "FINAL PERMISSION ALLOWED"
              : "FINAL PERMISSION BLOCKED"}
          </h2>

          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {permission.actionText}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Final
            </div>
            <div className={`mt-1 text-lg font-black ${allowed ? "text-emerald-200" : "text-red-200"}`}>
              {permission.finalStatus}
            </div>
          </div>

          <div className="rounded-xl bg-black/25 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Stock
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {permission.baseStatus}
            </div>
          </div>

          <div className="rounded-xl bg-black/25 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Evidence
            </div>
            <div className={`mt-1 text-lg font-black ${permission.evidenceStatus === "PASS" ? "text-emerald-200" : "text-red-200"}`}>
              {permission.evidenceStatus}
            </div>
          </div>
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

      {!allowed && permission.reasons.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-900 bg-black/20 p-4">
          <div className="text-sm font-black text-red-100">
            Permission remains blocked because:
          </div>

          <ul className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {permission.reasons.slice(0, 10).map((reason) => (
              <li key={reason} className="rounded-lg bg-slate-950/70 p-3">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a
          href="/paper/evidence"
          className="rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-bold text-slate-100 hover:bg-slate-900"
        >
          Open Evidence Recorder
        </a>

        <div className="rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-400">
          Read-only assistant flow. No Dhan auto-order. Manual execution only.
        </div>
      </div>
    </div>
  );
}
