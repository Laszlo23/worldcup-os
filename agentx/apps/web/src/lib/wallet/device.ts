import { getPhantomProvider } from "./phantom-connect";

export const PHANTOM_PENDING_CONNECT_KEY = "txline-phantom-pending-connect";
export const PHANTOM_CONNECT_QUERY = "phantomConnect";

function hasInjectedSolanaProvider(): boolean {
  if (typeof window === "undefined") return false;
  if (getPhantomProvider()) return true;
  const okx = (window as Window & { okxwallet?: { solana?: { connect?: unknown; signMessage?: unknown } } }).okxwallet?.solana;
  if (okx?.connect && okx.signMessage) return true;
  const solana = window.solana;
  if (solana && !solana.isPhantom && solana.publicKey) return true;
  return false;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function isWalletAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  if (/phantom|okx|okex|trust|metamask|coinbase|solflare|brave/i.test(ua)) return true;
  if (typeof window !== "undefined" && hasInjectedSolanaProvider()) return true;
  return false;
}

export function isSocialInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isWalletAppBrowser()) return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("instagram") ||
    ua.includes("twitter") ||
    ua.includes("telegram")
  );
}

export function shouldBlockWalletConnect(): boolean {
  if (!isSocialInAppBrowser()) return false;
  return !hasInjectedSolanaProvider() && !getPhantomProvider();
}

export function isPhantomInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /phantom/i.test(navigator.userAgent);
}

export function isMobileWalletEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isPhantomInAppBrowser()) return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod/.test(ua) && !isSocialInAppBrowser() && !getPhantomProvider();
}

export function consumePhantomConnectIntent(): boolean {
  let intent = false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PHANTOM_CONNECT_QUERY) === "1") {
      intent = true;
      url.searchParams.delete(PHANTOM_CONNECT_QUERY);
      const qs = url.searchParams.toString();
      window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
    }
  } catch {
    /* ignore */
  }
  try {
    if (sessionStorage.getItem(PHANTOM_PENDING_CONNECT_KEY) === "1") {
      sessionStorage.removeItem(PHANTOM_PENDING_CONNECT_KEY);
      intent = true;
    }
  } catch {
    /* ignore */
  }
  return intent;
}
