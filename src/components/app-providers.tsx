import { type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { LiveProvider } from "@/lib/realtime/live-provider";
import { SolanaWalletProvider } from "@/lib/wallet/provider";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";
import { WalletUiReadyContext } from "@/lib/wallet/wallet-ui-ready";

function ProvidersWithoutWallet({ children }: { children: ReactNode }) {
  return (
    <WalletUiReadyContext.Provider value={false}>
      <LiveProvider />
      {children}
    </WalletUiReadyContext.Provider>
  );
}

function ProvidersWithWallet({ children }: { children: ReactNode }) {
  return (
    <SolanaWalletProvider>
      <WalletUiReadyContext.Provider value={true}>
        <WalletTxBridge />
        <LiveProvider />
        {children}
      </WalletUiReadyContext.Provider>
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
