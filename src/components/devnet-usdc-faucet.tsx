import { useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { getClientSolanaNetwork } from "@/lib/wallet/config";
import { cn } from "@/lib/utils";

type DevnetUsdcFaucetProps = {
  variant?: "button" | "menu" | "inline";
  className?: string;
  showWhenBalanceAbove?: number;
};

export function DevnetUsdcFaucet({ variant = "button", className, showWhenBalanceAbove = 5 }: DevnetUsdcFaucetProps) {
  const wallet = useAppStore((s) => s.wallet);
  const updateWalletBalance = useAppStore((s) => s.updateWalletBalance);
  const [loading, setLoading] = useState(false);
  const isDevnet = getClientSolanaNetwork() === "devnet";

  if (!isDevnet || !wallet.connected) return null;
  if (wallet.balance > showWhenBalanceAbove && variant !== "menu") return null;

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
        description: `${res.balance.toFixed(2)} USDC available on devnet`,
        action: res.explorerUrl
          ? {
              label: "View tx",
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

  if (variant === "menu") {
    return (
      <DropdownMenuItem className="min-h-[44px]" disabled={loading} onClick={() => void requestUsdc()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
        Get test USDC (devnet)
      </DropdownMenuItem>
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void requestUsdc()}
        className={cn(
          "text-[11px] text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50",
          className,
        )}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Droplets className="h-3 w-3" />}
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
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
      Get test USDC
    </Button>
  );
}

export function getDevnetStakePresets(): readonly number[] {
  return getClientSolanaNetwork() === "devnet" ? [1, 5, 10, 25] : [10, 25, 50, 100];
}

export function getDefaultStakeAmount(): number {
  return getClientSolanaNetwork() === "devnet" ? 5 : 25;
}
