import { defineHandler } from "nitro";
import { listLeaderboard } from "@/server/repositories/matches";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "leaderboard"))) return errorResponse("Rate limit exceeded", 429);
  const period = (getQueryParam(event, "period") ?? "all_time") as "weekly" | "monthly" | "all_time";
  const rows = await listLeaderboard(period);
  return jsonResponse({ rows, period });
});
