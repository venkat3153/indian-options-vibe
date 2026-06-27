export type DisciplineInput = {
  todayTrades: number;
  maxTrades: number;
  todayLossR: number;
  maxLossR: number;
  hasOpenPosition: boolean;
  emotion: string;
  oneQtyConfirmed: boolean;
  manualOnlyConfirmed: boolean;
  cooldownUntil?: string;
};

export type DisciplineResult = {
  allowed: boolean;
  status: "ALLOWED" | "BLOCKED";
  reasons: string[];
};

export function calculateTradeDisciplineLock(input: DisciplineInput): DisciplineResult {
  const reasons: string[] = [];

  if (input.todayTrades >= input.maxTrades) {
    reasons.push("Max trades reached for today.");
  }

  if (input.todayLossR <= -Math.abs(input.maxLossR)) {
    reasons.push("Daily loss limit hit. Trading must stop.");
  }

  if (input.hasOpenPosition) {
    reasons.push("Open position exists. Do not stack trades.");
  }

  if (input.cooldownUntil) {
    const cooldownTime = new Date(input.cooldownUntil).getTime();

    if (!Number.isNaN(cooldownTime) && cooldownTime > Date.now()) {
      reasons.push("Cooldown is active. Do not take another trade yet.");
    }
  }

  const emotion = input.emotion.toLowerCase();

  if (
    emotion.includes("revenge") ||
    emotion.includes("fomo") ||
    emotion.includes("panic") ||
    emotion.includes("angry") ||
    emotion.includes("recover")
  ) {
    reasons.push("Emotion risk detected. No trade in revenge/FOMO/recovery mode.");
  }

  if (!input.oneQtyConfirmed) {
    reasons.push("One quantity / one lot confirmation missing.");
  }

  if (!input.manualOnlyConfirmed) {
    reasons.push("Manual Dhan only confirmation missing.");
  }

  return {
    allowed: reasons.length === 0,
    status: reasons.length === 0 ? "ALLOWED" : "BLOCKED",
    reasons,
  };
}
