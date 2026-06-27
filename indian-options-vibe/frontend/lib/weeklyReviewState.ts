export type WeeklyReviewState = {
  weekLabel: string;
  totalTrades: number;
  ruleBreaks: number;
  fomoTrades: number;
  revengeTrades: number;
  oneQtyRespected: boolean;
  manualOnlyRespected: boolean;
  bestTradeLesson: string;
  worstTradeLesson: string;
  nextWeekFocus: string;
  nextWeekMode: "NORMAL" | "REDUCED" | "NO_TRADE_FIRST_DAY";
  savedAt: string;
};

export const WEEKLY_REVIEW_KEY = "indian-options-vibe:weekly-review-state:v1";

export function defaultWeeklyReviewState(): WeeklyReviewState {
  return {
    weekLabel: "",
    totalTrades: 0,
    ruleBreaks: 0,
    fomoTrades: 0,
    revengeTrades: 0,
    oneQtyRespected: true,
    manualOnlyRespected: true,
    bestTradeLesson: "",
    worstTradeLesson: "",
    nextWeekFocus: "",
    nextWeekMode: "NORMAL",
    savedAt: "",
  };
}

export function loadWeeklyReviewState(): WeeklyReviewState {
  if (typeof window === "undefined") return defaultWeeklyReviewState();

  try {
    const raw = window.localStorage.getItem(WEEKLY_REVIEW_KEY);
    if (!raw) return defaultWeeklyReviewState();

    return {
      ...defaultWeeklyReviewState(),
      ...(JSON.parse(raw) as WeeklyReviewState),
    };
  } catch {
    return defaultWeeklyReviewState();
  }
}

export function saveWeeklyReviewState(state: WeeklyReviewState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    WEEKLY_REVIEW_KEY,
    JSON.stringify({
      ...state,
      savedAt: new Date().toISOString(),
    })
  );
}
