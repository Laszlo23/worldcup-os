import { syncPassportXpLedger } from "./superfan";
import { hasDatabase, LiveDataRequiredError } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";

function requireDatabase(): void {
  if (!hasDatabase()) throw new LiveDataRequiredError();
}

async function mirrorPassportXp(userId: string, xpDelta: number, reason: string): Promise<void> {
  const user = await maybeOne<{ wallet_pubkey: string }>("select wallet_pubkey from users where id = $1", [userId]);
  if (user) await syncPassportXpLedger(user.wallet_pubkey, xpDelta, reason);
}

export type EngagementPollRow = {
  id: string;
  external_id: string;
  match_id: string;
  match_external_id: string;
  event_key: string;
  question: string;
  window_label: string;
  window_seconds: number;
  closes_at: string;
  yes_reward: number;
  no_reward: number;
  outcome: "yes" | "no" | "void" | null;
  resolved_at: string | null;
  resolution_kind: string | null;
};

export type EngagementMomentRow = {
  id: string;
  external_id: string;
  match_id: string;
  match_external_id: string;
  title: string;
  player: string | null;
  minute: number | null;
  rarity: string;
  image_url: string | null;
  serial_label: string | null;
  claimed: boolean;
};

export type EngagementPassport = {
  xp: number;
  level: number;
  streak: number;
  predictionsTotal: number;
  predictionsWon: number;
  momentsClaimed: number;
  stadiumVerified: number;
  achievements: { id: string; title: string; unlocked: boolean }[];
};

const REWARD_CATALOG = [
  { id: "reward-jersey", title: "Signed Jersey Raffle", xp: 500, category: "merch" },
  { id: "reward-vip", title: "VIP Watch Party", xp: 1200, category: "experience" },
  { id: "reward-boots", title: "Boots Drop Entry", xp: 800, category: "merch" },
] as const;

export function listRewardCatalog() {
  return REWARD_CATALOG.map((r) => ({ ...r }));
}

export async function ensurePassport(userId: string): Promise<void> {
  requireDatabase();
  await query(
    `
      insert into engagement_passports (user_id)
      values ($1)
      on conflict (user_id) do nothing
    `,
    [userId],
  );
}

export async function getPassport(userId: string): Promise<EngagementPassport> {
  requireDatabase();
  await ensurePassport(userId);
  const row = await one<{
    xp: number;
    level: number;
    streak: number;
    predictions_total: number;
    predictions_won: number;
    moments_claimed: number;
    stadium_verified: number;
  }>("select * from engagement_passports where user_id = $1", [userId]);

  const stickerCount = await countUserStickers(userId);
  const growthSetComplete = await hasSetCompletion(userId, "set-growth");

  const achievements = [
    { id: "first-predict", title: "First Prediction", unlocked: row.predictions_total > 0 },
    { id: "streak-3", title: "3-Win Streak", unlocked: row.streak >= 3 },
    { id: "sticker-collector", title: "Sticker Collector", unlocked: row.moments_claimed >= 1 || stickerCount > 0 },
    { id: "stadium-proof", title: "Stadium Verified", unlocked: row.stadium_verified > 0 },
    { id: "xp-500", title: "500 XP Club", unlocked: row.xp >= 500 },
    { id: "sticker-collector-5", title: "5 Stickers Earned", unlocked: stickerCount >= 5 },
    { id: "set-growth-complete", title: "Growth Squad Complete", unlocked: growthSetComplete },
  ];

  return {
    xp: row.xp,
    level: row.level,
    streak: row.streak,
    predictionsTotal: row.predictions_total,
    predictionsWon: row.predictions_won,
    momentsClaimed: row.moments_claimed,
    stadiumVerified: row.stadium_verified,
    achievements,
  };
}

export async function listPolls(matchExternalId?: string): Promise<EngagementPollRow[]> {
  requireDatabase();
  const rows = await query<EngagementPollRow & { match_external_id: string }>(
    `
      select p.*, m.external_id as match_external_id
      from engagement_polls p
      join matches m on m.id = p.match_id
      where ($1::text is null or m.external_id = $1)
        and p.closes_at > now() - interval '5 minutes'
      order by p.closes_at desc
      limit 20
    `,
    [matchExternalId ?? null],
  );
  return rows;
}

