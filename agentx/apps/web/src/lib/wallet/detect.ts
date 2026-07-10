import { getOkxSolana } from "./okx-wallet-adapter";

export function isOkxInstalled(): boolean {
  return Boolean(getOkxSolana());
}

export function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { phantom?: { solana?: unknown } }).phantom?.solana);
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
