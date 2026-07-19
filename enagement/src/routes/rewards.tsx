import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useRewards, usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
import { ArrowRight, Loader2 } from "lucide-react";

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
  const { data: rewards = [], isPending } = useRewards();
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
      toast.success("Reward redeemed", {
        description: "Team will fulfill this off-chain. XP deducted from your passport.",
      });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.rewards });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Redeem failed");
    }
  };

  return (
    <AppShell title="Rewards" subtitle="Spend XP on fan experiences">
      <section className="px-4 pt-4">
        <div className="glass rounded-xl p-3 text-xs text-muted-foreground">
          Earn XP from <Link to="/predict" className="font-semibold text-accent">XP polls</Link>,{" "}
          <Link to="/moments" className="font-semibold text-accent">moment claims</Link>, and{" "}
          <Link to="/stadium" className="font-semibold text-accent">stadium check-in</Link> — then redeem here.
        </div>
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">XP Balance</p>
          {!wallet.connected ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Connect to see your XP</p>
              <ConnectWalletButton size="default" />
            </div>
          ) : (
            <p className="mt-0.5 text-2xl font-black tabular-nums text-primary">{xp.toLocaleString()} XP</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 px-4 pt-4">
        {isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : null}
        {!isPending && rewards.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No rewards listed yet.</p>
        ) : null}
        {rewards.map((r) => {
          const affordable = wallet.connected && xp >= r.xp;
          return (
            <article key={r.id} className="glass flex gap-3 rounded-2xl p-3">
              <img
                src={IMAGES[r.id] ?? "/reward-jersey.jpg"}
                alt=""
                className="size-20 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="mt-1 font-mono text-xs text-primary">{r.xp} XP</p>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => void redeem(r.id)}
                  className="mt-2 rounded-md bg-foreground px-3 py-1 text-[10px] font-bold uppercase text-background disabled:opacity-40"
                >
                  {!wallet.connected ? "Connect to redeem" : affordable ? "Redeem" : "Need more XP"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="px-4 py-6">
        <Link to="/predict" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
          Earn XP on Predict <ArrowRight className="size-3" />
        </Link>
      </section>
    </AppShell>
  );
}
