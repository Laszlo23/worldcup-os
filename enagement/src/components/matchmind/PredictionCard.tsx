import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, Loader2, ArrowRight, Users, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { queryKeys, useMatchSignals, type EngagementPoll } from "@/lib/queries/hooks";
import { showStickerEarnToast } from "@/components/matchmind/StickerEarnToast";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { agentChoice, crowdChoice } from "@/lib/follow-vote";
import {
  getFollowMode,
  unlockFanBadge,
  FAN_BADGE_META,
} from "@/lib/onboarding";
import { ShareActions } from "@/components/social/share-actions";
import { votePollOnChain } from "@/lib/wallet/poll-vote";
import { isSmartWalletUnlocked } from "@/lib/wallet/smart-wallet";
import { useWalletSigningReady } from "@/hooks/use-wallet-signing-ready";

const MATCH_ORIGIN = import.meta.env.VITE_APP_URL ?? "https://match.buildingcultureid.space";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Implied decimal-style crowd quote from Yes share (floor 1.05). */
function crowdQuote(yesShare: number): { yes: string; no: string } {
  const y = Math.min(0.92, Math.max(0.08, yesShare || 0.5));
  const n = 1 - y;
  return {
    yes: (1 / y).toFixed(2),
    no: (1 / n).toFixed(2),
  };
}

function toastNewBadge(id: "crowd-rider" | "agent-ally" | "first-whistle") {
  if (!unlockFanBadge(id)) return;
  const meta = FAN_BADGE_META[id];
  toast.success(`Badge unlocked · ${meta.title}`, { description: meta.detail });
}

export function PredictionCard({ p }: { p: EngagementPoll }) {
  const wallet = useAppStore((s) => s.wallet);
  const signingReady = useWalletSigningReady();
  const [countdown, setCountdown] = useState(p.countdown);
  const [choice, setChoice] = useState<"yes" | "no" | null>(p.userChoice ?? null);
  const [preferred, setPreferred] = useState(() => getFollowMode());
  const qc = useQueryClient();
  const { data: signalsData } = useMatchSignals(p.matchId, !p.resolved);
  const signal = signalsData?.signals?.[0] ?? null;
  const agentLean = agentChoice(p, signal);

  useEffect(() => {
    setPreferred(getFollowMode());
  }, []);

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
      if (!signingReady) {
        throw new Error(
          isSmartWalletUnlocked()
            ? "Wallet preparing — try again"
            : "Unlock your MatchMind smart wallet to vote on-chain",
        );
      }
      return votePollOnChain({ pollId: p.id, choice: c });
    },
    onSuccess: (res) => {
      setChoice(res.choice);
      toastNewBadge("first-whistle");
      toast.success("Vote locked on-chain", {
        description: `If you're right when the window closes, you earn +${res.choice === "yes" ? p.yesReward : p.noReward} XP.`,
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : {
              label: "Profile",
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
  const quotes = crowdQuote(p.probability);
  const ringPct = p.countdown > 0 ? Math.min(100, (countdown / Math.max(p.countdown, 1)) * 100) : 0;
  const closed = countdown === 0 || p.resolved;
  const locked = choice !== null;
  const isSevenMin = /7\s*min/i.test(p.window);
  const crowdSide = crowdChoice(p);
  const canVote = wallet.connected && signingReady && !locked && !closed && !vote.isPending;

  const followCrowd = () => {
    if (!canVote) return;
    toastNewBadge("crowd-rider");
    vote.mutate(crowdSide);
  };

  const followAgent = () => {
    if (!canVote) return;
    if (!agentLean) {
      toast.message("Agent is quiet", {
        description: "No live AgentX signal for this match yet — try Crowd or call it yourself.",
      });
      return;
    }
    toastNewBadge("agent-ally");
    vote.mutate(agentLean.choice);
  };

  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong relative overflow-hidden rounded-2xl p-4"
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            {isSevenMin ? "7-min micro" : "XP poll"} · {p.window}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold leading-snug text-balance">{p.question}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/35 bg-primary/12 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              YES {quotes.yes}
            </span>
            <span className="rounded-full border border-accent/35 bg-accent/12 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent">
              NO {quotes.no}
            </span>
            <span className="text-[11px] text-muted-foreground">Crowd quote · live</span>
          </div>
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
          <p className="text-xs text-muted-foreground">Create or unlock your MatchMind wallet to vote on-chain.</p>
          <ConnectWalletButton size="default" />
        </div>
      ) : wallet.connected && !signingReady && !locked && !closed ? (
        <div className="relative mt-4 rounded-xl border border-live/30 bg-live/10 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Unlock your MatchMind smart wallet (header → address → or Profile) to sign the on-chain vote.
          </p>
        </div>
      ) : (
        <>
          {!locked && !closed ? (
            <div className="relative mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canVote}
                onClick={followCrowd}
                className={`flex min-h-[48px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] disabled:opacity-50 ${
                  preferred === "crowd"
                    ? "border-primary/55 bg-primary/15 shadow-[0_0_20px_oklch(0.82_0.22_155_/_0.15)]"
                    : "border-border bg-background/70"
                }`}
              >
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                  <Users className="size-3" />
                  Follow Crowd
                </span>
                <span className="text-xs font-semibold">
                  Lock <span className="uppercase text-primary">{crowdSide}</span>
                  <span className="text-muted-foreground"> · {crowdSide === "yes" ? pct : 100 - pct}%</span>
                </span>
              </button>
              <button
                type="button"
                disabled={!canVote}
                onClick={followAgent}
                className={`flex min-h-[48px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] disabled:opacity-50 ${
                  preferred === "agent"
                    ? "border-accent/55 bg-accent/15 shadow-[0_0_20px_oklch(0.82_0.16_210_/_0.18)]"
                    : "border-border bg-background/70"
                }`}
              >
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                  <Bot className="size-3" />
                  Follow Agent
                </span>
                <span className="line-clamp-1 text-xs font-semibold">
                  {agentLean ? (
                    <>
                      Lock <span className="uppercase text-accent">{agentLean.choice}</span>
                      {signal ? (
                        <span className="text-muted-foreground"> · {Math.round(signal.confidence)}%</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Waiting on signal…</span>
                  )}
                </span>
              </button>
            </div>
          ) : null}

          {agentLean && !locked && !closed ? (
            <p className="relative mt-2 line-clamp-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Agent · {agentLean.reason}
            </p>
          ) : null}

          <div className="relative mt-3 grid grid-cols-2 gap-2">
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
        </>
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
          <div className="space-y-1.5 border-t border-primary/20 pt-2">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary/90">
              Share this call
            </p>
            <ShareActions
              contentType="prediction"
              contentId={p.id}
              title={`I locked ${choice.toUpperCase()} on: ${p.question}`}
              url={`${MATCH_ORIGIN}/predict`}
            />
          </div>
          <Link to="/moments" className="inline-flex items-center gap-1 font-semibold text-accent">
            Claim goal moments in Album <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}

      {p.voters > 0 ? (
        <div className="relative mt-4">
          <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            <span>
              Crowd Yes {pct}% · quote {quotes.yes}
            </span>
            <span>{p.voters} votes</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div initial={false} animate={{ width: `${pct}%` }} className="h-full bg-primary" />
          </div>
        </div>
      ) : (
        <p className="relative mt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Be the first vote — set the crowd quote
        </p>
      )}
    </motion.article>
  );
}
