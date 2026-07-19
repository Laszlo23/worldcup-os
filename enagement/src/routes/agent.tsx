import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Sparkles, Zap } from "lucide-react";
import { DocPageShell } from "@/components/matchmind/DocPageShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useMatchSignals, queryKeys } from "@/lib/queries/hooks";
import { hasSmartWallet, isSmartWalletUnlocked } from "@/lib/wallet/smart-wallet";
import { executeAgentPilotPlan } from "@/lib/wallet/agent-pilot";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { setFollowMode } from "@/lib/onboarding";
import { toast } from "sonner";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
});

type Prefs = {
  enabled: boolean;
  mode: "agent" | "crowd";
  votesCast: number;
  lastTickAt: string | null;
  usdcMarkets: boolean;
  usdcBudget: number;
  usdcSpent: number;
  usdcStake: number;
  marketsPlaced: number;
  usdcRemaining: number;
};

const BUDGET_PRESETS = [10, 25, 50, 100];
const STAKE_PRESETS = [1, 5, 10, 25];

function AgentPage() {
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();
  const { match } = useActiveMatchState();
  const { data: signalsData } = useMatchSignals(match?.id, wallet.connected);
  const [draftBudget, setDraftBudget] = useState<number | null>(null);
  const [draftStake, setDraftStake] = useState<number | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["autoAgent"],
    queryFn: () => apiFetch<{ prefs: Prefs }>("/api/engagement/auto-agent"),
    enabled: wallet.connected,
    refetchInterval: 10_000,
  });

  const save = useMutation({
    mutationFn: (body: Partial<Prefs> & { enabled: boolean }) =>
      apiFetch<{ prefs: Prefs }>("/api/engagement/auto-agent", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (res, vars) => {
      setFollowMode(res.prefs.mode);
      if (typeof vars.enabled === "boolean" && vars.enabled !== data?.prefs.enabled) {
        toast.success(res.prefs.enabled ? "Agent Pilot on" : "Agent Pilot off");
      } else {
        toast.success("Pilot settings saved");
      }
      setDraftBudget(null);
      setDraftStake(null);
      void qc.invalidateQueries({ queryKey: ["autoAgent"] });
      void qc.invalidateQueries({ queryKey: ["communityTasks"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Connect wallet first");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Update failed");
    },
  });

  const tick = useMutation({
    mutationFn: async () => {
      const plan = await apiFetch<{
        planned?: { pollId: string; choice: "yes" | "no" }[];
        plannedMarkets?: {
          marketExternalId: string;
          optionExternalId: string;
          amount: number;
          label: string;
          matchExternalId: string;
        }[];
        skipped: number;
      }>("/api/engagement/auto-agent", {
        method: "POST",
        body: JSON.stringify({ action: "tick", matchId: match?.id }),
      });
      const result = await executeAgentPilotPlan(plan);
      return { plan, result };
    },
    onSuccess: ({ plan, result }) => {
      if (result.lockedVotes || result.lockedMarkets) {
        toast.success("Agent Pilot locked on-chain", {
          description: [
            result.lockedVotes ? `${result.lockedVotes} XP vote(s)` : null,
            result.lockedMarkets
              ? `${result.lockedMarkets} USDC (${result.spent}) — ${(plan.plannedMarkets ?? [])
                  .map((m) => m.label)
                  .join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        });
        void qc.invalidateQueries({ queryKey: queryKeys.polls(match?.id) });
        void qc.invalidateQueries({ queryKey: queryKeys.myPredictions });
        void qc.invalidateQueries({ queryKey: ["autoAgent"] });
      } else {
        toast.message("Nothing locked", {
          description:
            (plan.planned?.length || plan.plannedMarkets?.length)
              ? "Signing failed — unlock wallet / fund USDC and retry."
              : plan.skipped
                ? "Waiting on signals, budget, or open pre-match markets."
                : "Check back when windows or markets open.",
        });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Tick failed"),
  });

  const mounted = useClientMounted();
  const smartExists = mounted && hasSmartWallet();
  const smartReady = smartExists && isSmartWalletUnlocked();

  if (!wallet.connected) {
    return (
      <DocPageShell title="Agent" subtitle="Auto-predict with AgentX">
        <div className="space-y-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a MatchMind smart wallet to enable Agent Pilot — XP polls and budgeted USDC markets,
            both signed on-chain.
          </p>
          <ConnectWalletButton size="default" />
        </div>
      </DocPageShell>
    );
  }

  const prefs = data?.prefs;
  const signal = signalsData?.signals?.[0];
  const budget = draftBudget ?? prefs?.usdcBudget ?? 0;
  const stake = draftStake ?? prefs?.usdcStake ?? 5;

  return (
    <DocPageShell title="Agent" subtitle="Auto-predict with AgentX">
      <header className="kit-stripe relative overflow-hidden rounded-3xl border border-accent/35 p-5">
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          <Bot className="size-3.5" />
          Agent Pilot
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold italic tracking-tight">
          Follow Agent — with a USDC leash
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set how much test USDC the pilot may spend. It locks XP polls and pre-match winner markets
          on Solana using your unlocked smart wallet — every tx is on-chain.
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-border bg-card/70 p-3 text-xs text-muted-foreground">
        {smartReady ? (
          <p className="text-primary">
            Smart wallet unlocked — pilot can sign XP memos and USDC escrow transfers.
          </p>
        ) : smartExists ? (
          <p>
            Unlock your smart wallet from the header so the pilot can sign. Wallet balance:{" "}
            <span className="font-mono text-foreground">{wallet.balance.toFixed(2)} USDC</span>
          </p>
        ) : (
          <p>
            Tip: <span className="font-semibold text-foreground">Create a smart wallet</span> so Agent
            Pilot can sign without extension popups.
          </p>
        )}
      </div>

      {isPending || !prefs ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-accent" />
        </div>
      ) : (
        <section className="mt-5 space-y-4 rounded-2xl border border-border bg-card/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pilot status</p>
              <p className="text-xs text-muted-foreground">
                {prefs.votesCast} XP votes · {prefs.marketsPlaced} USDC markets ·{" "}
                {prefs.lastTickAt
                  ? `last tick ${new Date(prefs.lastTickAt).toLocaleTimeString()}`
                  : "not ticked yet"}
              </p>
            </div>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  enabled: !prefs.enabled,
                  mode: prefs.mode,
                  usdcMarkets: prefs.usdcMarkets,
                  usdcBudget: prefs.usdcBudget,
                  usdcStake: prefs.usdcStake,
                })
              }
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase italic tracking-tight ${
                prefs.enabled
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background"
              }`}
            >
              {prefs.enabled ? "On" : "Off"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ModeBtn
              active={prefs.mode === "agent"}
              label="Follow Agent"
              detail="AgentX → on-chain"
              onClick={() =>
                save.mutate({
                  enabled: prefs.enabled,
                  mode: "agent",
                  usdcMarkets: prefs.usdcMarkets,
                  usdcBudget: prefs.usdcBudget,
                  usdcStake: prefs.usdcStake,
                })
              }
            />
            <ModeBtn
              active={prefs.mode === "crowd"}
              label="Follow Crowd"
              detail="XP polls only"
              onClick={() =>
                save.mutate({
                  enabled: prefs.enabled,
                  mode: "crowd",
                  usdcMarkets: false,
                  usdcBudget: prefs.usdcBudget,
                  usdcStake: prefs.usdcStake,
                })
              }
            />
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">USDC market budget</p>
                <p className="text-[11px] text-muted-foreground">
                  Cap how much the pilot may stake on winner markets (devnet).
                </p>
              </div>
              <button
                type="button"
                disabled={save.isPending || prefs.mode !== "agent"}
                onClick={() =>
                  save.mutate({
                    enabled: prefs.enabled,
                    mode: prefs.mode,
                    usdcMarkets: !prefs.usdcMarkets,
                    usdcBudget: budget,
                    usdcStake: stake,
                  })
                }
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  prefs.usdcMarkets && prefs.mode === "agent"
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {prefs.usdcMarkets && prefs.mode === "agent" ? "USDC on" : "USDC off"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <StatCell label="Budget" value={`${budget.toFixed(0)}`} />
              <StatCell label="Spent" value={`${prefs.usdcSpent.toFixed(1)}`} />
              <StatCell label="Left" value={`${Math.max(0, budget - prefs.usdcSpent).toFixed(1)}`} accent />
            </div>

            <p className="mt-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Total budget (USDC)
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BUDGET_PRESETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setDraftBudget(b)}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${
                    budget === b
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {b}
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={budget}
                onChange={(e) => setDraftBudget(Number(e.target.value))}
                className="w-16 rounded-full border border-border bg-background px-2 py-1 font-mono text-[10px]"
                aria-label="Custom USDC budget"
              />
            </div>

            <p className="mt-3 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Stake per pick
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STAKE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraftStake(s)}
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${
                    stake === s
                      ? "bg-accent text-accent-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  enabled: prefs.enabled,
                  mode: prefs.mode,
                  usdcMarkets: prefs.usdcMarkets,
                  usdcBudget: budget,
                  usdcStake: stake,
                })
              }
              className="mt-3 w-full rounded-xl border border-border bg-background py-2 text-xs font-bold uppercase tracking-wide"
            >
              Save budget
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Wallet: {wallet.balance.toFixed(2)} USDC · Pilot stops when budget or balance runs out.
              Pre-match winner markets only.
            </p>
          </div>

          <button
            type="button"
            disabled={!prefs.enabled || tick.isPending || !smartReady}
            onClick={() => tick.mutate()}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold uppercase italic text-accent-foreground disabled:opacity-40"
          >
            {tick.isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Run pilot now
          </button>
          {!smartReady ? (
            <p className="text-center text-[11px] text-muted-foreground">
              Unlock the smart wallet to run — background pilot needs an unlocked signer.
            </p>
          ) : null}
        </section>
      )}

      {signal ? (
        <section className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Latest AgentX signal
          </p>
          <p className="mt-1 text-sm font-semibold">{signal.headline}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {signal.prediction} · {Math.round(signal.confidence)}% confidence
          </p>
        </section>
      ) : (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Waiting on AgentX signals for this fixture…
        </p>
      )}

      <p className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-semibold">
        <Link to="/predict" className="text-accent">
          My picks →
        </Link>
        <Link to="/tasks" className="text-muted-foreground hover:text-accent">
          Claim enable-agent task
        </Link>
        <Link to="/docs" className="text-muted-foreground hover:text-accent">
          Docs
        </Link>
      </p>
    </DocPageShell>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/50 px-2 py-2">
      <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ModeBtn({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left ${
        active ? "border-accent/50 bg-accent/15" : "border-border bg-background/60"
      }`}
    >
      <span className="inline-flex items-center gap-1 text-xs font-semibold">
        <Sparkles className="size-3" />
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
    </button>
  );
}
