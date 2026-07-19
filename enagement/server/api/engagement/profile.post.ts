import { defineHandler } from "nitro";
import { updateFanProfile, type FanSocials } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-profile", 20, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{
    displayName?: string | null;
    socials?: FanSocials;
    evmAddress?: string | null;
  }>(event);

  try {
    const user = await upsertUser(wallet);
    const passport = await updateFanProfile(user.id, {
      displayName: body.displayName,
      socials: body.socials,
      evmAddress: body.evmAddress,
    });
    return jsonResponse({ ok: true, passport, wallet });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    return errorResponse(err instanceof Error ? err.message : "Profile update failed", 400);
  }
});
