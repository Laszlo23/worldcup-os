import { getPhantomProvider } from "./phantom-connect";
import { getOkxProvider } from "./injected-wallet";

export function isOkxInstalled(): boolean {
  return Boolean(getOkxProvider());
}

export function isPhantomInstalled(): boolean {
  return Boolean(getPhantomProvider());
}

/** Prefer OKX when it is the only injected Solana wallet. */
export function getPreferredWalletName(): "OKX Wallet" | "Phantom" | null {
  const okx = isOkxInstalled();
  const phantom = isPhantomInstalled();
  if (okx && !phantom) return "OKX Wallet";
  if (phantom && !okx) return "Phantom";
  if (okx) return "OKX Wallet";
  if (phantom) return "Phantom";
  return null;
}
