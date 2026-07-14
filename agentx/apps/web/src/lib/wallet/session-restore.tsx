"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/lib/store/wallet";
import { refreshWalletSession } from "./auth";
import { getPhantomProvider } from "./phantom-connect";
import { getOkxProvider } from "./injected-wallet";

/** Restore HTTP session cookie into client wallet state (survives page refresh). */
export function WalletSessionRestore() {
  const wallet = useWalletStore((s) => s.wallet);
  const restoreWalletSession = useWalletStore((s) => s.restoreWalletSession);

  useEffect(() => {
    if (wallet.connected) return;

    void (async () => {
      const session = await refreshWalletSession();
      if (!session) return;

      restoreWalletSession(session.wallet, session.balance);

      const phantom = getPhantomProvider();
      if (phantom && !phantom.isConnected) {
        try {
          await phantom.connect({ onlyIfTrusted: true });
        } catch {
          // User can reconnect manually
        }
      }

      const okx = getOkxProvider();
      if (okx && !okx.isConnected) {
        try {
          await okx.connect({ onlyIfTrusted: true });
        } catch {
          // User can reconnect manually
        }
      }
    })();
  }, [wallet.connected, restoreWalletSession]);

  return null;
}
