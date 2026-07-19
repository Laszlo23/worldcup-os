import { useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Target, Trophy } from "lucide-react";
import { usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { listFanBadges, FAN_BADGE_META, subscribeFanBadges } from "@/lib/onboarding";

function getFanBadgeSnapshot() {
  return listFanBadges().join(",");
}

export function FanQuestStrip() {
  const wallet = useAppStore((s) => s.wallet);
  const { data } = usePassport(wallet.connected);
  const badgeKey = useSyncExternalStore(subscribeFanBadges, getFanBadgeSnapshot, () => "");
  const fanBadges = badgeKey ? badgeKey.split(",").filter(Boolean) : [];
  const streak = data?.passport.streak ?? 0;
  const wins = data?.passport.predictionsWon ?? 0;

  return (
    <section className="px-4">
      <div className="kit-stripe relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/8 p-3.5">
        <div className="relative flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Matchday quests
            </p>
            <p className="mt-0.5 text-sm font-semibold">Stack XP before the whistle</p>
          </div>
          <Link
            to="/passport"
            className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-bold text-primary"
          >
            <Trophy className="size-3" />
            Badges
          </Link>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          <QuestChip
            icon={<Target className="size-3.5" />}
            label="Poll win"
            value={wallet.connected ? `${wins}` : "—"}
            hint="+XP"
          />
          <QuestChip
            icon={<Flame className="size-3.5" />}
            label="Streak"
            value={wallet.connected ? `${streak}` : "0"}
            hint="heat"
            hot={streak >= 3}
          />
          <QuestChip
            icon={<Trophy className="size-3.5" />}
            label="Fan marks"
            value={`${fanBadges.length}`}
            hint="local"
          />
        </div>

        {fanBadges.length > 0 ? (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {fanBadges.slice(0, 4).map((id) => {
              const meta = FAN_BADGE_META[id as keyof typeof FAN_BADGE_META];
              if (!meta) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent"
                  title={meta.detail}
                >
                  <span className="opacity-70">{meta.mark}</span>
                  {meta.title}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="relative mt-3 text-[11px] text-muted-foreground">
            Finish onboarding and ride Crowd or Agent to earn your first fan marks.
          </p>
        )}
      </div>
    </section>
  );
}

function QuestChip({
  icon,
  label,
  value,
  hint,
  hot,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  hot?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        hot ? "border-live/40 bg-live/10" : "border-border/70 bg-background/50"
      }`}
    >
      <div className={`flex items-center gap-1 ${hot ? "text-live" : "text-muted-foreground"}`}>
        {icon}
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-display text-lg font-bold italic tabular-nums leading-none">{value}</p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{hint}</p>
    </div>
  );
}
