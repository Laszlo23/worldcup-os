import { defineHandler } from "nitro";
import {
  getStadiumCrowd,
  listCommunityPulse,
  listFanReactionSummary,
  listFanXpLeaderboard,
} from "@shared/server/repositories/engagement";
import { listSuperfanLeaderboard } from "@shared/server/repositories/superfan";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, getQueryParam, jsonResponse, rateLimit } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-community"))) return errorResponse("Rate limit exceeded", 429);

  const matchId = getQueryParam(event, "matchId");

  try {
    const [xpBoard, superfanBoard, crowd, reactions, pulse] = await Promise.all([
      listFanXpLeaderboard(30),
      listSuperfanLeaderboard(20).catch(() => []),
      matchId ? getStadiumCrowd(matchId) : Promise.resolve({ checkedIn: 0, recent: [] }),
      matchId ? listFanReactionSummary(matchId) : Promise.resolve([]),
      matchId ? listCommunityPulse(matchId, 24) : Promise.resolve([]),
    ]);

    return jsonResponse({
      xpLeaderboard: xpBoard,
      superfanLeaderboard: superfanBoard,
      crowd,
      reactions,
      pulse,
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
