import { createContext, useContext } from "react";

export const WalletUiReadyContext = createContext(false);

export function useWalletUiReady(): boolean {
  return useContext(WalletUiReadyContext);
}
