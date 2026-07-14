import { type ReactNode } from "react";
import { LiveProvider } from "@/lib/realtime/live-provider";
import { SolanaWalletProvider } from "@/lib/wallet/provider";
import { WalletTxBridge } from "@/lib/wallet/tx-bridge";
import { WalletSessionRestore } from "@/lib/wallet/session-restore";
import { WalletUiReadyContext } from "@/lib/wallet/wallet-ui-ready";
import { useClientMounted } from "@/hooks/use-client-mounted";

export function AppProviders({ children }: { children: ReactNode }) {
  const clientMounted = useClientMounted();

  return (
    <LiveProvider>
      {clientMounted ? (
        <SolanaWalletProvider>
          <WalletUiReadyContext.Provider value={true}>
            <WalletTxBridge />
            <WalletSessionRestore />
            {children}
          </WalletUiReadyContext.Provider>
        </SolanaWalletProvider>
      ) : (
        <WalletUiReadyContext.Provider value={false}>{children}</WalletUiReadyContext.Provider>
      )}
    </LiveProvider>
  );
}
