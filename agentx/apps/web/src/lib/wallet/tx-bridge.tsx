"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletStore } from "@/lib/store/wallet";

export function WalletTxBridge() {
  const { signTransaction, sendTransaction, connected, publicKey } = useWallet();
  const wallet = useWalletStore((s) => s.wallet);
  const setWalletTxFns = useWalletStore((s) => s.setWalletTxFns);

  useEffect(() => {
    const adapterPubkey = connected && publicKey ? publicKey.toBase58() : null;
    const sessionPubkey = wallet.connected ? wallet.address : null;
    if (signTransaction && adapterPubkey && sessionPubkey && adapterPubkey === sessionPubkey) {
      setWalletTxFns({
        signTransaction,
        sendTransaction: sendTransaction ?? undefined,
      });
      return () => setWalletTxFns(null);
    }
    setWalletTxFns(null);
  }, [signTransaction, sendTransaction, connected, publicKey, wallet.connected, wallet.address, setWalletTxFns]);

  return null;
}
