import { defineHandler } from "nitro";
import { getStadiumStatus, recordStadiumProof } from "@shared/server/repositories/engagement";
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
  getQueryParam,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-stadium-status"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const matchExternalId = getQueryParam(event, "matchId");
  if (!matchExternalId) return errorResponse("matchId required", 400);

  try {
    const user = await upsertUser(wallet);
    const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
    if (!match) return errorResponse("Match not found", 404);
    const status = await getStadiumStatus(user.id, match.id);
    return jsonResponse({ verified: status.verified, txSignature: status.txSignature ?? null });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
