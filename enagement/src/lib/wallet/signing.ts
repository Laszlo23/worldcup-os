import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  findInjectedForSession,
  injectedPubkey,
  type InjectedWallet,
} from "./injected-wallet";
import { ensureWalletNetwork } from "./ensure-wallet-network";
import { useAppStore } from "../store";
import { canUseOnChainPredictions } from "./config";

export type WalletTxFns = {
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<string>;
};

function txFnsFromInjected(wallet: InjectedWallet): WalletTxFns {
  return {
    signTransaction: async (tx) => {
      await ensureWalletNetwork(wallet.name);
      return wallet.provider.signTransaction(tx);
    },
    sendTransaction: async (tx, connection) => {
      await ensureWalletNetwork(wallet.name);
      const signed = await wallet.provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    },
  };
}

/** Resolve wallet signing at action time — Phantom, OKX, or wallet-adapter bridge. */
export async function resolveWalletTxFns(): Promise<WalletTxFns> {
  const { wallet, walletTxFns } = useAppStore.getState();
  if (!wallet.connected || !wallet.address) {
    throw new Error("Connect wallet first");
  }

  if (walletTxFns?.signTransaction) {
    return walletTxFns;
  }

  const injected = findInjectedForSession(wallet.address);
  if (!injected) {
    throw new Error("Wallet extension not detected — reconnect your wallet to sign the escrow transfer");
  }

  if (!injected.provider.isConnected || !injected.provider.publicKey) {
    try {
      await injected.provider.connect({ onlyIfTrusted: true });
    } catch {
      await injected.provider.connect();
    }
  }

  const pubkey = injectedPubkey(injected.provider);
  if (!pubkey) {
    throw new Error("Wallet not connected — click Connect and approve access");
  }
  if (pubkey !== wallet.address) {
    throw new Error("Connected wallet account does not match your signed-in wallet — disconnect and reconnect");
  }

  await ensureWalletNetwork(injected.name);
  const fns = txFnsFromInjected(injected);
  useAppStore.getState().setWalletTxFns(fns);
  return fns;
}

export function isOnChainPredictionEnabled(): boolean {
  return canUseOnChainPredictions();
}

export function isWalletReadyForSigning(): boolean {
  const { wallet, walletTxFns } = useAppStore.getState();
  if (!wallet.connected) return false;
  if (walletTxFns?.signTransaction) return true;
  const injected = findInjectedForSession(wallet.address);
  if (!injected?.provider.isConnected || !injected.provider.publicKey) return false;
  return injectedPubkey(injected.provider) === wallet.address;
}

/** @deprecated Use isWalletReadyForSigning */
export const isPhantomReadyForSigning = isWalletReadyForSigning;
