import { PreTradeEvidence } from "@/lib/preTradeEvidence";
import { TradeCandidate } from "@/lib/tradeCandidate";

export type CandidateConsistencyResult = {
  ok: boolean;
  status: "PASS" | "BLOCK";
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
      ok: false,
      status: "BLOCK",
      reason: "No Trade Candidate saved. Save one planned idea before live permission.",
    };
  }

  if (!evidence) {
    return {
      ok: false,
      status: "BLOCK",
      reason: "Trade Candidate exists, but pre-trade evidence is missing.",
    };
  }

  const candidateSymbol = clean(candidate.symbol);
  const evidenceSymbol = clean(evidence.symbol);
  const candidateSide = clean(candidate.side);
  const evidenceSide = clean(evidence.side);

  if (!candidateSymbol || !candidateSide || !candidate.setup.trim()) {
    return {
      ok: false,
      status: "BLOCK",
      reason: "Trade Candidate is incomplete. Symbol, side, and setup are required.",
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
    reason: "Trade Candidate matches pre-trade evidence.",
  };
}
