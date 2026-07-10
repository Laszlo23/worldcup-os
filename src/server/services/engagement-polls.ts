import { createMomentFromGoal, createPoll, resolveExpiredPollsFromEvents } from "../repositories/engagement";

const GOAL_QUESTIONS = [
  { text: "Will there be another goal before half-time?", kind: "goal_before_ht" as const },
  { text: "Will the scoring team hold the lead at full time?", kind: "hold_lead" as const },
  { text: "Will there be a goal in the next 2 minutes?", kind: "goal_in_window" as const },
  { text: "Will the next event be a corner?", kind: "corner_in_window" as const },
];

function pickQuestion(minute: number) {
  if (minute < 45) return GOAL_QUESTIONS[0]!;
  if (minute < 70) return GOAL_QUESTIONS[2]!;
  return GOAL_QUESTIONS[1]!;
}

export async function maybeOnGoalEngagement(params: {
  matchId: string;
  matchExternalId: string;
  eventKey: string;
  player?: string;
  minute?: number;
}): Promise<void> {
  const picked = pickQuestion(params.minute ?? 0);
  await createPoll({
    matchId: params.matchId,
    eventKey: `poll_${params.eventKey}`,
    question: picked.text,
    resolutionKind: picked.kind,
    windowLabel: picked.kind === "goal_in_window" ? "Next 2 min" : "Live window",
    windowSeconds: picked.kind === "goal_in_window" ? 120 : 180,
  });

  await createMomentFromGoal({
    matchId: params.matchId,
    eventKey: params.eventKey,
    title: params.player ? `${params.player} Moment` : "Match Moment",
    player: params.player,
    minute: params.minute,
  });

  await resolveOpenGoalWindowPolls(params.matchId);
}

/** Resolve polls that asked about a goal in their window when a goal just arrived. */
export async function resolveOpenGoalWindowPolls(matchId: string): Promise<void> {
  const { resolvePollsOnTxlineEvent } = await import("../repositories/engagement");
  await resolvePollsOnTxlineEvent(matchId, "goal");
}

export async function syncEngagementPolls(): Promise<number> {
  return resolveExpiredPollsFromEvents();
}
