import { defineHandler } from "nitro";
import { followUser, listFollowing } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-follow", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ wallet?: string; action?: string }>(event);

  try {
    const user = await upsertUser(wallet);
    if (body.action === "list") {
      const following = await listFollowing(user.id);
      return jsonResponse({ following });
    }
    const target = body.wallet?.trim();
    if (!target) return errorResponse("wallet required", 400);
    const result = await followUser(user.id, target);
    if (!result.ok) {
      const messages: Record<string, string> = {
        user_not_found: "Predictor not found",
        self: "Can't follow yourself",
      };
      return errorResponse(messages[result.reason ?? ""] ?? result.reason ?? "Failed", 400);
    }
    return jsonResponse({ ok: true, following: result.following });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
