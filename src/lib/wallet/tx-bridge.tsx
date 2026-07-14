import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppStore } from "../store";
import { findInjectedForSession, injectedPubkey } from "./injected-wallet";
import type { WalletTxFns } from "./signing";

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
      setWalletTxFns({
        signTransaction: (tx) => injected.provider.signTransaction(tx),
        sendTransaction: async (tx, connection) => {
          const signed = await injected.provider.signTransaction(tx);
          const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
          await connection.confirmTransaction(signature, "confirmed");
          return signature;
        },
      });
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
