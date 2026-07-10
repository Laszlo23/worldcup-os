#!/usr/bin/env node
/**
 * Seed judge-demo data: live events, settled match proof, demo users + leaderboard, statistics.
 * Run: DATABASE_URL=... node scripts/seed-demo.mjs
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to seed demo data. Set ALLOW_DEMO_SEED=true to run this script.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const DEMO_PROOF = {
  matchExternalId: "m7",
  merkleRoot: "0x7f3a8b2c1d4e5f6a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  proofHash: "0x54025f38abbd08567c21e8f4d3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4",
  signature: "ed25519:bae86c8aae8827demo_stat_validation_sig",
  solanaTx: process.env.SETTLEMENT_TX_SIGNATURE ?? "",
};

const LIVE_EVENTS = [
  { event_type: "goal", title: "GOAL · Argentina 2–1 Brazil", body: "TxLINE stat validation · Messi 23'" },
  { event_type: "odds_update", title: "MARKET ENGINE · Odds shift", body: "Winner market: ARG 2.10 → 1.85" },
  { event_type: "market_close", title: "MARKET ENGINE · Auto-close", body: "Markets locked before kickoff" },
  { event_type: "settlement", title: "SETTLEMENT · Solana escrow", body: "Match settled · winners paid on devnet" },
  { event_type: "proof_verified", title: "PROOF · Merkle root verified", body: "Oracle signature validated · root on-chain" },
  { event_type: "goal", title: "GOAL · France 1–1 Germany", body: "TxLINE live score update" },
  { event_type: "odds_update", title: "ODDS · Draw market", body: "Draw 3.40 → 3.15" },
  { event_type: "tx_confirmed", title: "ON-CHAIN · Escrow confirmed", body: "USDC locked in escrow PDA" },
  { event_type: "settlement_started", title: "SETTLEMENT · Processing", body: "Stat-validation fetched from TxLINE" },
  { event_type: "proof_verified", title: "PROOF · Certificate ready", body: "View in Proof Explorer" },
];

const DEMO_USERS = [
  { wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", nickname: "AlphaTrader", profit: 4200 },
  { wallet: "9aBzK3mN8pQr2sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq", nickname: "OracleFan", profit: 3100 },
  { wallet: "3FpqR7sT1uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ", nickname: "SolanaMaxi", profit: 2800 },
  { wallet: "Hn2Mk5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq", nickname: "TxLinePro", profit: 1900 },
  { wallet: "Cw8Rk2mN5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNo", nickname: "WorldCupOS", profit: 1200 },
];

try {
  // Ensure settled match m7 exists (upsert minimal row if missing)
  await pool.query(
    `
      insert into matches (
        external_id, txline_fixture_id, home_team, away_team, score_home, score_away,
        status, minute, stadium, stage, kickoff_at, score_seq
      ) values (
        'm7', 900007,
        '{"id":"bra","name":"Brazil","code":"BRA","flag":"🇧🇷"}'::jsonb,
        '{"id":"esp","name":"Spain","code":"ESP","flag":"🇪🇸"}'::jsonb,
        1, 2, 'settled', 90, 'Khalifa International', 'Round of 16', now() - interval '48 hours', 1842
      )
      on conflict (external_id) do update set
        status = 'settled', score_home = 1, score_away = 2, score_seq = 1842, updated_at = now()
    `,
  );

  const matchRes = await pool.query("select id from matches where external_id = $1", [DEMO_PROOF.matchExternalId]);
  const matchId = matchRes.rows[0]?.id;
  if (!matchId) throw new Error("Match m7 not found");

  // Live events
  for (const [i, ev] of LIVE_EVENTS.entries()) {
    await pool.query(
      `
        insert into live_events (match_id, event_type, title, body, created_at, source)
        select $1, $2, $3, $4, now() - ($5 || ' seconds')::interval, 'demo'
        where not exists (
          select 1 from live_events where title = $3 and event_type = $2 limit 1
        )
      `,
      [matchId, ev.event_type, ev.title, ev.body, String((LIVE_EVENTS.length - i) * 30)],
    );
  }

  // Demo proof
  const existingProof = await pool.query("select id from proofs where match_id = $1 limit 1", [matchId]);
  if (!existingProof.rows.length) {
    const settlement = await pool.query(
      `insert into settlements (match_id, status, started_at, finished_at)
       values ($1, 'completed', now() - interval '1 hour', now() - interval '59 minutes')
       returning id`,
      [matchId],
    );
    await pool.query(
      `
        insert into proofs (
          match_id, settlement_id, merkle_root, proof_hash, signature, validation_status,
          solana_tx, explorer_url, final_score_home, final_score_away, validated_at, source
        ) values ($1, $2, $3, $4, $5, 'verified', $6, $7, 1, 2, now() - interval '58 minutes', 'demo')
      `,
      [
        matchId,
        settlement.rows[0].id,
        DEMO_PROOF.merkleRoot,
        DEMO_PROOF.proofHash,
        DEMO_PROOF.signature,
        DEMO_PROOF.solanaTx || null,
        DEMO_PROOF.solanaTx ? `https://explorer.solana.com/tx/${DEMO_PROOF.solanaTx}?cluster=devnet` : null,
      ],
    );
  }

  // Demo users + leaderboard
  for (const [i, u] of DEMO_USERS.entries()) {
    const userRes = await pool.query(
      `
        insert into users (wallet_pubkey, nickname, joined_at)
        values ($1, $2, now() - interval '7 days')
        on conflict (wallet_pubkey) do update set nickname = excluded.nickname
        returning id
      `,
      [u.wallet, u.nickname],
    );
    const userId = userRes.rows[0].id;
    for (const period of ["weekly", "monthly", "all_time"]) {
      await pool.query(
        `
          insert into leaderboard (user_id, period, rank, profit, roi, win_rate, correct, streak, volume, biggest_win)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (user_id, period) do update set
            rank = excluded.rank, profit = excluded.profit, roi = excluded.roi,
            win_rate = excluded.win_rate, correct = excluded.correct, streak = excluded.streak,
            volume = excluded.volume, biggest_win = excluded.biggest_win, updated_at = now()
        `,
        [userId, period, i + 1, u.profit, 12.5, 68 - i * 3, 24 - i * 2, Math.max(1, 8 - i), u.profit * 4, u.profit * 0.4],
      );
    }
  }

  // Refresh statistics buckets from current DB state
  const vol = await pool.query(
    `select coalesce(sum(amount), 0)::float as t from predictions`,
  );
  const users = await pool.query(`select count(*)::int as c from users`);
  const proofs = await pool.query(`select count(*)::int as c from proofs where validation_status = 'verified'`);
  const metrics = {
    tvl: Number(vol.rows[0]?.t ?? 0),
    markets: 0,
    liveMatches: 0,
    users: users.rows[0]?.c ?? 0,
    transactions: proofs.rows[0]?.c ?? 0,
  };
  const marketCount = await pool.query(`select count(*)::int as c from markets`);
  metrics.markets = marketCount.rows[0]?.c ?? 0;

  await pool.query(
    `
      insert into statistics (scope, bucket, metrics)
      values ('platform', 'totals', $1::jsonb)
      on conflict (scope, bucket) do update set metrics = excluded.metrics, updated_at = now()
    `,
    [JSON.stringify(metrics)],
  );

  console.log("Demo seed complete:", {
    matchId,
    liveEvents: LIVE_EVENTS.length,
    leaderboardUsers: DEMO_USERS.length,
  });
} finally {
  await pool.end();
}
