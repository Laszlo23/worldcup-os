import { defineHandler } from "nitro";
import { walletAuthSchema } from "@shared/lib/validators/api";
import { verifyWalletSignature, extractDomainFromAuthMessage } from "@shared/server/services/auth";
import { tryUpsertUser } from "@shared/server/repositories/matches";
import { getUsdcBalance } from "@shared/server/services/auth";
import { consumeNonce, extractNonceFromMessage } from "@shared/server/services/nonce-store";
import { createSessionToken, buildSessionCookie } from "@shared/server/services/session";
import { isValidSolanaPubkey } from "@shared/server/lib/solana-pubkey";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireMutationOrigin, isAllowedAuthDomain, isRequestSecure } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-verify", 30))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  const body = await readJsonBody<unknown>(event);
  const parsed = walletAuthSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { pubkey, signature, message, nickname } = parsed.data;
  if (!isValidSolanaPubkey(pubkey)) return errorResponse("Invalid pubkey", 400);
  if (!verifyWalletSignature(pubkey, message, signature)) {
    return errorResponse("Invalid wallet signature", 401);
  }
  if (!message.includes(pubkey)) return errorResponse("Message mismatch", 400);
  const messageDomain = extractDomainFromAuthMessage(message);
  if (!messageDomain || !isAllowedAuthDomain(messageDomain, event)) {
    return errorResponse("Invalid auth domain — refresh and sign again", 401);
  }

  const nonce = extractNonceFromMessage(message);
  if (!nonce || !(await consumeNonce(pubkey, nonce))) {
    return errorResponse("Invalid or expired nonce — click Connect and sign again", 401);
  }

  const user = await tryUpsertUser(pubkey, nickname);
  const balance = await getUsdcBalance(pubkey);
  const token = await createSessionToken(pubkey);

  return jsonResponse(
    {
      user: {
        id: user?.id ?? pubkey,
        wallet: pubkey,
        nickname: user?.nickname ?? nickname ?? `Trader ${pubkey.slice(0, 4)}`,
        avatar: user?.avatar ?? `https://api.dicebear.com/9.x/shapes/svg?seed=${pubkey}`,
      },
      balance,
    },
    200,
    { "Set-Cookie": buildSessionCookie(token, isRequestSecure(event)) },
  );
});
