import { defineHandler } from "nitro";
import { postFanWish, type FanWishKind } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-wishes-post", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ kind?: string; body?: string }>(event);
  const kind = body.kind as FanWishKind | undefined;
  const text = typeof body.body === "string" ? body.body : "";

  try {
    const user = await upsertUser(wallet);
    const result = await postFanWish({ userId: user.id, kind: kind ?? "feedback", body: text });
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_kind: "Pick feature, feedback, or shoutout",
        invalid_body: "Message must be 3–400 characters",
        invalid_chars: "Message contains invalid characters",
        slow_down: "Slow down — wait a few seconds",
        not_found: "Could not load wish",
      };
      return errorResponse(messages[result.reason] ?? result.reason, 400);
    }
    return jsonResponse({ wish: result.wish }, 201);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
