import { defineHandler } from "nitro";
import { listProofs, listOnChainEscrowProofs } from "@/server/repositories/matches";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "proofs"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");

  try {
    const [proofs, escrowProofs] = await Promise.all([
      listProofs(matchId),
      listOnChainEscrowProofs(matchId),
    ]);
    return jsonResponse({ proofs, escrowProofs });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
