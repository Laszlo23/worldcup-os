import { useEffect } from "react";
import { useAppStore } from "../store";
import { refreshWalletSession } from "./auth";
import { getPhantomProvider } from "./phantom-connect";

/** Restore HTTP session cookie into client wallet state (survives page refresh). */
export function WalletSessionRestore() {
  const wallet = useAppStore((s) => s.wallet);
  const restoreWalletSession = useAppStore((s) => s.restoreWalletSession);

  useEffect(() => {
    if (wallet.connected) return;

    void (async () => {
      const session = await refreshWalletSession();
      if (!session) return;

      restoreWalletSession(session.wallet, session.balance);

      const provider = getPhantomProvider();
      if (!provider || provider.isConnected) return;

      try {
        await provider.connect({ onlyIfTrusted: true });
      } catch {
        // User can reconnect manually — session alone is not enough to sign txs
      }
    })();
  }, [wallet.connected, restoreWalletSession]);

  return null;
}
