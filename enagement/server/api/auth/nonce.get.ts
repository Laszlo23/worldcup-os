import { defineHandler } from "nitro";
import { createNonce } from "@shared/server/services/nonce-store";
import { buildAuthMessage } from "@shared/server/services/auth";
import { isValidSolanaPubkey } from "@shared/server/lib/solana-pubkey";
import { jsonResponse, rateLimit, errorResponse, getQueryParam, getRequestHost } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-nonce", 60))) return errorResponse("Rate limit exceeded", 429);
  const pubkey = getQueryParam(event, "pubkey");
  if (!pubkey || !isValidSolanaPubkey(pubkey)) return errorResponse("Invalid pubkey", 400);
  const nonce = await createNonce(pubkey);
  const domain = getRequestHost(event);
  return jsonResponse({ nonce, message: buildAuthMessage(pubkey, nonce, domain) });
});
