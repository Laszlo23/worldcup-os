import { defineHandler } from "nitro";
import { recordStadiumProof } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { maybeOne } from "@shared/server/db/postgres";
import { buildAnchorReceiptTx, getExplorerUrl, verifyMemoTx } from "@shared/server/blockchain/anchor-receipt";
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
  if (!(await rateLimit(event, "engagement-stadium"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{ matchId?: string; txSignature?: string; action?: string }>(event);
  if (!body.matchId) return errorResponse("matchId required", 400);

  try {
    const user = await upsertUser(wallet);
    const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [body.matchId]);
    if (!match) return errorResponse("Match not found", 404);

    if (body.action === "build") {
      const memo = `matchmind:stadium:${body.matchId}:${wallet}`;
      const built = await buildAnchorReceiptTx({ userPubkey: wallet, memo });
      return jsonResponse({ transaction: built.transaction, memo });
    }

    if (!body.txSignature) return errorResponse("txSignature required", 400);
    const valid = await verifyMemoTx({
      txSignature: body.txSignature,
      userPubkey: wallet,
      expectedPrefix: `matchmind:stadium:${body.matchId}`,
    });
    if (!valid) return errorResponse("Stadium proof not verified on-chain", 400);

    await recordStadiumProof({
      userId: user.id,
      matchId: match.id,
      txSignature: body.txSignature,
    });

    return jsonResponse({
      ok: true,
      verified: true,
      explorerUrl: getExplorerUrl(body.txSignature),
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
