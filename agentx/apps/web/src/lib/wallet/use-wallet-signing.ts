"use client";

import { useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletStore } from "@/lib/store/wallet";
import { connectInjectedWallet, findInjectedForSession, getInjectedWallet } from "./injected-wallet";
import type { WalletTxFns } from "./signing";

export function useWalletSigning() {
  const { signTransaction, sendTransaction, connected, publicKey, connect, wallet: adapterWallet } = useWallet();
  const session = useWalletStore((s) => s.wallet);
  const storedFns = useWalletStore((s) => s.walletTxFns);

  const adapterFns = useMemo((): WalletTxFns | null => {
    const adapterPubkey = connected && publicKey ? publicKey.toBase58() : null;
    const sessionPubkey = session.connected ? session.address : null;
    if (signTransaction && adapterPubkey && sessionPubkey && adapterPubkey === sessionPubkey) {
      return { signTransaction, sendTransaction: sendTransaction ?? undefined };
    }
    return null;
  }, [signTransaction, sendTransaction, connected, publicKey, session.connected, session.address]);

  const injectedFns = useMemo((): WalletTxFns | null => {
    if (!session.connected) return null;
    const injected = findInjectedForSession(session.address);
    if (!injected?.provider.signTransaction) return null;
    return {
      signTransaction: (tx) => injected.provider.signTransaction(tx),
    };
  }, [session.connected, session.address]);

  const fns = storedFns ?? adapterFns ?? injectedFns;
  const ready = Boolean(fns);

  const ensureReady = useCallback(async (): Promise<WalletTxFns> => {
    if (storedFns) return storedFns;
    if (adapterFns) return adapterFns;
    if (injectedFns) return injectedFns;

    if (!session.connected) {
      throw new Error("Connect your wallet first");
    }

    const injected = findInjectedForSession(session.address) ?? getInjectedWallet();
    if (injected) {
      await connectInjectedWallet(injected);
      if (injected.provider.signTransaction) {
        return { signTransaction: (tx) => injected.provider.signTransaction(tx) };
      }
    }

    if (!connected && adapterWallet) {
      await connect();
    }

    if (signTransaction && publicKey?.toBase58() === session.address) {
      return { signTransaction, sendTransaction: sendTransaction ?? undefined };
    }

    throw new Error("Reconnect your wallet to approve the funding transaction");
  }, [
    storedFns,
    adapterFns,
    injectedFns,
    session.connected,
    session.address,
    connected,
    connect,
    adapterWallet,
    signTransaction,
    sendTransaction,
    publicKey,
  ]);

  return { fns, ready, ensureReady, sessionConnected: session.connected };
}
