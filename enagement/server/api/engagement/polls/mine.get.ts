import { defineHandler } from "nitro";
import { listUserPollVotes } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
} from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-polls-mine", 40, 60_000))) {
    return errorResponse("Rate limit exceeded", 429);
  }
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const user = await upsertUser(wallet);
    const votes = await listUserPollVotes(user.id);
    return jsonResponse({
      votes: votes.map((v) => {
        const resolved = Boolean(v.outcome);
        const won =
          resolved && v.outcome !== "void" && v.outcome === v.choice
            ? true
            : resolved
              ? false
              : null;
        return {
          id: v.pollExternalId,
          matchId: v.matchExternalId,
          question: v.question,
          window: v.windowLabel,
          choice: v.choice,
          outcome: v.outcome,
          xpAwarded: v.xpAwarded,
          txSignature: v.txSignature,
          createdAt: v.createdAt,
          closesAt: v.closesAt,
          resolved,
          won,
          explorerUrl: v.txSignature
            ? `https://explorer.solana.com/tx/${v.txSignature}?cluster=devnet`
            : null,
        };
      }),
    });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
