import { syncPassportXpLedger } from "./superfan";
import { hasDatabase, LiveDataRequiredError } from "../config/env";
import { maybeOne, one, query, withTransaction } from "../db/postgres";

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

export type FanSocials = {
  x?: string;
  discord?: string;
  farcaster?: string;
  telegram?: string;
  website?: string;
};

export type EngagementPassport = {
  xp: number;
  level: number;
  streak: number;
  predictionsTotal: number;
  predictionsWon: number;
  momentsClaimed: number;
  stadiumVerified: number;
  xpStaked: number;
  mmBalance: number;
  pendingMm: number;
  displayName: string | null;
  socials: FanSocials;
  evmAddress: string | null;
  humanPassportScore: number | null;
  humanPassportCheckedAt: string | null;
  humanVerified: boolean;
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
    xp_staked?: number;
    mm_balance?: string | number;
    stake_updated_at?: string | null;
    display_name?: string | null;
    socials?: FanSocials | string | null;
    evm_address?: string | null;
    human_passport_score?: string | number | null;
    human_passport_checked_at?: string | null;
  }>("select * from engagement_passports where user_id = $1", [userId]);

  const stickerCount = await countUserStickers(userId);
  const growthSetComplete = await hasSetCompletion(userId, "set-growth");
  const xpStaked = Number(row.xp_staked ?? 0);
  const mmBalance = Number(row.mm_balance ?? 0);
  const pendingMm = computePendingMm(xpStaked, row.stake_updated_at ?? null);
  const socials = parseSocials(row.socials);
  const humanPassportScore =
    row.human_passport_score != null && row.human_passport_score !== ""
      ? Number(row.human_passport_score)
      : null;
  const humanVerified = humanPassportScore != null && humanPassportScore >= 20;

  const achievements = [
    { id: "first-predict", title: "Kickoff Call", unlocked: row.predictions_total > 0 },
    { id: "streak-3", title: "Hat-trick Streak", unlocked: row.streak >= 3 },
    { id: "streak-5", title: "Unstoppable", unlocked: row.streak >= 5 },
    { id: "sticker-collector", title: "Moment Hunter", unlocked: row.moments_claimed >= 1 || stickerCount > 0 },
    { id: "stadium-proof", title: "Pitchside Verified", unlocked: row.stadium_verified > 0 },
    { id: "xp-500", title: "Midfield Maestro", unlocked: row.xp >= 500 },
    { id: "xp-2000", title: "Box-to-Box", unlocked: row.xp >= 2000 },
    { id: "sticker-collector-5", title: "Album Climber", unlocked: stickerCount >= 5 },
    { id: "set-growth-complete", title: "Growth Squad Complete", unlocked: growthSetComplete },
    { id: "clinical-10", title: "Clinical Finisher", unlocked: row.predictions_won >= 10 },
    { id: "season-ticket", title: "Season Ticket", unlocked: row.predictions_total >= 25 },
    { id: "captains-armband", title: "Captain's Armband", unlocked: row.level >= 5 },
    { id: "highlight-reel", title: "Highlight Reel", unlocked: row.moments_claimed >= 3 },
    { id: "stake-miner", title: "XP Miner", unlocked: xpStaked >= 100 || mmBalance > 0 },
    { id: "human-passport", title: "Human Verified", unlocked: humanVerified },
  ];

  return {
    xp: row.xp,
    level: row.level,
    streak: row.streak,
    predictionsTotal: row.predictions_total,
    predictionsWon: row.predictions_won,
    momentsClaimed: row.moments_claimed,
    stadiumVerified: row.stadium_verified,
    xpStaked,
    mmBalance,
    pendingMm,
    displayName: row.display_name?.trim() || null,
    socials,
    evmAddress: row.evm_address?.trim() || null,
    humanPassportScore: Number.isFinite(humanPassportScore as number) ? humanPassportScore : null,
    humanPassportCheckedAt: row.human_passport_checked_at ?? null,
    humanVerified,
    achievements,
  };
}

function parseSocials(raw: FanSocials | string | null | undefined): FanSocials {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return parseSocials(JSON.parse(raw) as FanSocials);
    } catch {
      return {};
    }
  }
  const out: FanSocials = {};
  for (const key of ["x", "discord", "farcaster", "telegram", "website"] as const) {
    const v = raw[key]?.trim();
    if (v) out[key] = v.slice(0, 120);
  }
  return out;
}

export async function updateFanProfile(
  userId: string,
  input: { displayName?: string | null; socials?: FanSocials; evmAddress?: string | null },
): Promise<EngagementPassport> {
  requireDatabase();
  await ensurePassport(userId);
  const displayName =
    input.displayName === undefined
      ? undefined
      : input.displayName?.trim()
        ? input.displayName.trim().slice(0, 40)
        : null;
  const socials = input.socials ? parseSocials(input.socials) : undefined;
  let evmAddress: string | null | undefined = input.evmAddress;
  if (evmAddress !== undefined) {
    const trimmed = evmAddress?.trim() ?? "";
    if (!trimmed) evmAddress = null;
    else if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) throw new Error("Invalid EVM address for Human Passport");
    else evmAddress = trimmed;
  }

  await query(
    `
      update engagement_passports
      set
        display_name = coalesce($2, display_name),
        socials = coalesce($3::jsonb, socials),
        evm_address = case when $4::boolean then $5 else evm_address end,
        updated_at = now()
      where user_id = $1
    `,
    [
      userId,
      displayName === undefined ? null : displayName,
      socials === undefined ? null : JSON.stringify(socials),
      evmAddress !== undefined,
      evmAddress ?? null,
    ],
  );
  // When displayName is explicitly cleared (null), coalesce won't clear — handle separately.
  if (displayName === null) {
    await query("update engagement_passports set display_name = null, updated_at = now() where user_id = $1", [
      userId,
    ]);
  }
  return getPassport(userId);
}

export async function saveHumanPassportScore(
  userId: string,
  score: number | null,
): Promise<EngagementPassport> {
  requireDatabase();
  await ensurePassport(userId);
  const prev = await maybeOne<{ human_passport_score: string | number | null }>(
    "select human_passport_score from engagement_passports where user_id = $1",
    [userId],
  );
  const wasVerified = Number(prev?.human_passport_score ?? 0) >= 20;
  await query(
    `
      update engagement_passports
      set human_passport_score = $2,
          human_passport_checked_at = now(),
          updated_at = now()
      where user_id = $1
    `,
    [userId, score],
  );
  if (!wasVerified && score != null && score >= 20) {
    await grantPassportXp(userId, 150, "human-passport-verified").catch(() => undefined);
  }
  return getPassport(userId);
}

/** Soft MM mining rate: staked XP × 0.05 MM per day. */
const MM_PER_XP_PER_DAY = 0.05;

