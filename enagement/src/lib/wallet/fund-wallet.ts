import { apiFetch } from "@/lib/api/client";

export type WalletFundResult = {
  ok: boolean;
  welcomeXp: number;
  welcomeClaimed: boolean;
  sol: {
    dripped: boolean;
    amount: number;
    balance: number;
    signature?: string;
    explorerUrl?: string;
    error?: string;
  };
  usdc?: {
    dripped: boolean;
    amount: number;
    balance: number;
    signature?: string;
    explorerUrl?: string;
    error?: string;
  };
};

/** Drip gas SOL + welcome XP after smart-wallet session or before on-chain claims. */
export async function fundSessionWallet(reason = "session"): Promise<WalletFundResult | null> {
  try {
    return await apiFetch<WalletFundResult>("/api/engagement/wallet/fund", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  } catch {
    return null;
  }
}

/** Ensure the session wallet can pay memo fees (silent top-up). */
export async function ensureOnchainGas(): Promise<boolean> {
  const funded = await fundSessionWallet("onchain_gas");
  if (!funded) return false;
  if (funded.sol.error && funded.sol.balance < 0.005) return false;
  return true;
}
