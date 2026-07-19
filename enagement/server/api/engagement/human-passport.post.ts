import { defineHandler } from "nitro";
import { saveHumanPassportScore } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { fetchHumanPassportScore, isHumanPassportConfigured } from "@shared/server/services/human-passport";
import { maybeOne } from "@shared/server/db/postgres";
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
  if (!(await rateLimit(event, "engagement-human-passport", 10, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  // Ignore any client-supplied EVM address — only score the address linked on this passport.
  await readJsonBody(event);

  try {
    const user = await upsertUser(wallet);
    const evm = (
      await maybeOne<{ evm_address: string | null }>(
        "select evm_address from engagement_passports where user_id = $1",
        [user.id],
      )
    )?.evm_address?.trim();

    if (!evm) {
      return errorResponse("Add an EVM address on your profile to check Human Passport", 400);
    }

    const result = await fetchHumanPassportScore(evm);
    if (result.error && result.score == null && !isHumanPassportConfigured()) {
      return jsonResponse({
        ok: false,
        configured: false,
        passportUrl: "https://passport.human.tech/",
        error: result.error,
        wallet,
      });
    }
    if (result.error && result.score == null) {
      return errorResponse(result.error, 400);
    }

    const passport = await saveHumanPassportScore(user.id, result.score);
    return jsonResponse({
      ok: true,
      configured: true,
      score: result.score,
      passing: result.passing,
      passport,
      wallet,
      passportUrl: "https://passport.human.tech/",
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
