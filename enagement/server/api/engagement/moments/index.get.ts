import { defineHandler } from "nitro";
import { listMoments } from "@shared/server/repositories/engagement";
import { getSessionWallet } from "@shared/server/middleware/http";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-moments"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");

  try {
    const wallet = await getSessionWallet(event);
    let userId: string | undefined;
    if (wallet) {
      const user = await upsertUser(wallet);
      userId = user.id;
    }
    const moments = await listMoments(matchId, userId);
    return jsonResponse({
      moments: moments.map((m) => ({
        id: m.external_id,
        matchId: m.match_external_id,
        title: m.title,
        player: m.player ?? "",
        minute: m.minute ?? 0,
        rarity: m.rarity,
        image: m.image_url ?? "/moment-volley.jpg",
        serial: m.serial_label ?? "",
        match: m.match_external_id,
        claimed: m.claimed,
      })),
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
