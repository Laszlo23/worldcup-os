import { create } from "zustand";
import { toast } from "sonner";
import type { Match } from "@/lib/types";
import type { WalletTxFns } from "@/lib/wallet/signing";

interface WalletState {
  connected: boolean;
  address: string;
  balance: number;
}

interface AppState {
  wallet: WalletState;
  matches: Match[];
  featuredMatchId: string | null;
  xp: number;
  walletTxFns: WalletTxFns | null;

  setMatches: (matches: Match[]) => void;
  setFeaturedMatchId: (id: string | null) => void;
  setXp: (xp: number) => void;
  setWalletTxFns: (fns: WalletTxFns | null) => void;
  connectWallet: (address: string, balance: number) => void;
  restoreWalletSession: (address: string, balance: number) => void;
  updateWalletBalance: (balance: number) => void;
  disconnectWallet: (opts?: { silent?: boolean }) => void;
  updateMatch: (id: string, patch: Partial<Match>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  wallet: { connected: false, address: "", balance: 0 },
  matches: [],
  featuredMatchId: null,
  xp: 0,
  walletTxFns: null,

  setMatches: (matches) => set({ matches }),
  setFeaturedMatchId: (id) => set({ featuredMatchId: id }),
  setXp: (xp) => set({ xp }),
  setWalletTxFns: (fns) => set({ walletTxFns: fns }),

  connectWallet: (address, balance) => {
    set({ wallet: { connected: true, address, balance } });
    toast.success("Wallet connected");
  },

  restoreWalletSession: (address, balance) => {
    set({ wallet: { connected: true, address, balance } });
  },

  updateWalletBalance: (balance) => {
    set((s) => ({ wallet: { ...s.wallet, balance } }));
  },

  disconnectWallet: (opts) => {
    set({ wallet: { connected: false, address: "", balance: 0 }, walletTxFns: null });
    if (!opts?.silent) toast("Wallet disconnected");
  },

  updateMatch: (id, patch) =>
    set((s) => ({
      matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
}));
