export type AssistantDecision = "PASS" | "WAIT" | "BLOCK";

export type ReadOnlyAssistantInput = {
  symbol: string;
  direction: string;
  setup: string;
  marketContext: string;
  entryPlan: string;
  stopLoss: string;
  target: string;
  emotion: string;
};

export type ReadOnlyAssistantResult = {
  decision: AssistantDecision;
  score: number;
  reasons: string[];
  checklist: string[];
  finalMessage: string;
};

export function reviewTradeIdea(input: ReadOnlyAssistantInput): ReadOnlyAssistantResult {
  const reasons: string[] = [];
  const checklist: string[] = [];
  let score = 0;

  const requiredChecks: Array<[boolean, string, string]> = [
    [Boolean(input.symbol.trim()), "Symbol present", "Symbol is missing."],
    [Boolean(input.direction.trim()), "Direction present", "Direction is missing."],
    [Boolean(input.setup.trim()), "Setup defined", "Setup is missing."],
    [Boolean(input.marketContext.trim()), "Market context written", "Market context is missing."],
    [Boolean(input.entryPlan.trim()), "Entry plan written", "Entry plan is missing."],
    [Boolean(input.stopLoss.trim()), "Stop-loss defined", "Stop-loss is missing."],
    [Boolean(input.target.trim()), "Target/exit defined", "Target or exit plan is missing."],
    [Boolean(input.emotion.trim()), "Emotion checked", "Emotional state is missing."],
  ];

  for (const [passed, okText, failText] of requiredChecks) {
    if (passed) {
      score += 1;
      checklist.push("✅ " + okText);
    } else {
      reasons.push(failText);
      checklist.push("❌ " + failText);
    }
  }

  const emotionalText = input.emotion.toLowerCase();

  if (
    emotionalText.includes("revenge") ||
    emotionalText.includes("angry") ||
    emotionalText.includes("panic") ||
    emotionalText.includes("fomo") ||
    emotionalText.includes("recover")
  ) {
    reasons.push("Emotion risk detected. Do not trade in revenge/FOMO/recovery mode.");
  }

  if (input.entryPlan.length < 20) {
    reasons.push("Entry plan is too short. Write exact trigger before entry.");
  }

  if (input.stopLoss.length < 10) {
    reasons.push("Stop-loss explanation is weak.");
  }

  let decision: AssistantDecision = "PASS";

  if (reasons.length >= 3) {
    decision = "BLOCK";
  } else if (reasons.length > 0) {
    decision = "WAIT";
  }

  return {
    decision,
    score,
    reasons,
    checklist,
    finalMessage:
      decision === "PASS"
        ? "Read-only review passed. Manual Dhan execution only, strictly 1 quantity / 1 lot."
        : decision === "WAIT"
          ? "Wait. Improve the trade plan before taking action."
          : "Blocked. Do not take this trade.",
  };
}
