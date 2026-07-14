import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
import { Connection, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
import type { EngagementMoment } from "@/lib/queries/hooks";
import { SOCCER_MOMENT_FALLBACKS } from "@/lib/soccer-assets";
import { decodeBase64 } from "@/lib/base64";
import { useWalletSigningReady } from "@/hooks/use-wallet-signing-ready";

function momentImageSrc(moment: EngagementMoment): string {
  const img = moment.image?.trim() ?? "";
  if (!img || img.startsWith("/moment-") || img.endsWith(".jpg")) {
    const idx = Math.abs(moment.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % SOCCER_MOMENT_FALLBACKS.length;
    return SOCCER_MOMENT_FALLBACKS[idx];
  }
  return img;
}

const rarityStyles: Record<string, { chip: string; ring: string; text: string }> = {
  Common: { chip: "bg-muted text-muted-foreground", ring: "ring-border", text: "text-foreground" },
  Rare: { chip: "bg-accent text-accent-foreground", ring: "ring-accent/40", text: "text-accent" },
  Epic: { chip: "bg-primary text-primary-foreground", ring: "ring-primary/40", text: "text-primary" },
  Legendary: { chip: "bg-gold text-primary-foreground", ring: "ring-gold/50", text: "text-gold" },
};

type ClaimStep = "idle" | "building" | "signing" | "confirming";

export function MomentCard({ moment, size = "lg" }: { moment: EngagementMoment; size?: "lg" | "sm" }) {
  const style = rarityStyles[moment.rarity] ?? rarityStyles.Common;
  const wallet = useAppStore((s) => s.wallet);
  const signingReady = useWalletSigningReady();
  const [step, setStep] = useState<ClaimStep>("idle");
  const qc = useQueryClient();
  const claiming = step !== "idle";

  const claimLabel = (() => {
    if (!wallet.connected) return "Connect wallet";
    if (!signingReady) return "Preparing wallet…";
    switch (step) {
      case "building":
        return "Building tx…";
      case "signing":
        return "Sign in wallet…";
      case "confirming":
        return "Confirming…";
      default:
        return "Claim on Solana";
    }
  })();

  const claim = async () => {
    if (!wallet.connected) {
      toast.error("Connect wallet to claim on Solana");
      return;
    }
    if (!signingReady) {
      toast.message("Wallet preparing", { description: "One moment — then try again." });
      return;
    }

    const runClaim = async () => {
      const txFns = await resolveWalletTxFns();
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
      setStep("building");
      const built = await apiFetch<{ transaction: string }>(`/api/engagement/moments/${moment.id}/claim`, {
        method: "POST",
        body: JSON.stringify({ action: "build" }),
      });
      const tx = Transaction.from(decodeBase64(built.transaction));
      setStep("signing");
      const sig = await submitTransaction(tx, txFns, connection);
      setStep("confirming");
      const res = await apiFetch<{ explorerUrl?: string }>(`/api/engagement/moments/${moment.id}/claim`, {
        method: "POST",
        body: JSON.stringify({ txSignature: sig }),
      });
      toast.success("Sticker claimed on-chain", {
        description: moment.title,
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.moments(moment.matchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
    };

    try {
      await runClaim();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Session expired — reconnect wallet");
      } else {
        toast.error(err instanceof Error ? err.message : "Claim failed");
      }
    } finally {
      setStep("idle");
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative overflow-hidden rounded-2xl bg-black ring-1 ${style.ring} ${
        size === "lg" ? "" : "w-[68vw] max-w-[280px] shrink-0"
      }`}
    >
      <div className={`relative ${size === "lg" ? "aspect-[4/5]" : "aspect-[4/5]"}`}>
        <img src={momentImageSrc(moment)} alt={moment.title} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/60 to-transparent p-4">
          <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${style.text}`}>
            {moment.player} · {moment.minute}'
          </p>
          <h4 className="mt-1 text-xl font-black italic uppercase leading-none text-white">{moment.title}</h4>
          {!moment.claimed ? (
            <Button
              size="sm"
              className="mt-3 min-h-[44px] w-full active:scale-[0.98]"
              disabled={claiming || (wallet.connected && !signingReady)}
              onClick={() => void claim()}
            >
              {claimLabel}
            </Button>
          ) : (
            <p className="mt-2 text-xs text-primary font-mono uppercase">On-chain claimed</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
