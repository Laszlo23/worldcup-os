import { createHash } from "node:crypto";
import { Keypair, Transaction } from "@solana/web3.js";
import { hasDatabase } from "../config/env";
import { maybeOne, query } from "../db/postgres";
import { findFeaturedEngagementMatch, upsertUser } from "../repositories/matches";
import {
  ensurePassport,
  listPolls,
  postFanMessage,
  updateFanProfile,
  voteOnPoll,
} from "../repositories/engagement";
import { buildAnchorReceiptTx } from "../blockchain/anchor-receipt";
import { getConnection } from "../blockchain/escrow";
import { ensureDevnetGas, isDevnetFaucetEnabled } from "../blockchain/faucet";

type VibePersona = {
  slug: string;
  nickname: string;
  displayName: string;
  vibe: string;
  lean: "home" | "away" | "neutral" | "chaos";
  lines: string[];
};

const PERSONAS: VibePersona[] = [
  {
    slug: "rio-fire",
    nickname: "RioFire",
    displayName: "RioFire",
    vibe: "Argentina terrace hype",
    lean: "home",
    lines: [
      "LETS GOOO the terrace is LOUD tonight 🔥",
      "That press is filthy — lock the next window YES",
      "Passport heating up. Who's with me on this call?",
      "Felt that wave through the whole stadium",
      "Don't blink — next seven minutes decide everything",
      "Crew chat energy is unmatched rn",
    ],
  },
  {
    slug: "iberia-pulse",
    nickname: "IberiaPulse",
    displayName: "IberiaPulse",
    vibe: "Spain tempo & midfield control",
    lean: "away",
    lines: [
      "Possession story writing itself — trust the tempo",
      "Midfield is cooking. Poll window looks juicy",
      "Clean patterns. I'm locking with conviction",
      "Watch the half-spaces — something's brewing",
      "Calm on the ball, chaos in the chat 😏",
      "Spain/Argentina nights were made for MatchMind",
    ],
  },
  {
    slug: "desk-oracle",
    nickname: "DeskOracle",
    displayName: "DeskOracle",
    vibe: "Cold analytical desk",
    lean: "neutral",
    lines: [
      "Numbers lean one way — terrace leans the other. Interesting.",
      "xG swing incoming if they keep that line high",
      "Window math: short horizon, high variance. Still calling it.",
      "AgentX pulse matches what I'm seeing on the pitch",
      "Discipline > vibes… but vibes help XP 👀",
      "Tracking the next event key. Stay sharp.",
    ],
  },
  {
    slug: "terrace-chief",
    nickname: "TerraceChief",
    displayName: "TerraceChief",
    vibe: "Crowd conductor",
    lean: "chaos",
    lines: [
      "WHO'S CHECKED IN AT THE STATION?? 📢",
      "Make some noise — live drops love a loud crew",
      "Chat is the twelfth man tonight",
      "If you're watching with friends, spam the pulse",
      "This terrace needs MORE chaos. More polls. More claims.",
      "Follow the predictors who are eating tonight",
    ],
  },
  {
    slug: "night-owl",
    nickname: "NightOwl",
    displayName: "NightOwl",
    vibe: "Late drama specialist",
    lean: "chaos",
    lines: [
      "Late nights hit different when the score is thin",
      "Someone's about to cook a 90+ moment… feel it",
      "I'm not sleeping till this window settles",
      "Drama mode: ON. Album ready.",
      "The quiet minutes before a banger — classic",
      "Keep the passport warm. Night shifts pay XP.",
    ],
  },
  {
    slug: "xp-hunter",
    nickname: "XPHunter",
    displayName: "XPHunter",
    vibe: "Prediction grinder",
    lean: "neutral",
    lines: [
      "Locking a call — streak stays alive 💪",
      "Poll desk is open. Free XP if you read the tempo",
      "Already in on this window. Who fades me?",
      "Crowd vs Agent? I'm splitting the difference tonight",
      "Every correct window stacks the passport. Simple.",
      "Mining the next seven minutes. See you on the board.",
    ],
  },
];

function masterSeed(): string {
  return (
    process.env.VIBE_AGENTS_MASTER_SEED?.trim() ||
    process.env.SETTLEMENT_AUTHORITY_SECRET?.trim() ||
    process.env.SOLANA_DEPLOYER_SECRET?.trim() ||
    "matchmind-vibe-dev-seed"
  );
}