export async function createPoll(params: {
  matchId: string;
  eventKey: string;
  question: string;
  windowLabel?: string;
  windowSeconds?: number;
  yesReward?: number;
  noReward?: number;
  resolutionKind?: string;
}): Promise<string | null> {
  requireDatabase();
  const externalId = `poll_${params.eventKey.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48)}`;
  const windowSeconds = params.windowSeconds ?? 120;
  const closesAt = new Date(Date.now() + windowSeconds * 1000).toISOString();

  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_polls where match_id = $1 and event_key = $2",
    [params.matchId, params.eventKey],
  );
  if (existing) return null;

  const row = await one<{ id: string }>(
    `
      insert into engagement_polls (
        external_id, match_id, event_key, question, window_label,
        window_seconds, closes_at, yes_reward, no_reward, resolution_kind
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning id
    `,
    [
      externalId,
      params.matchId,
      params.eventKey,
      params.question,
      params.windowLabel ?? "Next 2 min",
      windowSeconds,
      closesAt,
      params.yesReward ?? 25,
      params.noReward ?? 15,
      params.resolutionKind ?? inferResolutionKind(params.question),
    ],
  );
  return row.id;
}

function inferResolutionKind(question: string): string {
  if (question.includes("corner")) return "corner_in_window";
  if (question.includes("next 2 minutes")) return "goal_in_window";
  if (question.includes("before half")) return "goal_before_ht";
  if (question.includes("hold the lead")) return "hold_lead";
  return "goal_in_window";
}

export async function voteOnPoll(userId: string, pollExternalId: string, choice: "yes" | "no"): Promise<{
  ok: boolean;
  reason?: string;
  newSticker?: StickerDef;
}> {
  requireDatabase();
  const poll = await maybeOne<{ id: string; closes_at: string; outcome: string | null }>(
    "select id, closes_at, outcome from engagement_polls where external_id = $1",
    [pollExternalId],
  );
  if (!poll) return { ok: false, reason: "poll_not_found" };
  if (poll.outcome) return { ok: false, reason: "poll_resolved" };
  if (new Date(poll.closes_at).getTime() < Date.now()) return { ok: false, reason: "poll_closed" };

  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_poll_votes where poll_id = $1 and user_id = $2",
    [poll.id, userId],
  );
  if (existing) return { ok: false, reason: "already_voted" };

  const before = await maybeOne<{ predictions_total: number }>(
    "select predictions_total from engagement_passports where user_id = $1",
    [userId],
  );

  await query(
    "insert into engagement_poll_votes (poll_id, user_id, choice) values ($1, $2, $3)",
    [poll.id, userId, choice],
  );
  await ensurePassport(userId);
  await query(
    "update engagement_passports set predictions_total = predictions_total + 1, updated_at = now() where user_id = $1",
    [userId],
  );

  let newSticker: StickerAwardResult | null = null;
  if ((before?.predictions_total ?? 0) === 0) {
    newSticker = await awardStickerIfEligible(userId, "first_predict", pollExternalId);
  }

  return { ok: true, newSticker: newSticker?.awarded ? newSticker.sticker : undefined };
}

export async function resolvePoll(pollId: string, outcome: "yes" | "no" | "void"): Promise<void> {
  requireDatabase();
  const poll = await maybeOne<{ yes_reward: number; no_reward: number }>(
    "select yes_reward, no_reward from engagement_polls where id = $1 and outcome is null",
    [pollId],
  );
  if (!poll) return;

  await query(
    "update engagement_polls set outcome = $2, resolved_at = now() where id = $1",
    [pollId, outcome],
  );

  if (outcome === "void") return;

  const votes = await query<{ user_id: string; choice: string }>(
    "select user_id, choice from engagement_poll_votes where poll_id = $1",
    [pollId],
  );

  for (const vote of votes) {
    const won = vote.choice === outcome;
    const xp = won ? (outcome === "yes" ? poll.yes_reward : poll.no_reward) : 0;
    await query(
      "update engagement_poll_votes set xp_awarded = $3 where poll_id = $1 and user_id = $2",
      [pollId, vote.user_id, xp],
    );
    if (xp > 0) {
      await ensurePassport(vote.user_id);
      await query(
        `
          update engagement_passports
          set xp = xp + $2,
              predictions_won = predictions_won + 1,
              streak = streak + 1,
              level = greatest(1, floor((xp + $2) / 250) + 1),
              updated_at = now()
          where user_id = $1
        `,
        [vote.user_id, xp],
      );
      await mirrorPassportXp(vote.user_id, xp, `poll-${pollId}`);
      await awardStickerIfEligible(vote.user_id, "poll_win", pollId);
      const streakRow = await maybeOne<{ streak: number }>(
        "select streak from engagement_passports where user_id = $1",
        [vote.user_id],
      );
      if ((streakRow?.streak ?? 0) >= 3) {
        await awardStickerIfEligible(vote.user_id, "streak_3", pollId);
      }
    } else {
      await query(
        "update engagement_passports set streak = 0, updated_at = now() where user_id = $1",
        [vote.user_id],
      );
    }
  }
}

