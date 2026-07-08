import { defineHandler } from "nitro";
import { walletAuthSchema } from "@/lib/validators/api";
import { verifyWalletSignature } from "@/server/services/auth";
import { upsertUser } from "@/server/repositories/matches";
import { getUsdcBalance } from "@/server/services/auth";
import { consumeNonce, extractNonceFromMessage } from "@/server/services/nonce-store";
import { createSessionToken, buildSessionCookie } from "@/server/services/session";
import { errorResponse, jsonResponse, rateLimit, readJsonBody } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-verify", 30))) return errorResponse("Rate limit exceeded", 429);
  const body = await readJsonBody<unknown>(event);
  const parsed = walletAuthSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { pubkey, signature, message, nickname } = parsed.data;
  if (!verifyWalletSignature(pubkey, message, signature)) {
    return errorResponse("Invalid wallet signature", 401);
  }
  if (!message.includes(pubkey)) return errorResponse("Message mismatch", 400);

  const nonce = extractNonceFromMessage(message);
  if (!nonce || !(await consumeNonce(pubkey, nonce))) {
    return errorResponse("Invalid or expired nonce", 401);
  }

  const user = await upsertUser(pubkey, nickname);
  const balance = await getUsdcBalance(pubkey);
  const token = await createSessionToken(pubkey);

  return jsonResponse(
    {
      user: {
        id: user.id,
        wallet: pubkey,
        nickname: (user as { nickname?: string }).nickname,
        avatar: (user as { avatar?: string }).avatar,
      },
      balance,
    },
    200,
    { "Set-Cookie": buildSessionCookie(token) },
  );
});
