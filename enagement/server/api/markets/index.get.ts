import { defineHandler } from "nitro";
import { listMarkets } from "@shared/server/repositories/matches";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "markets"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  const bettableOnly = getQueryParam(event, "bettable") === "true";
  const markets = await listMarkets(matchId, bettableOnly);
  return jsonResponse({ markets });
});
