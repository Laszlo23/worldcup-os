import { PublicKey } from "@solana/web3.js";

export type PhantomInjected = {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: { toBytes(): Uint8Array; toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean; cluster?: string }) => Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  signTransaction: <T>(transaction: T) => Promise<T>;
  signAllTransactions: <T>(transactions: T[]) => Promise<T[]>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomInjected };
    solana?: PhantomInjected;
  }
}

export function getPhantomProvider(): PhantomInjected | null {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana ?? window.solana;
  return provider?.isPhantom ? provider : null;
}

export function phantomSignMessage(provider: PhantomInjected) {
  return async (message: Uint8Array): Promise<Uint8Array> => {
    const { signature } = await provider.signMessage(message);
    return signature;
  };
}

export function waitForPhantom(timeoutMs = 3000): Promise<PhantomInjected | null> {
  const existing = getPhantomProvider();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const provider = getPhantomProvider();
      if (provider) {
        resolve(provider);
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
