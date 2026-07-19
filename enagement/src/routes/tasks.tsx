import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { DocPageShell } from "@/components/matchmind/DocPageShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

type TaskRow = {
  id: string;
  title: string;
  detail: string;
  xp: number;
  kind: "claim" | "link" | "auto";
  href?: string;
  claimed: boolean;
  ready: boolean;
};

function TasksPage() {
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["communityTasks"],
    queryFn: () => apiFetch<{ tasks: TaskRow[] }>("/api/engagement/tasks"),
    enabled: wallet.connected,
    refetchInterval: 12_000,
  });

  const claim = useMutation({
    mutationFn: (taskId: string) =>
      apiFetch<{
        ok: boolean;
        xp: number;
        sol?: { dripped: boolean; amount: number; explorerUrl?: string } | null;
      }>(`/api/engagement/tasks/${taskId}/claim`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: (res) => {
      const solBit =
        res.sol?.dripped && res.sol.amount > 0 ? ` · +${res.sol.amount.toFixed(3)} SOL` : "";
      toast.success(`+${res.xp} XP${solBit}`, {
        description: "Community task claimed — gas ready for on-chain drops",
        action: res.sol?.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.sol!.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: ["communityTasks"] });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Connect wallet first");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Claim failed");
    },
  });

  if (!wallet.connected) {
    return (
      <DocPageShell title="Tasks" subtitle="Grow the terrace · earn XP">
        <div className="space-y-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Connect to unlock community growth tasks and claim XP rewards.
          </p>
          <ConnectWalletButton size="default" />
        </div>
      </DocPageShell>
    );
  }

  const tasks = data?.tasks ?? [];
  const done = tasks.filter((t) => t.claimed).length;

  return (
    <DocPageShell title="Tasks" subtitle="Grow the terrace · earn XP">
      <header className="kit-stripe rounded-3xl border border-primary/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Community quests
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold italic tracking-tight">
              Help MatchMind grow
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share, chat, vote, stake — each quest pays passport XP plus a little gas SOL on
              devnet so smart-wallet claims work on-chain.
            </p>
          </div>
          <div className="kit-badge grid size-14 place-items-center rounded-2xl border border-primary/35">
            <span className="font-display text-lg font-bold italic tabular-nums text-primary">
              {done}/{tasks.length || "—"}
            </span>
          </div>
        </div>
      </header>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Could not load tasks.</p>
          <button type="button" className="mt-2 text-xs font-semibold text-accent" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-2xl border p-4 ${
                task.claimed
                  ? "border-primary/25 bg-primary/8"
                  : "border-border bg-card/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.detail}</p>
                  <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] font-bold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="size-3" />
                      +{task.xp} XP
                    </span>
                    <span className="text-live">+~0.012 SOL</span>
                  </p>
                </div>
                {task.claimed ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
                    <Check className="size-3" />
                    Done
                  </span>
                ) : (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {task.href ? (
                      <a
                        href={task.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                      >
                        Open <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={!task.ready || claim.isPending}
                      onClick={() => claim.mutate(task.id)}
                      className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold uppercase italic text-primary-foreground disabled:opacity-40"
                    >
                      {task.ready ? "Claim" : "Locked"}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tip: enable{" "}
        <Link to="/agent" className="font-semibold text-accent">
          Agent Pilot
        </Link>{" "}
        and{" "}
        <Link to="/stake" className="font-semibold text-accent">
          stake XP
        </Link>{" "}
        to unlock big quests.
      </p>
    </DocPageShell>
  );
}
