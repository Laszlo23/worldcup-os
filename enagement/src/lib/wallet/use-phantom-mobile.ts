import { useEffect, useState } from "react";
import { getPhantomProvider, waitForPhantom } from "./phantom-connect";
import { listInjectedWallets } from "./injected-wallet";
import {
  isMobileViewport,
  isPhantomInAppBrowser,
  isWalletAppBrowser,
  shouldBlockWalletConnect,
} from "./device";

export type PhantomMobileStatus =
  | "checking"
  | "injected"
  | "phantom_browser"
  | "mobile_external"
  | "desktop"
  | "in_app_blocked";

export function resolvePhantomMobileStatus(providerReady: boolean): PhantomMobileStatus {
  if (typeof window === "undefined") return "checking";
  if (providerReady || getPhantomProvider() || listInjectedWallets().length > 0) return "injected";
  if (shouldBlockWalletConnect()) return "in_app_blocked";
  if (isPhantomInAppBrowser()) return "phantom_browser";
  if (isMobileViewport()) return "mobile_external";
  return "desktop";
}

/** Wait for async Phantom injection before showing “Open Phantom” on mobile. */
export function usePhantomMobileStatus(): PhantomMobileStatus {
  const [status, setStatus] = useState<PhantomMobileStatus>(() => resolvePhantomMobileStatus(false));

  useEffect(() => {
    let cancelled = false;

    const sync = (providerReady: boolean) => {
      if (!cancelled) setStatus(resolvePhantomMobileStatus(providerReady));
    };

    sync(Boolean(getPhantomProvider()));

    void (async () => {
      const waitMs = isWalletAppBrowser() || isMobileViewport() ? 6000 : 1200;
      const provider = await waitForPhantom(waitMs);
      if (!cancelled) sync(Boolean(provider));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
