import { defineHandler } from "nitro";
import { likeBlogPost } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-blog-like", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const postKey = decodeURIComponent((event.context?.params?.postKey as string) ?? "").trim();
  if (!postKey) return errorResponse("postKey required", 400);

  const body = await readJsonBody<{
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
    const result = await likeBlogPost(user.id, {
      postKey,
      kind: body.kind,
      kicker: body.kicker,
      headline: body.headline,
      lede: body.lede,
      body: body.body,
      imageUrl: body.imageUrl,
      matchExternalId: body.matchExternalId,
    });
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
