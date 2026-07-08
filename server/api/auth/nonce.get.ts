import { defineHandler } from "nitro";
import { createNonce } from "@/server/services/nonce-store";
import { buildAuthMessage } from "@/server/services/auth";
import { jsonResponse, rateLimit, errorResponse, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-nonce", 60))) return errorResponse("Rate limit exceeded", 429);
  const pubkey = getQueryParam(event, "pubkey");
  if (!pubkey) return errorResponse("Missing pubkey", 400);
  const nonce = await createNonce(pubkey);
  return jsonResponse({ nonce, message: buildAuthMessage(pubkey, nonce) });
});
