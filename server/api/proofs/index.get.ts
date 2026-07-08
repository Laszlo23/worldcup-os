import { defineHandler } from "nitro";
import { listProofs } from "@/server/repositories/matches";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "proofs"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");

  try {
    const proofs = await listProofs(matchId);
    return jsonResponse({ proofs });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
