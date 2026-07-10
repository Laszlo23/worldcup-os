#!/usr/bin/env tsx
/**
 * Seed exactly one presenter demo: open prediction + honest oracle timeline.
 * No fake wins before kickoff. Idempotent — safe to re-run.
 *
 * Usage: node --import tsx scripts/seed-presenter-demo.ts
 */
import { one, maybeOne, query, withTransaction } from "../src/server/db/postgres";
import { hasDatabase } from "../src/server/config/env";

const DEMO_PREDICTION_ID = "pred_present_demo";
const PRESENTER_WALLET = process.env.PRESENTER_WALLET ?? "Ebg5SZicANi5w1sABmQ8RrYcYtFtULVY4skeC6e5LYWY";
const MATCH_EXTERNAL_ID = "fx-18209181";
const MARKET_EXTERNAL_ID = "fx-18209181-winner";
const OPTION_EXTERNAL_ID = "h";
const STAKE_USDC = 10;

async function main() {
  if (!hasDatabase()) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const existing = await maybeOne<{ id: string }>(
    "select id from predictions where external_id = $1",
    [DEMO_PREDICTION_ID],
  );
  if (existing) {
    console.log("Presenter demo already seeded:", DEMO_PREDICTION_ID);
    return;
  }

  const ctx = await one<{
    user_id: string;
    market_id: string;
    match_id: string;
    option_id: string;
    option_label: string;
    price: string;
    match_uuid: string;
  }>(
    `
      select
        u.id as user_id,
        m.id as market_id,
        m.match_id,
        mo.id as option_id,
        mo.label as option_label,
        mo.price::text as price,
        m.match_id as match_uuid
      from users u
      join markets m on m.external_id = $2
      join market_options mo on mo.market_id = m.id and mo.external_id = $3
      join matches mt on mt.id = m.match_id
      where u.wallet_pubkey = $1 and mt.status = 'scheduled'
    `,
    [PRESENTER_WALLET, MARKET_EXTERNAL_ID, OPTION_EXTERNAL_ID],
  );

  const price = Number(ctx.price);
  const placedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  await withTransaction(async (client) => {
    const pred = await one<{ id: string }>(
      `
        insert into predictions (
          external_id, user_id, market_id, match_id, option_id, outcome_label,
          amount, price, status, payout, claimed, escrow_pda, tx_signature, placed_at
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, 'open', null, false, null, null, $9
        )
        returning id
      `,
      [
        DEMO_PREDICTION_ID,
        ctx.user_id,
        ctx.market_id,
        ctx.match_id,
        ctx.option_id,
        ctx.option_label,
        STAKE_USDC,
        price,
        placedAt,
      ],
      client,
    );

    await query(
      "insert into escrows (prediction_id, amount, status) values ($1, $2, 'locked')",
      [pred.id, STAKE_USDC],
      client,
    );
  });

  const eventRows: Array<[string, string, string, Record<string, unknown>, string]> = [
    [
      "odds_update",
      "ODDS · France shortened",
      `${ctx.option_label} winner market · ${price.toFixed(2)}x after TxLINE fixture sync`,
      { matchId: MATCH_EXTERNAL_ID, marketId: MARKET_EXTERNAL_ID, demo: true },
      new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    ],
    [
      "market_close",
      "MARKET · Winner open",
      `${MATCH_EXTERNAL_ID} · predictions accepted until 5 min before kickoff`,
      { matchId: MATCH_EXTERNAL_ID, demo: true },
      new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    ],
    [
      "odds_update",
      "PREDICTION · Escrow locked",
      `${STAKE_USDC} USDC on ${ctx.option_label} @ ${price.toFixed(2)}x · awaiting kickoff`,
      { predictionId: DEMO_PREDICTION_ID, amount: STAKE_USDC, demo: true },
      placedAt,
    ],
  ];

  for (const [eventType, title, body, payload, createdAt] of eventRows) {
    await query(
      `
        insert into live_events (match_id, event_type, title, body, payload, source, created_at)
        values ($1, $2, $3, $4, $5, 'txline', $6)
      `,
      [ctx.match_id, eventType, title, body, payload, createdAt],
    );
  }

  console.log("Seeded presenter demo (open only):");
  console.log("  Prediction:", DEMO_PREDICTION_ID, "·", STAKE_USDC, "USDC on", ctx.option_label, "· open");
  console.log("  Wallet:", PRESENTER_WALLET);
  console.log("  Live events:", eventRows.length);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
