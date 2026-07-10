import { create } from "zustand";
import { toast } from "sonner";
import type { Match, Prediction } from "./mock/types";
import { apiFetch } from "./api/client";
import { placePredictionOnChain } from "./wallet/prediction";
import { isOnChainPredictionEnabled, resolveWalletTxFns } from "./wallet/signing";
import { parseWalletSimulationError } from "./wallet/prediction-errors";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";

interface WalletState {
  connected: boolean;
  address: string;
  balance: number;
}

type WalletTxFns = {
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<string>;
};

interface AppState {
  wallet: WalletState;
  matches: Match[];
  predictions: Prediction[];
  walletTxFns: WalletTxFns | null;
  claimingId: string | null;
  feedUnreadCount: number;

  setMatches: (matches: Match[]) => void;
  setWalletTxFns: (fns: WalletTxFns | null) => void;
  connectWallet: (address: string, balance: number) => void;
  restoreWalletSession: (address: string, balance: number) => void;
  updateWalletBalance: (balance: number) => void;
  disconnectWallet: (opts?: { silent?: boolean }) => void;

  updateMatch: (id: string, patch: Partial<Match>) => void;
  placePrediction: (p: Omit<Prediction, "id" | "placedAt" | "status">) => Promise<string | null>;
  settlePrediction: (id: string, won: boolean) => void;
  claim: (id: string) => Promise<{ payout: number; explorerUrl?: string | null } | null>;
  syncPortfolio: (predictions: Prediction[]) => void;
  incrementFeedUnread: () => void;
  clearFeedUnread: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  wallet: { connected: false, address: "", balance: 0 },
  matches: [],
  predictions: [],
  walletTxFns: null,
  claimingId: null,
  feedUnreadCount: 0,

  setMatches: (matches) => set({ matches }),
  setWalletTxFns: (fns) => set({ walletTxFns: fns }),

  connectWallet: (address, balance) => {
    set({ wallet: { connected: true, address, balance } });
    toast.success("Wallet connected", { description: address.slice(0, 8) + "…" + address.slice(-6) });
  },

  restoreWalletSession: (address, balance) => {
    set({ wallet: { connected: true, address, balance } });
  },

  updateWalletBalance: (balance) => {
    set((s) => ({ wallet: { ...s.wallet, balance } }));
  },

  disconnectWallet: (opts) => {
    set({ wallet: { connected: false, address: "", balance: 0 }, predictions: [], walletTxFns: null });
    if (!opts?.silent) toast("Wallet disconnected");
  },

  updateMatch: (id, patch) =>
    set((s) => ({ matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

  placePrediction: async (p) => {
    const { wallet } = get();
    if (!wallet.connected) {
      toast.error("Connect wallet to place a prediction");
      return null;
    }
    if (wallet.balance < p.amount) {
      toast.error("Insufficient USDC balance");
      return null;
    }

    try {
      if (!isOnChainPredictionEnabled()) {
        toast.error("On-chain predictions are not configured for this deployment");
        return null;
      }

      const txFns = await resolveWalletTxFns();
      const onChain = await placePredictionOnChain({
        marketExternalId: p.marketId,
        optionExternalId: p.outcomeId,
        amount: p.amount,
        walletAddress: wallet.address,
        signTransaction: txFns.signTransaction,
        sendTransaction: txFns.sendTransaction,
      });

      const res = { prediction: onChain.prediction, txSignature: onChain.txSignature };

      set((s) => ({
        wallet: { ...s.wallet, balance: Math.max(0, s.wallet.balance - p.amount) },
        predictions: [res.prediction, ...s.predictions],
      }));

      const explorerUrl = res.txSignature
        ? `https://explorer.solana.com/tx/${res.txSignature}?cluster=${import.meta.env.VITE_SOLANA_NETWORK ?? "devnet"}`
        : undefined;

      toast.success("Prediction locked in escrow", {
        description: `${p.amount} USDC on ${p.outcomeLabel} @ ${p.price.toFixed(2)}x`,
        action: explorerUrl
          ? {
              label: "View tx",
              onClick: () => window.open(explorerUrl, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      return res.txSignature ?? "confirmed";
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to place prediction";
      const friendly = parseWalletSimulationError(raw);
      const message = friendly ?? raw;
      if (/user rejected|cancelled|canceled|denied/i.test(message)) {
        toast.message("Transaction cancelled");
      } else {
        toast.error(message, {
          description: /SOL|faucet/i.test(message)
            ? "Predictions use USDC for stake but SOL pays Solana network fees."
            : undefined,
        });
      }
      return null;
    }
  },

  settlePrediction: (id, won) =>
    set((s) => ({
      predictions: s.predictions.map((p) =>
        p.id === id
          ? { ...p, status: won ? "won" : "lost", payout: won ? +(p.amount * p.price).toFixed(2) : 0 }
          : p,
      ),
    })),

  claim: async (id) => {
    const wallet = get().wallet;
    const p = get().predictions.find((x) => x.id === id);
    if (!p || p.status !== "won" || p.claimed || !wallet.connected || get().claimingId) return null;

    set({ claimingId: id });
    try {
      const res = await apiFetch<{ ok: boolean; payout: number; explorerUrl?: string | null }>("/api/predictions/claim", {
        method: "POST",
        body: JSON.stringify({ predictionExternalId: id }),
      });
      set((s) => ({
        wallet: { ...s.wallet, balance: s.wallet.balance + res.payout },
        predictions: s.predictions.map((x) => (x.id === id ? { ...x, claimed: true, status: "settled" } : x)),
        claimingId: null,
      }));
      toast.success("Reward claimed on-chain", {
        description: res.explorerUrl ? `+${res.payout} USDC · confirmed on Solana` : `+${res.payout} USDC`,
        action: res.explorerUrl
          ? {
              label: "Explorer",
              onClick: () => window.open(res.explorerUrl!, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      return { payout: res.payout, explorerUrl: res.explorerUrl };
    } catch (err) {
      set({ claimingId: null });
      toast.error(err instanceof Error ? err.message : "Failed to claim reward");
      return null;
    }
  },

  syncPortfolio: (predictions) => set({ predictions }),

  incrementFeedUnread: () => set((s) => ({ feedUnreadCount: s.feedUnreadCount + 1 })),

  clearFeedUnread: () => set({ feedUnreadCount: 0 }),
}));
