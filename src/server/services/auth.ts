import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { env } from "../config/env";
import { listPredictionsForWallet } from "../repositories/matches";
import type { PortfolioSummary } from "@/lib/types";

export { verifyWalletSignature, buildAuthMessage, authMessageDomain, extractDomainFromAuthMessage } from "./auth-wallet";

export async function getUsdcBalance(pubkey: string): Promise<number> {
  try {
    const connection = new Connection(env.solanaRpcUrl, "confirmed");
    const mint = new PublicKey(env.usdcMint);
    const owner = new PublicKey(pubkey);
    const ata = getAssociatedTokenAddressSync(mint, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

export async function getSolBalance(pubkey: string): Promise<number> {
  try {
    const connection = new Connection(env.solanaRpcUrl, "confirmed");
    const lamports = await connection.getBalance(new PublicKey(pubkey));
    return lamports / 1_000_000_000;
  } catch {
    return 0;
  }
}

export async function getPortfolioSummary(pubkey: string): Promise<PortfolioSummary> {
  const [balance, predictions] = await Promise.all([
    getUsdcBalance(pubkey),
    listPredictionsForWallet(pubkey),
  ]);

  const open = predictions.filter((p) => p.status === "open");
  const won = predictions.filter((p) => p.status === "won");
  const lost = predictions.filter((p) => p.status === "lost");
  const settled = predictions.filter((p) => p.status === "settled");

  const inEscrow = open.reduce((s, p) => s + p.amount, 0);
  const pendingRewards = won.reduce((s, p) => s + (p.payout ?? 0), 0);
  const totalEarnings = settled.reduce((s, p) => s + ((p.payout ?? 0) - p.amount), 0);
  const decided = won.length + lost.length + settled.length;
  const wins = won.length + settled.length;
  const accuracy = decided ? (wins / decided) * 100 : 0;
  const invested = predictions.reduce((s, p) => s + p.amount, 0);
  const roi = invested ? (totalEarnings / invested) * 100 : 0;

  const performance = buildIndexedPerformance(predictions);

  return {
    balance,
    inEscrow,
    pendingRewards,
    totalEarnings,
    roi,
    accuracy,
    performance,
    open,
    won,
    lost,
    settled,
  };
}

/** Cumulative P&L from settled/lost predictions — indexed from DB, not on-chain. */
function buildIndexedPerformance(predictions: import("@/lib/mock/types").Prediction[]): { d: string; v: number }[] {
  const events = predictions
    .filter((p) => p.status === "settled" || p.status === "lost")
    .map((p) => ({
      t: p.placedAt,
      delta: p.status === "settled" ? (p.payout ?? 0) - p.amount : -p.amount,
    }))
    .sort((a, b) => a.t - b.t);

  if (!events.length) return [];

  let running = 0;
  return events.map((e) => {
    running += e.delta;
    return {
      d: new Date(e.t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      v: Math.round(running * 100) / 100,
    };
  });
}