import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useMemo, type ReactNode } from "react";
import { getClientSolanaNetwork } from "./config";
import { OkxWalletAdapter } from "./okx-wallet-adapter";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** Only construct adapters in the browser — safe for SSR and unit tests. */
export function createWalletAdapters() {
  if (typeof window === "undefined") return [];
  const network =
    getClientSolanaNetwork() === "mainnet" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;
  return [new PhantomWalletAdapter(), new OkxWalletAdapter(), new SolflareWalletAdapter({ network })];
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => createWalletAdapters(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
