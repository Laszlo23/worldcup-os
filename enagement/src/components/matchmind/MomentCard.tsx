import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
import { getSigningStatus } from "@/lib/wallet/signing-status";
import { ensureOnchainGas } from "@/lib/wallet/fund-wallet";
import { Connection, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
import type { EngagementMoment } from "@/lib/queries/hooks";
import { dropArtForSeed } from "@/lib/soccer-assets";
import { decodeBase64 } from "@/lib/base64";
import { useWalletSigningReady } from "@/hooks/use-wallet-signing-ready";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { SmartWalletDialog } from "@/components/wallet/smart-wallet-dialog";
import { rarityStyles } from "./sticker-styles";

/** Prefer diversified drop art so the album never looks like one repeated still. */
function momentImageSrc(moment: EngagementMoment): string {
  return dropArtForSeed(`${moment.id}:${moment.player}:${moment.minute}`);
}

type ClaimStep = "idle" | "building" | "signing" | "confirming";

export function MomentCard({ moment, size = "lg" }: { moment: EngagementMoment; size?: "lg" | "sm" }) {
  const style = rarityStyles[moment.rarity] ?? rarityStyles.Common;
  const wallet = useAppStore((s) => s.wallet);
  const signingReady = useWalletSigningReady();
  const [step, setStep] = useState<ClaimStep>("idle");
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartMode, setSmartMode] = useState<"auto" | "create" | "unlock">("auto");
  const qc = useQueryClient();
  const claiming = step !== "idle";
  const signingStatus = getSigningStatus();
  const needsSigner = wallet.connected && !signingReady;

  const claimLabel = (() => {
    if (needsSigner) {
      if (signingStatus.kind === "unlock_smart") return "Unlock to claim";
      if (signingStatus.kind === "create_smart") return "Create wallet to claim";
      if (signingStatus.kind === "reconnect_extension") return "Reconnect wallet";
      return "Unlock to claim";
    }
    switch (step) {
      case "idle":
        return "Claim · +50 XP";
      case "building":
        return "Building tx…";
      case "signing":
        return "Sign in wallet…";
      case "confirming":
        return "Confirming…";
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  })();

  const openSigner = () => {
    const status = getSigningStatus();
    if (status.kind === "unlock_smart") {
      setSmartMode("unlock");
      setSmartOpen(true);
      toast.message("Unlock your smart wallet", {
        description: "Enter your PIN so MatchMind can sign the on-chain claim memo.",
      });
      return;
    }
    if (status.kind === "create_smart") {
      setSmartMode("create");
      setSmartOpen(true);
      toast.message("Create a smart wallet", {
        description: "Your session has no signer on this device — create one (or connect Phantom).",
      });
      return;
    }
    if (status.kind === "reconnect_extension") {
      toast.error("Reconnect Phantom / OKX", {
        description: "Session is restored but the extension is locked — open Connect and approve.",
      });
    }
  };

  const claim = async () => {
    if (!wallet.connected) {
      toast.error("Connect wallet first", {
        description: "Use Connect in the header, then claim this goal drop.",
      });
      return;
    }
    if (!signingReady) {
      openSigner();
      return;
    }

    const runClaim = async () => {
      const txFns = await resolveWalletTxFns();
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
      setStep("building");
      await ensureOnchainGas();
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
      toast.success("Moment claimed · +50 XP", {
        description: `${moment.title} is now in your album`,
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : { label: "Passport", onClick: () => { window.location.href = "/passport"; } },
      });
      void qc.invalidateQueries({ queryKey: queryKeys.moments(moment.matchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.moments() });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
    };

    try {
      await runClaim();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Session expired — reconnect wallet");
      } else {
        const msg = err instanceof Error ? err.message : "Claim failed";
        const hint =
          /program that does not exist|ProgramAccountNotFound/i.test(msg)
            ? "Network memo program issue — refresh and try again."
            : /blockhash|expired/i.test(msg)
              ? "Transaction expired — tap Claim again."
              : msg;
        toast.error(hint);
      }
    } finally {
      setStep("idle");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl ring-2 ${style.ring} ${style.glow} ${
        size === "lg" ? "ambient-orbs" : "w-[68vw] max-w-[280px] shrink-0"
      }`}
    >
      <div className="relative aspect-[4/5] bg-black">
        <img
          src={momentImageSrc(moment)}
          alt={moment.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] ${style.chip}`}
          >
            {moment.rarity}
          </span>
          {moment.serial ? (
            <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[9px] text-white/80 backdrop-blur-sm">
              {moment.serial}
            </span>
          ) : null}
        </div>

        {moment.claimed ? (
          <div className="absolute right-3 top-3 z-20 rotate-[-8deg] rounded-md border border-accent/50 bg-accent/15 px-2 py-1 backdrop-blur-md">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent text-glow-accent">
              On-chain
            </p>
          </div>
        ) : (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 backdrop-blur-sm">
            <Sparkles className="size-3 text-primary" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-primary">Drop</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          <div className="glass rounded-xl p-3">
            <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${style.text}`}>
              {moment.player} · {moment.minute}'
              {moment.match ? ` · ${moment.match}` : ""}
            </p>
            <h4 className="mt-1 font-display text-xl font-bold italic uppercase leading-none tracking-tight text-white">
              {moment.title}
            </h4>
            {!moment.claimed ? (
              wallet.connected ? (
                <>
                  <Button
                    size="sm"
                    className="mm-shimmer mt-3 min-h-[44px] w-full bg-gradient-to-r from-primary to-accent text-primary-foreground active:scale-[0.98]"
                    disabled={claiming}
                    onClick={() => void claim()}
                  >
                    {needsSigner ? <KeyRound className="mr-1.5 size-3.5" /> : null}
                    {claimLabel}
                  </Button>
                  {needsSigner ? (
                    <p className="mt-1.5 text-[10px] text-white/65">
                      Session restored — unlock (or create) a signer on this device to claim on-chain.
                    </p>
                  ) : null}
                  <SmartWalletDialog open={smartOpen} onOpenChange={setSmartOpen} mode={smartMode} />
                </>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] text-white/70">Connect wallet, then sign a Solana memo to claim (+50 XP).</p>
                  <ConnectWalletButton size="default" />
                </div>
              )
            ) : (
              <div className="mt-2 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Claimed · +50 XP
                </p>
                <Link
                  to="/passport"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-accent"
                >
                  View in Passport <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
