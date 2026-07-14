import { PublicKey } from "@solana/web3.js";
import type { PhantomInjected } from "./phantom-connect";
import { getPhantomProvider, phantomSignMessage, waitForPhantom } from "./phantom-connect";
import { getOkxSolana } from "./okx-wallet-adapter";

export type InjectedWalletName = "Phantom" | "OKX Wallet" | "Wallet";

export type InjectedSolanaProvider = PhantomInjected & {
  isOkxWallet?: boolean;
};

export type InjectedWallet = {
  name: InjectedWalletName;
  provider: InjectedSolanaProvider;
};

export function getOkxProvider(): InjectedSolanaProvider | null {
  const provider = getOkxSolana();
  return provider ?? null;
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

export function injectedPubkey(provider: InjectedSolanaProvider): string | null {
  if (!provider.publicKey) return null;
  try {
    return provider.publicKey.toString();
  } catch {
    return null;
  }
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
  const raw = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
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

export async function waitForAnyInjectedWallet(timeoutMs = 6000): Promise<InjectedWallet | null> {
  const immediate = getInjectedWallet();
  if (immediate) return immediate;
  await waitForPhantom(timeoutMs);
  return getInjectedWallet();
}