function computePendingMm(xpStaked: number, stakeUpdatedAt: string | null): number {
  if (xpStaked <= 0 || !stakeUpdatedAt) return 0;
  const ms = Date.now() - new Date(stakeUpdatedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  const days = ms / (24 * 60 * 60 * 1000);
  return Math.round(xpStaked * MM_PER_XP_PER_DAY * days * 1e6) / 1e6;
}

export type EngagementPollListRow = EngagementPollRow & {
  match_external_id: string;
  yes_votes: number;
  no_votes: number;
  user_choice: "yes" | "no" | null;
};

export type UserPollVoteRow = {
  pollExternalId: string;
  matchExternalId: string;
  question: string;
  windowLabel: string;
  choice: "yes" | "no";
  outcome: "yes" | "no" | "void" | null;
  xpAwarded: number;
  txSignature: string | null;
  createdAt: string;
  closesAt: string;
};

/** History of XP poll votes for the signed-in fan. */
export async function listUserPollVotes(userId: string, limit = 40): Promise<UserPollVoteRow[]> {
  requireDatabase();
  const rows = await query<{
    poll_external_id: string;
    match_external_id: string;
    question: string;
    window_label: string;
    choice: "yes" | "no";
    outcome: "yes" | "no" | "void" | null;
    xp_awarded: number;
    tx_signature: string | null;
    created_at: string;
    closes_at: string;
  }>(
    `
      select
        p.external_id as poll_external_id,
        m.external_id as match_external_id,
        p.question,
        p.window_label,
        v.choice,
        p.outcome,
        v.xp_awarded,
        v.tx_signature,
        v.created_at,
        p.closes_at
      from engagement_poll_votes v
      join engagement_polls p on p.id = v.poll_id
      join matches m on m.id = p.match_id
      where v.user_id = $1
      order by v.created_at desc
      limit $2
    `,
    [userId, Math.min(80, Math.max(1, limit))],
  );
  return rows.map((r) => ({
    pollExternalId: r.poll_external_id,
    matchExternalId: r.match_external_id,
    question: r.question,
    windowLabel: r.window_label,
    choice: r.choice,
    outcome: r.outcome,
    xpAwarded: Number(r.xp_awarded ?? 0),
    txSignature: r.tx_signature,
    createdAt: r.created_at,
    closesAt: r.closes_at,
  }));
}

export async function listPolls(
  matchExternalId?: string,
  userId?: string,
): Promise<EngagementPollListRow[]> {
  requireDatabase();
  const rows = await query<EngagementPollListRow>(
    `
      select
        p.*,
        m.external_id as match_external_id,
        coalesce((
          select count(*)::int from engagement_poll_votes v
          where v.poll_id = p.id and v.choice = 'yes'
        ), 0) as yes_votes,
        coalesce((
          select count(*)::int from engagement_poll_votes v
          where v.poll_id = p.id and v.choice = 'no'
        ), 0) as no_votes,
        (
          select v.choice from engagement_poll_votes v
          where v.poll_id = p.id and v.user_id = $2::uuid
          limit 1
        ) as user_choice
      from engagement_polls p
      join matches m on m.id = p.match_id
      where ($1::text is null or m.external_id = $1)
        and p.closes_at > now() - interval '5 minutes'
      order by p.closes_at desc
      limit 20
    `,
    [matchExternalId ?? null, userId ?? null],
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
      params.windowLabel ?? "Next 7 min",
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
  const q = question.toLowerCase();
  if (q.includes("yellow")) return "yellow_in_window";
  if (q.includes("corner")) return "corner_in_window";
  if (q.includes("next 7 minutes") && q.includes("goal")) return "goal_in_window";
  if (q.includes("next 2 minutes")) return "goal_in_window";
  if (q.includes("before half")) return "goal_before_ht";
  if (q.includes("hold the lead")) return "hold_lead";
  return "goal_in_window";
}

export async function voteOnPoll(
  userId: string,
  pollExternalId: string,
  choice: "yes" | "no",
  txSignature?: string,
): Promise<{
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

  if (!txSignature || txSignature.length < 32) {
    return { ok: false, reason: "tx_required" };
  }

  const reused = await maybeOne<{ id: string }>(
    "select id from engagement_poll_votes where tx_signature = $1",
    [txSignature],
  );
  if (reused) return { ok: false, reason: "tx_reused" };

  const before = await maybeOne<{ predictions_total: number }>(
    "select predictions_total from engagement_passports where user_id = $1",
    [userId],
  );

  await query(
    "insert into engagement_poll_votes (poll_id, user_id, choice, tx_signature) values ($1, $2, $3, $4)",
    [poll.id, userId, choice, txSignature],
  );
  await ensurePassport(userId);
  await query(
    "update engagement_passports set predictions_total = predictions_total + 1, updated_at = now() where user_id = $1",
    [userId],
  );

  let newSticker: StickerAwardResult | null = null;
  if ((before?.predictions_total ?? 0) === 0) {
    newSticker = await awardStickerIfEligible(userId, "first_predict", pollExternalId);
    await qualifyReferralIfNeeded(userId).catch(() => undefined);
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

export type EngagementMomentListRow = EngagementMomentRow & {
  match_label: string;
};

export async function listMoments(
  matchExternalId?: string,
  userId?: string,
): Promise<EngagementMomentListRow[]> {
  requireDatabase();
  const rows = await query<EngagementMomentListRow>(
    `
      select
        em.*,
        m.external_id as match_external_id,
        trim(both ' ' from concat_ws(
          ' · ',
          nullif(concat_ws(
            ' vs ',
            nullif(m.home_team->>'name', ''),
            nullif(m.away_team->>'name', '')
          ), ''),
          nullif(m.stage, '')
        )) as match_label,
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

const MOMENT_ART_POOL = [
  "/moment-drop-slide.jpg",
  "/moment-drop-bicycle.jpg",
  "/moment-drop-keeper.jpg",
  "/moment-drop-corner.jpg",
  "/moment-topbin-curl.jpg",
  "/moment-volley-night.jpg",
  "/moment-save-dive.jpg",
  "/moment-header.jpg",
  "/moment-celebration.jpg",
  "/moment-thunderbolt.jpg",
  "/moment-volley.jpg",
  "/moment-topbin.jpg",
  "/moment-save.jpg",
  "/soccer/Richarlison-of-Brazil-scores-second-goal-FIFA-World-Cup-Qatar-2022-Group-G-match-Brazil-and-Serbia-Lusail-Stadium-November-24-2022-Lusail-City-Qatar.webp",
  "/soccer/football-or-soccer-player-in-action-on-stadium-with-flashlights-kicking-ball-for-winning-goal.webp",
  "/soccer/soccer-players-heading.webp",
  "/soccer/infight_soccer.webp",
  "/soccer/football-player-taking-a-corner-kick-while-playing-at-the-stadium.webp",
  "/soccer/close-up-of-a-football-action-scene-with-competing-soccer-players-at-the-stadium-photo.webp",
  "/soccer/powerful-kick-of-a-soccer-player-with-fiery-ball-photo.webp",
  "/soccer/221128155448-01-portugal-uruguay-world-cup-1128.webp",
  "/soccer/221203174011-05-england-wales-world-cup-1129.webp",
  "/soccer/221219105607-messi-crowd-world-cup-121822.webp",
] as const;

function pickMomentArt(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return MOMENT_ART_POOL[hash % MOMENT_ART_POOL.length]!;
}

/** Rarity from minute band + event seed — late winners skew rarer. */
function pickMomentRarity(minute: number | undefined, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  const roll = hash % 100;
  const m = minute ?? 0;
  if (m >= 85 && roll < 18) return "Legendary";
  if (m >= 70 && roll < 28) return "Epic";
  if (roll < 45) return "Rare";
  if (roll < 75) return "Epic";
  return "Rare";
}

export async function createMomentFromGoal(params: {
  matchId: string;
  eventKey: string;
  title: string;
  player?: string;
  minute?: number;
  imageUrl?: string;
  rarity?: string;
}): Promise<void> {
  requireDatabase();
  const externalId = `moment_${params.eventKey.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 48)}`;
  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_moments where match_id = $1 and event_key = $2",
    [params.matchId, params.eventKey],
  );
  if (existing) return;

  const serialNum = 100 + (Math.abs(externalId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 8900);
  const serial = `#${String(serialNum).padStart(4, "0")} / 9999`;
  const rarity = params.rarity ?? pickMomentRarity(params.minute, params.eventKey);
  const imageUrl = params.imageUrl ?? pickMomentArt(params.eventKey);

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
      rarity,
      imageUrl,
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
}): Promise<{ firstTime: boolean }> {
  requireDatabase();
  const existing = await maybeOne<{ id: string }>(
    "select id from engagement_stadium_proofs where user_id = $1 and match_id = $2",
    [params.userId, params.matchId],
  );

  if (existing) {
    await query(
      `
        update engagement_stadium_proofs
        set tx_signature = coalesce($3, tx_signature), verified_at = now()
        where user_id = $1 and match_id = $2
      `,
      [params.userId, params.matchId, params.txSignature ?? null],
    );
    return { firstTime: false };
  }

  await query(
    `
      insert into engagement_stadium_proofs (user_id, match_id, tx_signature)
      values ($1, $2, $3)
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
  return { firstTime: true };
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

  const already = await maybeOne<{ id: string }>(
    "select id from engagement_reward_redemptions where user_id = $1 and reward_external_id = $2 limit 1",
    [userId, rewardExternalId],
  );
  if (already) return { ok: false, reason: "already_redeemed" };

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

export async function resolvePollsOnTxlineEvent(
  matchId: string,
  eventType: "goal" | "corner" | "yellow",
): Promise<number> {
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
    if (eventType === "yellow" && kind === "yellow_in_window") {
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

    if (kind === "yellow_in_window") {
      const hadYellow = await eventInPollWindow(poll.match_id, poll, "yellow");
      await resolvePoll(poll.id, hadYellow ? "yes" : "no");
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
  "set-legends": "Legend NFTs",
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
    imageUrl: m.image_url ?? "/moment-volley-night.jpg",
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

  for (const setId of ["set-matchday", "set-growth", "set-legends"] as const) {
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

export type FanMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    wallet: string;
    nickname: string | null;
    avatar: string | null;
    /** True when the author is a MatchMind terrace vibe agent */
    isAgent?: boolean;
  };
};

export type FanLeaderRow = {
  rank: number;
  wallet: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  momentsClaimed: number;
};

export type StadiumCrowd = {
  checkedIn: number;
  recent: { wallet: string; nickname: string | null; verifiedAt: string }[];
};

export type FanReactionSummary = {
  emoji: string;
  count: number;
};

export type CommunityPulseItem = {
  id: string;
  kind: "vote" | "moment" | "stadium" | "chat";
  title: string;
  body: string;
  createdAt: string;
  wallet: string | null;
};

function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

export async function listFanMessages(matchExternalId: string, limit = 60): Promise<FanMessage[]> {
  requireDatabase();
  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
  if (!match) return [];

  const lim = Math.min(100, Math.max(1, limit));
  try {
    const rows = await query<{
      id: string;
      body: string;
      created_at: string;
      wallet_pubkey: string;
      nickname: string | null;
      avatar: string | null;
      is_agent: boolean;
    }>(
      `
        select m.id, m.body, m.created_at,
               u.wallet_pubkey, u.nickname, u.avatar,
               exists (
                 select 1 from engagement_vibe_agents va
                 where va.user_id = u.id and va.enabled = true
               ) as is_agent
        from engagement_fan_messages m
        join users u on u.id = m.user_id
        where m.match_id = $1
        order by m.created_at desc
        limit $2
      `,
      [match.id, lim],
    );

    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      author: {
        wallet: r.wallet_pubkey,
        nickname: r.nickname,
        avatar: r.avatar,
        isAgent: Boolean(r.is_agent),
      },
    }));
  } catch {
    // vibe_agents table not migrated yet
    const rows = await query<{
      id: string;
      body: string;
      created_at: string;
      wallet_pubkey: string;
      nickname: string | null;
      avatar: string | null;
    }>(
      `
        select m.id, m.body, m.created_at,
               u.wallet_pubkey, u.nickname, u.avatar
        from engagement_fan_messages m
        join users u on u.id = m.user_id
        where m.match_id = $1
        order by m.created_at desc
        limit $2
      `,
      [match.id, lim],
    );
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      author: {
        wallet: r.wallet_pubkey,
        nickname: r.nickname,
        avatar: r.avatar,
      },
    }));
  }
}

export async function postFanMessage(params: {
  userId: string;
  matchExternalId: string;
  body: string;
}): Promise<{ ok: true; message: FanMessage } | { ok: false; reason: string }> {
  requireDatabase();
  const body = params.body.trim();
  if (body.length < 1 || body.length > 500) return { ok: false, reason: "invalid_body" };
  if (/[<>]/.test(body)) return { ok: false, reason: "invalid_chars" };

  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [params.matchExternalId]);
  if (!match) return { ok: false, reason: "match_not_found" };

  const recent = await maybeOne<{ created_at: string }>(
    `
      select created_at from engagement_fan_messages
      where user_id = $1 and match_id = $2
      order by created_at desc
      limit 1
    `,
    [params.userId, match.id],
  );
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 4_000) {
    return { ok: false, reason: "slow_down" };
  }

  const row = await one<{
    id: string;
    body: string;
    created_at: string;
    wallet_pubkey: string;
    nickname: string | null;
    avatar: string | null;
  }>(
    `
      with inserted as (
        insert into engagement_fan_messages (match_id, user_id, body)
        values ($1, $2, $3)
        returning id, body, created_at, user_id
      )
      select i.id, i.body, i.created_at,
             u.wallet_pubkey, u.nickname, u.avatar
      from inserted i
      join users u on u.id = i.user_id
    `,
    [match.id, params.userId, body],
  );

  return {
    ok: true,
    message: {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      author: {
        wallet: row.wallet_pubkey,
        nickname: row.nickname,
        avatar: row.avatar,
      },
    },
  };
}

export async function listFanXpLeaderboard(limit = 40): Promise<FanLeaderRow[]> {
  requireDatabase();
  const rows = await query<{
    wallet_pubkey: string;
    nickname: string | null;
    avatar: string | null;
    xp: number;
    level: number;
    streak: number;
    moments_claimed: number;
  }>(
    `
      select u.wallet_pubkey, u.nickname, u.avatar,
             p.xp, p.level, p.streak, p.moments_claimed
      from engagement_passports p
      join users u on u.id = p.user_id
      where p.xp > 0
      order by p.xp desc, p.moments_claimed desc
      limit $1
    `,
    [Math.min(100, Math.max(1, limit))],
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    wallet: r.wallet_pubkey,
    nickname: r.nickname,
    avatar: r.avatar,
    xp: r.xp,
    level: r.level,
    streak: r.streak,
    momentsClaimed: r.moments_claimed,
  }));
}

export async function getStadiumCrowd(matchExternalId: string): Promise<StadiumCrowd> {
  requireDatabase();
  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
  if (!match) return { checkedIn: 0, recent: [] };

  const countRow = await one<{ n: number }>(
    "select count(*)::int as n from engagement_stadium_proofs where match_id = $1",
    [match.id],
  );
  const recent = await query<{
    wallet_pubkey: string;
    nickname: string | null;
    verified_at: string;
  }>(
    `
      select u.wallet_pubkey, u.nickname, s.verified_at
      from engagement_stadium_proofs s
      join users u on u.id = s.user_id
      where s.match_id = $1
      order by s.verified_at desc
      limit 12
    `,
    [match.id],
  );

  return {
    checkedIn: countRow.n,
    recent: recent.map((r) => ({
      wallet: r.wallet_pubkey,
      nickname: r.nickname,
      verifiedAt: r.verified_at,
    })),
  };
}

export async function listFanReactionSummary(matchExternalId: string): Promise<FanReactionSummary[]> {
  requireDatabase();
  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
  if (!match) return [];

  const rows = await query<{ emoji: string; count: number }>(
    `
      select emoji, count(*)::int as count
      from engagement_fan_reactions
      where match_id = $1 and created_at > now() - interval '2 hours'
      group by emoji
      order by count desc
    `,
    [match.id],
  );
  return rows;
}

export async function postFanReaction(params: {
  userId: string;
  matchExternalId: string;
  emoji: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  requireDatabase();
  const allowed = new Set(["🔥", "⚽", "😱", "👏", "💚"]);
  if (!allowed.has(params.emoji)) return { ok: false, reason: "invalid_emoji" };

  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [params.matchExternalId]);
  if (!match) return { ok: false, reason: "match_not_found" };

  const recent = await maybeOne<{ created_at: string }>(
    `
      select created_at from engagement_fan_reactions
      where user_id = $1 and match_id = $2
      order by created_at desc
      limit 1
    `,
    [params.userId, match.id],
  );
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 2_000) {
    return { ok: false, reason: "slow_down" };
  }

  await query(
    "insert into engagement_fan_reactions (match_id, user_id, emoji) values ($1, $2, $3)",
    [match.id, params.userId, params.emoji],
  );
  return { ok: true };
}

export async function listCommunityPulse(matchExternalId: string, limit = 20): Promise<CommunityPulseItem[]> {
  requireDatabase();
  const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
  if (!match) return [];

  const items: CommunityPulseItem[] = [];

  const chats = await query<{
    id: string;
    body: string;
    created_at: string;
    wallet_pubkey: string;
    nickname: string | null;
  }>(
    `
      select m.id, m.body, m.created_at, u.wallet_pubkey, u.nickname
      from engagement_fan_messages m
      join users u on u.id = m.user_id
      where m.match_id = $1
      order by m.created_at desc
      limit 8
    `,
    [match.id],
  );
  for (const c of chats) {
    const name = c.nickname || shortWallet(c.wallet_pubkey);
    items.push({
      id: `chat-${c.id}`,
      kind: "chat",
      title: `${name} in the crew`,
      body: c.body,
      createdAt: c.created_at,
      wallet: c.wallet_pubkey,
    });
  }

  const votes = await query<{
    id: string;
    choice: string;
    created_at: string;
    question: string;
    wallet_pubkey: string;
    nickname: string | null;
  }>(
    `
      select v.id, v.choice, v.created_at, p.question, u.wallet_pubkey, u.nickname
      from engagement_poll_votes v
      join engagement_polls p on p.id = v.poll_id
      join users u on u.id = v.user_id
      where p.match_id = $1
      order by v.created_at desc
      limit 8
    `,
    [match.id],
  );
  for (const v of votes) {
    const name = v.nickname || shortWallet(v.wallet_pubkey);
    items.push({
      id: `vote-${v.id}`,
      kind: "vote",
      title: `${name} voted ${v.choice.toUpperCase()}`,
      body: v.question,
      createdAt: v.created_at,
      wallet: v.wallet_pubkey,
    });
  }

  const claims = await query<{
    id: string;
    created_at: string;
    title: string;
    wallet_pubkey: string;
    nickname: string | null;
  }>(
    `
      select c.id, c.created_at, m.title, u.wallet_pubkey, u.nickname
      from engagement_moment_claims c
      join engagement_moments m on m.id = c.moment_id
      join users u on u.id = c.user_id
      where m.match_id = $1
      order by c.created_at desc
      limit 6
    `,
    [match.id],
  );
  for (const c of claims) {
    const name = c.nickname || shortWallet(c.wallet_pubkey);
    items.push({
      id: `moment-${c.id}`,
      kind: "moment",
      title: `${name} claimed a drop`,
      body: c.title,
      createdAt: c.created_at,
      wallet: c.wallet_pubkey,
    });
  }

  const stadium = await query<{
    id: string;
    verified_at: string;
    wallet_pubkey: string;
    nickname: string | null;
  }>(
    `
      select s.id, s.verified_at, u.wallet_pubkey, u.nickname
      from engagement_stadium_proofs s
      join users u on u.id = s.user_id
      where s.match_id = $1
      order by s.verified_at desc
      limit 6
    `,
    [match.id],
  );
  for (const s of stadium) {
    const name = s.nickname || shortWallet(s.wallet_pubkey);
    items.push({
      id: `stadium-${s.id}`,
      kind: "stadium",
      title: `${name} checked in`,
      body: "Stadium proof verified on Solana",
      createdAt: s.verified_at,
      wallet: s.wallet_pubkey,
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.min(40, Math.max(1, limit)));
}

// ── Community tasks / XP stake / auto-agent ──────────────────────────────

export type CommunityTaskDef = {
  id: string;
  title: string;
  detail: string;
  xp: number;
  kind: "claim" | "link" | "auto";
  href?: string;
};

export const COMMUNITY_TASKS: CommunityTaskDef[] = [
  {
    id: "mm-lace-boots",
    title: "Lace your boots",
    detail: "Claim welcome XP + gas SOL so your smart wallet can sign on-chain drops.",
    xp: 100,
    kind: "claim",
  },
  {
    id: "mm-share-matchmind",
    title: "Share MatchMind",
    detail: "Drop the Live Hub link with your crew — grow the terrace.",
    xp: 75,
    kind: "link",
    href: "https://match.buildingcultureid.space",
  },
  {
    id: "mm-follow-x",
    title: "Follow on X",
    detail: "Follow the MatchMind / World Cup OS account, then claim.",
    xp: 50,
    kind: "link",
    href: "https://x.com",
  },
  {
    id: "mm-crew-chat",
    title: "Post in Crew",
    detail: "Send one message in the Crew room during a match.",
    xp: 40,
    kind: "auto",
  },
  {
    id: "mm-first-vote",
    title: "Cast a poll",
    detail: "Lock any XP poll — Follow Crowd or Agent counts.",
    xp: 50,
    kind: "auto",
  },
  {
    id: "mm-share-prediction",
    title: "Share a prediction",
    detail: "Share a locked XP poll or USDC call — bring the terrace in.",
    xp: 60,
    kind: "auto",
  },
  {
    id: "mm-claim-drop",
    title: "Claim a drop",
    detail: "Mint a goal moment into your album.",
    xp: 60,
    kind: "auto",
  },
  {
    id: "mm-enable-agent",
    title: "Enable Agent Pilot",
    detail: "Turn on auto-predictions with the trading agent.",
    xp: 80,
    kind: "auto",
  },
  {
    id: "mm-stake-100",
    title: "Stake 100 XP",
    detail: "Lock 100+ XP in the mine to start earning MM.",
    xp: 100,
    kind: "auto",
  },
  {
    id: "mm-invite-friend",
    title: "Invite a friend",
    detail: "Share your passport card — every new fan helps the network.",
    xp: 90,
    kind: "link",
    href: "https://match.buildingcultureid.space/passport",
  },
];

export async function grantPassportXp(userId: string, amount: number, reason: string): Promise<void> {
  requireDatabase();
  if (amount <= 0) return;
  await ensurePassport(userId);
  await query(
    `
      update engagement_passports
      set xp = xp + $2,
          level = greatest(1, floor((xp + $2) / 250) + 1),
          updated_at = now()
      where user_id = $1
    `,
    [userId, amount],
  );
  await mirrorPassportXp(userId, amount, reason);
}

async function taskEligible(userId: string, taskId: string): Promise<boolean> {
  switch (taskId) {
    case "mm-crew-chat": {
      const row = await maybeOne<{ n: string }>(
        "select count(*)::text as n from engagement_fan_messages where user_id = $1",
        [userId],
      );
      return Number(row?.n ?? 0) > 0;
    }
    case "mm-first-vote": {
      const p = await getPassport(userId);
      return p.predictionsTotal > 0;
    }
    case "mm-share-prediction": {
      const row = await maybeOne<{ n: string }>(
        `
          select count(*)::text as n from superfan_points_ledger
          where user_id = $1 and source = 'share' and content_type = 'prediction'
        `,
        [userId],
      );
      return Number(row?.n ?? 0) > 0;
    }
    case "mm-claim-drop": {
      const p = await getPassport(userId);
      return p.momentsClaimed > 0;
    }
    case "mm-enable-agent": {
      const row = await maybeOne<{ enabled: boolean }>(
        "select enabled from engagement_auto_agent where user_id = $1",
        [userId],
      );
      return Boolean(row?.enabled);
    }
    case "mm-stake-100": {
      const p = await getPassport(userId);
      return p.xpStaked >= 100;
    }
    case "mm-lace-boots":
    case "mm-share-matchmind":
    case "mm-follow-x":
    case "mm-invite-friend":
      return true;
    default:
      return false;
  }
}

export async function listCommunityTasks(userId: string): Promise<
  (CommunityTaskDef & { claimed: boolean; ready: boolean })[]
> {
  requireDatabase();
  await ensurePassport(userId);
  const claimed = await query<{ task_id: string }>(
    "select task_id from engagement_task_claims where user_id = $1",
    [userId],
  );
  const claimedSet = new Set(claimed.map((c) => c.task_id));
  const out: (CommunityTaskDef & { claimed: boolean; ready: boolean })[] = [];
  for (const task of COMMUNITY_TASKS) {
    const done = claimedSet.has(task.id);
    const ready = done ? false : await taskEligible(userId, task.id);
    out.push({ ...task, claimed: done, ready });
  }
  return out;
}

export async function claimCommunityTask(
  userId: string,
  taskId: string,
): Promise<{ ok: boolean; xp?: number; reason?: string }> {
  requireDatabase();
  const task = COMMUNITY_TASKS.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: "unknown_task" };

  const existing = await maybeOne<{ task_id: string }>(
    "select task_id from engagement_task_claims where user_id = $1 and task_id = $2",
    [userId, taskId],
  );
  if (existing) return { ok: false, reason: "already_claimed" };

  const ready = await taskEligible(userId, taskId);
  if (!ready) return { ok: false, reason: "not_ready" };

  await query(
    "insert into engagement_task_claims (user_id, task_id, xp_awarded) values ($1, $2, $3)",
    [userId, taskId, task.xp],
  );
  await grantPassportXp(userId, task.xp, `task-${taskId}`);
  return { ok: true, xp: task.xp };
}

export type StakeStatus = {
  liquidXp: number;
  xpStaked: number;
  mmBalance: number;
  pendingMm: number;
  dailyRate: number;
  aprLabel: string;
};

export async function getStakeStatus(userId: string): Promise<StakeStatus> {
  const p = await getPassport(userId);
  return {
    liquidXp: p.xp,
    xpStaked: p.xpStaked,
    mmBalance: p.mmBalance,
    pendingMm: p.pendingMm,
    dailyRate: MM_PER_XP_PER_DAY,
    aprLabel: `${Math.round(MM_PER_XP_PER_DAY * 365 * 100)}% MM / yr on staked XP`,
  };
}

async function settlePendingMm(userId: string): Promise<number> {
  const row = await one<{
    xp_staked: number;
    mm_balance: string | number;
    stake_updated_at: string | null;
  }>(
    "select coalesce(xp_staked,0) as xp_staked, coalesce(mm_balance,0) as mm_balance, stake_updated_at from engagement_passports where user_id = $1",
    [userId],
  );
  const pending = computePendingMm(Number(row.xp_staked), row.stake_updated_at);
  if (pending <= 0) {
    await query(
      "update engagement_passports set stake_updated_at = coalesce(stake_updated_at, now()), updated_at = now() where user_id = $1",
      [userId],
    );
    return 0;
  }
  await query(
    `
      update engagement_passports
      set mm_balance = coalesce(mm_balance, 0) + $2,
          stake_updated_at = now(),
          updated_at = now()
      where user_id = $1
    `,
    [userId, pending],
  );
  return pending;
}

export async function stakeXp(
  userId: string,
  amount: number,
): Promise<{ ok: boolean; reason?: string; status?: StakeStatus }> {
  requireDatabase();
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n < 10) return { ok: false, reason: "min_10" };
  await ensurePassport(userId);
  await settlePendingMm(userId);
  const p = await getPassport(userId);
  if (p.xp < n) return { ok: false, reason: "insufficient_xp" };
  await query(
    `
      update engagement_passports
      set xp = xp - $2,
          xp_staked = coalesce(xp_staked, 0) + $2,
          stake_updated_at = now(),
          level = greatest(1, floor((xp - $2) / 250) + 1),
          updated_at = now()
      where user_id = $1
    `,
    [userId, n],
  );
  return { ok: true, status: await getStakeStatus(userId) };
}

export async function unstakeXp(
  userId: string,
  amount: number,
): Promise<{ ok: boolean; reason?: string; status?: StakeStatus }> {
  requireDatabase();
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n < 1) return { ok: false, reason: "invalid_amount" };
  await ensurePassport(userId);
  await settlePendingMm(userId);
  const p = await getPassport(userId);
  if (p.xpStaked < n) return { ok: false, reason: "insufficient_staked" };
  await query(
    `
      update engagement_passports
      set xp = xp + $2,
          xp_staked = greatest(0, coalesce(xp_staked, 0) - $2),
          stake_updated_at = case when coalesce(xp_staked, 0) - $2 > 0 then now() else null end,
          level = greatest(1, floor((xp + $2) / 250) + 1),
          updated_at = now()
      where user_id = $1
    `,
    [userId, n],
  );
  return { ok: true, status: await getStakeStatus(userId) };
}

export async function claimMinedMm(
  userId: string,
): Promise<{ ok: boolean; claimed: number; status: StakeStatus }> {
  requireDatabase();
  await ensurePassport(userId);
  const claimed = await settlePendingMm(userId);
  return { ok: true, claimed, status: await getStakeStatus(userId) };
}

/** Convert mined MM into liquid XP (1 MM → 2 XP). */
export async function convertMmToXp(
  userId: string,
  mmAmount: number,
): Promise<{ ok: boolean; reason?: string; xpGained?: number; status?: StakeStatus }> {
  requireDatabase();
  const n = Math.floor(mmAmount * 1000) / 1000;
  if (!Number.isFinite(n) || n < 1) return { ok: false, reason: "min_1_mm" };
  await ensurePassport(userId);
  await settlePendingMm(userId);
  const p = await getPassport(userId);
  if (p.mmBalance < n) return { ok: false, reason: "insufficient_mm" };
  const xpGained = Math.floor(n * 2);
  await query(
    `
      update engagement_passports
      set mm_balance = coalesce(mm_balance, 0) - $2,
          xp = xp + $3,
          level = greatest(1, floor((xp + $3) / 250) + 1),
          updated_at = now()
      where user_id = $1
    `,
    [userId, n, xpGained],
  );
  await mirrorPassportXp(userId, xpGained, `mm-convert-${Date.now()}`);
  return { ok: true, xpGained, status: await getStakeStatus(userId) };
}

export type AutoAgentPrefs = {
  enabled: boolean;
  mode: "agent" | "crowd";
  votesCast: number;
  lastTickAt: string | null;
  /** Place on-chain USDC winner markets within budget. */
  usdcMarkets: boolean;
  /** Max USDC the pilot may stake in total. */
  usdcBudget: number;
  /** USDC already staked by the pilot. */
  usdcSpent: number;
  /** Stake size per market pick. */
  usdcStake: number;
  marketsPlaced: number;
  /** Remaining budget (budget − spent). */
  usdcRemaining: number;
};

const MAX_USDC_BUDGET = 500;
const MAX_USDC_STAKE = 50;

function clampBudget(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_USDC_BUDGET, Math.round(n * 100) / 100);
}

function clampStake(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(MAX_USDC_STAKE, Math.max(1, Math.round(n * 100) / 100));
}

export async function getAutoAgentPrefs(userId: string): Promise<AutoAgentPrefs> {
  requireDatabase();
  const row = await maybeOne<{
    enabled: boolean;
    mode: string;
    votes_cast: number;
    last_tick_at: string | null;
    usdc_markets?: boolean;
    usdc_budget?: string | number;
    usdc_spent?: string | number;
    usdc_stake?: string | number;
    markets_placed?: number;
  }>("select * from engagement_auto_agent where user_id = $1", [userId]);
  const usdcBudget = Number(row?.usdc_budget ?? 0);
  const usdcSpent = Number(row?.usdc_spent ?? 0);
  return {
    enabled: Boolean(row?.enabled),
    mode: row?.mode === "crowd" ? "crowd" : "agent",
    votesCast: Number(row?.votes_cast ?? 0),
    lastTickAt: row?.last_tick_at ?? null,
    usdcMarkets: Boolean(row?.usdc_markets),
    usdcBudget,
    usdcSpent,
    usdcStake: Number(row?.usdc_stake ?? 5) || 5,
    marketsPlaced: Number(row?.markets_placed ?? 0),
    usdcRemaining: Math.max(0, usdcBudget - usdcSpent),
  };
}

export async function setAutoAgentPrefs(
  userId: string,
  prefs: {
    enabled: boolean;
    mode?: "agent" | "crowd";
    usdcMarkets?: boolean;
    usdcBudget?: number;
    usdcStake?: number;
  },
): Promise<AutoAgentPrefs> {
  requireDatabase();
  const mode = prefs.mode === "crowd" ? "crowd" : "agent";
  const existing = await getAutoAgentPrefs(userId);
  const usdcMarkets = typeof prefs.usdcMarkets === "boolean" ? prefs.usdcMarkets : existing.usdcMarkets;
  const usdcBudget =
    typeof prefs.usdcBudget === "number" ? clampBudget(prefs.usdcBudget) : existing.usdcBudget;
  const usdcStake =
    typeof prefs.usdcStake === "number" ? clampStake(prefs.usdcStake) : existing.usdcStake;

  await query(
    `
      insert into engagement_auto_agent (
        user_id, enabled, mode, usdc_markets, usdc_budget, usdc_stake, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (user_id) do update
        set enabled = excluded.enabled,
            mode = excluded.mode,
            usdc_markets = excluded.usdc_markets,
            usdc_budget = excluded.usdc_budget,
            usdc_stake = excluded.usdc_stake,
            updated_at = now()
    `,
    [userId, prefs.enabled, mode, usdcMarkets, usdcBudget, usdcStake],
  );
  return getAutoAgentPrefs(userId);
}

function mapSignalToChoice(
  question: string,
  signal: { headline: string; prediction: string; confidence: number; type: string } | null,
  mode: "agent" | "crowd",
  yesShare: number,
): "yes" | "no" | null {
  if (mode === "crowd") return yesShare >= 0.5 ? "yes" : "no";
  if (!signal) return null;
  const q = question.toLowerCase();
  const pred = `${signal.headline} ${signal.prediction}`.toLowerCase();
  const aboutGoal = /goal|score|net/.test(q);
  const signalGoal = /goal|score/.test(pred);
  if (aboutGoal && signalGoal) return "yes";
  if (signal.type === "bullish" && Number(signal.confidence) >= 48) return "yes";
  if (Number(signal.confidence) < 40) return "no";
  return yesShare >= 0.5 ? "yes" : "no";
}

export type PlannedUsdcMarket = {
  marketExternalId: string;
  optionExternalId: string;
  amount: number;
  label: string;
  matchExternalId: string;
};

function mapSignalToMarketOption(
  outcomes: { id: string; label: string }[],
  signal: { headline: string; prediction: string; confidence: number; type: string } | null,
  mode: "agent" | "crowd",
): { id: string; label: string } | null {
  if (!outcomes.length) return null;
  if (mode === "crowd") {
    // Crowd mode without live odds → skip USDC (needs agent conviction).
    return null;
  }
  if (!signal || Number(signal.confidence) < 52) return null;
  const text = `${signal.headline} ${signal.prediction}`.toLowerCase();

  const scored = outcomes.map((o) => {
    const label = o.label.toLowerCase();
    let score = 0;
    if (text.includes(label)) score += 3;
    const tokens = label.split(/\s+/).filter((t) => t.length > 2);
    for (const t of tokens) {
      if (text.includes(t)) score += 1;
    }
    if (/draw|tie|x$/.test(label) && /draw|tie|stalemate/.test(text)) score += 3;
    return { o, score };
  });
  scored.sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score > 0) return scored[0].o;

  // Bullish + no clear team → prefer first non-draw outcome
  if (signal.type === "bullish") {
    return outcomes.find((o) => !/draw|tie/i.test(o.label)) ?? outcomes[0] ?? null;
  }
  return null;
}

/** Plan XP poll votes + optional USDC markets — client signs each on-chain. */
export async function runAutoAgentTick(
  userId: string,
  opts: {
    matchExternalId?: string;
    signals: { matchId: string; headline: string; prediction: string; confidence: number; type: string }[];
  },
): Promise<{
  planned: { pollId: string; choice: "yes" | "no" }[];
  plannedMarkets: PlannedUsdcMarket[];
  voted: { pollId: string; choice: "yes" | "no" }[];
  skipped: number;
  prefs: AutoAgentPrefs;
}> {
  requireDatabase();
  const prefs = await getAutoAgentPrefs(userId);
  if (!prefs.enabled) {
    return { planned: [], plannedMarkets: [], voted: [], skipped: 0, prefs };
  }

  const polls = await listPolls(opts.matchExternalId, userId);
  const open = polls.filter((p) => !p.outcome && !p.user_choice && new Date(p.closes_at).getTime() > Date.now());
  const planned: { pollId: string; choice: "yes" | "no" }[] = [];
  let skipped = 0;

  for (const poll of open.slice(0, 4)) {
    const yes = poll.yes_votes ?? 0;
    const no = poll.no_votes ?? 0;
    const total = yes + no;
    const yesShare = total > 0 ? yes / total : 0.5;
    const signal =
      opts.signals.find((s) => s.matchId === poll.match_external_id) ?? opts.signals[0] ?? null;
    const choice = mapSignalToChoice(poll.question, signal, prefs.mode, yesShare);
    if (!choice) {
      skipped += 1;
      continue;
    }
    planned.push({ pollId: poll.external_id, choice });
  }

  const plannedMarkets: PlannedUsdcMarket[] = [];
  if (prefs.usdcMarkets && prefs.usdcRemaining >= prefs.usdcStake && prefs.mode === "agent") {
    const matchId = opts.matchExternalId ?? opts.signals[0]?.matchId;
    if (matchId) {
      const signal =
        opts.signals.find((s) => s.matchId === matchId) ?? opts.signals[0] ?? null;
      const marketRow = await maybeOne<{
        market_external_id: string;
        match_status: string;
        kickoff_at: string | null;
        closed: boolean;
      }>(
        `
          select m.external_id as market_external_id, mt.status as match_status,
                 mt.kickoff_at, m.closed
          from markets m
          join matches mt on mt.id = m.match_id
          where mt.external_id = $1 and m.type = 'winner' and m.closed = false
          limit 1
        `,
        [matchId],
      );
      const kickoffOk =
        marketRow?.kickoff_at == null ||
        Date.now() < new Date(marketRow.kickoff_at).getTime() - 5 * 60_000;
      if (
        marketRow &&
        !marketRow.closed &&
        marketRow.match_status === "scheduled" &&
        kickoffOk
      ) {
        const already = await maybeOne<{ id: string }>(
          `
            select p.id from predictions p
            join markets m on m.id = p.market_id
            where p.user_id = $1 and m.external_id = $2 and p.status = 'open'
            limit 1
          `,
          [userId, marketRow.market_external_id],
        );
        if (!already) {
          const outcomes = await query<{ external_id: string; label: string }>(
            `
              select o.external_id, o.label
              from market_options o
              join markets m on m.id = o.market_id
              where m.external_id = $1
              order by o.created_at asc
            `,
            [marketRow.market_external_id],
          );
          const pick = mapSignalToMarketOption(
            outcomes.map((o) => ({ id: o.external_id, label: o.label })),
            signal,
            prefs.mode,
          );
          if (pick) {
            const amount = Math.min(prefs.usdcStake, prefs.usdcRemaining);
            plannedMarkets.push({
              marketExternalId: marketRow.market_external_id,
              optionExternalId: pick.id,
              amount,
              label: pick.label,
              matchExternalId: matchId,
            });
          } else {
            skipped += 1;
          }
        }
      }
    }
  }

  await query(
    "update engagement_auto_agent set last_tick_at = now(), updated_at = now() where user_id = $1",
    [userId],
  );

  return { planned, plannedMarkets, voted: [], skipped, prefs };
}

export async function markAutoAgentVotes(userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  requireDatabase();
  await query(
    `
      update engagement_auto_agent
      set votes_cast = votes_cast + $2, last_tick_at = now(), updated_at = now()
      where user_id = $1
    `,
    [userId, count],
  );
}

/** Record USDC spent by Agent Pilot after a confirmed on-chain place. */
export async function recordAutoAgentUsdcSpend(
  userId: string,
  amount: number,
): Promise<AutoAgentPrefs | { ok: false; reason: string }> {
  requireDatabase();
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "invalid_amount" };
  const prefs = await getAutoAgentPrefs(userId);
  if (!prefs.usdcMarkets) return { ok: false, reason: "usdc_markets_off" };
  if (amount > prefs.usdcRemaining + 0.001) return { ok: false, reason: "budget_exceeded" };

  await query(
    `
      update engagement_auto_agent
      set usdc_spent = usdc_spent + $2,
          markets_placed = markets_placed + 1,
          last_tick_at = now(),
          updated_at = now()
      where user_id = $1
    `,
    [userId, amount],
  );
  return getAutoAgentPrefs(userId);
}

// --- Fan wishes / feedback / shoutouts ---

export type FanWishKind = "feature" | "feedback" | "shoutout";

export type FanWish = {
  id: string;
  kind: FanWishKind;
  body: string;
  cheers: number;
  createdAt: string;
  cheeredByMe: boolean;
  author: { wallet: string; nickname: string | null; displayName: string | null };
};

const LEGEND_MINT_XP: Record<string, number> = {
  "legend-messi": 400,
  "legend-maradona": 350,
  "legend-pele": 350,
  "legend-cruyff": 300,
  "legend-ronaldinho": 300,
  "legend-zidane": 300,
};

export async function listFanWishes(opts: {
  kind?: FanWishKind;
  userId?: string;
  limit?: number;
}): Promise<FanWish[]> {
  requireDatabase();
  const limit = Math.min(80, Math.max(1, opts.limit ?? 40));
  const rows = await query<{
    id: string;
    kind: FanWishKind;
    body: string;
    cheers: number;
    created_at: string;
    wallet_pubkey: string;
    nickname: string | null;
    display_name: string | null;
    cheered: boolean;
  }>(
    `
      select w.id, w.kind, w.body, w.cheers, w.created_at,
             u.wallet_pubkey, u.nickname, p.display_name,
             exists (
               select 1 from engagement_fan_wish_cheers c
               where c.wish_id = w.id
                 and $2::uuid is not null
                 and c.user_id = $2
             ) as cheered
      from engagement_fan_wishes w
      join users u on u.id = w.user_id
      left join engagement_passports p on p.user_id = w.user_id
      where ($1::text is null or w.kind = $1)
      order by w.cheers desc, w.created_at desc
      limit $3
    `,
    [opts.kind ?? null, opts.userId ?? null, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    body: r.body,
    cheers: r.cheers,
    createdAt: r.created_at,
    cheeredByMe: Boolean(r.cheered),
    author: {
      wallet: r.wallet_pubkey,
      nickname: r.nickname,
      displayName: r.display_name,
    },
  }));
}

export async function postFanWish(params: {
  userId: string;
  kind: FanWishKind;
  body: string;
}): Promise<{ ok: true; wish: FanWish } | { ok: false; reason: string }> {
  requireDatabase();
  if (!["feature", "feedback", "shoutout"].includes(params.kind)) {
    return { ok: false, reason: "invalid_kind" };
  }
  const body = params.body.trim();
  if (body.length < 3 || body.length > 400) return { ok: false, reason: "invalid_body" };
  if (/[<>]/.test(body)) return { ok: false, reason: "invalid_chars" };

  const recent = await maybeOne<{ created_at: string }>(
    `
      select created_at from engagement_fan_wishes
      where user_id = $1
      order by created_at desc
      limit 1
    `,
    [params.userId],
  );
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 8_000) {
    return { ok: false, reason: "slow_down" };
  }

  const row = await one<{ id: string }>(
    `
      insert into engagement_fan_wishes (user_id, kind, body)
      values ($1, $2, $3)
      returning id
    `,
    [params.userId, params.kind, body],
  );
  const wishes = await listFanWishes({ userId: params.userId, limit: 80 });
  const wish = wishes.find((w) => w.id === row.id);
  if (!wish) return { ok: false, reason: "not_found" };
  return { ok: true, wish };
}

export async function cheerFanWish(
  userId: string,
  wishId: string,
): Promise<{ ok: true; cheers: number } | { ok: false; reason: string }> {
  requireDatabase();
  const wish = await maybeOne<{ id: string; cheers: number }>(
    "select id, cheers from engagement_fan_wishes where id = $1",
    [wishId],
  );
  if (!wish) return { ok: false, reason: "not_found" };

  const already = await maybeOne<{ wish_id: string }>(
    "select wish_id from engagement_fan_wish_cheers where wish_id = $1 and user_id = $2",
    [wishId, userId],
  );
  if (already) return { ok: true, cheers: wish.cheers };

  await query("insert into engagement_fan_wish_cheers (wish_id, user_id) values ($1, $2)", [
    wishId,
    userId,
  ]);
  const updated = await one<{ cheers: number }>(
    "update engagement_fan_wishes set cheers = cheers + 1 where id = $1 returning cheers",
    [wishId],
  );
  return { ok: true, cheers: updated.cheers };
}

// --- Legend mint (XP → sticker) ---

export async function mintLegendSticker(
  userId: string,
  stickerId: string,
): Promise<{ ok: boolean; reason?: string; stickerId?: string; xpSpent?: number }> {
  requireDatabase();
  const price = LEGEND_MINT_XP[stickerId];
  if (price == null) return { ok: false, reason: "unknown_legend" };

  const def = await maybeOne<{ id: string; set_id: string }>(
    "select id, set_id from engagement_sticker_defs where id = $1",
    [stickerId],
  );
  if (!def || def.set_id !== "set-legends") return { ok: false, reason: "unknown_legend" };

  const owned = await maybeOne<{ id: string }>(
    "select id from engagement_user_stickers where user_id = $1 and sticker_id = $2",
    [userId, stickerId],
  );
  if (owned) return { ok: false, reason: "already_owned" };

  await ensurePassport(userId);
  const passport = await getPassport(userId);
  if (passport.xp < price) return { ok: false, reason: "insufficient_xp" };

  await query(
    "update engagement_passports set xp = xp - $2, updated_at = now() where user_id = $1",
    [userId, price],
  );
  await query(
    "insert into engagement_user_stickers (user_id, sticker_id, source_ref) values ($1, $2, $3)",
    [userId, stickerId, "legend-mint"],
  );
  await checkSetCompletion(userId, "set-legends");
  return { ok: true, stickerId, xpSpent: price };
}

export async function listOwnedTradeableStickers(userId: string): Promise<
  {
    stickerId: string;
    title: string;
    rarity: string;
    imageUrl: string;
    setId: string;
    listed: boolean;
  }[]
> {
  requireDatabase();
  const rows = await query<{
    sticker_id: string;
    title: string;
    rarity: string;
    image_url: string;
    set_id: string;
    listed: boolean;
  }>(
    `
      select sd.id as sticker_id, sd.title, sd.rarity, sd.image_url, sd.set_id,
             exists (
               select 1 from engagement_sticker_listings l
               where l.seller_id = $1 and l.sticker_id = sd.id and l.status = 'open'
             ) as listed
      from engagement_user_stickers us
      join engagement_sticker_defs sd on sd.id = us.sticker_id
      where us.user_id = $1
      order by sd.set_id, sd.sort_order
    `,
    [userId],
  );
  return rows.map((r) => ({
    stickerId: r.sticker_id,
    title: r.title,
    rarity: r.rarity,
    imageUrl: r.image_url,
    setId: r.set_id,
    listed: Boolean(r.listed),
  }));
}

// --- Sticker marketplace ---

export type StickerListing = {
  id: string;
  stickerId: string;
  title: string;
  rarity: string;
  imageUrl: string;
  setId: string;
  priceXp: number;
  status: "open" | "sold" | "cancelled";
  createdAt: string;
  seller: { wallet: string; nickname: string | null; displayName: string | null };
  mine: boolean;
};

export async function listStickerListings(opts: {
  userId?: string;
  status?: "open" | "sold" | "cancelled";
  limit?: number;
}): Promise<StickerListing[]> {
  requireDatabase();
  const status = opts.status ?? "open";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 48));
  const rows = await query<{
    id: string;
    sticker_id: string;
    title: string;
    rarity: string;
    image_url: string;
    set_id: string;
    price_xp: number;
    status: "open" | "sold" | "cancelled";
    created_at: string;
    wallet_pubkey: string;
    nickname: string | null;
    display_name: string | null;
    seller_id: string;
  }>(
    `
      select l.id, l.sticker_id, l.price_xp, l.status, l.created_at, l.seller_id,
             sd.title, sd.rarity, sd.image_url, sd.set_id,
             u.wallet_pubkey, u.nickname, p.display_name
      from engagement_sticker_listings l
      join engagement_sticker_defs sd on sd.id = l.sticker_id
      join users u on u.id = l.seller_id
      left join engagement_passports p on p.user_id = l.seller_id
      where l.status = $1
      order by l.created_at desc
      limit $2
    `,
    [status, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    stickerId: r.sticker_id,
    title: r.title,
    rarity: r.rarity,
    imageUrl: r.image_url,
    setId: r.set_id,
    priceXp: r.price_xp,
    status: r.status,
    createdAt: r.created_at,
    seller: {
      wallet: r.wallet_pubkey,
      nickname: r.nickname,
      displayName: r.display_name,
    },
    mine: opts.userId != null && r.seller_id === opts.userId,
  }));
}

export async function createStickerListing(
  userId: string,
  stickerId: string,
  priceXp: number,
): Promise<{ ok: true; listing: StickerListing } | { ok: false; reason: string }> {
  requireDatabase();
  const price = Math.floor(priceXp);
  if (!Number.isFinite(price) || price < 25 || price > 50_000) {
    return { ok: false, reason: "invalid_price" };
  }

  const owned = await maybeOne<{ id: string }>(
    "select id from engagement_user_stickers where user_id = $1 and sticker_id = $2",
    [userId, stickerId],
  );
  if (!owned) return { ok: false, reason: "not_owned" };

  const open = await maybeOne<{ id: string }>(
    "select id from engagement_sticker_listings where seller_id = $1 and sticker_id = $2 and status = 'open'",
    [userId, stickerId],
  );
  if (open) return { ok: false, reason: "already_listed" };

  const row = await one<{ id: string }>(
    `
      insert into engagement_sticker_listings (seller_id, sticker_id, price_xp)
      values ($1, $2, $3)
      returning id
    `,
    [userId, stickerId, price],
  );
  const listings = await listStickerListings({ userId, status: "open", limit: 100 });
  const listing = listings.find((l) => l.id === row.id);
  if (!listing) return { ok: false, reason: "not_found" };
  return { ok: true, listing };
}

export async function cancelStickerListing(
  userId: string,
  listingId: string,
): Promise<{ ok: boolean; reason?: string }> {
  requireDatabase();
  const row = await maybeOne<{ id: string; seller_id: string; status: string }>(
    "select id, seller_id, status from engagement_sticker_listings where id = $1",
    [listingId],
  );
  if (!row) return { ok: false, reason: "not_found" };
  if (row.seller_id !== userId) return { ok: false, reason: "not_seller" };
  if (row.status !== "open") return { ok: false, reason: "not_open" };
  await query(
    "update engagement_sticker_listings set status = 'cancelled', updated_at = now() where id = $1",
    [listingId],
  );
  return { ok: true };
}

export async function buyStickerListing(
  buyerId: string,
  listingId: string,
): Promise<{ ok: boolean; reason?: string; priceXp?: number }> {
  requireDatabase();
  return withTransaction(async (client) => {
    const listing = await client.query<{
      id: string;
      seller_id: string;
      sticker_id: string;
      price_xp: number;
      status: string;
    }>("select id, seller_id, sticker_id, price_xp, status from engagement_sticker_listings where id = $1 for update", [
      listingId,
    ]);
    const row = listing.rows[0];
    if (!row) return { ok: false, reason: "not_found" };
    if (row.status !== "open") return { ok: false, reason: "not_open" };
    if (row.seller_id === buyerId) return { ok: false, reason: "own_listing" };

    const buyerOwns = await client.query(
      "select id from engagement_user_stickers where user_id = $1 and sticker_id = $2",
      [buyerId, row.sticker_id],
    );
    if (buyerOwns.rows[0]) return { ok: false, reason: "already_owned" };

    const sellerOwns = await client.query(
      "select id from engagement_user_stickers where user_id = $1 and sticker_id = $2 for update",
      [row.seller_id, row.sticker_id],
    );
    if (!sellerOwns.rows[0]) return { ok: false, reason: "seller_missing" };

    await client.query(
      "insert into engagement_passports (user_id) values ($1) on conflict (user_id) do nothing",
      [buyerId],
    );
    await client.query(
      "insert into engagement_passports (user_id) values ($1) on conflict (user_id) do nothing",
      [row.seller_id],
    );

    const buyerXp = await client.query<{ xp: number }>(
      "select xp from engagement_passports where user_id = $1 for update",
      [buyerId],
    );
    const xp = buyerXp.rows[0]?.xp ?? 0;
    if (xp < row.price_xp) return { ok: false, reason: "insufficient_xp" };

    await client.query(
      "update engagement_passports set xp = xp - $2, updated_at = now() where user_id = $1",
      [buyerId, row.price_xp],
    );
    await client.query(
      "update engagement_passports set xp = xp + $2, updated_at = now() where user_id = $1",
      [row.seller_id, row.price_xp],
    );
    await client.query("delete from engagement_user_stickers where user_id = $1 and sticker_id = $2", [
      row.seller_id,
      row.sticker_id,
    ]);
    await client.query(
      "insert into engagement_user_stickers (user_id, sticker_id, source_ref) values ($1, $2, $3)",
      [buyerId, row.sticker_id, `market-${listingId}`],
    );
    await client.query(
      `
        update engagement_sticker_listings
        set status = 'sold', buyer_id = $2, sold_at = now(), updated_at = now()
        where id = $1
      `,
      [listingId, buyerId],
    );
    return { ok: true, priceXp: row.price_xp };
  });
}

// --- Ball News social ---

export type BlogPostMeta = {
  postKey: string;
  kind: string;
  kicker: string;
  headline: string;
  lede: string;
  body: string | null;
  imageUrl: string | null;
  matchExternalId: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type BlogComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { wallet: string; nickname: string | null; displayName: string | null };
};

/** Ensure a blog meta row exists for FK; never overwrite editorial content from user like/comment. */
async function upsertBlogMeta(meta: {
  postKey: string;
  kind?: string;
  kicker?: string;
  headline: string;
  lede?: string;
  body?: string;
  imageUrl?: string;
  matchExternalId?: string;
}): Promise<void> {
  await query(
    `
      insert into engagement_blog_meta (post_key, kind, kicker, headline, lede, body, image_url, match_external_id, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      on conflict (post_key) do nothing
    `,
    [
      meta.postKey.slice(0, 160),
      meta.kind ?? "desk",
      (meta.kicker ?? "").slice(0, 80),
      meta.headline.slice(0, 200),
      (meta.lede ?? "").slice(0, 500),
      meta.body?.slice(0, 4000) ?? null,
      meta.imageUrl ?? null,
      meta.matchExternalId ?? null,
    ],
  );
}

export async function getBlogEngagement(
  postKey: string,
  userId?: string,
): Promise<BlogPostMeta | null> {
  requireDatabase();
  const key = postKey.slice(0, 160);
  const row = await maybeOne<{
    post_key: string;
    kind: string;
    kicker: string;
    headline: string;
    lede: string;
    body: string | null;
    image_url: string | null;
    match_external_id: string | null;
  }>("select * from engagement_blog_meta where post_key = $1", [key]);

  const likes = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_blog_likes where post_key = $1",
    [key],
  );
  const comments = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_blog_comments where post_key = $1",
    [key],
  );
  let likedByMe = false;
  if (userId) {
    const mine = await maybeOne<{ user_id: string }>(
      "select user_id from engagement_blog_likes where post_key = $1 and user_id = $2",
      [key, userId],
    );
    likedByMe = Boolean(mine);
  }

  if (!row) {
    return {
      postKey: key,
      kind: "desk",
      kicker: "",
      headline: "",
      lede: "",
      body: null,
      imageUrl: null,
      matchExternalId: null,
      likeCount: Number(likes?.count ?? 0),
      commentCount: Number(comments?.count ?? 0),
      likedByMe,
    };
  }

  return {
    postKey: row.post_key,
    kind: row.kind,
    kicker: row.kicker,
    headline: row.headline,
    lede: row.lede,
    body: row.body,
    imageUrl: row.image_url,
    matchExternalId: row.match_external_id,
    likeCount: Number(likes?.count ?? 0),
    commentCount: Number(comments?.count ?? 0),
    likedByMe,
  };
}

export async function likeBlogPost(
  userId: string,
  meta: {
    postKey: string;
    kind?: string;
    kicker?: string;
    headline: string;
    lede?: string;
    body?: string;
    imageUrl?: string;
    matchExternalId?: string;
  },
): Promise<{ liked: boolean; likeCount: number }> {
  requireDatabase();
  await upsertBlogMeta(meta);
  const key = meta.postKey.slice(0, 160);
  const existing = await maybeOne<{ user_id: string }>(
    "select user_id from engagement_blog_likes where post_key = $1 and user_id = $2",
    [key, userId],
  );
  if (existing) {
    await query("delete from engagement_blog_likes where post_key = $1 and user_id = $2", [key, userId]);
  } else {
    await query("insert into engagement_blog_likes (post_key, user_id) values ($1, $2)", [key, userId]);
  }
  const count = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_blog_likes where post_key = $1",
    [key],
  );
  return { liked: !existing, likeCount: Number(count?.count ?? 0) };
}

export async function listBlogComments(postKey: string, limit = 40): Promise<BlogComment[]> {
  requireDatabase();
  const rows = await query<{
    id: string;
    body: string;
    created_at: string;
    wallet_pubkey: string;
    nickname: string | null;
    display_name: string | null;
  }>(
    `
      select c.id, c.body, c.created_at, u.wallet_pubkey, u.nickname, p.display_name
      from engagement_blog_comments c
      join users u on u.id = c.user_id
      left join engagement_passports p on p.user_id = c.user_id
      where c.post_key = $1
      order by c.created_at desc
      limit $2
    `,
    [postKey.slice(0, 160), Math.min(80, Math.max(1, limit))],
  );
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    author: { wallet: r.wallet_pubkey, nickname: r.nickname, displayName: r.display_name },
  }));
}

export async function postBlogComment(
  userId: string,
  meta: {
    postKey: string;
    kind?: string;
    kicker?: string;
    headline: string;
    lede?: string;
    body?: string;
    imageUrl?: string;
    matchExternalId?: string;
  },
  text: string,
): Promise<{ ok: true; comment: BlogComment } | { ok: false; reason: string }> {
  requireDatabase();
  const body = text.trim();
  if (body.length < 1 || body.length > 500) return { ok: false, reason: "invalid_body" };
  if (/[<>]/.test(body)) return { ok: false, reason: "invalid_chars" };
  await upsertBlogMeta(meta);
  const key = meta.postKey.slice(0, 160);

  const recent = await maybeOne<{ created_at: string }>(
    `
      select created_at from engagement_blog_comments
      where user_id = $1 and post_key = $2
      order by created_at desc limit 1
    `,
    [userId, key],
  );
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 4_000) {
    return { ok: false, reason: "slow_down" };
  }

  const row = await one<{ id: string }>(
    "insert into engagement_blog_comments (post_key, user_id, body) values ($1, $2, $3) returning id",
    [key, userId, body],
  );
  const comments = await listBlogComments(key, 1);
  const comment = comments.find((c) => c.id === row.id);
  if (!comment) return { ok: false, reason: "not_found" };
  return { ok: true, comment };
}

// --- Referrals ---

function makeReferralCode(wallet: string): string {
  const base = wallet.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const salt = Math.floor(Math.random() * 90 + 10);
  return `MM${base}${salt}`;
}

export async function getOrCreateReferralCode(userId: string, wallet: string): Promise<string> {
  requireDatabase();
  const existing = await maybeOne<{ code: string }>(
    "select code from engagement_referral_codes where user_id = $1",
    [userId],
  );
  if (existing) return existing.code;
  for (let i = 0; i < 5; i++) {
    const code = makeReferralCode(wallet);
    try {
      await query("insert into engagement_referral_codes (user_id, code) values ($1, $2)", [userId, code]);
      return code;
    } catch {
      /* collision */
    }
  }
  throw new Error("Could not create referral code");
}

export async function applyReferralCode(
  refereeId: string,
  code: string,
): Promise<{ ok: boolean; reason?: string }> {
  requireDatabase();
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return { ok: false, reason: "invalid_code" };
  const already = await maybeOne<{ id: string }>(
    "select id from engagement_referrals where referee_id = $1",
    [refereeId],
  );
  if (already) return { ok: false, reason: "already_referred" };

  const referrer = await maybeOne<{ user_id: string }>(
    "select user_id from engagement_referral_codes where code = $1",
    [cleaned],
  );
  if (!referrer) return { ok: false, reason: "code_not_found" };
  if (referrer.user_id === refereeId) return { ok: false, reason: "self_referral" };

  await query(
    "insert into engagement_referrals (referrer_id, referee_id, code, status) values ($1, $2, $3, 'pending')",
    [referrer.user_id, refereeId, cleaned],
  );
  return { ok: true };
}

export async function qualifyReferralIfNeeded(refereeId: string): Promise<void> {
  requireDatabase();
  const row = await maybeOne<{ id: string; referrer_id: string; status: string }>(
    "select id, referrer_id, status from engagement_referrals where referee_id = $1",
    [refereeId],
  );
  if (!row || row.status === "rewarded") return;
  await query(
    "update engagement_referrals set status = 'rewarded', qualified_at = now() where id = $1",
    [row.id],
  );
  await grantPassportXp(row.referrer_id, 80, "referral-bonus").catch(() => undefined);
  await grantPassportXp(refereeId, 40, "referral-welcome").catch(() => undefined);
}

export async function getReferralStats(userId: string): Promise<{
  code: string | null;
  invited: number;
  rewarded: number;
}> {
  requireDatabase();
  const code = await maybeOne<{ code: string }>(
    "select code from engagement_referral_codes where user_id = $1",
    [userId],
  );
  const stats = await maybeOne<{ invited: string; rewarded: string }>(
    `
      select
        count(*)::text as invited,
        count(*) filter (where status = 'rewarded')::text as rewarded
      from engagement_referrals
      where referrer_id = $1
    `,
    [userId],
  );
  return {
    code: code?.code ?? null,
    invited: Number(stats?.invited ?? 0),
    rewarded: Number(stats?.rewarded ?? 0),
  };
}

// --- Follows ---

export async function followUser(
  followerId: string,
  followeeWallet: string,
): Promise<{ ok: boolean; reason?: string; following?: boolean }> {
  requireDatabase();
  const followee = await maybeOne<{ id: string }>(
    "select id from users where wallet_pubkey = $1",
    [followeeWallet],
  );
  if (!followee) return { ok: false, reason: "user_not_found" };
  if (followee.id === followerId) return { ok: false, reason: "self" };

  const existing = await maybeOne<{ follower_id: string }>(
    "select follower_id from engagement_follows where follower_id = $1 and followee_id = $2",
    [followerId, followee.id],
  );
  if (existing) {
    await query("delete from engagement_follows where follower_id = $1 and followee_id = $2", [
      followerId,
      followee.id,
    ]);
    return { ok: true, following: false };
  }
  await query("insert into engagement_follows (follower_id, followee_id) values ($1, $2)", [
    followerId,
    followee.id,
  ]);
  return { ok: true, following: true };
}

export async function listFollowing(userId: string): Promise<
  { wallet: string; nickname: string | null; displayName: string | null; xp: number; level: number }[]
> {
  requireDatabase();
  const rows = await query<{
    wallet_pubkey: string;
    nickname: string | null;
    display_name: string | null;
    xp: number;
    level: number;
  }>(
    `
      select u.wallet_pubkey, u.nickname, p.display_name, coalesce(p.xp, 0) as xp, coalesce(p.level, 1) as level
      from engagement_follows f
      join users u on u.id = f.followee_id
      left join engagement_passports p on p.user_id = u.id
      where f.follower_id = $1
      order by f.created_at desc
      limit 50
    `,
    [userId],
  );
  return rows.map((r) => ({
    wallet: r.wallet_pubkey,
    nickname: r.nickname,
    displayName: r.display_name,
    xp: r.xp,
    level: r.level,
  }));
}

export async function listFollowersOf(userId: string): Promise<number> {
  requireDatabase();
  const row = await maybeOne<{ count: string }>(
    "select count(*)::text as count from engagement_follows where followee_id = $1",
    [userId],
  );
  return Number(row?.count ?? 0);
}

export async function followingSet(userId: string): Promise<Set<string>> {
  requireDatabase();
  const rows = await query<{ wallet_pubkey: string }>(
    `
      select u.wallet_pubkey
      from engagement_follows f
      join users u on u.id = f.followee_id
      where f.follower_id = $1
    `,
    [userId],
  );
  return new Set(rows.map((r) => r.wallet_pubkey));
}

// --- Wallet transaction history ---

export async function listWalletTransactions(
  userId: string,
  limit = 40,
): Promise<
  {
    id: string;
    type: string;
    status: string;
    signature: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }[]
> {
  requireDatabase();
  const rows = await query<{
    id: string;
    type: string;
    status: string;
    signature: string | null;
    metadata: Record<string, unknown> | string | null;
    created_at: string;
  }>(
    `
      select id, type, status, signature, metadata, created_at
      from transactions
      where user_id = $1
      order by created_at desc
      limit $2
    `,
    [userId, Math.min(80, Math.max(1, limit))],
  );

  // Enrich with poll votes + moment claims (memo receipts)
  const polls = await query<{
    id: string;
    tx_signature: string | null;
    choice: string;
    created_at: string;
  }>(
    `
      select id::text, tx_signature, choice, created_at
      from engagement_poll_votes
      where user_id = $1 and tx_signature is not null
      order by created_at desc
      limit 20
    `,
    [userId],
  );
  const moments = await query<{
    id: string;
    tx_signature: string;
    created_at: string;
  }>(
    `
      select id::text, tx_signature, created_at
      from engagement_moment_claims
      where user_id = $1
      order by created_at desc
      limit 20
    `,
    [userId],
  );

  const parseMeta = (m: Record<string, unknown> | string | null): Record<string, unknown> => {
    if (!m) return {};
    if (typeof m === "string") {
      try {
        return JSON.parse(m) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return m;
  };

  const merged = [
    ...rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      signature: r.signature,
      metadata: parseMeta(r.metadata),
      createdAt: r.created_at,
    })),
    ...polls.map((p) => ({
      id: `poll-${p.id}`,
      type: "poll_vote",
      status: "confirmed",
      signature: p.tx_signature,
      metadata: { choice: p.choice },
      createdAt: p.created_at,
    })),
    ...moments.map((m) => ({
      id: `moment-${m.id}`,
      type: "moment_claim",
      status: "confirmed",
      signature: m.tx_signature,
      metadata: {},
      createdAt: m.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return merged.slice(0, Math.min(80, Math.max(1, limit)));
}

