import { defineHandler } from "nitro";
import { createStickerListing } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-market-create", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ stickerId?: string; priceXp?: number }>(event);
  const stickerId = body.stickerId?.trim();
  const priceXp = Number(body.priceXp);
  if (!stickerId) return errorResponse("stickerId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await createStickerListing(user.id, stickerId, priceXp);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_price: "Price must be 25–50,000 XP",
        not_owned: "You don't own this sticker",
        already_listed: "Already listed",
        not_found: "Listing failed",
      };
      return errorResponse(messages[result.reason] ?? result.reason, 400);
    }
    return jsonResponse({ listing: result.listing }, 201);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
