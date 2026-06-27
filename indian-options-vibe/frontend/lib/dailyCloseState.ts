export type DailyCloseState = {
  date: string;
  followedPlan: boolean;
  respectedOneQty: boolean;
  respectedManualOnly: boolean;
  overtraded: boolean;
  revengeOrFomo: boolean;
  stoppedOnRule: boolean;
  lesson: string;
  tomorrowMode: "NORMAL" | "REDUCED" | "NO_TRADE";
  savedAt: string;
};

export const DAILY_CLOSE_KEY = "indian-options-vibe:daily-close-state:v1";

export function todayCloseKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function defaultDailyCloseState(): DailyCloseState {
  return {
    date: todayCloseKey(),
    followedPlan: false,
    respectedOneQty: true,
    respectedManualOnly: true,
    overtraded: false,
    revengeOrFomo: false,
    stoppedOnRule: false,
    lesson: "",
    tomorrowMode: "NORMAL",
    savedAt: "",
  };
}

export function loadDailyCloseState(): DailyCloseState {
  if (typeof window === "undefined") return defaultDailyCloseState();

  try {
    const raw = window.localStorage.getItem(DAILY_CLOSE_KEY);
    if (!raw) return defaultDailyCloseState();

    const parsed = JSON.parse(raw) as DailyCloseState;

    if (parsed.date !== todayCloseKey()) {
      return defaultDailyCloseState();
    }

    return {
      ...defaultDailyCloseState(),
      ...parsed,
      date: todayCloseKey(),
    };
  } catch {
    return defaultDailyCloseState();
  }
}

export function saveDailyCloseState(state: DailyCloseState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    DAILY_CLOSE_KEY,
    JSON.stringify({
      ...state,
      date: todayCloseKey(),
      savedAt: new Date().toISOString(),
    })
  );
}
