import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Zap, Loader2, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api/client";
import { queryKeys, type EngagementPoll } from "@/lib/queries/hooks";
import { showStickerEarnToast } from "@/components/matchmind/StickerEarnToast";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PredictionCard({ p }: { p: EngagementPoll }) {
  const wallet = useAppStore((s) => s.wallet);
  const [countdown, setCountdown] = useState(p.countdown);
  const [choice, setChoice] = useState<"yes" | "no" | null>(p.userChoice ?? null);
  const qc = useQueryClient();

  useEffect(() => {
    setCountdown(p.countdown);
  }, [p.countdown]);

  useEffect(() => {
    setChoice(p.userChoice ?? null);
  }, [p.userChoice, p.id]);

  useEffect(() => {
    if (countdown <= 0 || choice || p.resolved) return;
    const id = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown, choice, p.resolved]);

  const vote = useMutation({
    mutationFn: async (c: "yes" | "no") => {
      const res = await apiFetch<{
        ok: boolean;
        choice: "yes" | "no";
        newSticker?: { id: string; title: string; rarity: string; imageUrl: string };
      }>(`/api/engagement/polls/${p.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ choice: c }),
      });
      return res;
    },
    onSuccess: (res) => {
      setChoice(res.choice);
      toast.success("Vote locked in", {
        description: `If you're right when the window closes, you earn +${res.choice === "yes" ? p.yesReward : p.noReward} XP.`,
        action: {
          label: "Passport",
          onClick: () => {
            window.location.href = "/passport";
          },
        },
      });
      if (res.newSticker) showStickerEarnToast(res.newSticker);
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
      void qc.invalidateQueries({ queryKey: queryKeys.polls(p.matchId) });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Connect wallet to vote");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Vote failed");
    },
  });

  const pct = Math.round(p.probability * 100);
  const ringPct = p.countdown > 0 ? Math.min(100, (countdown / Math.max(p.countdown, 1)) * 100) : 0;
  const closed = countdown === 0 || p.resolved;
  const locked = choice !== null;

  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong relative overflow-hidden rounded-2xl p-4"
    >
      <div className="mm-shimmer pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            XP Poll · {p.window}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold leading-snug text-balance">{p.question}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Free to vote · XP paid only if you win after the window settles
          </p>
        </div>
        <div className="relative grid size-12 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="16" className="fill-none stroke-muted" strokeWidth="2" />
            <circle
              cx="18"
              cy="18"
              r="16"
              className="fill-none stroke-accent transition-[stroke-dashoffset] duration-1000 ease-linear"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - ringPct / 100)}
            />
          </svg>
          <span className="absolute font-mono text-[10px] font-bold tabular-nums text-accent">
            {closed ? "Done" : formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {!wallet.connected && !locked ? (
        <div className="relative mt-4 space-y-2 rounded-xl border border-accent/25 bg-accent/10 p-3 text-center">
          <p className="text-xs text-muted-foreground">Connect your Solana wallet to lock in a vote.</p>
          <ConnectWalletButton size="default" />
        </div>
      ) : (
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={locked || closed || vote.isPending}
            onClick={() => vote.mutate("yes")}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg px-3 py-2.5 text-sm font-bold uppercase italic tracking-tight transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              choice === "yes" ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
            }`}
          >
            {vote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Yes</span>}
            <span className="mt-0.5 font-mono text-[10px] font-bold not-italic tracking-normal opacity-80">
              Win +{p.yesReward} XP
            </span>
          </button>
          <button
            type="button"
            disabled={locked || closed || vote.isPending}
            onClick={() => vote.mutate("no")}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-bold uppercase italic tracking-tight transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              choice === "no" ? "border-accent bg-accent/15 text-accent" : "bg-background text-foreground"
            }`}
          >
            <span>No</span>
            <span className="mt-0.5 font-mono text-[10px] font-bold not-italic tracking-normal opacity-70">
              Win +{p.noReward} XP
            </span>
          </button>
        </div>
      )}

      {choice ? (
        <div className="relative mt-3 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Zap className="size-3.5" />
            Locked in <span className="font-bold uppercase">{choice}</span>
            {p.resolved && p.outcome ? (
              <span className="ml-auto font-mono uppercase">
                {p.outcome === choice ? "Won" : p.outcome === "void" ? "Void" : "Lost"}
              </span>
            ) : (
              <span className="ml-auto text-muted-foreground">Settles after window</span>
            )}
          </div>
          <Link to="/moments" className="inline-flex items-center gap-1 font-semibold text-accent">
            Claim goal moments in Album <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}

      {p.voters > 0 ? (
        <div className="relative mt-4">
          <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            <span>Crowd Yes {pct}%</span>
            <span>{p.voters} votes</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <motion.div initial={false} animate={{ width: `${pct}%` }} className="h-full bg-accent" />
          </div>
        </div>
      ) : (
        <p className="relative mt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Be the first vote on this poll
        </p>
      )}
    </motion.article>
  );
}
