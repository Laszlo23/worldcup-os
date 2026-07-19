import { defineHandler } from "nitro";
import { postBlogComment } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-blog-comment", 30, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const postKey = decodeURIComponent((event.context?.params?.postKey as string) ?? "").trim();
  if (!postKey) return errorResponse("postKey required", 400);

  const body = await readJsonBody<{
    text?: string;
    kind?: string;
    kicker?: string;
    headline?: string;
    lede?: string;
    body?: string;
    imageUrl?: string;
    matchExternalId?: string;
  }>(event);

  if (!body.headline?.trim()) return errorResponse("headline required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await postBlogComment(
      user.id,
      {
        postKey,
        kind: body.kind,
        kicker: body.kicker,
        headline: body.headline,
        lede: body.lede,
        body: body.body,
        imageUrl: body.imageUrl,
        matchExternalId: body.matchExternalId,
      },
      body.text ?? "",
    );
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_body: "Comment must be 1–500 characters",
        invalid_chars: "Invalid characters",
        slow_down: "Slow down — wait a few seconds",
        not_found: "Could not post",
      };
      return errorResponse(messages[result.reason] ?? result.reason, 400);
    }
    return jsonResponse({ comment: result.comment }, 201);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
