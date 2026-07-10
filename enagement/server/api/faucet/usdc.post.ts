import { defineHandler } from "nitro";
import { dripDevnetUsdc, isDevnetFaucetEnabled } from "@shared/server/blockchain/faucet";
import { hasDatabase } from "@shared/server/config/env";
import { maybeOne } from "@shared/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, requireSession, requireMutationOrigin } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "faucet", 5, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  if (!isDevnetFaucetEnabled()) {
    return errorResponse("Devnet USDC faucet is not available", 503);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  let userId: string | undefined;
  if (hasDatabase()) {
    try {
      const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
      userId = user?.id;
    } catch {
      // devnet faucet still works without Postgres
    }
  }

  try {
    const result = await dripDevnetUsdc({ userPubkey: wallet, userId });
    return jsonResponse({
      ok: true,
      amount: result.amount,
      balance: result.balance,
      signature: result.signature,
      explorerUrl: result.explorerUrl,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Faucet failed", 400);
  }
});
