import { useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { getClientSolanaNetwork } from "@/lib/wallet/config";
import { cn } from "@/lib/utils";

type DevnetUsdcFaucetProps = {
  variant?: "button" | "inline";
  className?: string;
  showWhenBalanceAbove?: number;
};

export function DevnetUsdcFaucet({
  variant = "button",
  className,
  showWhenBalanceAbove = 5,
}: DevnetUsdcFaucetProps) {
  const wallet = useAppStore((s) => s.wallet);
  const updateWalletBalance = useAppStore((s) => s.updateWalletBalance);
  const [loading, setLoading] = useState(false);
  const isDevnet = getClientSolanaNetwork() === "devnet";

  if (!isDevnet || !wallet.connected) return null;
  if (wallet.balance > showWhenBalanceAbove && variant !== "inline") return null;

  const requestUsdc = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        amount: number;
        balance: number;
        explorerUrl: string;
      }>("/api/faucet/usdc", { method: "POST" });
      updateWalletBalance(res.balance);
      toast.success(`+${res.amount} test USDC`, {
        description: `${res.balance.toFixed(2)} USDC ready for escrow`,
        action: res.explorerUrl
          ? {
              label: "Explorer",
              onClick: () => window.open(res.explorerUrl, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Faucet request failed");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void requestUsdc()}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50",
          className,
        )}
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : <Droplets className="size-3" />}
        Get 100 test USDC
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      className={cn("gap-1.5", className)}
      onClick={() => void requestUsdc()}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Droplets className="size-4" />}
      Get test USDC
    </Button>
  );
}
