import { defineHandler } from "nitro";
import { placePredictionSchema } from "@/lib/validators/api";
import { hasDatabase } from "@/server/config/env";
import { maybeOne, one, query, withTransaction } from "@/server/db/postgres";
import { verifyPlacePredictionTx } from "@/server/blockchain/verify";
import { insertLiveEvent } from "@/server/repositories/matches";
import { loadMarketBettingGate } from "@/server/services/market-betting-gate";
import { screenWallet } from "@/server/services/webacy-screening";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "predictions", 60))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const screening = await screenWallet(wallet, "deposit");
  if (!screening.allowed) return errorResponse(screening.reason, 403);

  const body = await readJsonBody<unknown>(event);
  const parsed = placePredictionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (!hasDatabase()) return errorResponse("Database unavailable", 503);

  if (!parsed.data.txSignature) {
    return errorResponse("On-chain transaction signature required", 400);
  }

  const verification = await verifyPlacePredictionTx({
    txSignature: parsed.data.txSignature,
    userPubkey: wallet,
    marketExternalId: parsed.data.marketExternalId,
    expectedAmount: parsed.data.amount,
  });

  if (!verification.ok) {
    return errorResponse(`Escrow verification failed: ${verification.reason}`, 400);
  }

  const reusedTx = await maybeOne<{ id: string }>(
    "select id from predictions where tx_signature = $1 limit 1",
    [parsed.data.txSignature],
  );
  if (reusedTx) return errorResponse("Transaction signature already used", 409);

  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
  if (!user) return errorResponse("User not found", 404);

  const market = await maybeOne<{
    id: string;
    external_id: string;
    match_id: string;
    type: string;
    closed: boolean;
    match_external_id: string;
    match_status: string;
    kickoff_at: string | null;
    closes_at: string | null;
  }>(
    `
      select m.id, m.external_id, m.match_id, m.type, m.closed, m.closes_at,
             mt.external_id as match_external_id, mt.status as match_status, mt.kickoff_at
      from markets m
      join matches mt on mt.id = m.match_id
      where m.external_id = $1
    `,
    [parsed.data.marketExternalId],
  );
  if (!market) return errorResponse("Market not found", 404);
  const gate = await loadMarketBettingGate(parsed.data.marketExternalId);
  if (!gate.ok) return errorResponse(gate.reason, 400);

  const option = await maybeOne<{ id: string; label: string; price: string | number }>(
    "select id, label, price from market_options where market_id = $1 and external_id = $2",
    [market.id, parsed.data.optionExternalId],
  );
  if (!option) return errorResponse("Outcome not found", 404);

  const externalId = `pred_${crypto.randomUUID().slice(0, 8)}`;
  const escrowPda = verification.escrowPda ?? parsed.data.escrowPda ?? null;
  const lockedAmount = verification.amount ?? parsed.data.amount;

  await withTransaction(async (client) => {
    const created = await one<{ id: string }>(
      `
        insert into predictions (
          external_id, user_id, market_id, match_id, option_id, outcome_label,
          amount, price, status, escrow_pda, tx_signature, placed_at
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, 'open', $9, $10, $11
        )
        returning id
      `,
      [
        externalId,
        user.id,
        market.id,
        market.match_id,
        option.id,
        option.label,
        lockedAmount,
        option.price,
        escrowPda,
        parsed.data.txSignature,
        new Date().toISOString(),
      ],
      client,
    );

    await query("insert into escrows (prediction_id, amount, status) values ($1, $2, 'locked')", [created.id, lockedAmount], client);
    await query(
      "insert into transactions (user_id, type, status, signature, metadata) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "place_prediction",
        "confirmed",
        parsed.data.txSignature,
        { predictionExternalId: externalId, amount: lockedAmount, escrowPda },
      ],
      client,
    );

    return created;
  });

  await insertLiveEvent(
    market.match_external_id,
    "odds_update",
    "PREDICTION · Escrow locked",
    `${lockedAmount} USDC on ${option.label} @ ${Number(option.price).toFixed(2)}x · awaiting kickoff`,
    { predictionId: externalId, matchId: market.match_external_id, amount: lockedAmount },
  );

  return jsonResponse({
    prediction: {
      id: externalId,
      marketId: market.external_id,
      matchId: market.match_external_id,
      outcomeId: parsed.data.optionExternalId,
      outcomeLabel: option.label,
      amount: lockedAmount,
      price: Number(option.price),
      placedAt: Date.now(),
      status: "open",
    },
  });
});
