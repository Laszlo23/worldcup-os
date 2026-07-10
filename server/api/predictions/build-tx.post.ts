import { defineHandler } from "nitro";
import { z } from "zod";
import { buildPlacePredictionTx, getPlacePredictionRequirements } from "@/server/blockchain/escrow";
import { formatInsufficientSolMessage } from "@/lib/wallet/prediction-errors";
import { getSolBalance } from "@/server/services/auth";
import { hasDatabase } from "@/server/config/env";
import { maybeOne } from "@/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";

const buildTxSchema = z.object({
  marketExternalId: z.string().min(1),
  amount: z.number().positive().max(1_000_000),
});

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "build-tx", 60))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = buildTxSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (hasDatabase()) {
    const market = await maybeOne<{ closed: boolean; match_status: string; kickoff_at: string | null }>(
      `
        select m.closed, mt.status as match_status, mt.kickoff_at
        from markets m
        join matches mt on mt.id = m.match_id
        where m.external_id = $1
      `,
      [parsed.data.marketExternalId],
    );
    if (!market || market.closed || market.match_status !== "scheduled") {
      return errorResponse("Market closed for predictions", 400);
    }
    if (market.kickoff_at) {
      const closesAt = new Date(market.kickoff_at).getTime() - 5 * 60_000;
      if (Date.now() >= closesAt) {
        return errorResponse("Market closed — kickoff window passed", 400);
      }
    }
  }

  const requirements = await getPlacePredictionRequirements({
    userPubkey: wallet,
    marketExternalId: parsed.data.marketExternalId,
  });

  const solBalance = await getSolBalance(wallet);
  if (solBalance * 1_000_000_000 < requirements.estimatedLamports) {
    return errorResponse(
      formatInsufficientSolMessage({
        solBalance,
        requiredLamports: requirements.estimatedLamports,
        needsUserAta: requirements.needsUserAta,
        needsEscrowAta: requirements.needsEscrowAta,
      }),
      400,
    );
  }

  const built = await buildPlacePredictionTx({
    userPubkey: wallet,
    amount: parsed.data.amount,
    marketExternalId: parsed.data.marketExternalId,
  });

  if (!built) return errorResponse("Failed to build prediction transaction", 500);
  return jsonResponse(built);
});
