import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { resolveWalletTxFns } from "@/lib/wallet/signing";
import { Transaction, Connection } from "@solana/web3.js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
import type { EngagementMoment } from "@/lib/queries/hooks";
import { SOCCER_MOMENT_FALLBACKS } from "@/lib/soccer-assets";

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

export function MomentCard({ moment, size = "lg" }: { moment: EngagementMoment; size?: "lg" | "sm" }) {
  const style = rarityStyles[moment.rarity] ?? rarityStyles.Common;
  const wallet = useAppStore((s) => s.wallet);
  const [claiming, setClaiming] = useState(false);
  const qc = useQueryClient();

  const claim = async () => {
    if (!wallet.connected) {
      toast.error("Connect wallet to claim on Solana");
      return;
    }
    setClaiming(true);
    try {
      const built = await apiFetch<{ transaction: string }>(`/api/engagement/moments/${moment.id}/claim`, {
        method: "POST",
        body: JSON.stringify({ action: "build" }),
      });
      const txFns = await resolveWalletTxFns();
      const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
      const signed = await txFns.signTransaction(tx);
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
      const sig = await txFns.sendTransaction!(signed, connection);
      const res = await apiFetch<{ explorerUrl?: string }>(`/api/engagement/moments/${moment.id}/claim`, {
        method: "POST",
        body: JSON.stringify({ txSignature: sig }),
      });
      toast.success("Moment claimed on-chain", {
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.moments(moment.matchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
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
            <Button size="sm" className="mt-3 w-full" disabled={claiming} onClick={() => void claim()}>
              {moment.claimed ? "Claimed" : claiming ? "Claiming…" : "Claim on Solana"}
            </Button>
          ) : (
            <p className="mt-2 text-xs text-primary font-mono uppercase">On-chain claimed</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
