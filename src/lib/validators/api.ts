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
  txSignature: z.string().optional(),
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
