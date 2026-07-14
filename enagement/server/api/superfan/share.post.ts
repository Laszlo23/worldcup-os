import { defineHandler } from "nitro";
import { z } from "zod";
import { awardStickerForShare } from "@shared/server/repositories/engagement";
import { recordShare } from "@shared/server/repositories/superfan";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireMutationOrigin, requireSession } from "@shared/server/middleware/http";

const bodySchema = z.object({
  app: z.enum(["wmos", "agentx", "matchmind"]),
  channel: z.enum(["x", "farcaster", "copy", "native"]),
  contentType: z.string().min(1).max(64),
  contentId: z.string().min(1).max(128),
  url: z.string().url().optional(),
});

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "superfan-share", 30))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const parsed = bodySchema.safeParse(await readJsonBody(event));
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  try {
    const result = await recordShare({ walletPubkey: wallet, ...parsed.data });
    let newSticker = null;
    if (parsed.data.app === "matchmind") {
      const user = await upsertUser(wallet);
      const stickerResult = await awardStickerForShare(user.id, parsed.data.contentType, parsed.data.contentId);
      if (stickerResult?.sticker) {
        newSticker = {
          id: stickerResult.sticker.id,
          title: stickerResult.sticker.title,
          rarity: stickerResult.sticker.rarity,
          imageUrl: stickerResult.sticker.imageUrl,
          setCompleted: stickerResult.setCompleted ?? false,
        };
      }
    }
    return jsonResponse({ ...result, newSticker });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
