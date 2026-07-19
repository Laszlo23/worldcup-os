import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pickaxe } from "lucide-react";
import { DocPageShell } from "@/components/matchmind/DocPageShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/stake")({
  component: StakePage,
});

type StakeStatus = {
  liquidXp: number;
  xpStaked: number;
  mmBalance: number;
  pendingMm: number;
  dailyRate: number;
  aprLabel: string;
};

function StakePage() {
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("100");

  const { data, isPending } = useQuery({
    queryKey: ["stakeStatus"],
    queryFn: () => apiFetch<{ status: StakeStatus }>("/api/engagement/stake"),
    enabled: wallet.connected,
    refetchInterval: 15_000,
  });

  const mutate = useMutation({
    mutationFn: (body: { action: string; amount?: number }) =>
      apiFetch<{ ok: boolean; status?: StakeStatus; claimed?: number; xpGained?: number }>(
        "/api/engagement/stake",
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (res, vars) => {
      if (vars.action === "claim") {
        toast.success(`Mined +${(res.claimed ?? 0).toFixed(3)} MM`);
      } else if (vars.action === "convert") {
        toast.success(`Converted → +${res.xpGained ?? 0} XP`);
      } else if (vars.action === "stake") {
        toast.success("XP locked in the Mine");
      } else if (vars.action === "unstake") {
        toast.success("XP returned to liquid");
      }
      void qc.invalidateQueries({ queryKey: ["stakeStatus"] });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: ["communityTasks"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Connect wallet first");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Action failed");
    },
  });

  if (!wallet.connected) {
    return (
      <DocPageShell title="Mine" subtitle="Stake XP · mine MM">
        <div className="space-y-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Connect to stake XP and mine MatchMind tokens.</p>
          <ConnectWalletButton size="default" />
        </div>
      </DocPageShell>
    );
  }

  const s = data?.status;
  const n = Math.floor(Number(amount) || 0);

  return (
    <DocPageShell title="Mine" subtitle="Stake XP · mine MM">
      <header className="kit-stripe relative overflow-hidden rounded-3xl border border-primary/35 p-5">
        <div className="pointer-events-none absolute inset-0 pitch-lines opacity-20" />
        <p className="relative inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          <Pickaxe className="size-3.5" />
          XP Mine
        </p>
        <h2 className="relative mt-1 font-display text-2xl font-bold italic tracking-tight">
          Stake to mine MM
        </h2>
        <p className="relative mt-2 text-sm text-muted-foreground">
          Lock liquid XP. Earn soft MM over time (~{(s?.dailyRate ?? 0.05) * 100}% MM / day on stake). Convert MM back to XP 1→2.
        </p>
      </header>

      {isPending || !s ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-2 gap-2">
            <Stat label="Liquid XP" value={s.liquidXp.toLocaleString()} />
            <Stat label="Staked XP" value={s.xpStaked.toLocaleString()} accent />
            <Stat label="MM balance" value={s.mmBalance.toFixed(3)} />
            <Stat label="Pending MM" value={s.pendingMm.toFixed(3)} hot />
          </section>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {s.aprLabel}
          </p>

          <section className="mt-5 space-y-3 rounded-2xl border border-border bg-card/70 p-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Amount
              </span>
              <input
                type="number"
                min={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none ring-primary focus:ring-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={mutate.isPending || n < 10}
                onClick={() => mutate.mutate({ action: "stake", amount: n })}
                className="min-h-[44px] rounded-xl bg-primary text-sm font-bold uppercase italic text-primary-foreground disabled:opacity-50"
              >
                Stake
              </button>
              <button
                type="button"
                disabled={mutate.isPending || n < 1}
                onClick={() => mutate.mutate({ action: "unstake", amount: n })}
                className="min-h-[44px] rounded-xl border border-border text-sm font-bold uppercase italic disabled:opacity-50"
              >
                Unstake
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={mutate.isPending}
                onClick={() => mutate.mutate({ action: "claim" })}
                className="min-h-[44px] rounded-xl border border-accent/40 bg-accent/15 text-sm font-bold text-accent disabled:opacity-50"
              >
                Claim MM
              </button>
              <button
                type="button"
                disabled={mutate.isPending || s.mmBalance < 1}
                onClick={() => mutate.mutate({ action: "convert", amount: Math.floor(s.mmBalance) })}
                className="min-h-[44px] rounded-xl border border-primary/40 bg-primary/10 text-sm font-bold text-primary disabled:opacity-50"
              >
                MM → XP
              </button>
            </div>
          </section>
        </>
      )}
    </DocPageShell>
  );
}

function Stat({
  label,
  value,
  accent,
  hot,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hot?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-xl font-bold italic tabular-nums ${
          accent ? "text-primary" : hot ? "text-accent" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
