import { defineHandler } from "nitro";
import { listSuperfanLeaderboard } from "@shared/server/repositories/superfan";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { clampQueryLimit, errorResponse, jsonResponse, rateLimit, getQueryParam } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "superfan-leaderboard"))) return errorResponse("Rate limit exceeded", 429);
  const limit = clampQueryLimit(getQueryParam(event, "limit"), 50, 100);

  try {
    const rows = await listSuperfanLeaderboard(limit);
    return jsonResponse({ rows });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
