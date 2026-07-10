import { defineHandler } from "nitro";
import { farcasterLinkSchema } from "@/lib/validators/api";
import { hasDatabase } from "@/server/config/env";
import { getProfileByWallet, linkFarcasterProfile } from "@/server/repositories/profile";
import { verifyFarcasterSignIn } from "@/server/services/farcaster";
import { consumeNonce } from "@/server/services/nonce-store";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "farcaster-link", 20))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<unknown>(event);
  const parsed = farcasterLinkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  if (!hasDatabase()) return errorResponse("Database unavailable", 503);

  const nonceOk = await consumeNonce(wallet, parsed.data.nonce);
  if (!nonceOk) return errorResponse("Invalid or expired nonce", 400);

  const verified = await verifyFarcasterSignIn(parsed.data);
  if (!verified) return errorResponse("Farcaster verification failed", 400);

  const existing = await getProfileByWallet(wallet);
  if (!existing) return errorResponse("Profile not found", 404);

  try {
    const profile = await linkFarcasterProfile({
      walletPubkey: wallet,
      fid: verified.fid,
      username: verified.username,
      pfpUrl: verified.pfpUrl,
    });
    return jsonResponse({ profile });
  } catch (err) {
    if (err instanceof Error && err.message === "farcaster_fid_taken") {
      return errorResponse("This Farcaster account is already linked to another wallet", 409);
    }
    throw err;
  }
});
