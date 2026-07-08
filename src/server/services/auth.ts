import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { env } from "../config/env";
import { listPredictionsForWallet } from "../repositories/matches";
import type { PortfolioSummary } from "@/lib/types";

export { verifyWalletSignature, buildAuthMessage } from "./auth-wallet";

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

  const performance = Array.from({ length: 14 }).map((_, i) => ({
    d: `D${i + 1}`,
    v: balance + totalEarnings - invested + i * (totalEarnings / 14 || 10),
  }));

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