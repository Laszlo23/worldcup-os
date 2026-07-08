import { defineHandler } from "nitro";
import { claimPredictionSchema } from "@/lib/validators/api";
import { hasDatabase } from "@/server/config/env";
import { maybeOne, query, withTransaction } from "@/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "claim", 60))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = claimPredictionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (!hasDatabase()) {
    return jsonResponse({ ok: true, payout: 0 });
  }

  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
  if (!user) return errorResponse("User not found", 404);

  const prediction = await maybeOne<{
    id: string;
    external_id: string;
    payout: string | number | null;
    status: string;
    claimed: boolean;
  }>(
    "select id, external_id, payout, status, claimed from predictions where external_id = $1 and user_id = $2",
    [parsed.data.predictionExternalId, user.id],
  );
  if (!prediction) return errorResponse("Prediction not found", 404);
  if (prediction.status !== "won" || prediction.claimed) return errorResponse("Nothing to claim", 400);

  await withTransaction(async (client) => {
    await query("update predictions set claimed = true, status = 'settled', updated_at = now() where id = $1", [prediction.id], client);
    await query("update escrows set status = 'claimed', updated_at = now() where prediction_id = $1", [prediction.id], client);
    await query(
      "insert into transactions (user_id, type, status, signature, metadata) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "claim",
        parsed.data.txSignature ? "confirmed" : "pending",
        parsed.data.txSignature ?? null,
        { predictionExternalId: prediction.external_id, payout: prediction.payout },
      ],
      client,
    );
    await query(
      "insert into notifications (user_id, type, title, body, payload) values ($1, $2, $3, $4, $5)",
      [
        user.id,
        "reward_claimed",
        "Reward claimed",
        `+${Number(prediction.payout).toFixed(2)} USDC`,
        { predictionId: prediction.external_id },
      ],
      client,
    );
  });

  return jsonResponse({ ok: true, payout: Number(prediction.payout) });
});
