import { defineHandler } from "nitro";
import { getOrCreateReferralCode, getReferralStats } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-referral-get", 30, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const user = await upsertUser(wallet);
    const code = await getOrCreateReferralCode(user.id, wallet);
    const stats = await getReferralStats(user.id);
    return jsonResponse({
      code,
      invited: stats.invited,
      rewarded: stats.rewarded,
      shareUrl: `https://match.buildingcultureid.space/?ref=${encodeURIComponent(code)}`,
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
