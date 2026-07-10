import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { useRewards, usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";

const IMAGES: Record<string, string> = {
  "reward-jersey": "/reward-jersey.jpg",
  "reward-vip": "/reward-vip.jpg",
  "reward-boots": "/reward-boots.jpg",
};

export const Route = createFileRoute("/rewards")({
  component: RewardsScreen,
});

function RewardsScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { data: rewards = [] } = useRewards();
  const { data: passportData } = usePassport(wallet.connected);
  const xp = passportData?.passport.xp ?? 0;
  const qc = useQueryClient();

  const redeem = async (id: string) => {
    if (!wallet.connected) {
      toast.error("Connect wallet to redeem");
      return;
    }
    try {
      await apiFetch(`/api/engagement/rewards/${id}/redeem`, { method: "POST", body: "{}" });
      toast.success("Reward redeemed — team will fulfill off-chain");
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Redeem failed");
    }
  };

  return (
    <AppShell title="Rewards Market" subtitle="Spend XP on fan experiences">
      <section className="px-4 pt-4">
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">XP Balance</p>
          <p className="mt-0.5 text-2xl font-black tabular-nums text-primary">{xp.toLocaleString()} XP</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 px-4 pt-4">
        {rewards.map((r) => {
          const affordable = xp >= r.xp;
          return (
            <article key={r.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              <img
                src={IMAGES[r.id] ?? "/reward-jersey.jpg"}
                alt=""
                className="size-20 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="font-mono text-xs text-primary mt-1">{r.xp} XP</p>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => void redeem(r.id)}
                  className="mt-2 rounded-md bg-foreground px-3 py-1 text-[10px] font-bold uppercase text-background disabled:opacity-40"
                >
                  {affordable ? "Redeem" : "Locked"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
