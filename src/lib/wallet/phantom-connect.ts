import { PublicKey } from "@solana/web3.js";

export type PhantomInjected = {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: { toBytes(): Uint8Array; toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  signTransaction: <T>(transaction: T) => Promise<T>;
  signAllTransactions: <T>(transactions: T[]) => Promise<T[]>;
  on?: (event: "disconnect" | "accountChanged", handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: "disconnect" | "accountChanged", handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomInjected };
    solana?: PhantomInjected;
  }
}

/** In-browser Phantom provider (extension or Phantom in-app browser). */
export function getPhantomProvider(): PhantomInjected | null {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana ?? window.solana;
  return provider?.isPhantom ? provider : null;
}

/** Extensions and Phantom mobile browser can inject asynchronously. */
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

export async function connectPhantomExtension(): Promise<string> {
  const provider = getPhantomProvider();
  if (!provider) {
    throw new Error("Phantom not available. Install the extension or open this page in the Phantom app.");
  }
  const result = await provider.connect({ onlyIfTrusted: false });
  const key = result.publicKey;
  if (!key) throw new Error("Phantom did not return a public key");
  try {
    return new PublicKey(key.toBytes()).toBase58();
  } catch {
    return key.toString();
  }
}

export function phantomSignMessage(provider: PhantomInjected) {
  return async (message: Uint8Array): Promise<Uint8Array> => {
    const { signature } = await provider.signMessage(message);
    return signature;
  };
}
