import { defineHandler } from "nitro";
import { z } from "zod";
import { buildPlacePredictionTx } from "@/server/blockchain/escrow";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession } from "@/server/middleware/http";

const buildTxSchema = z.object({
  marketExternalId: z.string().min(1),
  amount: z.number().positive().max(1_000_000),
});

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "build-tx", 60))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = buildTxSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const built = await buildPlacePredictionTx({
    userPubkey: wallet,
    amount: parsed.data.amount,
    marketExternalId: parsed.data.marketExternalId,
  });

  if (!built) return errorResponse("Failed to build transaction", 500);
  return jsonResponse(built);
});
