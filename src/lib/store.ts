import { create } from "zustand";
import { toast } from "sonner";
import type { Match, Prediction } from "./mock/types";
import { initialMatches } from "./mock/data";
import { apiFetch } from "./api/client";
import { placePredictionOnChain } from "./wallet/prediction";
import { canUseOnChainPredictions } from "./wallet/config";
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

  setMatches: (matches: Match[]) => void;
  setWalletTxFns: (fns: WalletTxFns | null) => void;
  connectWallet: (address: string, balance: number) => void;
  disconnectWallet: () => void;

  updateMatch: (id: string, patch: Partial<Match>) => void;
  placePrediction: (p: Omit<Prediction, "id" | "placedAt" | "status">) => Promise<void>;
  settlePrediction: (id: string, won: boolean) => void;
  claim: (id: string) => Promise<void>;
  syncPortfolio: (predictions: Prediction[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  wallet: { connected: false, address: "", balance: 0 },
  matches: initialMatches,
  predictions: [],
  walletTxFns: null,

  setMatches: (matches) => set({ matches }),
  setWalletTxFns: (fns) => set({ walletTxFns: fns }),

  connectWallet: (address, balance) => {
    set({ wallet: { connected: true, address, balance } });
    toast.success("Wallet connected", { description: address.slice(0, 8) + "…" + address.slice(-6) });
  },

  disconnectWallet: () => {
    set({ wallet: { connected: false, address: "", balance: 0 }, predictions: [], walletTxFns: null });
    toast("Wallet disconnected");
  },

  updateMatch: (id, patch) =>
    set((s) => ({ matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),

  placePrediction: async (p) => {
    const { wallet, walletTxFns } = get();
    if (!wallet.connected) return toast.error("Connect wallet to place a prediction");
    if (wallet.balance < p.amount) return toast.error("Insufficient USDC balance");

    try {
      let res: { prediction: Prediction };

      if (walletTxFns && canUseOnChainPredictions()) {
        res = await placePredictionOnChain({
          marketExternalId: p.marketId,
          optionExternalId: p.outcomeId,
          amount: p.amount,
          walletAddress: wallet.address,
          signTransaction: walletTxFns.signTransaction,
          sendTransaction: walletTxFns.sendTransaction,
        });
      } else {
        res = await apiFetch<{ prediction: Prediction }>("/api/predictions/place", {
          method: "POST",
          body: JSON.stringify({
            marketExternalId: p.marketId,
            optionExternalId: p.outcomeId,
            amount: p.amount,
          }),
        });
      }

      set((s) => ({
        wallet: { ...s.wallet, balance: s.wallet.balance - p.amount },
        predictions: [res.prediction, ...s.predictions],
      }));
      toast.success("Prediction locked in escrow", {
        description: `${p.amount} USDC on ${p.outcomeLabel} @ ${p.price.toFixed(2)}x`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place prediction");
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
    if (!p || p.status !== "won" || p.claimed || !wallet.connected) return;

    try {
      const res = await apiFetch<{ ok: boolean; payout: number }>("/api/predictions/claim", {
        method: "POST",
        body: JSON.stringify({ predictionExternalId: id }),
      });
      set((s) => ({
        wallet: { ...s.wallet, balance: s.wallet.balance + res.payout },
        predictions: s.predictions.map((x) => (x.id === id ? { ...x, claimed: true, status: "settled" } : x)),
      }));
      toast.success("Reward claimed", { description: `+${res.payout} USDC` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim reward");
    }
  },

  syncPortfolio: (predictions) => set({ predictions }),
}));
