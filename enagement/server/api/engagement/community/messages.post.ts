import { defineHandler } from "nitro";
import { postFanMessage } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-fan-chat-post", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ matchId?: string; body?: string }>(event);
  const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
  const text = typeof body.body === "string" ? body.body : "";
  if (!matchId) return errorResponse("matchId required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await postFanMessage({ userId: user.id, matchExternalId: matchId, body: text });
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_body: "Message must be 1–500 characters",
        invalid_chars: "Message contains invalid characters",
        match_not_found: "Match not found",
        slow_down: "Slow down — wait a few seconds between messages",
      };
      return errorResponse(messages[result.reason] ?? result.reason, 400);
    }
    return jsonResponse({ message: result.message }, 201);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
