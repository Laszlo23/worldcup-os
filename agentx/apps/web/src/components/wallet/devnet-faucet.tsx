"use client";

import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useWalletStore } from "@/lib/store/wallet";
import { useState } from "react";
import { toast } from "sonner";

export function DevnetFaucetButton() {
  const wallet = useWalletStore((s) => s.wallet);
  const updateWalletBalance = useWalletStore((s) => s.updateWalletBalance);
  const [loading, setLoading] = useState(false);

  if (!wallet.connected) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1 text-xs text-gold"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void (async () => {
          try {
            const res = await apiFetch<{ balance: number; amount: number; explorerUrl?: string }>("/api/faucet/usdc", {
              method: "POST",
            });
            updateWalletBalance(res.balance);
            toast.success(`Received ${res.amount} devnet USDC`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Faucet failed");
          } finally {
            setLoading(false);
          }
        })();
      }}
    >
      <Droplets className="h-3.5 w-3.5" />
      Faucet
    </Button>
  );
}
