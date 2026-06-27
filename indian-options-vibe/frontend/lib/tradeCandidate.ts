export type TradeCandidateSide = "BUY_CE" | "BUY_PE" | "STOCK_BUY" | "STOCK_SELL" | "";

export type TradeCandidate = {
  id: string;
  createdAt: string;
  symbol: string;
  side: TradeCandidateSide;
  setup: string;
  source: "MANUAL" | "SCREENER" | "STOCK_DETAIL" | "FULL_MODEL";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  notes: string;
};

export const TRADE_CANDIDATE_KEY = "indian-options-vibe:trade-candidate:v1";

export function candidateTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function candidateDateKey(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
}

export function isCandidateFromToday(candidate?: TradeCandidate | null) {
  if (!candidate) return false;
  return candidateDateKey(candidate.createdAt) === candidateTodayKey();
}

export function defaultTradeCandidate(): TradeCandidate {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    symbol: "",
    side: "",
    setup: "",
    source: "MANUAL",
    confidence: "LOW",
    notes: "",
  };
}

export function loadTradeCandidate(): TradeCandidate | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TRADE_CANDIDATE_KEY);
    if (!raw) return null;

    const candidate = JSON.parse(raw) as TradeCandidate;

    if (!isCandidateFromToday(candidate)) {
      clearTradeCandidate();
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

export function saveTradeCandidate(candidate: TradeCandidate) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    TRADE_CANDIDATE_KEY,
    JSON.stringify({
      ...candidate,
      createdAt: new Date().toISOString(),
    })
  );
}

export function clearTradeCandidate() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TRADE_CANDIDATE_KEY);
}
