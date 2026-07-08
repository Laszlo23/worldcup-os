import { type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { LiveProvider } from "@/lib/realtime/live-provider";
import { SolanaWalletProvider } from "@/lib/wallet/provider";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={children}>
      <SolanaWalletProvider>
        <WalletTxBridge />
        <LiveProvider />
        {children}
      </SolanaWalletProvider>
    </ClientOnly>
  );
}
