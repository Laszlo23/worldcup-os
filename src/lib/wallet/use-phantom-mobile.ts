import { useEffect, useState } from "react";
import { getPhantomProvider, waitForPhantom } from "./phantom-connect";
import { isInAppBrowser, isMobileViewport, isPhantomInAppBrowser } from "./device";

export type PhantomMobileStatus =
  | "checking"
  | "injected"
  | "phantom_browser"
  | "mobile_external"
  | "desktop"
  | "in_app_blocked";

export function resolvePhantomMobileStatus(providerReady: boolean): PhantomMobileStatus {
  if (typeof window === "undefined") return "checking";
  if (isInAppBrowser()) return "in_app_blocked";
  if (providerReady || getPhantomProvider()) return "injected";
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
      const provider = await waitForPhantom(isMobileViewport() ? 4500 : 1200);
      if (!cancelled) sync(Boolean(provider));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
