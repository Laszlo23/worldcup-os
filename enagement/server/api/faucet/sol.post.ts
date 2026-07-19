import { defineHandler } from "nitro";
import { ensureDevnetGas, isDevnetFaucetEnabled } from "@shared/server/blockchain/faucet";
import { hasDatabase } from "@shared/server/config/env";
import { maybeOne } from "@shared/server/db/postgres";
import { screenWallet } from "@shared/server/services/webacy-screening";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "faucet-sol", 8, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  if (!isDevnetFaucetEnabled()) {
    return errorResponse("Devnet SOL faucet is not available", 503);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const screening = await screenWallet(wallet, "faucet");
  if (!screening.allowed) return errorResponse(screening.reason, 403);

  let userId: string | undefined;
  if (hasDatabase()) {
    try {
      const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [wallet]);
      userId = user?.id;
    } catch {
      // still drip without Postgres
    }
  }

  const result = await ensureDevnetGas({
    userPubkey: wallet,
    userId,
    reason: "faucet_sol",
  });

  if (!result.ok && result.error === "faucet_disabled") {
    return errorResponse("Devnet SOL faucet is not available", 503);
  }
  if (!result.ok && result.error && !result.balance) {
    return errorResponse(result.error, 400);
  }

  return jsonResponse({
    ok: true,
    dripped: result.dripped,
    amount: result.amount,
    balance: result.balance,
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    error: result.error,
  });
});
