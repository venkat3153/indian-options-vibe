import {
  calculateEvidenceGate,
  PreTradeEvidence,
} from "@/lib/preTradeEvidence";

export type BaseFinalPermissionStatus =
  | "ALLOWED"
  | "BLOCKED"
  | "WAIT"
  | "NO_TRADE"
  | "UNKNOWN";

export type FinalLivePermissionResult = {
  finalStatus: "ALLOWED" | "BLOCKED";
  evidenceStatus: "PASS" | "BLOCK";
  baseStatus: BaseFinalPermissionStatus;
  reasons: string[];
  actionText: string;
};

export function normalizeBasePermissionStatus(value?: string | null): BaseFinalPermissionStatus {
  const raw = String(value || "").trim().toUpperCase();

  if (raw.includes("ALLOWED") || raw.includes("ALLOW")) return "ALLOWED";
  if (raw.includes("BLOCKED") || raw.includes("BLOCK")) return "BLOCKED";
  if (raw.includes("NO_TRADE") || raw.includes("NO TRADE")) return "NO_TRADE";
  if (raw.includes("WAIT")) return "WAIT";

  return "UNKNOWN";
}

export function calculateFinalLivePermission({
  baseStatus,
  evidence,
}: {
  baseStatus?: string | null;
  evidence?: PreTradeEvidence | null;
}): FinalLivePermissionResult {
  const normalizedBase = normalizeBasePermissionStatus(baseStatus);
  const evidenceGate = calculateEvidenceGate(evidence);

  const reasons: string[] = [];

  if (normalizedBase !== "ALLOWED") {
    reasons.push(`Stock detail permission is not ALLOWED. Current status: ${normalizedBase}.`);
  }

  if (!evidenceGate.allowed) {
    reasons.push("Pre-trade evidence gate is BLOCK.");
    reasons.push(...evidenceGate.reasons);
  }

  const finalAllowed = normalizedBase === "ALLOWED" && evidenceGate.allowed;

  return {
    finalStatus: finalAllowed ? "ALLOWED" : "BLOCKED",
    evidenceStatus: evidenceGate.status,
    baseStatus: normalizedBase,
    reasons,
    actionText: finalAllowed
      ? "FINAL MANUAL PERMISSION ALLOWED — You may execute manually in Dhan with exactly 1 quantity / 1 lot."
      : "FINAL MANUAL PERMISSION BLOCKED — Do not execute. Complete stock permission and evidence gate first.",
  };
}
