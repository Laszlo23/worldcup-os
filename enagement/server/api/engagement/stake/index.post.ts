import { defineHandler } from "nitro";
import { stakeXp, unstakeXp, claimMinedMm, convertMmToXp } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-stake-mutate"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ action?: string; amount?: number }>(event);
  const action = body?.action;
  const amount = Number(body?.amount ?? 0);

  try {
    const user = await upsertUser(wallet);

    if (action === "stake") {
      const result = await stakeXp(user.id, amount);
      if (!result.ok) {
        const msg =
          result.reason === "insufficient_xp"
            ? "Not enough liquid XP"
            : result.reason === "min_10"
              ? "Stake at least 10 XP"
              : "Stake failed";
        return errorResponse(msg, 400);
      }
      return jsonResponse({ ok: true, status: result.status });
    }

    if (action === "unstake") {
      const result = await unstakeXp(user.id, amount);
      if (!result.ok) {
        return errorResponse(
          result.reason === "insufficient_staked" ? "Not enough staked XP" : "Unstake failed",
          400,
        );
      }
      return jsonResponse({ ok: true, status: result.status });
    }

    if (action === "claim") {
      const result = await claimMinedMm(user.id);
      return jsonResponse({ ok: true, claimed: result.claimed, status: result.status });
    }

    if (action === "convert") {
      const result = await convertMmToXp(user.id, amount);
      if (!result.ok) {
        return errorResponse(
          result.reason === "insufficient_mm" ? "Not enough MM" : "Convert at least 1 MM",
          400,
        );
      }
      return jsonResponse({ ok: true, xpGained: result.xpGained, status: result.status });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
