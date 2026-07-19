import { defineHandler } from "nitro";
import { mintLegendSticker } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-legend-mint", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ stickerId?: string }>(event);
  const stickerId = body.stickerId?.trim();
  if (!stickerId) return errorResponse("stickerId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await mintLegendSticker(user.id, stickerId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        unknown_legend: "Unknown legend card",
        already_owned: "You already own this legend NFT",
        insufficient_xp: "Not enough XP to mint",
      };
      return errorResponse(messages[result.reason ?? ""] ?? result.reason ?? "Mint failed", 400);
    }
    return jsonResponse({ ok: true, stickerId: result.stickerId, xpSpent: result.xpSpent });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
