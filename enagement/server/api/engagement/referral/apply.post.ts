import { defineHandler } from "nitro";
import { applyReferralCode } from "@shared/server/repositories/engagement";
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
  if (!(await rateLimit(event, "engagement-referral-apply", 10, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ code?: string }>(event);
  const code = body.code?.trim();
  if (!code) return errorResponse("code required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await applyReferralCode(user.id, code);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid_code: "Invalid code",
        already_referred: "Referral already applied",
        code_not_found: "Code not found",
        self_referral: "Can't use your own code",
      };
      return errorResponse(messages[result.reason ?? ""] ?? result.reason ?? "Failed", 400);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
