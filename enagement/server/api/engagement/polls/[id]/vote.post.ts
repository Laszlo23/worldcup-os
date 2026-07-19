import { defineHandler } from "nitro";
import { voteOnPoll } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { buildAnchorReceiptTx, getExplorerUrl, verifyMemoTx } from "@shared/server/blockchain/anchor-receipt";
import { ensureDevnetGas, isDevnetFaucetEnabled } from "@shared/server/blockchain/faucet";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
  readJsonBody,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-vote"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const pollId = event.context?.params?.id as string | undefined;
  if (!pollId) return errorResponse("Poll id required", 400);

  const body = await readJsonBody<{ choice?: string; action?: string; txSignature?: string }>(event);
  const choice = body.choice === "no" ? "no" : body.choice === "yes" ? "yes" : null;
  if (!choice) return errorResponse("choice must be yes or no", 400);

  try {
    const user = await upsertUser(wallet);

    if (body.action === "build") {
      if (isDevnetFaucetEnabled()) {
        await ensureDevnetGas({ userPubkey: wallet, userId: user.id, reason: "poll_vote" });
      }
      const memo = `matchmind:poll:${pollId}:${choice}:${wallet}`;
      const built = await buildAnchorReceiptTx({ userPubkey: wallet, memo });
      return jsonResponse({ transaction: built.transaction, memo, sponsored: built.sponsored });
    }

    if (!body.txSignature) return errorResponse("txSignature required — votes are on-chain", 400);

    const memoPrefix = `matchmind:poll:${pollId}:${choice}`;
    const valid = await verifyMemoTx({
      txSignature: body.txSignature,
      userPubkey: wallet,
      expectedPrefix: memoPrefix,
    });
    if (!valid) return errorResponse("On-chain vote receipt not found or invalid", 400);

    const result = await voteOnPoll(user.id, pollId, choice, body.txSignature);
    if (!result.ok) {
      const messages: Record<string, string> = {
        already_voted: "You already locked in a vote on this poll",
        poll_closed: "This poll window has closed",
        poll_resolved: "This poll already settled",
        poll_not_found: "Poll not found",
        tx_required: "On-chain signature required",
        tx_reused: "Transaction already used",
      };
      const reason = result.reason ?? "vote_failed";
      return errorResponse(messages[reason] ?? reason, 400);
    }
    return jsonResponse({
      ok: true,
      choice,
      txSignature: body.txSignature,
      explorerUrl: getExplorerUrl(body.txSignature),
      newSticker: result.newSticker
        ? {
            id: result.newSticker.id,
            title: result.newSticker.title,
            rarity: result.newSticker.rarity,
            imageUrl: result.newSticker.imageUrl,
          }
        : undefined,
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
