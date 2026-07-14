import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { isWalletReadyForSigning } from "@/lib/wallet/signing";
import { useWalletUiReady } from "@/lib/wallet/wallet-ui-ready";

/** Poll until wallet bridge is ready for on-chain signing. */
export function useWalletSigningReady(): boolean {
  const walletUiReady = useWalletUiReady();
  const connected = useAppStore((s) => s.wallet.connected);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!walletUiReady || !connected) {
      setReady(false);
      return;
    }
    const check = () => setReady(isWalletReadyForSigning());
    check();
    const id = window.setInterval(check, 200);
    return () => window.clearInterval(id);
  }, [walletUiReady, connected]);

  return walletUiReady && connected && ready;
}
