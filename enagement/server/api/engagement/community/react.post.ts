import { defineHandler } from "nitro";
import { postFanReaction } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-fan-react", 60, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ matchId?: string; emoji?: string }>(event);
  const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
  const emoji = typeof body.emoji === "string" ? body.emoji : "";
  if (!matchId) return errorResponse("matchId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await postFanReaction({ userId: user.id, matchExternalId: matchId, emoji });
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_emoji: "Unsupported reaction",
        match_not_found: "Match not found",
        slow_down: "Easy — reactions are cooling down",
      };
      return errorResponse(messages[result.reason] ?? result.reason, 400);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
