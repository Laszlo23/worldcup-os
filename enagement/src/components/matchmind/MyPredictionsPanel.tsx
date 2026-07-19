import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";

type UsdcPred = {
  id: string;
  matchId: string;
  outcomeLabel: string;
  amount: number;
  status: string;
  payout?: number;
  claimed: boolean;
};

type XpVote = {
  id: string;
  matchId: string;
  question: string;
  window: string;
  choice: "yes" | "no";
  outcome: "yes" | "no" | "void" | null;
  xpAwarded: number;
  txSignature: string | null;
  createdAt: string;
  resolved: boolean;
  won: boolean | null;
  explorerUrl: string | null;
};

type Filter = "all" | "open" | "won" | "settled" | "xp";

function statusTone(status: string): string {
  switch (status) {
    case "open":
      return "border-accent/40 text-accent bg-accent/10";
    case "won":
      return "border-primary/40 text-primary bg-primary/10";
    case "settled":
      return "border-gold/40 text-gold bg-gold/10";
    case "lost":
      return "border-muted-foreground/30 text-muted-foreground bg-muted/40";
    default:
      return "border-border text-muted-foreground bg-muted/30";
  }
}

function voteTone(vote: XpVote): string {
  if (vote.won === true) return "border-primary/40 text-primary bg-primary/10";
  if (vote.won === false) return "border-muted-foreground/30 text-muted-foreground bg-muted/40";
  return "border-accent/40 text-accent bg-accent/10";
}

/** Full history of the fan's USDC markets + XP poll votes — claim wins here. */
export function MyPredictionsPanel({
  compact = false,
  defaultFilter = "all",
}: {
  compact?: boolean;
  defaultFilter?: Filter;
}) {
  const wallet = useAppStore((s) => s.wallet);
  const updateWalletBalance = useAppStore((s) => s.updateWalletBalance);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>(defaultFilter);

  const usdcQ = useQuery({
    queryKey: queryKeys.myPredictions,
    queryFn: () => apiFetch<{ predictions: UsdcPred[] }>("/api/predictions/mine"),
    enabled: wallet.connected,
    refetchInterval: 15_000,
  });

  const xpQ = useQuery({
    queryKey: queryKeys.myXpVotes,
    queryFn: () => apiFetch<{ votes: XpVote[] }>("/api/engagement/polls/mine"),
    enabled: wallet.connected,
    refetchInterval: 15_000,
  });

  const claim = useMutation({
    mutationFn: (predictionExternalId: string) =>
      apiFetch<{ ok: boolean; payout: number; explorerUrl?: string | null }>("/api/predictions/claim", {
        method: "POST",
        body: JSON.stringify({ predictionExternalId }),
      }),
    onSuccess: (res) => {
      toast.success(`Claimed ${res.payout.toFixed(2)} USDC`, {
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl!, "_blank") }
          : undefined,
      });
      updateWalletBalance(wallet.balance + res.payout);
      void qc.invalidateQueries({ queryKey: queryKeys.myPredictions });
      void qc.invalidateQueries({ queryKey: queryKeys.myXpVotes });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Claim failed");
    },
  });

  const predictions = usdcQ.data?.predictions ?? [];
  const votes = xpQ.data?.votes ?? [];

  const claimable = useMemo(
    () => predictions.filter((p) => p.status === "won" && !p.claimed),
    [predictions],
  );

  const filteredUsdc = useMemo(() => {
    switch (filter) {
      case "open":
        return predictions.filter((p) => p.status === "open");
      case "won":
        return predictions.filter((p) => p.status === "won" || (p.status === "settled" && (p.payout ?? 0) > 0));
      case "settled":
        return predictions.filter((p) => p.status === "settled" || p.status === "lost");
      case "xp":
        return [];
      default:
        return predictions;
    }
  }, [filter, predictions]);

  const showXp = filter === "all" || filter === "xp";
  const isPending = usdcQ.isPending || xpQ.isPending;

  if (!wallet.connected) {
    return (
      <section
        id="mine"
        className="rounded-3xl border border-border/80 bg-card/40 p-4 text-center"
      >
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <Trophy className="size-3.5" />
          My picks
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your wallet to see XP poll votes and USDC market positions.
        </p>
        <div className="mt-3 flex justify-center">
          <ConnectWalletButton size="default" />
        </div>
      </section>
    );
  }

  return (
    <section
      id="mine"
      className={`rounded-3xl border border-primary/25 bg-primary/5 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Trophy className="size-3.5" />
            My picks
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your XP poll votes and USDC market positions — claim wins here.
          </p>
        </div>
        {claimable.length > 0 ? (
          <span className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-gold">
            {claimable.length} to claim
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["won", "Won"],
            ["settled", "Settled"],
            ["xp", "XP polls"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
              filter === id
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading your picks…
        </p>
      ) : null}

      {!isPending && filteredUsdc.length === 0 && !(showXp && votes.length > 0) ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No picks in this filter yet.</p>
          <Link
            to="/predict"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent"
          >
            Open Polls <Sparkles className="size-3" />
          </Link>
        </div>
      ) : null}

      {filter !== "xp" && filteredUsdc.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            USDC markets
          </p>
          <ul className="space-y-2">
            {filteredUsdc.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${statusTone(p.status)}`}
                    >
                      {p.status}
                      {p.claimed ? " · claimed" : ""}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{p.outcomeLabel}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Stake {p.amount} USDC
                    {p.payout != null && p.payout > 0 ? ` · payout ${p.payout.toFixed(2)}` : ""}
                  </p>
                </div>
                {p.status === "won" && !p.claimed ? (
                  <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(p.id)}>
                    {claim.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Claim"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showXp && votes.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            XP poll votes
          </p>
          <ul className="space-y-2">
            {(filter === "xp" ? votes : votes.slice(0, compact ? 4 : 12)).map((v) => (
              <li
                key={`${v.id}-${v.createdAt}`}
                className="rounded-xl border border-border bg-background/50 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${voteTone(v)}`}
                  >
                    {v.won === true ? "won" : v.won === false ? "missed" : "locked"}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {v.choice}
                  </span>
                  {v.xpAwarded > 0 ? (
                    <span className="font-mono text-[9px] font-bold text-primary">+{v.xpAwarded} XP</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-semibold leading-snug">{v.question}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{v.window}</span>
                  {v.explorerUrl ? (
                    <a
                      href={v.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-accent hover:underline"
                    >
                      On-chain <ExternalLink className="size-2.5" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {filter === "all" && votes.length > (compact ? 4 : 12) ? (
            <button
              type="button"
              onClick={() => setFilter("xp")}
              className="text-xs font-semibold text-accent"
            >
              See all {votes.length} XP votes →
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** @deprecated Prefer MyPredictionsPanel — kept as alias for existing imports. */
export function ClaimsPanel() {
  return <MyPredictionsPanel />;
}
