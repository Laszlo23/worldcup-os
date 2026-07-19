import { defineHandler } from "nitro";
import { buyStickerListing } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
  readJsonBody,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-market-buy", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ listingId?: string }>(event);
  const listingId = body.listingId?.trim();
  if (!listingId) return errorResponse("listingId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await buyStickerListing(user.id, listingId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "Listing not found",
        not_open: "Listing is no longer available",
        own_listing: "Can't buy your own listing",
        already_owned: "You already own this sticker",
        seller_missing: "Seller no longer holds this sticker",
        insufficient_xp: "Not enough XP",
      };
      return errorResponse(messages[result.reason ?? ""] ?? result.reason ?? "Buy failed", 400);
    }
    return jsonResponse({ ok: true, priceXp: result.priceXp });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
