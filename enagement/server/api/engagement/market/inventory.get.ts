import { defineHandler } from "nitro";
import { listOwnedTradeableStickers } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-market-inv", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const user = await upsertUser(wallet);
    const inventory = await listOwnedTradeableStickers(user.id);
    return jsonResponse({ inventory });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
