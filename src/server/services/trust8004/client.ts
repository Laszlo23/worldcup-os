import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  SolanaSDK,
  Tag,
  trustTierToString,
  type TrustTier,
} from "8004-solana";
import { env } from "../../config/env";

export type Trust8004Reputation = {
  asset: string;
  configured: boolean;
  trustTier: TrustTier | null;
  trustTierLabel: string;
  averageScore: number | null;
  totalFeedbacks: number;
  qualityScore: number | null;
  confidence: number | null;
  riskScore: number | null;
  alive: boolean | null;
};

function clusterFromNetwork(network: "devnet" | "mainnet"): "devnet" | "mainnet-beta" {
  return network === "mainnet" ? "mainnet-beta" : "devnet";
}

function loadFeedbackSigner(): Keypair | null {
  const secret =
    process.env.AGENT_8004_FEEDBACK_SECRET ??
    process.env.SOLANA_DEPLOYER_SECRET ??
    process.env.SOLANA_PRIVATE_KEY ??
    process.env.SETTLEMENT_AUTHORITY_SECRET;
  if (!secret) return null;
  const trimmed = secret.trim();
  try {
    const parsed = JSON.parse(trimmed) as number[];
    if (Array.isArray(parsed)) return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    // base58
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    return null;
  }
}

export function getTrust8004Asset(): string | null {
  const asset = process.env.AGENT_8004_ASSET?.trim();
  return asset || null;
}

export function createTrust8004Sdk(signer?: Keypair | null): SolanaSDK {
  return new SolanaSDK({
    cluster: clusterFromNetwork(env.solanaNetwork),
    rpcUrl: env.solanaRpcUrl,
    signer: signer ?? undefined,
  });
}

export async function getTrust8004Reputation(asset?: string): Promise<Trust8004Reputation> {
  const target = asset ?? getTrust8004Asset();
  if (!target) {
    return {
      asset: "",
      configured: false,
      trustTier: null,
      trustTierLabel: "Unrated",
      averageScore: null,
      totalFeedbacks: 0,
      qualityScore: null,
      confidence: null,
      riskScore: null,
      alive: null,
    };
  }

  const sdk = createTrust8004Sdk();
  const pubkey = target;

  let trustTier: TrustTier | null = null;
  let trustTierLabel = "Unrated";
  let averageScore: number | null = null;
  let totalFeedbacks = 0;
  let qualityScore: number | null = null;
  let confidence: number | null = null;
  let riskScore: number | null = null;
  let alive: boolean | null = null;

  try {
    const enriched = await sdk.getEnrichedSummary(pubkey);
    if (enriched) {
      trustTier = enriched.trustTier;
      trustTierLabel = trustTierToString(enriched.trustTier);
      averageScore = enriched.averageScore;
      totalFeedbacks = enriched.totalFeedbacks;
      qualityScore = enriched.qualityScore / 100;
      confidence = enriched.confidence / 100;
      riskScore = enriched.riskScore;
    } else {
      const summary = await sdk.getSummary(pubkey);
      averageScore = summary.averageScore;
      totalFeedbacks = summary.totalFeedbacks;
      trustTier = await sdk.getTrustTier(pubkey);
      trustTierLabel = trustTierToString(trustTier);
    }
  } catch {
    // indexer or RPC unavailable — return partial
  }

  try {
    const report = await sdk.isItAlive(pubkey, { timeoutMs: 8000, treatAuthAsAlive: true });
    alive = report.status === "live" || report.status === "partially";
  } catch {
    alive = null;
  }

  return {
    asset: pubkey,
    configured: true,
    trustTier,
    trustTierLabel,
    averageScore,
    totalFeedbacks,
    qualityScore,
    confidence,
    riskScore,
    alive,
  };
}

export type HeartbeatFeedbackInput = {
  uptimePercent: number;
  reachable: boolean;
  appsHealthy: boolean;
  detail: string;
};

export async function submitTrust8004HeartbeatFeedback(
  input: HeartbeatFeedbackInput,
  asset?: string,
): Promise<{ submitted: boolean; reason?: string; signature?: string }> {
  const target = asset ?? getTrust8004Asset();
  if (!target) return { submitted: false, reason: "AGENT_8004_ASSET not configured" };

  const signer = loadFeedbackSigner();
  if (!signer) return { submitted: false, reason: "No feedback signer (set SOLANA_DEPLOYER_SECRET)" };

  const sdk = createTrust8004Sdk(signer);

  try {
    const uptime = Math.min(100, Math.max(0, input.uptimePercent));
    const uptimeResult = await sdk.giveFeedback(target, {
      value: uptime.toFixed(2),
      tag1: Tag.uptime,
      tag2: Tag.day,
      score: input.appsHealthy ? Math.round(uptime) : Math.max(0, Math.round(uptime) - 20),
      endpoint: "/earn/heartbeat",
      feedbackUri: `https://superteam.fun/t/${process.env.SUPERTEAM_EARN_AGENT_NAME ?? "superform-worldcup-agent"}`,
    });

    if (!input.reachable) {
      await sdk.giveFeedback(target, {
        value: 0,
        valueDecimals: 0,
        tag1: Tag.reachable,
        score: 0,
        endpoint: "/earn/heartbeat",
        feedbackUri: input.detail.slice(0, 200),
      });
    }

    const signature =
      typeof uptimeResult === "string"
        ? uptimeResult
        : uptimeResult && typeof uptimeResult === "object" && "signature" in uptimeResult
          ? String((uptimeResult as { signature?: string }).signature ?? "")
          : undefined;

    return { submitted: true, signature };
  } catch (err) {
    return {
      submitted: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
