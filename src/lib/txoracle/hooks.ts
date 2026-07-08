import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { createTxoracleProgram } from "./program";

export function useTxoracleProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return createTxoracleProgram(connection, wallet);
  }, [connection, wallet]);
}
