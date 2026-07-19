import {
  createMomentFromGoal,
  createPoll,
  resolveExpiredPollsFromEvents,
  resolvePollsOnTxlineEvent,
} from "../repositories/engagement";
import { maybeOne, query } from "../db/postgres";
import { hasDatabase } from "../config/env";

const SEVEN_MIN = 420;

type PollKind =
  | "goal_in_window"
  | "yellow_in_window"
  | "goal_before_ht"
  | "hold_lead"
  | "corner_in_window";

const LIVE_MICROS: { text: string; kind: PollKind; windowLabel: string; windowSeconds: number }[] = [
  {
    text: "Will there be a goal in the next 7 minutes?",
    kind: "goal_in_window",
    windowLabel: "Next 7 min",
    windowSeconds: SEVEN_MIN,
  },
  {
    text: "Will there be a yellow card in the next 7 minutes?",
    kind: "yellow_in_window",
    windowLabel: "Next 7 min",
    windowSeconds: SEVEN_MIN,
  },
  {
    text: "Will the next event be a corner?",
    kind: "corner_in_window",
    windowLabel: "Next 7 min",
    windowSeconds: SEVEN_MIN,
  },
];

const SECONDARY: { text: string; kind: PollKind; windowLabel: string; windowSeconds: number }[] = [
  {
    text: "Will there be another goal before half-time?",
    kind: "goal_before_ht",
    windowLabel: "Before HT",
    windowSeconds: SEVEN_MIN,
  },
  {
    text: "Will the scoring team hold the lead at full time?",
    kind: "hold_lead",
    windowLabel: "To full time",
    windowSeconds: SEVEN_MIN,
  },
];

const MOMENT_TITLE_SUFFIXES = ["Strike", "Finish", "Curler", "Header", "Thunderbolt", "Clinical"] as const;

function pickAfterGoal(minute: number) {
  if (minute < 45) return SECONDARY[0]!;
  if (minute < 70) return LIVE_MICROS[0]!;
  return SECONDARY[1]!;
}

function pickRotatingMicro(salt: string) {
  let hash = 0;
  for (let i = 0; i < salt.length; i++) hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  return LIVE_MICROS[hash % LIVE_MICROS.length]!;
}

function cinematicMomentTitle(player: string | undefined, minute: number | undefined, eventKey: string): string {
  let hash = 0;
  for (let i = 0; i < eventKey.length; i++) hash = (hash * 31 + eventKey.charCodeAt(i)) >>> 0;
  const suffix = MOMENT_TITLE_SUFFIXES[hash % MOMENT_TITLE_SUFFIXES.length]!;
  const m = minute ?? 0;
  if (player && m > 0) return `The ${m}' ${suffix}`;
  if (player) return `${player.split(" ").pop() ?? player} ${suffix}`;
  if (m > 0) return `The ${m}' ${suffix}`;
  return `Match ${suffix}`;
}

export async function maybeOnGoalEngagement(params: {
  matchId: string;
  matchExternalId: string;
  eventKey: string;
  player?: string;
  minute?: number;
}): Promise<void> {
  const picked = pickAfterGoal(params.minute ?? 0);
  await createPoll({
    matchId: params.matchId,
    eventKey: `poll_${params.eventKey}`,
    question: picked.text,
    resolutionKind: picked.kind,
    windowLabel: picked.windowLabel,
    windowSeconds: picked.windowSeconds,
  });

  await createMomentFromGoal({
    matchId: params.matchId,
    eventKey: params.eventKey,
    title: cinematicMomentTitle(params.player, params.minute, params.eventKey),
    player: params.player,
    minute: params.minute,
  });

  await resolveOpenGoalWindowPolls(params.matchId);
}

export async function maybeOnYellowEngagement(params: {
  matchId: string;
  eventKey: string;
}): Promise<void> {
  await resolvePollsOnTxlineEvent(params.matchId, "yellow");

  const open = await maybeOne<{ id: string }>(
    `
      select id from engagement_polls
      where match_id = $1 and outcome is null and closes_at > now()
      limit 1
    `,
    [params.matchId],
  );
  if (open) return;

  const picked = LIVE_MICROS[0]!;
  await createPoll({
    matchId: params.matchId,
    eventKey: `poll_after_yellow_${params.eventKey}`,
    question: picked.text,
    resolutionKind: picked.kind,
    windowLabel: picked.windowLabel,
    windowSeconds: picked.windowSeconds,
  });
}

/** Resolve polls that asked about a goal in their window when a goal just arrived. */
export async function resolveOpenGoalWindowPolls(matchId: string): Promise<void> {
  await resolvePollsOnTxlineEvent(matchId, "goal");
}

/** Ensure live matches always have at least one open 7-min XP micro. */
export async function ensureOpenLivePolls(): Promise<number> {
  if (!hasDatabase()) return 0;

  const liveMatches = await query<{ id: string; external_id: string; minute: number | null }>(
    `
      select id, external_id, minute
      from matches
      where status in ('live', 'halftime')
      order by kickoff desc nulls last
      limit 12
    `,
  );

  let created = 0;
  for (const match of liveMatches) {
    const open = await maybeOne<{ id: string }>(
      `
        select id from engagement_polls
        where match_id = $1 and outcome is null and closes_at > now()
        limit 1
      `,
      [match.id],
    );
    if (open) continue;

    const bucket = Math.floor(Date.now() / (SEVEN_MIN * 1000));
    const picked = pickRotatingMicro(`${match.external_id}:${bucket}:${match.minute ?? 0}`);
    await createPoll({
      matchId: match.id,
      eventKey: `live_micro_${match.external_id}_${bucket}_${picked.kind}`,
      question: picked.text,
      resolutionKind: picked.kind,
      windowLabel: picked.windowLabel,
      windowSeconds: picked.windowSeconds,
    });
    created += 1;
  }
  return created;
}

export async function syncEngagementPolls(): Promise<number> {
  const resolved = await resolveExpiredPollsFromEvents();
  const opened = await ensureOpenLivePolls();
  return resolved + opened;
}
