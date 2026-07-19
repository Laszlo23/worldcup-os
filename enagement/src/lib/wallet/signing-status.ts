import { findInjectedForSession, injectedPubkey } from "./injected-wallet";
import {
  getSmartWalletPubkey,
  getUnlockedSmartWalletPubkey,
  hasSmartWallet,
  isSmartWalletUnlocked,
} from "./smart-wallet";
import { useAppStore } from "../store";

export type SigningStatus =
  | { kind: "ready" }
  | { kind: "disconnected" }
  | { kind: "unlock_smart"; pubkey: string }
  | { kind: "create_smart" }
  | { kind: "reconnect_extension" };

/** Why the session can / cannot sign on-chain txs right now. */
export function getSigningStatus(): SigningStatus {
  const { wallet, walletTxFns } = useAppStore.getState();
  if (!wallet.connected || !wallet.address) return { kind: "disconnected" };

  if (
    isSmartWalletUnlocked() &&
    getUnlockedSmartWalletPubkey() === wallet.address
  ) {
    return { kind: "ready" };
  }

  if (walletTxFns?.signTransaction) return { kind: "ready" };

  const injected = findInjectedForSession(wallet.address);
  if (injected?.provider.isConnected && injected.provider.publicKey) {
    if (injectedPubkey(injected.provider) === wallet.address) return { kind: "ready" };
  }

  const smartPubkey = getSmartWalletPubkey();
  if (smartPubkey && smartPubkey === wallet.address && hasSmartWallet()) {
    return { kind: "unlock_smart", pubkey: smartPubkey };
  }

  if (hasSmartWallet()) {
    // Stored smart wallet differs from session — unlock switches session to it.
    return { kind: "unlock_smart", pubkey: smartPubkey ?? "" };
  }

  if (injected) return { kind: "reconnect_extension" };

  return { kind: "create_smart" };
}
