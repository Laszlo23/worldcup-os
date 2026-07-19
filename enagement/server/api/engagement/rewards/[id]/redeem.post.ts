import { defineHandler } from "nitro";
import { redeemReward } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-redeem"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const rewardId = event.context?.params?.id as string | undefined;
  if (!rewardId) return errorResponse("Reward id required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await redeemReward(user.id, rewardId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        already_redeemed: "You already redeemed this reward",
        insufficient_xp: "Not enough XP — earn more from polls and moments",
        reward_not_found: "Reward not found",
      };
      const reason = result.reason ?? "redeem_failed";
      return errorResponse(messages[reason] ?? reason, 400);
    }
    return jsonResponse({ ok: true, xpSpent: result.xpSpent });

  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
