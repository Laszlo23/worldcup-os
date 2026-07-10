import { defineHandler } from "nitro";
import { updateProfileSchema } from "@/lib/validators/api";
import { hasDatabase } from "@/server/config/env";
import { getProfileByWallet, updateProfile } from "@/server/repositories/profile";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "profile-update", 30))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (!hasDatabase()) return errorResponse("Database unavailable", 503);

  const existing = await getProfileByWallet(wallet);
  if (!existing) return errorResponse("Profile not found", 404);

  const updated = await updateProfile(wallet, {
    nickname: parsed.data.nickname,
    bio: parsed.data.bio,
    xHandle: parsed.data.xHandle,
  });

  return jsonResponse({ profile: updated });
});
