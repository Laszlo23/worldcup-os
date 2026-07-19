import { defineHandler } from "nitro";
import { getBlogEngagement, listBlogComments } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getSessionWallet } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-blog-get", 60, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const postKey = decodeURIComponent((event.context?.params?.postKey as string) ?? "").trim();
  if (!postKey) return errorResponse("postKey required", 400);

  try {
    const wallet = await getSessionWallet(event);
    let userId: string | undefined;
    if (wallet) userId = (await upsertUser(wallet)).id;
    const engagement = await getBlogEngagement(postKey, userId);
    const comments = await listBlogComments(postKey, 50);
    return jsonResponse({ engagement, comments });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
