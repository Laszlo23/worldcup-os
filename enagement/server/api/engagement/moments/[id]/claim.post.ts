import { defineHandler } from "nitro";
import { recordMomentClaim } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
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
  if (!(await rateLimit(event, "engagement-moment-claim"))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const momentId = event.context?.params?.id as string | undefined;
  if (!momentId) return errorResponse("Moment id required", 400);

  const body = await readJsonBody<{ txSignature?: string; action?: string }>(event);

  try {
    const user = await upsertUser(wallet);

    if (body.action === "build") {
      const memo = `matchmind:moment:${momentId}:${wallet}`;
      const built = await buildAnchorReceiptTx({ userPubkey: wallet, memo });
      return jsonResponse({ transaction: built.transaction, memo });
    }

    if (!body.txSignature) return errorResponse("txSignature required", 400);
    const memoPrefix = `matchmind:moment:${momentId}`;
    const valid = await verifyMemoTx({
      txSignature: body.txSignature,
      userPubkey: wallet,
      expectedPrefix: memoPrefix,
    });
    if (!valid) return errorResponse("On-chain moment claim not verified", 400);

    const metadataUri = `https://match.buildingcultureid.space/moments/${momentId}`;
    const result = await recordMomentClaim({
      userId: user.id,
      momentExternalId: momentId,
      txSignature: body.txSignature,
      metadataUri,
    });
    if (!result.ok) return errorResponse(result.reason ?? "claim_failed", 400);

    return jsonResponse({
      ok: true,
      explorerUrl: getExplorerUrl(body.txSignature),
      metadataUri,
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
