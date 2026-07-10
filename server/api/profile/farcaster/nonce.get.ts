import { defineHandler } from "nitro";
import { createNonce } from "@/server/services/nonce-store";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "farcaster-nonce", 30))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const nonce = await createNonce(wallet);
  return jsonResponse({ nonce });
});
