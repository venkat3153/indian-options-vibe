export type DailyRiskState = {
  date: string;
  todayTrades: number;
  maxTrades: number;
  todayLossR: number;
  maxLossR: number;
  emotion: string;
  lockedManually: boolean;
};

export const DAILY_RISK_KEY = "indian-options-vibe:daily-risk-state:v1";

export function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function defaultDailyRiskState(): DailyRiskState {
  return {
    date: todayKey(),
    todayTrades: 0,
    maxTrades: 1,
    todayLossR: 0,
    maxLossR: 2,
    emotion: "",
    lockedManually: false,
  };
}

export function loadDailyRiskState(): DailyRiskState {
  if (typeof window === "undefined") return defaultDailyRiskState();

  try {
    const raw = window.localStorage.getItem(DAILY_RISK_KEY);
    if (!raw) return defaultDailyRiskState();

    const parsed = JSON.parse(raw) as DailyRiskState;

    if (parsed.date !== todayKey()) {
      return defaultDailyRiskState();
    }

    return {
      ...defaultDailyRiskState(),
      ...parsed,
      date: todayKey(),
    };
  } catch {
    return defaultDailyRiskState();
  }
}

export function saveDailyRiskState(state: DailyRiskState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    DAILY_RISK_KEY,
    JSON.stringify({
      ...state,
      date: todayKey(),
    })
  );
}
