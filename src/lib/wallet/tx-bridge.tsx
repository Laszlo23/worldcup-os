import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { useAppStore } from "../store";

export function WalletTxBridge() {
  const { signTransaction, sendTransaction } = useWallet();
  const setWalletTxFns = useAppStore((s) => s.setWalletTxFns);

  useEffect(() => {
    if (signTransaction) {
      setWalletTxFns({
        signTransaction,
        sendTransaction: sendTransaction ?? undefined,
      });
    } else {
      setWalletTxFns(null);
    }
    return () => setWalletTxFns(null);
  }, [signTransaction, sendTransaction, setWalletTxFns]);

  return null;
}
