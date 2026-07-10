import { z } from "zod";

export const walletAuthSchema = z.object({
  pubkey: z.string().min(32).max(64),
  signature: z.string().min(1),
  message: z.string().min(1),
  nickname: z.string().max(64).optional(),
});

export const placePredictionSchema = z.object({
  marketExternalId: z.string().min(1),
  optionExternalId: z.string().min(1),
  amount: z.number().positive().max(1_000_000),
  txSignature: z.string().optional(),
  escrowPda: z.string().optional(),
});

export const claimPredictionSchema = z.object({
  predictionExternalId: z.string().min(1),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(["weekly", "monthly", "all_time"]).default("all_time"),
});

export const replayStartSchema = z.object({
  fixtureId: z.number().int().positive(),
  matchExternalId: z.string().optional(),
});

export const workerAuthSchema = z.object({
  secret: z.string().min(1),
});

const xHandleSchema = z
  .string()
  .max(15)
  .regex(/^[A-Za-z0-9_]{1,15}$/, "Invalid X handle")
  .transform((v) => v.replace(/^@/, ""));

export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(64).optional(),
  bio: z.string().max(280).nullable().optional(),
  xHandle: xHandleSchema.nullable().optional(),
});

export const farcasterLinkSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  nonce: z.string().min(1),
});

export const postChatMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(500, "Message too long (max 500 characters)")
    .refine((v) => !/[<>]/.test(v), "Invalid characters in message"),
});
