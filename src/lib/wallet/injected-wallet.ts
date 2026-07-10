import { PublicKey } from "@solana/web3.js";
import type { PhantomInjected } from "./phantom-connect";
import { getPhantomProvider, phantomSignMessage, waitForPhantom } from "./phantom-connect";

export type InjectedWalletName = "Phantom" | "OKX Wallet";

export type InjectedSolanaProvider = PhantomInjected & {
  isOkxWallet?: boolean;
};

export type InjectedWallet = {
  name: InjectedWalletName;
  provider: InjectedSolanaProvider;
};

declare global {
  interface Window {
    okxwallet?: {
      solana?: InjectedSolanaProvider & { isOkxWallet?: boolean };
      svm?: {
        genesisHash?: string;
        changeNetwork?: (params: { genesisHash: string }) => Promise<{ genesisHash?: string }>;
      };
    };
  }
}

export function getOkxProvider(): InjectedSolanaProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.okxwallet?.solana;
  if (!provider) return null;
  return provider;
}

export function listInjectedWallets(): InjectedWallet[] {
  const wallets: InjectedWallet[] = [];
  const phantom = getPhantomProvider();
  if (phantom) wallets.push({ name: "Phantom", provider: phantom });
  const okx = getOkxProvider();
  if (okx) wallets.push({ name: "OKX Wallet", provider: okx });
  return wallets;
}

export function getInjectedWallet(prefer: InjectedWalletName = "Phantom"): InjectedWallet | null {
  const wallets = listInjectedWallets();
  return wallets.find((w) => w.name === prefer) ?? wallets[0] ?? null;
}

export function waitForInjectedWallet(timeoutMs = 3000, prefer: InjectedWalletName = "Phantom"): Promise<InjectedWallet | null> {
  const existing = getInjectedWallet(prefer);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const wallet = getInjectedWallet(prefer);
      if (wallet) {
        resolve(wallet);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

/** Prefer OKX when Phantom is absent (common on OKX-only setups). */
export async function waitForAnyInjectedWallet(timeoutMs = 3000): Promise<InjectedWallet | null> {
  const phantom = await waitForPhantom(timeoutMs);
  if (phantom) return { name: "Phantom", provider: phantom };
  const okx = getOkxProvider();
  if (okx) return { name: "OKX Wallet", provider: okx };

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const okxLate = getOkxProvider();
      if (okxLate) {
        resolve({ name: "OKX Wallet", provider: okxLate });
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

export function findInjectedForSession(sessionAddress: string): InjectedWallet | null {
  for (const wallet of listInjectedWallets()) {
    const pubkey = injectedPubkey(wallet.provider);
    if (pubkey === sessionAddress) return wallet;
  }
  return getInjectedWallet();
}

export async function connectInjectedWallet(wallet: InjectedWallet): Promise<string> {
  const { provider } = wallet;
  const connectOpts =
    wallet.name === "Phantom" && getClientNetwork() === "devnet"
      ? ({ onlyIfTrusted: false, cluster: "devnet" } as { onlyIfTrusted?: boolean; cluster?: string })
      : { onlyIfTrusted: false };

  const result = await provider.connect(connectOpts);
  const key = result.publicKey ?? provider.publicKey;
  if (!key) throw new Error(`${wallet.name} did not return a public key`);
  try {
    return new PublicKey(key.toBytes()).toBase58();
  } catch {
    return key.toString();
  }
}

function getClientNetwork(): "devnet" | "mainnet" {
  const raw = import.meta.env.VITE_SOLANA_NETWORK ?? "devnet";
  return raw === "mainnet" ? "mainnet" : "devnet";
}

export function injectedSignMessage(wallet: InjectedWallet) {
  if (wallet.name === "Phantom") {
    return phantomSignMessage(wallet.provider);
  }
  return async (message: Uint8Array): Promise<Uint8Array> => {
    const { signature } = await wallet.provider.signMessage(message);
    return signature;
  };
}

export function injectedPubkey(provider: InjectedSolanaProvider): string | null {
  if (!provider.publicKey) return null;
  try {
    return provider.publicKey.toString();
  } catch {
    return null;
  }
}
