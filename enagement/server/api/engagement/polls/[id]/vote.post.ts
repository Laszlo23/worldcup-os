import { defineHandler } from "nitro";
import { voteOnPoll } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-vote"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const pollId = event.context?.params?.id as string | undefined;
  if (!pollId) return errorResponse("Poll id required", 400);

  const body = await readJsonBody<{ choice?: string }>(event);
  const choice = body.choice === "no" ? "no" : body.choice === "yes" ? "yes" : null;
  if (!choice) return errorResponse("choice must be yes or no", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await voteOnPoll(user.id, pollId, choice);
    if (!result.ok) return errorResponse(result.reason ?? "vote_failed", 400);
    return jsonResponse({ ok: true, choice });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
