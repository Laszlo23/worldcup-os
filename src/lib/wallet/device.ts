import { getPhantomProvider } from "./phantom-connect";

export const PHANTOM_PENDING_CONNECT_KEY = "wmos-phantom-pending-connect";
export const PHANTOM_CONNECT_QUERY = "phantomConnect";

declare global {
  interface Window {
    zerion?: unknown;
    okxwallet?: { solana?: { connect?: unknown; signMessage?: unknown } };
    solana?: { isPhantom?: boolean; isOkxWallet?: boolean; connect?: unknown; signMessage?: unknown };
    ethereum?: { isZerion?: boolean; isMetaMask?: boolean; isCoinbaseWallet?: boolean };
  }
}

function hasInjectedSolanaProvider(): boolean {
  if (typeof window === "undefined") return false;
  if (getPhantomProvider()) return true;
  if (window.okxwallet?.solana?.connect && window.okxwallet.solana.signMessage) return true;
  const solana = window.solana;
  if (solana?.connect && solana.signMessage && !solana.isPhantom && !solana.isOkxWallet) return true;
  return false;
}

/** Phone / tablet viewport — not the same as “needs Phantom app”. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/** Wallet apps with injected providers (Zerion, Phantom, OKX, etc.) — not social in-app browsers. */
export function isWalletAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  if (
    /phantom/i.test(ua) ||
    /zerion/i.test(ua) ||
    /io\.zerion/i.test(ua) ||
    /okx/i.test(ua) ||
    /okex/i.test(ua) ||
    /trust/i.test(ua) ||
    /metamask/i.test(ua) ||
    /coinbase/i.test(ua) ||
    /rainbow/i.test(ua) ||
    /solflare/i.test(ua) ||
    /tokenpocket/i.test(ua) ||
    /brave/i.test(ua)
  ) {
    return true;
  }
  if (typeof window !== "undefined") {
    if (window.zerion) return true;
    const eth = window.ethereum;
    if (eth?.isZerion || eth?.isMetaMask || eth?.isCoinbaseWallet) return true;
    if (hasInjectedSolanaProvider()) return true;
  }
  return false;
}

/** Known social / messenger in-app browsers that block wallet injection. */
export function isSocialInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isWalletAppBrowser()) return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("instagram") ||
    ua.includes("twitter") ||
    ua.includes("linkedinapp") ||
    ua.includes("telegram") ||
    ua.includes("line/")
  );
}

/** @deprecated Use isSocialInAppBrowser — kept for callers that import isInAppBrowser. */
export function isInAppBrowser(): boolean {
  return isSocialInAppBrowser();
}

/** Block connect only in social in-app browsers with no wallet injection. */
export function shouldBlockWalletConnect(): boolean {
  if (!isSocialInAppBrowser()) return false;
  return !hasInjectedSolanaProvider() && !getPhantomProvider();
}

/** Phantom's in-app browser (provider injects here — never re-open browse deeplink). */
export function isPhantomInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /phantom/i.test(navigator.userAgent);
}

/** Mobile OS browser without an injected Phantom provider (Safari, Chrome, etc.). */
export function isMobileWalletEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isPhantomInAppBrowser()) return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobileOs = /android|iphone|ipad|ipod/.test(ua);
  return isMobileOs && !isInAppBrowser() && !getPhantomProvider();
}

/** iOS Safari — Phantom universal-link browse flow is supported. */
export function isIosSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIos = ua.includes("iphone") || ua.includes("ipad");
  const isSafari = ua.includes("safari");
  return isIos && isSafari && !isInAppBrowser();
}

/** Build return URL with connect intent (survives Phantom browse redirect; sessionStorage does not). */
export function buildPhantomConnectReturnUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PHANTOM_CONNECT_QUERY, "1");
  return url.toString();
}

/** @deprecated Never redirect to phantom.app — use injected provider or wallet picker instead. */
export function openPhantomMobileBrowser(): void {
  console.warn("[wallet] openPhantomMobileBrowser is disabled — use injected wallet connect");
}

export function markPhantomConnectPending(): void {
  try {
    sessionStorage.setItem(PHANTOM_PENDING_CONNECT_KEY, "1");
  } catch {
    // private mode
  }
}

export function consumePhantomConnectPending(): boolean {
  try {
    const pending = sessionStorage.getItem(PHANTOM_PENDING_CONNECT_KEY);
    if (pending) {
      sessionStorage.removeItem(PHANTOM_PENDING_CONNECT_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** True when user arrived from Phantom browse deeplink or tapped Connect on mobile Safari. */
export function hasPhantomConnectIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PHANTOM_CONNECT_QUERY) === "1") return true;
  } catch {
    // ignore
  }
  try {
    return sessionStorage.getItem(PHANTOM_PENDING_CONNECT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Read and strip connect intent from URL + sessionStorage (one-shot). */
export function consumePhantomConnectIntent(): boolean {
  let intent = false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PHANTOM_CONNECT_QUERY) === "1") {
      intent = true;
      url.searchParams.delete(PHANTOM_CONNECT_QUERY);
      const qs = url.searchParams.toString();
      const next = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
      window.history.replaceState({}, "", next);
    }
  } catch {
    // ignore
  }
  if (consumePhantomConnectPending()) intent = true;
  return intent;
}
