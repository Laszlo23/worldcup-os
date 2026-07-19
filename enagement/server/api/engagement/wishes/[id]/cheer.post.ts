import { defineHandler } from "nitro";
import { cheerFanWish } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-wishes-cheer", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const wishId = (event.context.params as { id?: string })?.id?.trim();
  if (!wishId) return errorResponse("Wish id required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await cheerFanWish(user.id, wishId);
    if (!result.ok) return errorResponse("Wish not found", 404);
    return jsonResponse({ cheers: result.cheers });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
