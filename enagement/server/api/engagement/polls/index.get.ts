import { defineHandler } from "nitro";
import { listPolls } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  getQueryParam,
  getSessionWallet,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-polls"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  try {
    const wallet = await getSessionWallet(event);
    let userId: string | undefined;
    if (wallet) {
      const user = await upsertUser(wallet);
      userId = user.id;
    }
    const polls = await listPolls(matchId, userId);
    return jsonResponse({
      polls: polls.map((p) => {
        const yes = p.yes_votes ?? 0;
        const no = p.no_votes ?? 0;
        const total = yes + no;
        const probability = total > 0 ? yes / total : 0.5;
        return {
          id: p.external_id,
          matchId: p.match_external_id,
          question: p.question,
          window: p.window_label,
          countdown: Math.max(0, Math.floor((new Date(p.closes_at).getTime() - Date.now()) / 1000)),
          yesReward: p.yes_reward,
          noReward: p.no_reward,
          probability,
          voters: total,
          yesVotes: yes,
          noVotes: no,
          userChoice: p.user_choice ?? null,
          outcome: p.outcome,
          resolved: Boolean(p.outcome),
        };
      }),
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
