"use client";

import { createContext, useContext, useEffect, useState } from "react";

const WalletUiReadyContext = createContext(false);

export function WalletUiReadyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <WalletUiReadyContext.Provider value={ready}>{children}</WalletUiReadyContext.Provider>;
}

export function useWalletUiReady(): boolean {
  return useContext(WalletUiReadyContext);
}
