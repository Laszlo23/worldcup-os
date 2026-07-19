import { defineHandler } from "nitro";
import { listFanWishes, type FanWishKind } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getSessionWallet } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-wishes-list", 60, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const url = new URL(event.node.req.url ?? "/", "http://local");
  const kindRaw = url.searchParams.get("kind");
  const kind =
    kindRaw === "feature" || kindRaw === "feedback" || kindRaw === "shoutout"
      ? (kindRaw as FanWishKind)
      : undefined;

  try {
    const wallet = await getSessionWallet(event);
    let userId: string | undefined;
    if (wallet) {
      const user = await upsertUser(wallet);
      userId = user.id;
    }
    const wishes = await listFanWishes({ kind, userId, limit: 50 });
    return jsonResponse({ wishes });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
