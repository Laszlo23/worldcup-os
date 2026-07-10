import { getSolanaNetwork } from "./config";
import { SOLANA_GENESIS_HASH } from "./networks";

export class WalletNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletNetworkError";
  }
}

declare global {
  interface Window {
    okxwallet?: {
      solana?: unknown;
      svm?: {
        genesisHash?: string;
        changeNetwork?: (params: { genesisHash: string }) => Promise<{ genesisHash?: string }>;
      };
    };
  }
}

/** Prompt OKX to use Solana devnet when the app is on devnet. */
export async function ensureWalletNetwork(walletName: string): Promise<void> {
  const network = getSolanaNetwork();
  if (network === "mainnet") return;
  if (walletName === "OKX Wallet") {
    await ensureOkxDevnet();
  }
}

async function ensureOkxDevnet(): Promise<void> {
  const svm = window.okxwallet?.svm;
  if (!svm?.changeNetwork) {
    throw new WalletNetworkError(
      "OKX Wallet could not switch to Solana devnet. Open OKX → Settings → Networks and enable Devnet.",
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
    throw new WalletNetworkError(`${message}. Enable Solana Devnet in OKX Wallet, then retry.`);
  }
}
