"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { OkxWalletAdapter } from "./okx-wallet-adapter";
import { useMemo, type ReactNode } from "react";
import { getSolanaNetwork, getSolanaRpcUrl } from "./config";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = getSolanaRpcUrl();
  const wallets = useMemo(() => {
    if (typeof window === "undefined") return [];
    const network = getSolanaNetwork() === "mainnet" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;
    return [new OkxWalletAdapter(), new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
