import { defineHandler } from "nitro";
import { claimPredictionSchema } from "@/lib/validators/api";
import { executeClaimPayout } from "@/server/blockchain/escrow";
import { hasDatabase } from "@/server/config/env";
import { maybeOne, query, withTransaction } from "@/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "claim", 30))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  let body: unknown;
  try {
    body = await readJsonBody<unknown>(event);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Invalid request body", 400);
  }
  const parsed = claimPredictionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (!hasDatabase()) {
    return errorResponse("Database unavailable", 503);
  }

  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
  if (!user) return errorResponse("User not found", 404);

  const locked = await withTransaction(async (client) => {
    const prediction = await maybeOne<{
      id: string;
      external_id: string;
      payout: string | number | null;
      status: string;
      claimed: boolean;
    }>(
      "select id, external_id, payout, status, claimed from predictions where external_id = $1 and user_id = $2 for update",
      [parsed.data.predictionExternalId, user.id],
      client,
    );
    if (!prediction || prediction.status !== "won" || prediction.claimed) return null;

    await query(
      "update predictions set claimed = true, status = 'settled', updated_at = now() where id = $1 and claimed = false",
      [prediction.id],
      client,
    );
    await query("update escrows set status = 'claimed', updated_at = now() where prediction_id = $1", [prediction.id], client);

    return prediction;
  });

  if (!locked) return errorResponse("Nothing to claim", 400);

  const payout = Number(locked.payout ?? 0);
  if (!Number.isFinite(payout) || payout <= 0) {
    await revertClaim(locked.id, user.id);
    return errorResponse("Invalid payout amount", 400);
  }

  let txSignature: string;
  let explorerUrl: string | null = null;

  try {
    const sent = await executeClaimPayout({ userPubkey: wallet, amount: payout });
    if (!sent) {
      await revertClaim(locked.id, user.id);
      return errorResponse("Unable to send USDC payout. Settlement pool may be empty — try again shortly.", 503);
    }
    txSignature = sent.signature;
    explorerUrl = sent.explorerUrl;
  } catch {
    await revertClaim(locked.id, user.id);
    return errorResponse("Payout transaction failed", 502);
  }

  const reused = await maybeOne<{ id: string }>(
    "select id from transactions where signature = $1 and type = 'claim' limit 1",
    [txSignature],
  );
  if (reused) {
    await revertClaim(locked.id, user.id);
    return errorResponse("Payout transaction already recorded", 409);
  }

  await withTransaction(async (client) => {
    await query(
      "insert into transactions (user_id, type, status, signature, metadata) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "claim",
        "confirmed",
        txSignature,
        { predictionExternalId: locked.external_id, payout, explorerUrl },
      ],
      client,
    );
    await query(
      "insert into notifications (user_id, type, title, body, payload) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "reward_claimed",
        "Reward claimed",
        `+${payout.toFixed(2)} USDC`,
        { predictionId: locked.external_id, txSignature, explorerUrl },
      ],
      client,
    );
  });

  return jsonResponse({ ok: true, payout, txSignature, explorerUrl });
});

async function revertClaim(predictionId: string, userId: string): Promise<void> {
  await withTransaction(async (client) => {
    await query(
      "update predictions set claimed = false, status = 'won', updated_at = now() where id = $1 and user_id = $2",
      [predictionId, userId],
      client,
    );
    await query("update escrows set status = 'released', updated_at = now() where prediction_id = $1", [predictionId], client);
  });
}
