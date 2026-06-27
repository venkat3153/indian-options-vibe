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

export function calculateEvidenceGate(evidence?: PreTradeEvidence | null) {
  const reasons: string[] = [];

  if (!evidence) {
    return {
      allowed: false,
      status: "BLOCK" as const,
      score: 0,
      reasons: ["No pre-trade evidence saved for today."],
    };
  }

  if (!evidence.symbol?.trim()) reasons.push("Symbol is missing.");
  if (!evidence.side?.trim()) reasons.push("Trade side is missing.");
  if (!evidence.setupName?.trim()) reasons.push("Setup name is missing.");
  if (!evidence.entryPlan?.trim()) reasons.push("Entry plan is missing.");
  if (!evidence.stopLossPlan?.trim()) reasons.push("Stop-loss plan is missing.");
  if (!evidence.targetExitPlan?.trim()) reasons.push("Target/exit plan is missing.");
  if (!evidence.invalidationReason?.trim()) reasons.push("Invalidation reason is missing.");
  if (!evidence.marketContext?.trim()) reasons.push("Market context is missing.");

  if (!evidence.dhanReadOnlyChecked) {
    reasons.push("Dhan read-only check is not confirmed.");
  }

  if (!evidence.oneQuantityOnlyConfirmed) {
    reasons.push("One-quantity-only discipline confirmation is missing.");
  }

  if (!evidence.manualDhanOnlyConfirmed) {
    reasons.push("Manual Dhan only / no auto-order confirmation is missing.");
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    status: allowed ? ("READY" as const) : ("BLOCK" as const),
    score: allowed ? 100 : Math.max(0, 100 - reasons.length * 10),
    reasons,
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
