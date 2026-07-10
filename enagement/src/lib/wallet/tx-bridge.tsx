import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppStore } from "../store";
import { findInjectedForSession, injectedPubkey } from "./injected-wallet";
import type { WalletTxFns } from "./signing";

function injectedTxFns(injected: NonNullable<ReturnType<typeof findInjectedForSession>>): WalletTxFns {
  return {
    signTransaction: (tx) => injected.provider.signTransaction(tx),
  };
}

export function WalletTxBridge() {
  const { signTransaction, sendTransaction, connected, publicKey, wallet: adapterWallet } = useWallet();
  const wallet = useAppStore((s) => s.wallet);
  const setWalletTxFns = useAppStore((s) => s.setWalletTxFns);

  useEffect(() => {
    const adapterPubkey = connected && publicKey ? publicKey.toBase58() : null;
    const sessionPubkey = wallet.connected ? wallet.address : null;
    const injected = sessionPubkey ? findInjectedForSession(sessionPubkey) : null;
    const injectedPubkeyStr = injected ? injectedPubkey(injected.provider) : null;

    if (signTransaction && adapterPubkey && sessionPubkey && adapterPubkey === sessionPubkey) {
      setWalletTxFns({
        signTransaction,
        sendTransaction: sendTransaction ?? undefined,
      });
      return () => setWalletTxFns(null);
    }

    if (sessionPubkey && injected && injectedPubkeyStr === sessionPubkey) {
      setWalletTxFns(injectedTxFns(injected));
      return () => setWalletTxFns(null);
    }

    setWalletTxFns(null);
  }, [
    signTransaction,
    sendTransaction,
    connected,
    publicKey,
    adapterWallet?.adapter.name,
    wallet.connected,
    wallet.address,
    setWalletTxFns,
  ]);

  return null;
}
