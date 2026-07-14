"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletUiReadyProvider } from "@/lib/wallet/wallet-ui-ready";
import { WalletSessionRestore } from "@/lib/wallet/session-restore";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";
import { TraderSocketProvider } from "@/lib/trader-socket-provider";

const SolanaWalletProvider = dynamic(
  () => import("@/lib/wallet/provider").then((m) => m.SolanaWalletProvider),
  { ssr: false },
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5000, refetchInterval: 15000 } } }));
  return (
    <QueryClientProvider client={client}>
      <WalletUiReadyProvider>
        <SolanaWalletProvider>
          <TraderSocketProvider>
            <WalletSessionRestore />
            <WalletTxBridge />
            {children}
          </TraderSocketProvider>
        </SolanaWalletProvider>
      </WalletUiReadyProvider>
    </QueryClientProvider>
  );
}