function agentKeypair(slug: string): Keypair {
  const digest = createHash("sha256").update(`matchmind-vibe-v1:${masterSeed()}:${slug}`).digest();
  return Keypair.fromSeed(digest.subarray(0, 32));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildChatLine(
  persona: VibePersona,
  ctx: { home: string; away: string; score: string; minute: number; status: string },
): string {
  const base = pick(persona.lines);
  const spice = [
    `${ctx.home} ${ctx.score} ${ctx.away}`,
    ctx.status === "live" || ctx.status === "halftime" ? `${ctx.minute}'` : ctx.status,
    `${ctx.home} vs ${ctx.away}`,
  ];
  if (Math.random() < 0.55) {
    return `${base} (${pick(spice)})`;
  }
  return base;
}

function choiceForPersona(
  persona: VibePersona,
  question: string,
  yesShare: number,
): "yes" | "no" {
  const q = question.toLowerCase();
  const homeBias = /home|argentina|left/.test(q);
  const awayBias = /away|spain|right/.test(q);
  if (persona.lean === "home" && (homeBias || /goal|score/.test(q))) return Math.random() < 0.72 ? "yes" : "no";
  if (persona.lean === "away" && (awayBias || /goal|score/.test(q))) return Math.random() < 0.72 ? "yes" : "no";
  if (persona.lean === "chaos") return Math.random() < 0.5 ? "yes" : "no";
  // Desk / hunter — slight crowd follow with noise
  if (yesShare >= 0.58) return Math.random() < 0.7 ? "yes" : "no";
  if (yesShare <= 0.42) return Math.random() < 0.7 ? "no" : "yes";
  return Math.random() < 0.5 ? "yes" : "no";
}

async function ensureAgent(persona: VibePersona): Promise<{
  slug: string;
  userId: string;
  wallet: string;
  keypair: Keypair;
} | null> {
  const keypair = agentKeypair(persona.slug);
  const wallet = keypair.publicKey.toBase58();
  const user = await upsertUser(
    wallet,
    persona.nickname,
    `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${persona.slug}`,
  );
  await ensurePassport(user.id);
  await updateFanProfile(user.id, { displayName: persona.displayName }).catch(() => undefined);

  await query(
    `
      insert into engagement_vibe_agents (slug, user_id, wallet_pubkey, persona, enabled, updated_at)
      values ($1, $2, $3, $4, true, now())
      on conflict (slug) do update set
        user_id = excluded.user_id,
        wallet_pubkey = excluded.wallet_pubkey,
        persona = excluded.persona,
        enabled = true,
        updated_at = now()
    `,
    [persona.slug, user.id, wallet, persona.vibe],
  );

  return { slug: persona.slug, userId: user.id, wallet, keypair };
}

async function signPollVote(params: {
  keypair: Keypair;
  userId: string;
  pollId: string;
  choice: "yes" | "no";
}): Promise<{ ok: boolean; signature?: string; reason?: string }> {
  const wallet = params.keypair.publicKey.toBase58();
  if (isDevnetFaucetEnabled()) {
    await ensureDevnetGas({
      userPubkey: wallet,
      userId: params.userId,
      reason: "vibe_agent_vote",
    }).catch(() => undefined);
  }

  const memo = `matchmind:poll:${params.pollId}:${params.choice}:${wallet}`;
  const built = await buildAnchorReceiptTx({ userPubkey: wallet, memo });
  const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
  tx.partialSign(params.keypair);

  const connection = getConnection();
  let signature: string;
  try {
    signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction(signature, "confirmed");
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "send_failed" };
  }

  const result = await voteOnPoll(params.userId, params.pollId, params.choice, signature);
  if (!result.ok) return { ok: false, reason: result.reason, signature };
  return { ok: true, signature };
}

