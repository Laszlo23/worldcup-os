import { create } from "zustand";
import { toast } from "sonner";
import type { WalletTxFns } from "@/lib/wallet/signing";

type WalletState = {
  connected: boolean;
  address: string;
  balance: number;
};

type WalletStore = {
  wallet: WalletState;
  walletTxFns: WalletTxFns | null;
  connectWallet: (address: string, balance: number) => void;
  restoreWalletSession: (address: string, balance: number) => void;
  updateWalletBalance: (balance: number) => void;
  disconnectWallet: (opts?: { silent?: boolean }) => void;
  setWalletTxFns: (fns: WalletTxFns | null) => void;
};

export const useWalletStore = create<WalletStore>((set) => ({
  wallet: { connected: false, address: "", balance: 0 },
  walletTxFns: null,
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
  setWalletTxFns: (fns) => set({ walletTxFns: fns }),
}));
