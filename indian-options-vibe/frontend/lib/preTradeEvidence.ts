export type EvidenceSide = "BUY_CE" | "BUY_PE" | "SELL_CE" | "SELL_PE" | "STOCK_BUY" | "STOCK_SELL";

export type EvidenceGateStatus = "PASS" | "BLOCK";

export type PreTradeEvidence = {
  id: string;
  createdAt: string;
  tradeDate: string;
  symbol: string;
  instrument: string;
  side: EvidenceSide | "";
  quantity: number;
  setupName: string;
  timeframe: string;
  entryPlan: string;
  stopLossPlan: string;
  targetPlan: string;
  invalidationReason: string;
  marketContext: string;
  emotionalState: string;
  dhanReadOnlyChecked: boolean;
  videoRecorded: boolean;
  voiceRecorded: boolean;
  screenshotReady: boolean;
  mcpReadOnlyReviewDone: boolean;
  oneQtyOnlyConfirmed: boolean;
  noAutoOrderConfirmed: boolean;
  finalSelfPermission: boolean;
};

export type EvidenceGateResult = {
  status: EvidenceGateStatus;
  allowed: boolean;
  reasons: string[];
  score: number;
  total: number;
};

export const EVIDENCE_STORAGE_KEY = "indian-options-vibe:pre-trade-evidence:v2";
export const LATEST_EVIDENCE_KEY = "indian-options-vibe:latest-pre-trade-evidence:v2";

export function buildBlankEvidence(): PreTradeEvidence {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    tradeDate: now.toISOString().slice(0, 10),
    symbol: "",
    instrument: "NIFTY OPTION",
    side: "",
    quantity: 1,
    setupName: "",
    timeframe: "5m",
    entryPlan: "",
    stopLossPlan: "",
    targetPlan: "",
    invalidationReason: "",
    marketContext: "",
    emotionalState: "",
    dhanReadOnlyChecked: false,
    videoRecorded: false,
    voiceRecorded: false,
    screenshotReady: false,
    mcpReadOnlyReviewDone: false,
    oneQtyOnlyConfirmed: false,
    noAutoOrderConfirmed: false,
    finalSelfPermission: false,
  };
}

export function calculateEvidenceGate(evidence?: PreTradeEvidence | null): EvidenceGateResult {
  const reasons: string[] = [];
  let score = 0;
  const total = 14;

  if (!evidence) {
    return {
      status: "BLOCK",
      allowed: false,
      reasons: ["No pre-trade evidence recorded yet."],
      score: 0,
      total,
    };
  }

  const checks: Array<[boolean, string]> = [
    [Boolean(evidence.symbol.trim()), "Symbol is missing."],
    [Boolean(evidence.instrument.trim()), "Instrument is missing."],
    [Boolean(evidence.side), "Trade side is missing."],
    [evidence.quantity === 1, "Quantity must be exactly 1 for July manual live-test."],
    [Boolean(evidence.setupName.trim()), "Setup name is missing."],
    [Boolean(evidence.entryPlan.trim()), "Entry plan is missing."],
    [Boolean(evidence.stopLossPlan.trim()), "Stop-loss plan is missing."],
    [Boolean(evidence.targetPlan.trim()), "Target/exit plan is missing."],
    [Boolean(evidence.invalidationReason.trim()), "Invalidation reason is missing."],
    [Boolean(evidence.marketContext.trim()), "Market context is missing."],
    [evidence.dhanReadOnlyChecked, "Dhan read-only check is not confirmed."],
    [evidence.videoRecorded, "Pre-trade video recording is not confirmed."],
    [evidence.voiceRecorded, "Pre-trade voice recording is not confirmed."],
    [evidence.screenshotReady, "Chart screenshot evidence is not confirmed."],
  ];

  for (const [passed, message] of checks) {
    if (passed) score += 1;
    else reasons.push(message);
  }

  if (!evidence.mcpReadOnlyReviewDone) {
    reasons.push("MCP read-only review confirmation is missing.");
  }

  if (!evidence.oneQtyOnlyConfirmed) {
    reasons.push("One-quantity-only discipline confirmation is missing.");
  }

  if (!evidence.noAutoOrderConfirmed) {
    reasons.push("Manual Dhan only / no auto-order confirmation is missing.");
  }

  if (!evidence.finalSelfPermission) {
    reasons.push("Final self-permission is not confirmed.");
  }

  const allowed = reasons.length === 0;

  return {
    status: allowed ? "PASS" : "BLOCK",
    allowed,
    reasons,
    score,
    total,
  };
}

export function loadEvidenceList(): PreTradeEvidence[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(EVIDENCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadLatestEvidence(): PreTradeEvidence | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LATEST_EVIDENCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreTradeEvidence;
  } catch {
    return null;
  }
}

export function saveEvidence(evidence: PreTradeEvidence): void {
  if (typeof window === "undefined") return;

  const current = loadEvidenceList();
  const next = [evidence, ...current.filter((item) => item.id !== evidence.id)].slice(0, 50);

  window.localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(next));
  window.localStorage.setItem(LATEST_EVIDENCE_KEY, JSON.stringify(evidence));
}
