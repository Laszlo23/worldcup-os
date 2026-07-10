import { useEffect } from "react";
import { usePortfolio } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";

/** Keep Zustand predictions in sync with the indexed API whenever a wallet session is active. */
export function PortfolioSync() {
  const wallet = useAppStore((s) => s.wallet);
  const syncPortfolio = useAppStore((s) => s.syncPortfolio);
  const { data: portfolio } = usePortfolio();

  useEffect(() => {
    if (!wallet.connected || !portfolio) return;
    syncPortfolio([...portfolio.open, ...portfolio.won, ...portfolio.lost, ...portfolio.settled]);
  }, [wallet.connected, portfolio, syncPortfolio]);

  return null;
}