export async function runVibeAgentsTick(): Promise<{
  ok: boolean;
  skipped?: string;
  chats: number;
  votes: number;
  errors: string[];
}> {
  if (process.env.VIBE_AGENTS_ENABLED === "0") {
    return { ok: true, skipped: "disabled", chats: 0, votes: 0, errors: [] };
  }
  if (!hasDatabase()) {
    return { ok: true, skipped: "no_database", chats: 0, votes: 0, errors: [] };
  }

  // Ensure table exists (migration may lag on some hosts)
  try {
    await query("select 1 from engagement_vibe_agents limit 1");
  } catch {
    return { ok: false, skipped: "table_missing", chats: 0, votes: 0, errors: ["table_missing"] };
  }

  const match = await findFeaturedEngagementMatch();
  if (!match) {
    return { ok: true, skipped: "no_match", chats: 0, votes: 0, errors: [] };
  }

  const errors: string[] = [];
  let chats = 0;
  let votes = 0;

  // Bootstrap all personas (idempotent)
  const agents: NonNullable<Awaited<ReturnType<typeof ensureAgent>>>[] = [];
  for (const persona of PERSONAS) {
    try {
      const a = await ensureAgent(persona);
      if (a) agents.push(a);
    } catch (err) {
      errors.push(`${persona.slug}:ensure:${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!agents.length) {
    return { ok: false, chats: 0, votes: 0, errors };
  }

  // Chat: 1–2 agents per tick (hot terrace without flooding)
  const chatCount = Math.random() < 0.55 ? 2 : 1;
  const chatAgents = [...agents].sort(() => Math.random() - 0.5).slice(0, chatCount);
  for (const agent of chatAgents) {
    const persona = PERSONAS.find((p) => p.slug === agent.slug)!;
    const recent = await maybeOne<{ last_chat_at: string | null }>(
      "select last_chat_at from engagement_vibe_agents where slug = $1",
      [agent.slug],
    );
    if (
      recent?.last_chat_at &&
      Date.now() - new Date(recent.last_chat_at).getTime() < 45_000
    ) {
      continue;
    }
    const body = buildChatLine(persona, {
      home: match.home.name,
      away: match.away.name,
      score: `${match.scoreHome}–${match.scoreAway}`,
      minute: match.minute ?? 0,
      status: match.status,
    });
    try {
      const posted = await postFanMessage({
        userId: agent.userId,
        matchExternalId: match.id,
        body,
      });
      if (posted.ok) {
        chats += 1;
        await query(
          `
            update engagement_vibe_agents
            set last_chat_at = now(), chats_sent = chats_sent + 1, updated_at = now()
            where slug = $1
          `,
          [agent.slug],
        );
      } else if (posted.reason !== "slow_down") {
        errors.push(`${agent.slug}:chat:${posted.reason}`);
      }
    } catch (err) {
      errors.push(`${agent.slug}:chat:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Votes: up to 2 open-poll locks per tick across agents
  const polls = (await listPolls(match.id)).filter(
    (p) => !p.outcome && new Date(p.closes_at).getTime() > Date.now() + 20_000,
  );
  if (polls.length > 0) {
    const voteAgents = [...agents].sort(() => Math.random() - 0.5);
    let voteBudget = 2;
    for (const agent of voteAgents) {
      if (voteBudget <= 0) break;
      const poll = pick(polls);
      const already = await maybeOne<{ id: string }>(
        `
          select v.id from engagement_poll_votes v
          join engagement_polls p on p.id = v.poll_id
          where v.user_id = $1 and p.external_id = $2
        `,
        [agent.userId, poll.external_id],
      );
      if (already) continue;

      const persona = PERSONAS.find((p) => p.slug === agent.slug)!;
      const yes = poll.yes_votes ?? 0;
      const no = poll.no_votes ?? 0;
      const total = yes + no;
      const yesShare = total > 0 ? yes / total : 0.5;
      const choice = choiceForPersona(persona, poll.question, yesShare);

      try {
        const voted = await signPollVote({
          keypair: agent.keypair,
          userId: agent.userId,
          pollId: poll.external_id,
          choice,
        });
        if (voted.ok) {
          votes += 1;
          voteBudget -= 1;
          await query(
            `
              update engagement_vibe_agents
              set last_vote_at = now(), votes_cast = votes_cast + 1, updated_at = now()
              where slug = $1
            `,
            [agent.slug],
          );
        } else if (voted.reason && voted.reason !== "already_voted") {
          errors.push(`${agent.slug}:vote:${voted.reason}`);
        }
      } catch (err) {
        errors.push(`${agent.slug}:vote:${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { ok: errors.length === 0 || chats + votes > 0, chats, votes, errors };
}

/** Wallets belonging to vibe agents — for UI badges. */
export async function listVibeAgentWallets(): Promise<Set<string>> {
  if (!hasDatabase()) return new Set();
  try {
    const rows = await query<{ wallet_pubkey: string }>(
      "select wallet_pubkey from engagement_vibe_agents where enabled = true",
    );
    return new Set(rows.map((r) => r.wallet_pubkey));
  } catch {
    return new Set();
  }
}
