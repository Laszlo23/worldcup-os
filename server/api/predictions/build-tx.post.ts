import { defineHandler } from "nitro";
import { z } from "zod";
import { buildPlacePredictionTx, getPlacePredictionRequirements } from "@/server/blockchain/escrow";
import { formatInsufficientSolMessage } from "@/lib/wallet/prediction-errors";
import { getSolBalance } from "@/server/services/auth";
import { hasDatabase } from "@/server/config/env";
import { loadMarketBettingGate } from "@/server/services/market-betting-gate";
import { screenWallet } from "@/server/services/webacy-screening";
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

  const screening = await screenWallet(wallet, "deposit");
  if (!screening.allowed) return errorResponse(screening.reason, 403);

  const body = await readJsonBody<unknown>(event);
  const parsed = buildTxSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (hasDatabase()) {
    const gate = await loadMarketBettingGate(parsed.data.marketExternalId);
    if (!gate.ok) return errorResponse(gate.reason, 400);
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
