import { defineHandler } from "nitro";
import { listMarkets } from "@/server/repositories/matches";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "markets"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  const markets = await listMarkets(matchId);
  return jsonResponse({ markets });
});
