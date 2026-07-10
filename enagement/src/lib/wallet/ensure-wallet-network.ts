import { getClientSolanaNetwork } from "./config";
import { SOLANA_GENESIS_HASH } from "./networks";
import type { InjectedWalletName } from "./injected-wallet";

type OkxSvmApi = {
  genesisHash?: string;
  changeNetwork?: (params: { genesisHash: string }) => Promise<{ genesisHash?: string }>;
};

export class WalletNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletNetworkError";
  }
}

/** Prompt the wallet to use the same cluster as the app (devnet for hackathon demo). */
export async function ensureWalletNetwork(walletName: InjectedWalletName): Promise<void> {
  const network = getClientSolanaNetwork();
  if (network === "mainnet") return;

  if (walletName === "OKX Wallet") {
    await ensureOkxDevnet();
    return;
  }

  // Phantom / Solflare: user may still need to pick Devnet in wallet settings.
  // Solflare adapter is constructed with network: "devnet" when configured in provider.tsx.
}

async function ensureOkxDevnet(): Promise<void> {
  const svm = window.okxwallet?.svm;
  if (!svm?.changeNetwork) {
    throw new WalletNetworkError(
      "OKX Wallet could not switch to Solana devnet. Update the extension, then open Settings → Networks and enable Devnet.",
    );
  }

  const target = SOLANA_GENESIS_HASH.devnet;
  if (svm.genesisHash === target) return;

  try {
    const result = await svm.changeNetwork({ genesisHash: target });
    if (result?.genesisHash && result.genesisHash !== target) {
      throw new WalletNetworkError("OKX Wallet is not on Solana devnet. Approve the network switch to continue.");
    }
  } catch (err) {
    if (err instanceof WalletNetworkError) throw err;
    const message = err instanceof Error ? err.message : "Network switch rejected";
    throw new WalletNetworkError(
      `${message}. Open OKX Wallet → Settings → enable Solana Devnet, then retry.`,
    );
  }
}
