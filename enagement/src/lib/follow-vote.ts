import type { EngagementPoll } from "@/lib/queries/hooks";

export type MatchSignalLean = {
  id: string;
  matchId: string;
  headline: string;
  prediction: string;
  confidence: number;
  type: string;
};

/** Majority side from live crowd share. */
export function crowdChoice(poll: EngagementPoll): "yes" | "no" {
  return poll.probability >= 0.5 ? "yes" : "no";
}

/**
 * Map AgentX "next goal" style signals onto YES/NO engagement polls.
 * Goal windows → agent expects a goal soon = YES.
 * Yellow / other → lean YES when confidence is high and type is bullish.
 */
export function agentChoice(
  poll: EngagementPoll,
  signal: MatchSignalLean | null,
): { choice: "yes" | "no"; reason: string } | null {
  if (!signal) return null;

  const q = poll.question.toLowerCase();
  const pred = `${signal.headline} ${signal.prediction}`.toLowerCase();
  const aboutGoal = /goal|score|net/.test(q);
  const aboutYellow = /yellow|card|booking/.test(q);
  const signalGoal = /goal|score/.test(pred);
  const confidence = Number(signal.confidence) || 0;

  if (aboutGoal && signalGoal) {
    return {
      choice: "yes",
      reason: signal.headline,
    };
  }

  if (aboutYellow) {
    // Agents currently lean on scoring pressure, not cards — soft lean.
    if (confidence >= 55) {
      return {
        choice: "yes",
        reason: "High-pressure window — agent sees chaos",
      };
    }
    return {
      choice: "no",
      reason: "Agent is watching goals, not bookings",
    };
  }

  if (signal.type === "bullish" && confidence >= 48) {
    return { choice: "yes", reason: signal.headline };
  }

  return { choice: "no", reason: signal.headline };
}
