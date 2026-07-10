import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys, type EngagementPoll } from "@/lib/queries/hooks";
import { toast } from "sonner";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PredictionCard({ p }: { p: EngagementPoll }) {
  const [countdown, setCountdown] = useState(p.countdown);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setCountdown(p.countdown);
  }, [p.countdown]);

  useEffect(() => {
    if (countdown <= 0 || choice || p.resolved) return;
    const id = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown, choice, p.resolved]);

  const vote = useMutation({
    mutationFn: async (c: "yes" | "no") => {
      await apiFetch(`/api/engagement/polls/${p.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ choice: c }),
      });
      return c;
    },
    onSuccess: (c) => {
      setChoice(c);
      toast.success("Vote locked in");
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.polls(p.matchId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Vote failed"),
  });

  const pct = Math.round(p.probability * 100);
  const ringPct = p.countdown > 0 ? Math.min(100, (countdown / Math.max(p.countdown, 1)) * 100) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <div className="mm-shimmer pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Live Prediction · {p.window}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-balance">{p.question}</h3>
        </div>
        <div className="relative grid size-12 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="16" className="fill-none stroke-muted" strokeWidth="2" />
            <circle
              cx="18"
              cy="18"
              r="16"
              className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - ringPct / 100)}
            />
          </svg>
          <span className="absolute font-mono text-[10px] font-bold tabular-nums text-primary">
            {formatCountdown(countdown)}
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={choice !== null || countdown === 0 || vote.isPending || p.resolved}
          onClick={() => vote.mutate("yes")}
          className={`flex flex-col items-center justify-center rounded-lg px-3 py-2.5 text-sm font-bold uppercase italic tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
            choice === "yes" ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
          }`}
        >
          {vote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Yes</span>}
          <span className="mt-0.5 font-mono text-[10px] font-bold not-italic tracking-normal opacity-80">
            +{p.yesReward} XP
          </span>
        </button>
        <button
          type="button"
          disabled={choice !== null || countdown === 0 || vote.isPending || p.resolved}
          onClick={() => vote.mutate("no")}
          className={`flex flex-col items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-bold uppercase italic tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
            choice === "no" ? "border-primary bg-primary/15 text-primary" : "bg-background text-foreground"
          }`}
        >
          <span>No</span>
          <span className="mt-0.5 font-mono text-[10px] font-bold not-italic tracking-normal opacity-70">
            +{p.noReward} XP
          </span>
        </button>
      </div>

      {choice ? (
        <div className="relative mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <Zap className="size-3.5" />
          Locked in <span className="font-bold uppercase">{choice}</span>
        </div>
      ) : null}
      <div className="relative mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    </motion.article>
  );
}
