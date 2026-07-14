import { defineHandler } from "nitro";
import { getSuperfanScore } from "@shared/server/repositories/superfan";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "superfan-score"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const score = await getSuperfanScore(wallet);
    return jsonResponse({ wallet, ...score });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
