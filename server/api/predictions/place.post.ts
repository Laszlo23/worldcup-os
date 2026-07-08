import { defineHandler } from "nitro";
import { placePredictionSchema } from "@/lib/validators/api";
import { hasDatabase, useMockFallback } from "@/server/config/env";
import { maybeOne, one, query, withTransaction } from "@/server/db/postgres";
import { verifyPlacePredictionTx } from "@/server/blockchain/verify";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "predictions", 60))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = placePredictionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (useMockFallback()) {
    return jsonResponse({
      prediction: {
        id: `pred_${crypto.randomUUID().slice(0, 8)}`,
        marketId: parsed.data.marketExternalId,
        matchId: "",
        outcomeId: parsed.data.optionExternalId,
        outcomeLabel: "",
        amount: parsed.data.amount,
        price: 1,
        status: "open",
        placedAt: Date.now(),
      },
    });
  }

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

  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
  if (!user) return errorResponse("User not found", 404);

  const market = await maybeOne<{
    id: string;
    external_id: string;
    match_id: string;
    closed: boolean;
    match_external_id: string;
  }>(
    `
      select m.id, m.external_id, m.match_id, m.closed, mt.external_id as match_external_id
      from markets m
      join matches mt on mt.id = m.match_id
      where m.external_id = $1
    `,
    [parsed.data.marketExternalId],
  );
  if (!market || market.closed) return errorResponse("Market closed", 400);

  const option = await maybeOne<{ id: string; label: string; price: string | number }>(
    "select id, label, price from market_options where market_id = $1 and external_id = $2",
    [market.id, parsed.data.optionExternalId],
  );
  if (!option) return errorResponse("Outcome not found", 404);

  const externalId = `pred_${crypto.randomUUID().slice(0, 8)}`;
  const escrowPda = verification.escrowPda ?? parsed.data.escrowPda ?? null;

  const prediction = await withTransaction(async (client) => {
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
        parsed.data.amount,
        option.price,
        escrowPda,
        parsed.data.txSignature,
        new Date().toISOString(),
      ],
      client,
    );

    await query("insert into escrows (prediction_id, amount, status) values ($1, $2, 'locked')", [created.id, parsed.data.amount], client);
    await query(
      "insert into transactions (user_id, type, status, signature, metadata) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "place_prediction",
        "confirmed",
        parsed.data.txSignature,
        { predictionExternalId: externalId, amount: parsed.data.amount, escrowPda },
      ],
      client,
    );

    return created;
  });

  return jsonResponse({
    prediction: {
      id: externalId,
      marketId: market.external_id,
      matchId: market.match_external_id,
      outcomeId: parsed.data.optionExternalId,
      outcomeLabel: option.label,
      amount: parsed.data.amount,
      price: Number(option.price),
      placedAt: Date.now(),
      status: "open",
    },
  });
});
