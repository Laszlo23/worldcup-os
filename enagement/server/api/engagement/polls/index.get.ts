import { defineHandler } from "nitro";
import { listPolls } from "@shared/server/repositories/engagement";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-polls"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  try {
    const polls = await listPolls(matchId);
    return jsonResponse({
      polls: polls.map((p) => ({
        id: p.external_id,
        matchId: p.match_external_id,
        question: p.question,
        window: p.window_label,
        countdown: Math.max(0, Math.floor((new Date(p.closes_at).getTime() - Date.now()) / 1000)),
        yesReward: p.yes_reward,
        noReward: p.no_reward,
        probability: 0.55,
        voters: 0,
        outcome: p.outcome,
        resolved: Boolean(p.outcome),
      })),
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
