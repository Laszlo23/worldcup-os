import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Lock, Trophy } from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";

export const Route = createFileRoute("/passport")({
  component: PassportScreen,
});

function PassportScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { data, isPending } = usePassport(wallet.connected);
  const passport = data?.passport;

  if (!wallet.connected) {
    return (
      <AppShell title="Fan Passport" subtitle="Connect wallet">
        <div className="px-4 py-16 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Sign in with Solana to load your fan passport.</p>
          <ConnectWalletButton />
        </div>
      </AppShell>
    );
  }

  if (isPending || !passport) {
    return (
      <AppShell title="Fan Passport" subtitle="Loading…">
        <p className="text-center py-16 text-muted-foreground">Loading passport…</p>
      </AppShell>
    );
  }

  const xpToNext = passport.level * 250;
  const pct = Math.min(100, Math.round((passport.xp / xpToNext) * 100));

  return (
    <AppShell title="Fan Passport" subtitle={`Level ${passport.level}`}>
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">MatchMind Passport</p>
              <h2 className="mt-1 text-2xl font-black italic uppercase leading-tight">
                {data.wallet.slice(0, 6)}…{data.wallet.slice(-4)}
              </h2>
            </div>
            <div className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10">
              <span className="text-2xl font-black tabular-nums text-primary">{passport.level}</span>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <span>{passport.xp.toLocaleString()} XP</span>
              <span>Next: {xpToNext.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 px-4 grid grid-cols-2 gap-2">
        <StatBig label="Predictions Won" value={passport.predictionsWon} accent />
        <StatBig label="Moments" value={passport.momentsClaimed} />
        <StatBig label="Stadiums" value={passport.stadiumVerified} />
        <StatBig label="Streak" value={passport.streak} />
      </section>

      <section className="mt-6 px-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-gold" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Achievements
          </h3>
        </div>
        <ul className="mt-3 space-y-2">
          {passport.achievements.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className={`grid size-9 place-items-center rounded-lg ${a.unlocked ? "bg-primary/15 text-primary" : "bg-background text-muted-foreground"}`}>
                {a.unlocked ? <CheckCircle2 className="size-4" /> : <Lock className="size-4" />}
              </span>
              <p className="text-sm font-semibold flex-1">{a.title}</p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

function StatBig({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
