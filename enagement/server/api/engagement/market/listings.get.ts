import { defineHandler } from "nitro";
import { listStickerListings } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getSessionWallet } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-market-list", 60, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  try {
    const wallet = await getSessionWallet(event);
    let userId: string | undefined;
    if (wallet) {
      const user = await upsertUser(wallet);
      userId = user.id;
    }
    const listings = await listStickerListings({ userId, status: "open", limit: 60 });
    return jsonResponse({ listings });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
