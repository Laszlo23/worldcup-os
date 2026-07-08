import { type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { LiveProvider } from "@/lib/realtime/live-provider";
import { SolanaWalletProvider } from "@/lib/wallet/provider";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";

function ProvidersWithoutWallet({ children }: { children: ReactNode }) {
  return (
    <>
      <LiveProvider />
      {children}
    </>
  );
}

function ProvidersWithWallet({ children }: { children: ReactNode }) {
  return (
    <SolanaWalletProvider>
      <WalletTxBridge />
      <LiveProvider />
      {children}
    </SolanaWalletProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<ProvidersWithoutWallet>{children}</ProvidersWithoutWallet>}>
      <ProvidersWithWallet>{children}</ProvidersWithWallet>
    </ClientOnly>
  );
}
