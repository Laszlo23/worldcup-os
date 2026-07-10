import { defineHandler } from "nitro";
import { leaderboardQuerySchema } from "@/lib/validators/api";
import { listLeaderboard } from "@/server/repositories/matches";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "leaderboard"))) return errorResponse("Rate limit exceeded", 429);
  const parsed = leaderboardQuerySchema.safeParse({ period: getQueryParam(event, "period") ?? "all_time" });
  if (!parsed.success) return errorResponse(parsed.error.message, 400);
  const rows = await listLeaderboard(parsed.data.period);
  return jsonResponse({ rows, period: parsed.data.period });
});
