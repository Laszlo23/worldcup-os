import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  findInjectedForSession,
  injectedPubkey,
  type InjectedWallet,
} from "./injected-wallet";
import { ensureWalletNetwork } from "./ensure-wallet-network";
import {
  getUnlockedSmartWalletPubkey,
  isSmartWalletUnlocked,
  smartWalletTxFns,
} from "./smart-wallet";
import { useAppStore } from "../store";
import { canUseOnChainPredictions } from "./config";

export type WalletTxFns = {
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<string>;
};

function isBlockhashError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("blockhash") || msg.includes("block hash") || msg.includes("expired");
}

function hasPartialSignatures(tx: Transaction): boolean {
  return tx.signatures.some((entry) => entry.signature != null);
}

/** Pre-built server txs go stale quickly — refresh immediately before sign/send. */
async function refreshLegacyBlockhash(tx: Transaction, connection: Connection): Promise<void> {
  // Sponsored/partially-signed txs (authority fee payer) must keep their blockhash.
  if (hasPartialSignatures(tx)) return;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
}

function txFnsFromInjected(wallet: InjectedWallet): WalletTxFns {
  return {
    signTransaction: async (tx) => {
      await ensureWalletNetwork(wallet.name);
      return wallet.provider.signTransaction(tx);
    },
    sendTransaction: async (tx, connection) => {
      await ensureWalletNetwork(wallet.name);
      if (tx instanceof Transaction) {
        await refreshLegacyBlockhash(tx, connection);
      }
      const signed = await wallet.provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return signature;
    },
  };
}

/** Sign and broadcast a transaction (adapter send or sign + raw send fallback). */
export async function submitTransaction(
  tx: Transaction | VersionedTransaction,
  txFns: WalletTxFns,
  connection: Connection,
): Promise<string> {
  const broadcast = async (): Promise<string> => {
    if (tx instanceof Transaction) {
      await refreshLegacyBlockhash(tx, connection);
    }
    if (txFns.sendTransaction) {
      return txFns.sendTransaction(tx, connection);
    }
    const signed = await txFns.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  };

  try {
    return await broadcast();
  } catch (err) {
    if (tx instanceof Transaction && isBlockhashError(err)) {
      await refreshLegacyBlockhash(tx, connection);
      return await broadcast();
    }
    throw err;
  }
}

/** Resolve wallet signing at action time — smart wallet, Phantom, OKX, or adapter bridge. */
export async function resolveWalletTxFns(): Promise<WalletTxFns> {
  const { wallet, walletTxFns } = useAppStore.getState();
  if (!wallet.connected || !wallet.address) {
    throw new Error("Connect wallet first");
  }

  if (
    isSmartWalletUnlocked() &&
    getUnlockedSmartWalletPubkey() === wallet.address
  ) {
    const fns = smartWalletTxFns();
    useAppStore.getState().setWalletTxFns(fns);
    return fns;
  }

  if (walletTxFns?.signTransaction) {
    return walletTxFns;
  }

  const injected = findInjectedForSession(wallet.address);
  if (!injected) {
    throw new Error(
      "Wallet not ready — unlock your MatchMind smart wallet or reconnect Phantom / OKX",
    );
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
  if (isSmartWalletUnlocked() && getUnlockedSmartWalletPubkey() === wallet.address) {
    return true;
  }
  if (walletTxFns?.signTransaction) return true;
  const injected = findInjectedForSession(wallet.address);
  if (!injected?.provider.isConnected || !injected.provider.publicKey) return false;
  return injectedPubkey(injected.provider) === wallet.address;
}

/** @deprecated Use isWalletReadyForSigning */
export const isPhantomReadyForSigning = isWalletReadyForSigning;
