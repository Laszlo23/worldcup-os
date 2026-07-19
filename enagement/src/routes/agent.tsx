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
};

function AgentPage() {
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();
  const { match } = useActiveMatchState();
  const { data: signalsData } = useMatchSignals(match?.id, wallet.connected);

  const { data, isPending } = useQuery({
    queryKey: ["autoAgent"],
    queryFn: () => apiFetch<{ prefs: Prefs }>("/api/engagement/auto-agent"),
    enabled: wallet.connected,
    refetchInterval: 10_000,
  });

  const save = useMutation({
    mutationFn: (body: { enabled: boolean; mode?: "agent" | "crowd" }) =>
      apiFetch<{ prefs: Prefs }>("/api/engagement/auto-agent", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      setFollowMode(res.prefs.mode);
      toast.success(res.prefs.enabled ? "Agent Pilot on" : "Agent Pilot off");
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
    mutationFn: () =>
      apiFetch<{ voted: { pollId: string; choice: string }[]; skipped: number }>(
        "/api/engagement/auto-agent",
        {
          method: "POST",
          body: JSON.stringify({ action: "tick", matchId: match?.id }),
        },
      ),
    onSuccess: (res) => {
      if (res.voted.length) {
        toast.success(`Pilot locked ${res.voted.length} poll${res.voted.length > 1 ? "s" : ""}`, {
          description: res.voted.map((v) => `${v.choice.toUpperCase()}`).join(" · "),
        });
        void qc.invalidateQueries({ queryKey: queryKeys.polls(match?.id) });
        void qc.invalidateQueries({ queryKey: ["autoAgent"] });
      } else {
        toast.message("No open polls to lock", {
          description: res.skipped ? "Waiting on signals or already voted." : "Check back when live windows open.",
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
            Connect — ideally with a MatchMind smart wallet — to enable Agent Pilot automated XP polls.
          </p>
          <ConnectWalletButton size="default" />
        </div>
      </DocPageShell>
    );
  }

  const prefs = data?.prefs;
  const signal = signalsData?.signals?.[0];

  return (
    <DocPageShell title="Agent" subtitle="Auto-predict with AgentX">
      <header className="kit-stripe relative overflow-hidden rounded-3xl border border-accent/35 p-5">
        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          <Bot className="size-3.5" />
          Agent Pilot
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold italic tracking-tight">
          Let the desk call windows
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pairs your signed-in wallet with live AgentX signals to auto-lock open XP polls while MatchMind is open.
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-border bg-card/70 p-3 text-xs text-muted-foreground">
        {smartReady ? (
          <p className="text-primary">Smart wallet unlocked — pilot can sign claims when drops hit.</p>
        ) : smartExists ? (
          <p>
            Unlock your smart wallet from the header key icon for full claim support. Poll auto-votes still work with any session.
          </p>
        ) : (
          <p>
            Tip:{" "}
            <span className="font-semibold text-foreground">Create a smart wallet</span> for a seamless fan + agent loop —
            no extension needed.
          </p>
        )}
      </div>

      {isPending || !prefs ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-accent" />
        </div>
      ) : (
        <section className="mt-5 space-y-3 rounded-2xl border border-border bg-card/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pilot status</p>
              <p className="text-xs text-muted-foreground">
                {prefs.votesCast} auto-votes ·{" "}
                {prefs.lastTickAt
                  ? `last tick ${new Date(prefs.lastTickAt).toLocaleTimeString()}`
                  : "not ticked yet"}
              </p>
            </div>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate({ enabled: !prefs.enabled, mode: prefs.mode })}
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
              detail="AgentX signals"
              onClick={() => save.mutate({ enabled: prefs.enabled, mode: "agent" })}
            />
            <ModeBtn
              active={prefs.mode === "crowd"}
              label="Follow Crowd"
              detail="Terrace majority"
              onClick={() => save.mutate({ enabled: prefs.enabled, mode: "crowd" })}
            />
          </div>

          <button
            type="button"
            disabled={!prefs.enabled || tick.isPending}
            onClick={() => tick.mutate()}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold uppercase italic text-accent-foreground disabled:opacity-40"
          >
            {tick.isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Run pilot now
          </button>
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
          Open polls →
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
