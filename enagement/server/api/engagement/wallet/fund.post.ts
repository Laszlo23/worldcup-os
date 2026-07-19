import { defineHandler } from "nitro";
import {
  dripDevnetUsdc,
  dripTaskSolBonus,
  ensureDevnetGas,
  isDevnetFaucetEnabled,
} from "@shared/server/blockchain/faucet";
import { claimCommunityTask } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { getUsdcBalance } from "@shared/server/services/auth";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { screenWallet } from "@shared/server/services/webacy-screening";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
  readJsonBody,
} from "@shared/server/middleware/http";

/**
 * Fund a session wallet with gas SOL + welcome XP (Lace your boots task).
 * Called after smart-wallet create/unlock and before on-chain claims.
 */
export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-wallet-fund", 10, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ reason?: string }>(event);
  const reason = body.reason?.trim() || "wallet_fund";

  const screening = await screenWallet(wallet, "faucet");
  if (!screening.allowed) return errorResponse(screening.reason, 403);

  try {
    const user = await upsertUser(wallet);

    let welcomeXp = 0;
    let welcomeClaimed = false;
    const welcome = await claimCommunityTask(user.id, "mm-lace-boots");
    if (welcome.ok) {
      welcomeXp = welcome.xp ?? 0;
      welcomeClaimed = true;
    }

    let sol: {
      dripped: boolean;
      amount: number;
      balance: number;
      signature?: string;
      explorerUrl?: string;
      error?: string;
    } = { dripped: false, amount: 0, balance: 0 };

    if (isDevnetFaucetEnabled()) {
      const gas = await ensureDevnetGas({
        userPubkey: wallet,
        userId: user.id,
        reason,
      });
      sol = {
        dripped: gas.dripped,
        amount: gas.amount,
        balance: gas.balance,
        signature: gas.signature,
        explorerUrl: gas.explorerUrl,
        error: gas.error,
      };

      // First lace-boots claim also sends the task SOL bonus if gas was skipped.
      if (welcomeClaimed && !gas.dripped) {
        const bonus = await dripTaskSolBonus({
          userPubkey: wallet,
          userId: user.id,
          taskId: "mm-lace-boots",
        });
        if (bonus.dripped) {
          sol = {
            dripped: true,
            amount: bonus.amount,
            balance: bonus.balance,
            signature: bonus.signature,
            explorerUrl: bonus.explorerUrl,
          };
        }
      }
    }

    let usdc: {
      dripped: boolean;
      amount: number;
      balance: number;
      signature?: string;
      explorerUrl?: string;
      error?: string;
    } = { dripped: false, amount: 0, balance: 0 };

    if (isDevnetFaucetEnabled()) {
      try {
        const before = await getUsdcBalance(wallet);
        usdc = { dripped: false, amount: 0, balance: before };
        if (before < 5) {
          const drip = await dripDevnetUsdc({ userPubkey: wallet, userId: user.id });
          usdc = {
            dripped: true,
            amount: drip.amount,
            balance: drip.balance,
            signature: drip.signature,
            explorerUrl: drip.explorerUrl,
          };
        }
      } catch (err) {
        usdc = {
          dripped: false,
          amount: 0,
          balance: await getUsdcBalance(wallet).catch(() => 0),
          error: err instanceof Error ? err.message : "usdc_faucet_failed",
        };
      }
    }

    return jsonResponse({
      ok: true,
      welcomeXp,
      welcomeClaimed,
      sol,
      usdc,
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
