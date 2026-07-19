import { defineHandler } from "nitro";
import { cancelStickerListing } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-market-cancel", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ listingId?: string }>(event);
  const listingId = body.listingId?.trim();
  if (!listingId) return errorResponse("listingId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await cancelStickerListing(user.id, listingId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "Listing not found",
        not_seller: "Not your listing",
        not_open: "Listing is not open",
      };
      return errorResponse(messages[result.reason ?? ""] ?? result.reason ?? "Cancel failed", 400);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
