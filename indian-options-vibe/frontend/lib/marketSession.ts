export type MarketSessionStatus = {
  isOpen: boolean;
  label: "OPEN" | "CLOSED";
  reason: string;
  istTime: string;
};

function getIstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function getMarketSessionStatus(date = new Date()): MarketSessionStatus {
  const { weekday, hour, minute } = getIstParts(date);
  const minutes = hour * 60 + minute;

  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  const istTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  if (isWeekend) {
    return {
      isOpen: false,
      label: "CLOSED",
      reason: "Weekend. NSE live permission is blocked.",
      istTime,
    };
  }

  if (minutes < marketOpen) {
    return {
      isOpen: false,
      label: "CLOSED",
      reason: "Before NSE market open. Live permission is blocked.",
      istTime,
    };
  }

  if (minutes > marketClose) {
    return {
      isOpen: false,
      label: "CLOSED",
      reason: "After NSE market close. Live permission is blocked.",
      istTime,
    };
  }

  return {
    isOpen: true,
    label: "OPEN",
    reason: "NSE market session is open.",
    istTime,
  };
}
