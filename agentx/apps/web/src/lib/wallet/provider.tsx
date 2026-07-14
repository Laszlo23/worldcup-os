"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork, type Adapter } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { OkxWalletAdapter } from "./okx-wallet-adapter";
import { useMemo, type ReactNode } from "react";
import { getSolanaNetwork, getSolanaRpcUrl } from "./config";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = getSolanaRpcUrl();
  const wallets = useMemo(() => {
    if (typeof window === "undefined") return [];
    const network = getSolanaNetwork() === "mainnet" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;
    const list: Adapter[] = [new OkxWalletAdapter(), new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })];
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (projectId) {
      list.push(
        new WalletConnectWalletAdapter({
          network,
          options: { projectId },
        }),
      );
    }
    return list;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
