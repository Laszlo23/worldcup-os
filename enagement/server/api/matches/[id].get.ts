import { defineHandler } from "nitro";
import { getMatchByExternalId, listMarkets, listProofs, listOnChainEscrowProofs } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "match-detail"))) return errorResponse("Rate limit exceeded", 429);
  const id = event.context.params?.id;
  if (!id) return errorResponse("Missing match id", 400);

  try {
    const match = await getMatchByExternalId(id);
    if (!match) return errorResponse("Match not found", 404);
    const [markets, proofs, escrowProofs] = await Promise.all([
      listMarkets(id),
      listProofs(id),
      listOnChainEscrowProofs(id),
    ]);
    return jsonResponse({ match, markets, proof: proofs[0] ?? null, escrowProofs });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
