import { getPhantomProvider } from "./phantom-connect";

export const PHANTOM_PENDING_CONNECT_KEY = "wmos-phantom-pending-connect";
export const PHANTOM_CONNECT_QUERY = "phantomConnect";

/** Phone / tablet viewport — not the same as “needs Phantom app”. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/** Twitter / Instagram / Telegram in-app browsers block wallet injection. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("instagram") ||
    ua.includes("twitter") ||
    ua.includes("linkedinapp") ||
    ua.includes("telegram") ||
    ua.includes("line/") ||
    ua.includes("wv") ||
    (ua.includes("iphone") && !ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios"))
  );
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

export function openPhantomMobileBrowser(): void {
  const target = encodeURIComponent(buildPhantomConnectReturnUrl());
  const ref = encodeURIComponent(window.location.origin);
  window.location.assign(`https://phantom.app/ul/browse/${target}?ref=${ref}`);
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
