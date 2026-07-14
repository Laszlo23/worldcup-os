import { hasDatabase, LiveDataRequiredError } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";
import { upsertUser } from "./matches";

export const SHARE_POINTS = 25;
export const AGENT_DEPLOY_POINTS = 100;

export type SuperfanSource = "share" | "task" | "passport" | "agent_deploy" | "agent_win";
export type SuperfanApp = "wmos" | "agentx" | "matchmind";

const VALID_TASKS: Record<string, number> = {
  "follow-x": 50,
  "join-telegram": 40,
  "share-replay": 75,
  "first-prediction": 25,
  "verify-proof": 30,
  "oracle-tour": 20,
  "connect-wallet": 15,
  "star-github": 35,
};

function requireDatabase(): void {
  if (!hasDatabase()) throw new LiveDataRequiredError();
}

function dayBucket(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export type AwardPointsInput = {
  walletPubkey: string;
  source: SuperfanSource;
  app: SuperfanApp;
  points: number;
  channel?: string;
  contentType?: string;
  contentId?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export async function awardSuperfanPoints(input: AwardPointsInput): Promise<{ awarded: number; total: number; duplicate?: boolean }> {
  requireDatabase();
  const user = await upsertUser(input.walletPubkey);
  const existing = await maybeOne<{ id: string }>(
    "select id from superfan_points_ledger where idempotency_key = $1",
    [input.idempotencyKey],
  );
  if (existing) {
    const total = await getSuperfanTotal(user.id);
    return { awarded: 0, total, duplicate: true };
  }

  await query(
    `
      insert into superfan_points_ledger
        (user_id, wallet_pubkey, source, app, channel, content_type, content_id, points, idempotency_key, metadata)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    `,
    [
      user.id,
      input.walletPubkey,
      input.source,
      input.app,
      input.channel ?? null,
      input.contentType ?? null,
      input.contentId ?? null,
      input.points,
      input.idempotencyKey,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  await query(
    "update users set superfan_points = superfan_points + $2, updated_at = now() where id = $1",
    [user.id, input.points],
  );

  const total = await getSuperfanTotal(user.id);
  return { awarded: input.points, total };
}

async function getSuperfanTotal(userId: string): Promise<number> {
  const row = await one<{ superfan_points: number }>("select superfan_points from users where id = $1", [userId]);
  return row.superfan_points;
}

export async function recordShare(input: {
  walletPubkey: string;
  app: SuperfanApp;
  channel: string;
  contentType: string;
  contentId: string;
  url?: string;
}): Promise<{ awarded: number; total: number; duplicate?: boolean }> {
  const idempotencyKey = `share:${input.walletPubkey}:${input.contentType}:${input.contentId}:${input.channel}:${dayBucket()}`;
  return awardSuperfanPoints({
    walletPubkey: input.walletPubkey,
    source: "share",
    app: input.app,
    points: SHARE_POINTS,
    channel: input.channel,
    contentType: input.contentType,
    contentId: input.contentId,
    idempotencyKey,
    metadata: input.url ? { url: input.url } : {},
  });
}

export async function completeTask(walletPubkey: string, taskId: string): Promise<{ awarded: number; total: number; duplicate?: boolean }> {
  const points = VALID_TASKS[taskId];
  if (!points) throw new Error("Invalid task");
  return awardSuperfanPoints({
    walletPubkey,
    source: "task",
    app: "wmos",
    points,
    contentType: "task",
    contentId: taskId,
    idempotencyKey: `task:${walletPubkey}:${taskId}`,
  });
}

export async function awardAgentDeploy(walletPubkey: string): Promise<{ awarded: number; total: number; duplicate?: boolean }> {
  return awardSuperfanPoints({
    walletPubkey,
    source: "agent_deploy",
    app: "agentx",
    points: AGENT_DEPLOY_POINTS,
    contentType: "agent",
    contentId: "deploy",
    idempotencyKey: `agent_deploy:${walletPubkey}`,
  });
}

export async function syncPassportXpLedger(walletPubkey: string, xpDelta: number, reason: string): Promise<void> {
  if (xpDelta <= 0) return;
  await awardSuperfanPoints({
    walletPubkey,
    source: "passport",
    app: "matchmind",
    points: xpDelta,
    contentType: "passport",
    contentId: reason,
    idempotencyKey: `passport:${walletPubkey}:${reason}:${dayBucket()}:${xpDelta}`,
  }).catch(() => undefined);
}

export type SuperfanScore = {
  total: number;
  rank: number | null;
  breakdown: { share: number; task: number; passport: number; agent: number; other: number };
  recent: { source: string; app: string; points: number; createdAt: string }[];
};

export async function getSuperfanScore(walletPubkey: string): Promise<SuperfanScore> {
  requireDatabase();
  const user = await upsertUser(walletPubkey);
  const total = await getSuperfanTotal(user.id);

  const breakdownRows = await query<{ source: string; sum: string }>(
    `
      select source, coalesce(sum(points), 0)::text as sum
      from superfan_points_ledger
      where user_id = $1
      group by source
    `,
    [user.id],
  );

  const breakdown = { share: 0, task: 0, passport: 0, agent: 0, other: 0 };
  for (const row of breakdownRows) {
    const val = Number(row.sum);
    if (row.source === "share") breakdown.share = val;
    else if (row.source === "task") breakdown.task = val;
    else if (row.source === "passport") breakdown.passport = val;
    else if (row.source === "agent_deploy" || row.source === "agent_win") breakdown.agent += val;
    else breakdown.other += val;
  }

  const rankRow = await maybeOne<{ rank: string }>(
    `
      select count(*) + 1 as rank
      from users
      where superfan_points > (select superfan_points from users where id = $1)
    `,
    [user.id],
  );

  const recent = await query<{ source: string; app: string; points: number; created_at: string }>(
    `
      select source, app, points, created_at
      from superfan_points_ledger
      where user_id = $1
      order by created_at desc
      limit 10
    `,
    [user.id],
  );

  return {
    total,
    rank: rankRow ? Number(rankRow.rank) : null,
    breakdown,
    recent: recent.map((r) => ({
      source: r.source,
      app: r.app,
      points: r.points,
      createdAt: r.created_at,
    })),
  };
}

export type SuperfanLeaderRow = {
  rank: number;
  wallet: string;
  points: number;
  nickname: string | null;
  avatar: string | null;
};

export async function listSuperfanLeaderboard(limit = 50): Promise<SuperfanLeaderRow[]> {
  requireDatabase();
  const rows = await query<{
    wallet_pubkey: string;
    superfan_points: number;
    nickname: string | null;
    avatar: string | null;
  }>(
    `
      select wallet_pubkey, superfan_points, nickname, avatar
      from users
      where superfan_points > 0
      order by superfan_points desc
      limit $1
    `,
    [limit],
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    wallet: r.wallet_pubkey,
    points: r.superfan_points,
    nickname: r.nickname,
    avatar: r.avatar,
  }));
}

export async function listCompletedTasks(walletPubkey: string): Promise<string[]> {
  requireDatabase();
  const user = await upsertUser(walletPubkey);
  const rows = await query<{ content_id: string }>(
    `
      select content_id
      from superfan_points_ledger
      where user_id = $1 and source = 'task' and content_id is not null
    `,
    [user.id],
  );
  return rows.map((r) => r.content_id).filter(Boolean);
}
