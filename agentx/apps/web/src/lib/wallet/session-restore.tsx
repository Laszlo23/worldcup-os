"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/lib/store/wallet";
import { refreshWalletSession } from "./auth";

export function WalletSessionRestore() {
  const wallet = useWalletStore((s) => s.wallet);
  const restoreWalletSession = useWalletStore((s) => s.restoreWalletSession);

  useEffect(() => {
    if (wallet.connected) return;
    void (async () => {
      const session = await refreshWalletSession();
      if (session) restoreWalletSession(session.wallet, session.balance);
    })();
  }, [wallet.connected, restoreWalletSession]);

  return null;
}
