import { PreTradeEvidence } from "@/lib/preTradeEvidence";
import { TradeCandidate } from "@/lib/tradeCandidate";

export type CandidateConsistencyResult = {
  ok: boolean;
  status: "PASS" | "BLOCK" | "CHECK";
  reason: string;
};

function clean(value?: string) {
  return String(value || "").trim().toUpperCase();
}

export function checkCandidateConsistency({
  candidate,
  evidence,
}: {
  candidate?: TradeCandidate | null;
  evidence?: PreTradeEvidence | null;
}): CandidateConsistencyResult {
  if (!candidate) {
    return {
      ok: true,
      status: "CHECK",
      reason: "No trade candidate saved. This is allowed, but candidate bridge is empty.",
    };
  }

  if (!evidence) {
    return {
      ok: false,
      status: "BLOCK",
      reason: "Trade candidate exists, but pre-trade evidence is missing.",
    };
  }

  const candidateSymbol = clean(candidate.symbol);
  const evidenceSymbol = clean(evidence.symbol);
  const candidateSide = clean(candidate.side);
  const evidenceSide = clean(evidence.side);

  if (!candidateSymbol || !candidateSide) {
    return {
      ok: false,
      status: "BLOCK",
      reason: "Trade candidate is incomplete. Symbol and side are required.",
    };
  }

  if (!evidenceSymbol || !evidenceSide) {
    return {
      ok: false,
      status: "BLOCK",
      reason: "Evidence is incomplete. Symbol and side are required.",
    };
  }

  if (candidateSymbol !== evidenceSymbol) {
    return {
      ok: false,
      status: "BLOCK",
      reason: `Candidate symbol ${candidateSymbol} does not match evidence symbol ${evidenceSymbol}.`,
    };
  }

  if (candidateSide !== evidenceSide) {
    return {
      ok: false,
      status: "BLOCK",
      reason: `Candidate side ${candidateSide} does not match evidence side ${evidenceSide}.`,
    };
  }

  return {
    ok: true,
    status: "PASS",
    reason: "Trade candidate matches pre-trade evidence.",
  };
}
