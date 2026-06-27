"use client";

import { useEffect, useState } from "react";
import {
  calculateEvidenceGate,
  loadLatestEvidence,
  PreTradeEvidence,
} from "@/lib/preTradeEvidence";
import {
  DhanReadOnlySnapshot,
  getDhanReadOnlySnapshot,
} from "@/lib/dhanReadOnly";

export default function ManualLivePermissionCockpit() {
  const [evidence, setEvidence] = useState<PreTradeEvidence | null>(null);
  const [dhan, setDhan] = useState<DhanReadOnlySnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);

    try {
      setEvidence(loadLatestEvidence());
      setDhan(await getDhanReadOnlySnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();

    function onFocus() {
      refresh();
    }

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const evidenceGate = calculateEvidenceGate(evidence);
  const dhanConnected = Boolean(dhan?.connected);
  const noOpenPositions = (dhan?.positions.length || 0) === 0;
  const oneQtyConfirmed = Boolean(evidence?.oneQtyOnlyConfirmed);
  const manualOnlyConfirmed = Boolean(evidence?.noAutoOrderConfirmed);

  const allowed =
    evidenceGate.allowed &&
    dhanConnected &&
    noOpenPositions &&
    oneQtyConfirmed &&
    manualOnlyConfirmed;

  const checks = [
    {
      label: "Pre-Trade Evidence",
      ok: evidenceGate.allowed,
      fail: "Evidence is incomplete.",
    },
    {
      label: "Dhan Read-Only Connected",
      ok: dhanConnected,
      fail: "Dhan read-only sync is not connected.",
    },
    {
      label: "No Existing Open Position",
      ok: noOpenPositions,
      fail: "Open position exists. Do not stack trades.",
    },
    {
      label: "One Quantity Discipline",
      ok: oneQtyConfirmed,
      fail: "1 quantity / 1 lot confirmation missing.",
    },
    {
      label: "Manual Dhan Only",
      ok: manualOnlyConfirmed,
      fail: "Manual-only confirmation missing.",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
              Full Model v2 · Manual Live Permission
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Manual Live Permission Cockpit
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This screen decides whether you are allowed to manually execute in Dhan.
              It never places orders. It only blocks or allows your own manual action.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              allowed ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">
              Final Permission
            </div>
            <div className="mt-2 text-4xl font-black">
              {allowed ? "ALLOWED" : "BLOCKED"}
            </div>
            <div className="mt-2 text-xs">
              Manual Dhan only · No auto-order
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Permission"}
          </button>

          <a
            href="/paper/evidence"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Evidence
          </a>

          <a
            href="/broker/dhan-readonly"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Open Dhan Read-Only
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`rounded-2xl border p-4 ${
              check.ok
                ? "border-emerald-800 bg-emerald-950/50"
                : "border-red-900 bg-red-950/50"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
              {check.label}
            </div>
            <div className={`mt-2 text-2xl font-black ${check.ok ? "text-emerald-200" : "text-red-200"}`}>
              {check.ok ? "PASS" : "BLOCK"}
            </div>
            {!check.ok ? (
              <div className="mt-2 text-xs text-red-100">{check.fail}</div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Today Evidence</h2>

          {evidence ? (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-900 p-4">
                Symbol: <span className="font-black text-white">{evidence.symbol || "-"}</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4">
                Side: <span className="font-black text-white">{evidence.side || "-"}</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4">
                Setup: <span className="font-black text-white">{evidence.setupName || "-"}</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4">
                Qty: <span className="font-black text-white">{evidence.quantity}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-red-950 p-4 text-sm text-red-100">
              No evidence saved yet.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-black text-white">Dhan Read-Only State</h2>

          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-xl bg-slate-900 p-4">
              Status:{" "}
              <span className={dhanConnected ? "font-black text-emerald-200" : "font-black text-red-200"}>
                {dhanConnected ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Open positions:{" "}
              <span className="font-black text-white">{dhan?.positions.length || 0}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4">
              Orders shown:{" "}
              <span className="font-black text-white">{dhan?.orders.length || 0}</span>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-slate-400">
              No execution route. No buy/sell/modify button.
            </div>
          </div>
        </div>
      </section>

      {!allowed ? (
        <section className="rounded-3xl border border-red-900 bg-red-950/50 p-6">
          <h2 className="text-xl font-black text-red-100">Why blocked?</h2>

          <div className="mt-4 space-y-2 text-sm text-red-100">
            {checks
              .filter((check) => !check.ok)
              .map((check) => (
                <div key={check.label} className="rounded-xl bg-black/20 p-3">
                  {check.fail}
                </div>
              ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-emerald-800 bg-emerald-950/50 p-6">
          <h2 className="text-xl font-black text-emerald-100">
            Manual permission allowed
          </h2>
          <p className="mt-2 text-sm text-emerald-100">
            You may execute manually in Dhan only. Strictly 1 quantity / 1 lot. No auto-order.
          </p>
        </section>
      )}
    </main>
  );
}
