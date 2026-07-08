import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { LiveProvider } from "@/lib/realtime/live-provider";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";

const SolanaWalletProvider = lazy(() =>
  import("@/lib/wallet/provider").then((m) => ({ default: m.SolanaWalletProvider })),
);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={children}>
      <Suspense fallback={children}>
        <SolanaWalletProvider>
          <WalletTxBridge />
          <LiveProvider />
          {children}
        </SolanaWalletProvider>
      </Suspense>
    </ClientOnly>
  );
}