export async function listMoments(matchExternalId?: string, userId?: string): Promise<EngagementMomentRow[]> {
  requireDatabase();
  const rows = await query<EngagementMomentRow & { match_external_id: string; claimed: boolean }>(
    `
      select
        em.*,
        m.external_id as match_external_id,
        case
          when $2::uuid is null then false
          else exists (
            select 1 from engagement_moment_claims c
            where c.moment_id = em.id and c.user_id = $2
          )
        end as claimed
      from engagement_moments em
      join matches m on m.id = em.match_id
      where ($1::text is null or m.external_id = $1)
      order by em.created_at desc
      limit 50
    `,
    [matchExternalId ?? null, userId ?? null],
  );
  return rows;
}

export async function createMomentFromGoal(params: {
  matchId: string;
  eventKey: string;
  title: string;
  player?: string;
  minute?: number;
  imageUrl?: string;
}): Promise<void> {
  requireDatabase();
  const externalId = `moment_${params.eventKey.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48)}`;
  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_moments where match_id = $1 and event_key = $2",
    [params.matchId, params.eventKey],
  );
  if (existing) return;

  const serial = `#${Math.floor(1000 + Math.random() * 9000)}`;
  await query(
    `
      insert into engagement_moments (
        external_id, match_id, event_key, title, player, minute, rarity, image_url, serial_label
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      externalId,
      params.matchId,
      params.eventKey,
      params.title,
      params.player ?? null,
      params.minute ?? null,
      "Rare",
      params.imageUrl ?? "/moment-volley.jpg",
      serial,
    ],
  );
}

export async function recordMomentClaim(params: {
  userId: string;
  momentExternalId: string;
  txSignature: string;
  metadataUri?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  requireDatabase();
  const moment = await maybeOne<{ id: string }>(
    "select id from engagement_moments where external_id = $1",
    [params.momentExternalId],
  );
  if (!moment) return { ok: false, reason: "moment_not_found" };

  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_moment_claims where moment_id = $1 and user_id = $2",
    [moment.id, params.userId],
  );
  if (existing) return { ok: false, reason: "already_claimed" };

  await query(
    `
      insert into engagement_moment_claims (moment_id, user_id, tx_signature, metadata_uri)
      values ($1, $2, $3, $4)
    `,
    [moment.id, params.userId, params.txSignature, params.metadataUri ?? null],
  );
  await ensurePassport(params.userId);
  await query(
    "update engagement_passports set moments_claimed = moments_claimed + 1, xp = xp + 50, updated_at = now() where user_id = $1",
    [params.userId],
  );
  await mirrorPassportXp(params.userId, 50, "moment-claim");
  const claimedRow = await maybeOne<{ moments_claimed: number }>(
    "select moments_claimed from engagement_passports where user_id = $1",
    [params.userId],
  );
  if ((claimedRow?.moments_claimed ?? 0) >= 5) {
    await awardStickerIfEligible(params.userId, "moments_5", moment.id);
  }
  return { ok: true };
}

export async function recordStadiumProof(params: {
  userId: string;
  matchId: string;
  txSignature?: string;
}): Promise<void> {
  requireDatabase();
  await query(
    `
      insert into engagement_stadium_proofs (user_id, match_id, tx_signature)
      values ($1, $2, $3)
      on conflict (user_id, match_id)
      do update set tx_signature = coalesce(excluded.tx_signature, engagement_stadium_proofs.tx_signature),
                    verified_at = now()
    `,
    [params.userId, params.matchId, params.txSignature ?? null],
  );
  await ensurePassport(params.userId);
  await query(
    "update engagement_passports set stadium_verified = stadium_verified + 1, xp = xp + 100, updated_at = now() where user_id = $1",
    [params.userId],
  );
  await mirrorPassportXp(params.userId, 100, "stadium-verify");
  await awardStickerIfEligible(params.userId, "stadium_verify", params.matchId);
}

export async function getStadiumStatus(userId: string, matchId: string): Promise<{ verified: boolean; txSignature?: string }> {
  requireDatabase();
  const row = await maybeOne<{ tx_signature: string | null }>(
    "select tx_signature from engagement_stadium_proofs where user_id = $1 and match_id = $2",
    [userId, matchId],
  );
  return { verified: Boolean(row), txSignature: row?.tx_signature ?? undefined };
}

export async function redeemReward(userId: string, rewardExternalId: string): Promise<{ ok: boolean; reason?: string; xpSpent?: number }> {
  requireDatabase();
  const reward = REWARD_CATALOG.find((r) => r.id === rewardExternalId);
  if (!reward) return { ok: false, reason: "reward_not_found" };

  const passport = await getPassport(userId);
  if (passport.xp < reward.xp) return { ok: false, reason: "insufficient_xp" };

  await query(
    "insert into engagement_reward_redemptions (user_id, reward_external_id, xp_spent) values ($1, $2, $3)",
    [userId, rewardExternalId, reward.xp],
  );
  await query(
    "update engagement_passports set xp = xp - $2, updated_at = now() where user_id = $1",
    [userId, reward.xp],
  );
  return { ok: true, xpSpent: reward.xp };
}

export async function resolvePollsOnTxlineEvent(matchId: string, eventType: "goal" | "corner"): Promise<number> {
  requireDatabase();
  const open = await query<{ id: string; resolution_kind: string | null }>(
    `
      select id, resolution_kind
      from engagement_polls
      where match_id = $1 and outcome is null and closes_at > now()
    `,
    [matchId],
  );
  let resolved = 0;
  for (const poll of open) {
    const kind = poll.resolution_kind ?? "goal_in_window";
    if (eventType === "goal" && (kind === "goal_in_window" || kind === "goal_before_ht")) {
      await resolvePoll(poll.id, "yes");
      resolved += 1;
    }
    if (eventType === "corner" && kind === "corner_in_window") {
      await resolvePoll(poll.id, "yes");
      resolved += 1;
    }
  }
  return resolved;
}

async function eventInPollWindow(
  matchId: string,
  poll: { id: string; created_at: string; closes_at: string; resolution_kind: string | null },
  eventType: string,
): Promise<boolean> {
  const row = await maybeOne<{ count: string }>(
    `
      select count(*)::text as count
      from match_events
      where match_id = $1
        and type = $2
        and created_at >= $3::timestamptz
        and created_at <= $4::timestamptz
    `,
    [matchId, eventType, poll.created_at, poll.closes_at],
  );
  return Number(row?.count ?? 0) > 0;
}

export async function resolveExpiredPollsFromEvents(): Promise<number> {
  requireDatabase();
  const expired = await query<{
    id: string;
    match_id: string;
    created_at: string;
    closes_at: string;
    resolution_kind: string | null;
  }>(
    `
      select id, match_id, created_at, closes_at, resolution_kind
      from engagement_polls
      where outcome is null and closes_at <= now()
      limit 20
    `,
  );

  let resolved = 0;
  for (const poll of expired) {
    const kind = poll.resolution_kind ?? "goal_in_window";

    if (kind === "hold_lead") {
      const match = await maybeOne<{ status: string; score_home: number; score_away: number }>(
        "select status, score_home, score_away from matches where id = $1",
        [poll.match_id],
      );
      if (match?.status !== "finished" && match?.status !== "settled") continue;
      const leadHeld = Number(match.score_home) !== Number(match.score_away);
      await resolvePoll(poll.id, leadHeld ? "yes" : "no");
      resolved += 1;
      continue;
    }

    if (kind === "corner_in_window") {
      const hadCorner = await eventInPollWindow(poll.match_id, poll, "corner");
      await resolvePoll(poll.id, hadCorner ? "yes" : "no");
      resolved += 1;
      continue;
    }

    const hadGoal = await eventInPollWindow(poll.match_id, poll, "goal");
    await resolvePoll(poll.id, hadGoal ? "yes" : "no");
    resolved += 1;
  }
  return resolved;
}

/** @deprecated Use resolveExpiredPollsFromEvents */
export async function resolveExpiredPolls(): Promise<number> {
  return resolveExpiredPollsFromEvents();
}

// --- Sticker album ---

const STICKER_SET_TITLES: Record<string, string> = {
  "set-goals": "Goal Drops",
  "set-matchday": "Matchday Crew",
  "set-growth": "Growth Squad",
};

const SET_COMPLETION_BONUS_XP = 100;

export type StickerDefRow = {
  id: string;
  title: string;
  description: string;
  set_id: string;
  rarity: string;
  image_url: string;
  earn_rule: string;
  xp_reward: number;
  sort_order: number;
};

export type StickerDef = {
  id: string;
  title: string;
  description: string;
  setId: string;
  setTitle: string;
  rarity: string;
  imageUrl: string;
  earnRule: string;
  xpReward: number;
  sortOrder: number;
};

export type StickerAwardResult = {
  awarded: boolean;
  sticker?: StickerDef;
  setCompleted?: boolean;
};

export type AlbumSticker = {
  id: string;
  title: string;
  description: string;
  rarity: string;
  imageUrl: string;
  owned: boolean;
  earnedAt?: string;
  kind: "static" | "moment";
  serial?: string;
  claimed?: boolean;
  matchId?: string;
  player?: string;
  minute?: number;
};

export type StickerAlbumSet = {
  id: string;
  title: string;
  owned: number;
  total: number;
  stickers: AlbumSticker[];
};

function mapStickerDef(row: StickerDefRow): StickerDef {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    setId: row.set_id,
    setTitle: STICKER_SET_TITLES[row.set_id] ?? row.set_id,
    rarity: row.rarity,
    imageUrl: row.image_url,
    earnRule: row.earn_rule,
    xpReward: row.xp_reward,
    sortOrder: row.sort_order,
  };
}

export async function listStickerDefs(): Promise<StickerDef[]> {
  requireDatabase();
  const rows = await query<StickerDefRow>(
    "select * from engagement_sticker_defs order by set_id, sort_order",
  );
  return rows.map(mapStickerDef);
}

async function countUserStickers(userId: string): Promise<number> {
  const row = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_user_stickers where user_id = $1",
    [userId],
  );
  return Number(row?.count ?? 0);
}

async function hasSetCompletion(userId: string, setId: string): Promise<boolean> {
  const row = await maybeOne<{ set_id: string }>(
    "select set_id from engagement_sticker_set_completions where user_id = $1 and set_id = $2",
    [userId, setId],
  );
  return Boolean(row);
}

export async function awardStickerIfEligible(
  userId: string,
  earnRule: string,
  sourceRef?: string,
): Promise<StickerAwardResult> {
  requireDatabase();
  const def = await maybeOne<StickerDefRow>(
    "select * from engagement_sticker_defs where earn_rule = $1",
    [earnRule],
  );
  if (!def) return { awarded: false };

  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_user_stickers where user_id = $1 and sticker_id = $2",
    [userId, def.id],
  );
  if (existing) return { awarded: false };

  await query(
    "insert into engagement_user_stickers (user_id, sticker_id, source_ref) values ($1, $2, $3)",
    [userId, def.id, sourceRef ?? null],
  );
  await ensurePassport(userId);
  await query(
    "update engagement_passports set xp = xp + $2, updated_at = now() where user_id = $1",
    [userId, def.xp_reward],
  );
  await mirrorPassportXp(userId, def.xp_reward, `sticker-${def.id}`);

  const setCompleted = await checkSetCompletion(userId, def.set_id);
  return { awarded: true, sticker: mapStickerDef(def), setCompleted };
}

export async function awardStickerForShare(
  userId: string,
  contentType: string,
  contentId: string,
): Promise<StickerAwardResult | null> {
  const rule =
    contentType === "passport"
      ? "share_passport"
      : contentType === "moment" || contentType.startsWith("moment")
        ? "share_moment"
        : null;
  if (!rule) return null;
  const result = await awardStickerIfEligible(userId, rule, contentId);
  return result.awarded ? result : null;
}

async function checkSetCompletion(userId: string, setId: string): Promise<boolean> {
  if (setId === "set-goals") return false;

  const totalRow = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_sticker_defs where set_id = $1",
    [setId],
  );
  const ownedRow = await maybeOne<{ count: string }>(
    `
      select count(*)::text as count
      from engagement_user_stickers us
      join engagement_sticker_defs sd on sd.id = us.sticker_id
      where us.user_id = $1 and sd.set_id = $2
    `,
    [userId, setId],
  );
  const total = Number(totalRow?.count ?? 0);
  const owned = Number(ownedRow?.count ?? 0);
  if (total === 0 || owned < total) return false;

  const already = await maybeOne<{ set_id: string }>(
    "select set_id from engagement_sticker_set_completions where user_id = $1 and set_id = $2",
    [userId, setId],
  );
  if (already) return false;

  await query(
    "insert into engagement_sticker_set_completions (user_id, set_id) values ($1, $2)",
    [userId, setId],
  );
  await ensurePassport(userId);
  await query(
    "update engagement_passports set xp = xp + $2, updated_at = now() where user_id = $1",
    [userId, SET_COMPLETION_BONUS_XP],
  );
  await mirrorPassportXp(userId, SET_COMPLETION_BONUS_XP, `sticker-set-${setId}`);
  return true;
}

export async function getStickerAlbum(userId: string): Promise<{
  sets: StickerAlbumSet[];
  totalOwned: number;
  recentEarns: AlbumSticker[];
}> {
  requireDatabase();
  const defs = await listStickerDefs();
  const ownedRows = await query<{ sticker_id: string; earned_at: string }>(
    "select sticker_id, earned_at from engagement_user_stickers where user_id = $1",
    [userId],
  );
  const ownedMap = new Map(ownedRows.map((r) => [r.sticker_id, r.earned_at]));

  const staticBySet = new Map<string, AlbumSticker[]>();
  for (const def of defs) {
    const list = staticBySet.get(def.setId) ?? [];
    list.push({
      id: def.id,
      title: def.title,
      description: def.description,
      rarity: def.rarity,
      imageUrl: def.imageUrl,
      owned: ownedMap.has(def.id),
      earnedAt: ownedMap.get(def.id),
      kind: "static",
    });
    staticBySet.set(def.setId, list);
  }

  const momentRows = await query<{
    external_id: string;
    title: string;
    player: string | null;
    minute: number | null;
    rarity: string;
    image_url: string | null;
    serial_label: string | null;
    match_external_id: string;
    claimed: boolean;
    earned_at: string | null;
  }>(
    `
      select
        em.external_id,
        em.title,
        em.player,
        em.minute,
        em.rarity,
        em.image_url,
        em.serial_label,
        m.external_id as match_external_id,
        exists (
          select 1 from engagement_moment_claims c
          where c.moment_id = em.id and c.user_id = $1
        ) as claimed,
        (
          select c.created_at from engagement_moment_claims c
          where c.moment_id = em.id and c.user_id = $1
          limit 1
        ) as earned_at
      from engagement_moments em
      join matches m on m.id = em.match_id
      order by em.created_at desc
      limit 30
    `,
    [userId],
  );

  const goalStickers: AlbumSticker[] = momentRows.map((m) => ({
    id: m.external_id,
    title: m.title,
    description: m.player ? `${m.player} · ${m.minute ?? 0}'` : "Goal drop",
    rarity: m.rarity,
    imageUrl: m.image_url ?? "/moment-volley.jpg",
    owned: m.claimed,
    earnedAt: m.earned_at ?? undefined,
    kind: "moment",
    serial: m.serial_label ?? undefined,
    claimed: m.claimed,
    matchId: m.match_external_id,
    player: m.player ?? undefined,
    minute: m.minute ?? undefined,
  }));

  const goalOwned = goalStickers.filter((s) => s.owned).length;
  const sets: StickerAlbumSet[] = [
    {
      id: "set-goals",
      title: STICKER_SET_TITLES["set-goals"],
      owned: goalOwned,
      total: goalStickers.length,
      stickers: goalStickers,
    },
  ];

  for (const setId of ["set-matchday", "set-growth"] as const) {
    const stickers = staticBySet.get(setId) ?? [];
    sets.push({
      id: setId,
      title: STICKER_SET_TITLES[setId],
      owned: stickers.filter((s) => s.owned).length,
      total: stickers.length,
      stickers,
    });
  }

  const recentEarns = [
    ...ownedRows
      .map((r) => {
        const def = defs.find((d) => d.id === r.sticker_id);
        if (!def) return null;
        return {
          id: def.id,
          title: def.title,
          description: def.description,
          rarity: def.rarity,
          imageUrl: def.imageUrl,
          owned: true,
          earnedAt: r.earned_at,
          kind: "static" as const,
        };
      })
      .filter((s): s is AlbumSticker => s !== null),
    ...goalStickers.filter((s) => s.owned && s.earnedAt),
  ]
    .sort((a, b) => new Date(b.earnedAt ?? 0).getTime() - new Date(a.earnedAt ?? 0).getTime())
    .slice(0, 8);

  const totalOwned = sets.reduce((sum, s) => sum + s.owned, 0);
  return { sets, totalOwned, recentEarns };
}
