import { defineHandler } from "nitro";
import { dripTaskSolBonus, isDevnetFaucetEnabled } from "@shared/server/blockchain/faucet";
import { claimCommunityTask } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-task-claim"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const taskId = event.context?.params?.id as string | undefined;
  if (!taskId) return errorResponse("Task id required", 400);

  try {
    const user = await upsertUser(wallet);
    const result = await claimCommunityTask(user.id, taskId);
    if (!result.ok) {
      const messages: Record<string, string> = {
        unknown_task: "Unknown task",
        already_claimed: "Already claimed",
        not_ready: "Finish the action first, then claim",
      };
      return errorResponse(messages[result.reason ?? ""] ?? "Claim failed", 400);
    }

    let sol: {
      dripped: boolean;
      amount: number;
      balance: number;
      signature?: string;
      explorerUrl?: string;
    } | null = null;

    if (isDevnetFaucetEnabled()) {
      const bonus = await dripTaskSolBonus({
        userPubkey: wallet,
        userId: user.id,
        taskId,
      });
      sol = {
        dripped: bonus.dripped,
        amount: bonus.amount,
        balance: bonus.balance,
        signature: bonus.signature,
        explorerUrl: bonus.explorerUrl,
      };
    }

    return jsonResponse({ ok: true, xp: result.xp, sol });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
