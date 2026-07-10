"use client";

import { createContext, useContext } from "react";
import { useTraderSocket } from "@/lib/use-trader-socket";

const TraderSocketContext = createContext(false);

export function TraderSocketProvider({ children }: { children: React.ReactNode }) {
  const { connected } = useTraderSocket();
  return <TraderSocketContext.Provider value={connected}>{children}</TraderSocketContext.Provider>;
}

export function useTraderSocketConnected(): boolean {
  return useContext(TraderSocketContext);
}
