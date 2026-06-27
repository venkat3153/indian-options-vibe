"use client";

import { useEffect, useState } from "react";
import { loadDailyRiskState, saveDailyRiskState, DailyRiskState } from "@/lib/dailyRiskState";
import { loadLatestEvidence, calculateEvidenceGate, PreTradeEvidence } from "@/lib/preTradeEvidence";
import { getDhanReadOnlySnapshot, DhanReadOnlySnapshot } from "@/lib/dhanReadOnly";
import { getMarketSessionStatus, MarketSessionStatus } from "@/lib/marketSession";
import { loadTradeCandidate, clearTradeCandidate, TradeCandidate } from "@/lib/tradeCandidate";
import { checkCandidateConsistency } from "@/lib/candidateConsistency";
import { addPermissionAudit, loadPermissionAudit, PermissionAuditEvent } from "@/lib/permissionAudit";

type Card = {
  title: string;
  href: string;
  description: string;
  status: "READY" | "BLOCK" | "CHECK";
};

export default function FullModelCommandCenter() {
  const [risk, setRisk] = useState<DailyRiskState | null>(null);
  const [evidence, setEvidence] = useState<PreTradeEvidence | null>(null);
  const [dhan, setDhan] = useState<DhanReadOnlySnapshot | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSessionStatus | null>(null);
  const [candidate, setCandidate] = useState<TradeCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditEvents, setAuditEvents] = useState<PermissionAuditEvent[]>([]);

  async function refresh() {
    setLoading(true);

    try {
      setRisk(loadDailyRiskState());
      setEvidence(loadLatestEvidence());
      setMarketSession(getMarketSessionStatus());
      setCandidate(loadTradeCandidate());
      setDhan(await getDhanReadOnlySnapshot());
      addPermissionAudit("FULL_MODEL_REFRESH", "Full Model command center refreshed.");
      setAuditEvents(loadPermissionAudit());
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
  const cooldownClear =
    !risk?.cooldownUntil || new Date(risk.cooldownUntil).getTime() <= Date.now();

  const dailyRiskOk =
    !risk ||
    (risk.todayTrades < risk.maxTrades &&
      risk.todayLossR > -Math.abs(risk.maxLossR) &&
      !risk.lockedManually &&
      cooldownClear);

  const marketOpen = Boolean(marketSession?.isOpen);
  const candidateConsistency = checkCandidateConsistency({ candidate, evidence });
  const finalReady = evidenceGate.allowed && dhanConnected && dailyRiskOk && marketOpen && candidateConsistency.ok;

  function emergencyLockDay() {
    const current = loadDailyRiskState();
    const locked = {
      ...current,
      lockedManually: true,
      emotion: current.emotion || "Emergency lock activated from Full Model",
    };

    saveDailyRiskState(locked);
    addPermissionAudit("EMERGENCY_LOCK", "Emergency Lock Day activated from Full Model.");
    setRisk(locked);
    setAuditEvents(loadPermissionAudit());
  }

  function clearCurrentCandidate() {
    clearTradeCandidate();
    addPermissionAudit("CANDIDATE_CLEARED", "Trade Candidate cleared from Full Model.");
    setCandidate(null);
    setAuditEvents(loadPermissionAudit());
  }

  const nextAction = (() => {
    if (risk?.lockedManually) {
      return {
        title: "Stop for today",
        message: "Emergency lock or manual lock is active. Do not trade. Review only.",
        href: "/discipline/lock",
        cta: "Open Discipline Lock",
        status: "BLOCK",
      };
    }

    if (!dailyRiskOk) {
      return {
        title: "Fix daily risk first",
        message: "Daily risk is blocking. Check max trades, max loss, or lock state.",
        href: "/discipline/lock",
        cta: "Open Discipline Lock",
        status: "BLOCK",
      };
    }

    if (!candidate) {
      return {
        title: "Save one trade candidate",
        message: "No random trades. First save the exact symbol, side, and setup you are evaluating.",
        href: "/trade/candidate",
        cta: "Open Trade Candidate",
        status: "BLOCK",
      };
    }

    if (!candidateConsistency.ok) {
      return {
        title: "Fix candidate/evidence mismatch",
        message: candidateConsistency.reason,
        href: "/trade/candidate",
        cta: "Open Trade Candidate",
        status: "BLOCK",
      };
    }

    if (!evidenceGate.allowed) {
      return {
        title: "Record pre-trade evidence",
        message: "Before live permission, complete the small evidence checklist.",
        href: "/paper/evidence",
        cta: "Open Evidence",
        status: "BLOCK",
      };
    }

    if (!marketOpen) {
      return {
        title: "Market is closed",
        message: marketSession?.reason || "Live permission is blocked outside NSE market session.",
        href: "/full-model",
        cta: "Refresh Command Center",
        status: "BLOCK",
      };
    }

    if (!dhanConnected) {
      return {
        title: "Check Dhan read-only",
        message: "Broker read-only sync is not connected. Do not continue until checked.",
        href: "/broker/dhan-readonly",
        cta: "Open Dhan Read-Only",
        status: "CHECK",
      };
    }

    return {
      title: "Go to Live Permission",
      message: "All core gates look clean. Final screen decides manual Dhan permission.",
      href: "/live/permission",
      cta: "Open Live Permission",
      status: "READY",
    };
  })();

  const cards: Card[] = [
    {
      title: "0. Trade Candidate",
      href: "/trade/candidate",
      description: "Save the one idea being evaluated before permission.",
      status: candidate ? "READY" : "BLOCK",
    },
    {
      title: "1. Daily Startup",
      href: "/daily/startup",
      description: "Set trade day, max trades, max loss, emotion, and market plan.",
      status: dailyRiskOk ? "READY" : "BLOCK",
    },
    {
      title: "2. Discipline Lock",
      href: "/discipline/lock",
      description: "Control overtrading, FOMO, revenge, and post-trade lock.",
      status: dailyRiskOk ? "READY" : "BLOCK",
    },
    {
      title: "3. Pre-Trade Evidence",
      href: "/paper/evidence",
      description: "Small checklist before trade. No overbuilding. Just discipline.",
      status: evidenceGate.allowed ? "READY" : "BLOCK",
    },
    {
      title: "4. Dhan Read-Only",
      href: "/broker/dhan-readonly",
      description: "Check broker state. Read-only. No execution.",
      status: dhanConnected ? "READY" : "CHECK",
    },
    {
      title: "5. Live Permission",
      href: "/live/permission",
      description: "Final manual permission screen before Dhan execution.",
      status: finalReady ? "READY" : "BLOCK",
    },
    {
      title: "6. Daily Close",
      href: "/daily/close",
      description: "End-of-day truth review and tomorrow risk mode.",
      status: "CHECK",
    },
    {
      title: "7. Weekly Review",
      href: "/weekly/review",
      description: "Weekend discipline review for rule breaks, FOMO, and revenge.",
      status: "CHECK",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Full Model v2 · July Manual Live-Test
            </div>

            <h1 className="mt-3 text-3xl font-black text-white">
              Full Model Command Center
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              This is your daily operating screen. It does not place orders. It only tells you
              whether your discipline, evidence, broker read-only state, and live permission are clean.
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-5 text-center ${
              finalReady ? "bg-emerald-950 text-emerald-100" : "bg-red-950 text-red-100"
            }`}
          >
            <div className="text-xs font-black uppercase tracking-widest">
              System Status
            </div>
            <div className="mt-2 text-4xl font-black">
              {finalReady ? "READY" : "BLOCK"}
            </div>
            <div className="mt-2 text-xs">
              Manual Dhan only · 1 qty
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Command Center"}
          </button>

          {candidate ? (
            <button
              type="button"
              onClick={clearCurrentCandidate}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-900"
            >
              Clear Candidate
            </button>
          ) : null}

          {risk?.lockedManually ? (
            <div className="rounded-xl border border-red-800 bg-red-950 px-5 py-3 text-sm font-black text-red-100">
              Emergency lock is active
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className={`rounded-2xl border p-5 ${dailyRiskOk ? "border-emerald-800 bg-emerald-950/50" : "border-red-900 bg-red-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Daily Risk</div>
          <div className={`mt-2 text-3xl font-black ${dailyRiskOk ? "text-emerald-200" : "text-red-200"}`}>
            {dailyRiskOk ? "PASS" : "BLOCK"}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            Trades {risk?.todayTrades ?? 0}/{risk?.maxTrades ?? 1} · R {risk?.todayLossR ?? 0}
            {risk?.cooldownUntil ? " · Cooldown active" : ""}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${evidenceGate.allowed ? "border-emerald-800 bg-emerald-950/50" : "border-red-900 bg-red-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Evidence</div>
          <div className={`mt-2 text-3xl font-black ${evidenceGate.allowed ? "text-emerald-200" : "text-red-200"}`}>
            {evidenceGate.status}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {evidence?.symbol || "No symbol"} · Qty {evidence?.quantity || 0}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${dhanConnected ? "border-emerald-800 bg-emerald-950/50" : "border-yellow-900 bg-yellow-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Dhan Read-Only</div>
          <div className={`mt-2 text-3xl font-black ${dhanConnected ? "text-emerald-200" : "text-yellow-200"}`}>
            {dhanConnected ? "CONNECTED" : "CHECK"}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            Positions {dhan?.positions.length || 0} · Orders {dhan?.orders.length || 0}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${marketOpen ? "border-emerald-800 bg-emerald-950/50" : "border-red-900 bg-red-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Market Session</div>
          <div className={`mt-2 text-3xl font-black ${marketOpen ? "text-emerald-200" : "text-red-200"}`}>
            {marketSession?.label || "CHECK"}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {marketSession?.istTime || "-"}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${candidate ? "border-emerald-800 bg-emerald-950/50" : "border-yellow-900 bg-yellow-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Trade Candidate</div>
          <div className={`mt-2 text-3xl font-black ${candidate ? "text-emerald-200" : "text-yellow-200"}`}>
            {candidate ? "SET" : "EMPTY"}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {candidate?.symbol || "No candidate"} {candidate?.side ? "· " + candidate.side : ""}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${candidateConsistency.ok ? "border-emerald-800 bg-emerald-950/50" : "border-red-900 bg-red-950/50"}`}>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Candidate Match</div>
          <div className={`mt-2 text-3xl font-black ${candidateConsistency.ok ? "text-emerald-200" : "text-red-200"}`}>
            {candidateConsistency.status}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {candidateConsistency.reason}
          </div>
        </div>
      </section>

      <section
        className={`rounded-3xl border p-6 ${
          nextAction.status === "READY"
            ? "border-emerald-800 bg-emerald-950/50"
            : nextAction.status === "CHECK"
              ? "border-yellow-900 bg-yellow-950/50"
              : "border-red-900 bg-red-950/50"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
              Smart Next Action
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              {nextAction.title}
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {nextAction.message}
            </p>
          </div>

          <a
            href={nextAction.href}
            className="rounded-xl bg-slate-100 px-5 py-3 text-center text-sm font-black text-slate-950 hover:bg-white"
          >
            {nextAction.cta}
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-slate-800 bg-slate-950 p-6 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">{card.title}</h2>
                <p className="mt-2 text-sm text-slate-400">{card.description}</p>
              </div>

              <div
                className={`rounded-xl px-3 py-2 text-xs font-black ${
                  card.status === "READY"
                    ? "bg-emerald-950 text-emerald-100"
                    : card.status === "BLOCK"
                      ? "bg-red-950 text-red-100"
                      : "bg-yellow-950 text-yellow-100"
                }`}
              >
                {card.status}
              </div>
            </div>
          </a>
        ))}
      </section>


      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Non-Negotiable Trading Rules</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              These are not suggestions. If one rule breaks, live permission should stay blocked.
            </p>
          </div>

          <button
            type="button"
            onClick={emergencyLockDay}
            className="rounded-xl border border-red-800 bg-red-950 px-5 py-3 text-center text-sm font-black text-red-100 hover:bg-red-900"
          >
            Emergency Lock Day
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-xl bg-slate-900 p-4 text-sm font-bold text-slate-200">
            1. Only 1 quantity / 1 lot
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm font-bold text-slate-200">
            2. Manual Dhan only
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm font-bold text-slate-200">
            3. No revenge / FOMO trade
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm font-bold text-slate-200">
            4. No stacking open positions
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-sm font-bold text-slate-200">
            5. Stop when rule says stop
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-xl font-black text-white">Correct Daily Flow</h2>

        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-4">
          <div className="rounded-xl bg-slate-900 p-4">Morning: Daily Startup</div>
          <div className="rounded-xl bg-slate-900 p-4">Before trade: Evidence + Dhan Read-Only</div>
          <div className="rounded-xl bg-slate-900 p-4">Entry: Manual Live Permission only</div>
          <div className="rounded-xl bg-slate-900 p-4">After market: Daily Close</div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-900 bg-yellow-950/30 p-6">
        <h2 className="text-xl font-black text-yellow-100">
          READY does not mean force a trade
        </h2>

        <p className="mt-3 max-w-4xl text-sm text-yellow-100">
          READY only means your discipline gates are clean. You still need a valid chart setup,
          clean option movement, and calm execution. If the setup disappears, do nothing.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-black/20 p-4 text-sm font-bold text-yellow-100">
            No setup = no trade
          </div>

          <div className="rounded-xl bg-black/20 p-4 text-sm font-bold text-yellow-100">
            No chase after move
          </div>

          <div className="rounded-xl bg-black/20 p-4 text-sm font-bold text-yellow-100">
            Permission is not prediction
          </div>
        </div>
      </section>


      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Permission Audit Trail</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Recent system events. This is for discipline review, not execution.
            </p>
          </div>

          <a
            href="/daily/close"
            className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-900"
          >
            Daily Close Review
          </a>
        </div>

        <div className="mt-5 space-y-3">
          {auditEvents.length === 0 ? (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              No audit events yet.
            </div>
          ) : (
            auditEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                <div className="font-black text-white">{event.type}</div>
                <div className="mt-1">{event.message}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </main>
  );
}
