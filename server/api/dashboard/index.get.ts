import { defineHandler } from "nitro";
import { getPlatformStats } from "@/server/services/analytics";
import { listMatches } from "@/server/repositories/matches";
import { errorResponse, jsonResponse, rateLimit } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "dashboard"))) return errorResponse("Rate limit exceeded", 429);
  const [totals, matches] = await Promise.all([getPlatformStats(), listMatches()]);
  const liveMatches = matches.filter((m) => m.status === "live" || m.status === "halftime").length;
  return jsonResponse({
    totals: { ...totals, liveMatches },
    matches,
  });
});
