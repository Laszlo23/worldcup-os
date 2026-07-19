import { useEffect, useState, useSyncExternalStore } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Flame,
  IdCard,
  Loader2,
  Lock,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { StickerShelf } from "@/components/matchmind/StickerAlbum";
import { InternalWalletCard } from "@/components/matchmind/InternalWalletCard";
import { ClaimsPanel } from "@/components/matchmind/ClaimsPanel";
import { KitSwitcher } from "@/components/matchmind/KitSwitcher";
import { ReferralCard } from "@/components/matchmind/ReferralCard";
import {
  usePassport,
  useStickerAlbum,
  queryKeys,
  type FanSocials,
  type PassportPayload,
} from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { ShareActions } from "@/components/social/share-actions";
import { PASSPORT_BADGE_META, rarityClass } from "@/lib/badges";
import {
  FAN_BADGE_META,
  listFanBadges,
  subscribeFanBadges,
  type FanBadgeId,
} from "@/lib/onboarding";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/passport")({
  component: PassportScreen,
});

function badgeSnapshot() {
  return listFanBadges().join(",");
}

function PassportScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { data, isPending, isError, refetch } = usePassport(wallet.connected);
  const { data: album } = useStickerAlbum(wallet.connected);
  const passport = data?.passport;
  const fanKey = useSyncExternalStore(subscribeFanBadges, badgeSnapshot, () => "");
  const fanBadges = (fanKey ? fanKey.split(",") : []).filter(Boolean) as FanBadgeId[];

  if (!wallet.connected) {
    return (
      <AppShell title="Profile" subtitle="Fan passport + wallet">
        <div className="space-y-4 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Create or unlock your MatchMind wallet to open your profile, socials, and Human Passport.
          </p>
          <ConnectWalletButton size="default" />
          <p className="text-xs text-muted-foreground">
            Tip: XP polls never need a signature. Unlock once for drops & USDC.
          </p>
        </div>
      </AppShell>
    );
  }

  if (isPending) {
    return (
      <AppShell title="Profile" subtitle="Loading…">
        <p className="py-16 text-center text-muted-foreground">Loading profile…</p>
      </AppShell>
    );
  }

  if (isError || !passport || !data) {
    return (
      <AppShell title="Profile" subtitle="Error">
        <div className="space-y-3 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Could not load profile. Try again.</p>
          <button
            type="button"
            className="text-xs font-semibold text-accent"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  const xpToNext = passport.level * 250;
  const pct = Math.min(100, Math.round((passport.xp / xpToNext) * 100));
  const unlockedCount = passport.achievements.filter((a) => a.unlocked).length;
  const display = passport.displayName?.trim() || `${data.wallet.slice(0, 6)}…${data.wallet.slice(-4)}`;

  return (
    <AppShell title="Profile" subtitle={`Level ${passport.level}`}>
      <section className="px-4 pt-4">
        <div className="kit-stripe relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-5">
          <div className="pointer-events-none absolute inset-0 pitch-lines opacity-20" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                <IdCard className="size-3.5" />
                Fan profile
              </p>
              <h2 className="mt-1 truncate font-display text-2xl font-bold italic tracking-tight">
                {display}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {data.wallet.slice(0, 4)}…{data.wallet.slice(-4)}
              </p>
            </div>
            <div className="kit-badge grid size-16 shrink-0 place-items-center rounded-2xl border border-primary/35">
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
          <div className="relative mt-3 flex flex-wrap items-center gap-2">
            {passport.humanVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/45 bg-gold/15 px-2.5 py-1 font-mono text-[10px] font-bold text-gold">
                <ShieldCheck className="size-3" />
                Human verified
              </span>
            ) : null}
            {passport.streak > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-live/40 bg-live/15 px-2.5 py-1 font-mono text-[10px] font-bold text-live">
                <Flame className="size-3" />
                {passport.streak} win streak
              </span>
            ) : null}
            <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold text-accent">
              {unlockedCount}/{passport.achievements.length} badges
            </span>
          </div>
          <ShareActions
            contentType="passport"
            contentId={data.wallet}
            title={`${display} · MatchMind Fan Passport`}
            className="relative mt-4"
          />
        </div>
      </section>

      <section className="mt-4 px-4">
        <ProfileStats
          passport={passport}
          collectablesOwned={album?.totalOwned ?? 0}
          badgesUnlocked={unlockedCount}
          badgesTotal={passport.achievements.length}
        />
      </section>

      <section className="mt-4 px-4">
        <InternalWalletCard />
      </section>

      <section className="mt-4 px-4">
        <ClaimsPanel />
      </section>

      <section className="mt-4 px-4">
        <ReferralCard />
      </section>

      <section className="mt-4 px-4">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Kit style
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          Switch Argentina, Spain, or MatchMind look — also available in Match Desk → Look.
        </p>
        <KitSwitcher />
      </section>

      <section className="mt-4 px-4">
        <ProfileEditor passport={passport} />
      </section>

      <section className="mt-4 px-4">
        <HumanPassportCard passport={passport} />
      </section>

      <section className="mt-4 flex flex-wrap gap-3 px-4 text-xs font-semibold">
        <Link to="/tasks" className="text-accent">
          Tasks →
        </Link>
        <Link to="/stake" className="text-accent">
          Mine →
        </Link>
        <Link to="/agent" className="text-accent">
          Agent →
        </Link>
        <Link to="/community" className="text-muted-foreground hover:text-accent">
          Crew →
        </Link>
        <Link to="/rewards" className="text-muted-foreground hover:text-accent">
          Shop →
        </Link>
      </section>

      {(passport.xpStaked ?? 0) > 0 || (passport.mmBalance ?? 0) > 0 ? (
        <section className="mt-4 px-4">
          <Link
            to="/stake"
            className="kit-stripe flex items-center justify-between rounded-2xl border border-primary/30 px-4 py-3"
          >
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">XP Mine</p>
              <p className="text-sm font-semibold">
                {(passport.xpStaked ?? 0).toLocaleString()} staked · {(passport.mmBalance ?? 0).toFixed(2)} MM
                {(passport.pendingMm ?? 0) > 0 ? ` · +${(passport.pendingMm ?? 0).toFixed(3)} pending` : ""}
              </p>
            </div>
            <span className="text-xs font-semibold text-accent">Open →</span>
          </Link>
        </section>
      ) : null}

      {fanBadges.length > 0 ? (
        <section className="mt-6 px-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Fan marks
            </h3>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {fanBadges.map((id) => {
              const meta = FAN_BADGE_META[id];
              if (!meta) return null;
              return (
                <li key={id} className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
                  <span className="kit-badge inline-grid size-8 place-items-center rounded-lg border border-primary/35 font-mono text-[10px] font-bold text-primary">
                    {meta.mark}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{meta.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.detail}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 px-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Collectables shelf
          </h3>
          <Link to="/moments" className="text-xs font-semibold text-primary">
            Full album
          </Link>
        </div>
        <div className="mt-3">
          <StickerShelf
            stickers={(album?.recentEarns ?? []).map((s) => ({
              id: s.id,
              title: s.title,
              rarity: s.rarity,
              imageUrl: s.imageUrl,
              owned: s.owned,
              serial: s.serial,
            }))}
          />
        </div>
      </section>

      <section className="mt-6 px-4 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-gold" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Achievements
          </h3>
        </div>
        <ul className="mt-3 space-y-2">
          {passport.achievements.map((a) => {
            const meta = PASSPORT_BADGE_META[a.id];
            const rarity = meta?.rarity ?? "common";
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  a.unlocked ? rarityClass(rarity) : "border-border bg-card/70 opacity-70"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-xl border font-mono text-[11px] font-bold ${
                    a.unlocked
                      ? "border-current/30 bg-background/40"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {a.unlocked ? meta?.mark ?? "OK" : <Lock className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {meta?.detail ?? (a.unlocked ? "Unlocked" : "Keep playing")}
                  </p>
                </div>
                {a.unlocked ? <CheckCircle2 className="size-4 shrink-0 opacity-80" /> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}

function ProfileEditor({ passport }: { passport: PassportPayload }) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(passport.displayName ?? "");
  const [socials, setSocials] = useState<FanSocials>(passport.socials ?? {});
  const [evmAddress, setEvmAddress] = useState(passport.evmAddress ?? "");

  useEffect(() => {
    setDisplayName(passport.displayName ?? "");
    setSocials(passport.socials ?? {});
    setEvmAddress(passport.evmAddress ?? "");
  }, [passport.displayName, passport.socials, passport.evmAddress]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<{ passport: PassportPayload }>("/api/engagement/profile", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          socials,
          evmAddress: evmAddress.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    },
  });

  const field = (key: keyof FanSocials, label: string, placeholder: string) => (
    <label className="block space-y-1">
      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={socials[key] ?? ""}
        onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
      />
    </label>
  );

  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Socials</p>
      <h3 className="mt-1 font-display text-lg font-bold italic tracking-tight">Your terrace handle</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Shown on your passport card. Link X, Discord, Farcaster — optional, all public.
      </p>
      <div className="mt-3 space-y-2.5">
        <label className="block space-y-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. TerraceKid"
            maxLength={40}
            className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
          />
        </label>
        {field("x", "X / Twitter", "@handle or url")}
        {field("discord", "Discord", "username")}
        {field("farcaster", "Farcaster", "fname")}
        {field("telegram", "Telegram", "@handle")}
        {field("website", "Website", "https://…")}
        <label className="block space-y-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            EVM address (Human Passport)
          </span>
          <input
            value={evmAddress}
            onChange={(e) => setEvmAddress(e.target.value)}
            placeholder="0x… for Unique Humanity score"
            className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 font-mono text-xs outline-none ring-primary/40 focus:ring-2"
          />
        </label>
      </div>
      <Button className="mt-3 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save profile"}
      </Button>
    </div>
  );
}

function HumanPassportCard({ passport }: { passport: PassportPayload }) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () =>
      apiFetch<{
        ok: boolean;
        configured?: boolean;
        score?: number | null;
        passing?: boolean;
        passportUrl?: string;
        error?: string;
        passport?: PassportPayload;
      }>("/api/engagement/human-passport", {
        method: "POST",
        body: JSON.stringify({ evmAddress: passport.evmAddress }),
      }),
    onSuccess: (res) => {
      if (res.configured === false) {
        toast.message("Open Human Passport to verify", {
          description: "API key not set on server — verify at passport.human.tech then save your EVM address.",
          action: res.passportUrl
            ? { label: "Open", onClick: () => window.open(res.passportUrl, "_blank") }
            : undefined,
        });
        return;
      }
      if (res.passing) toast.success(`Human verified · score ${res.score}`);
      else toast.message(`Score ${res.score ?? "—"} — need ≥ 20 to pass`);
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Check failed");
    },
  });

  return (
    <div className="rounded-3xl border border-gold/35 bg-gold/8 p-4">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
        <ShieldCheck className="size-3.5" />
        Human Passport
      </p>
      <h3 className="mt-1 font-display text-lg font-bold italic tracking-tight">Proof of personhood</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://passport.human.tech/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          passport.human.tech
        </a>{" "}
        (ex-Gitcoin Passport). Link an EVM address, collect stamps, then refresh your Unique Humanity score.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[10px] font-bold">
          Score {passport.humanPassportScore ?? "—"}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${
            passport.humanVerified
              ? "border-gold/45 bg-gold/20 text-gold"
              : "border-border text-muted-foreground"
          }`}
        >
          {passport.humanVerified ? "Passing ≥ 20" : "Not verified"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => window.open("https://passport.human.tech/", "_blank", "noopener")}
        >
          Verify stamps <ExternalLink className="size-3.5" />
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={refresh.isPending || !passport.evmAddress}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Refresh score
        </Button>
      </div>
      {!passport.evmAddress ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Save an EVM address in Socials above to enable score refresh.
        </p>
      ) : null}
    </div>
  );
}

function ProfileStats({
  passport,
  collectablesOwned,
  badgesUnlocked,
  badgesTotal,
}: {
  passport: PassportPayload;
  collectablesOwned: number;
  badgesUnlocked: number;
  badgesTotal: number;
}) {
  const total = passport.predictionsTotal;
  const won = passport.predictionsWon;
  const winRate = total > 0 ? Math.round((won / total) * 100) : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-accent/25 bg-card/80">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Your stats</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Passport performance this season</p>
        </div>
        {winRate != null ? (
          <div className="rounded-2xl border border-primary/35 bg-primary/12 px-3 py-2 text-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Win rate</p>
            <p className="font-display text-xl font-bold italic tabular-nums text-primary">{winRate}%</p>
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/40 sm:grid-cols-3">
        <StatCell label="XP" value={passport.xp.toLocaleString()} accent />
        <StatCell label="Level" value={String(passport.level)} />
        <StatCell label="Win streak" value={String(passport.streak)} hot={passport.streak > 0} />
        <StatCell label="Polls locked" value={String(total)} />
        <StatCell label="Polls won" value={String(won)} accent />
        <StatCell label="Moments claimed" value={String(passport.momentsClaimed)} />
        <StatCell label="Collectables" value={String(collectablesOwned)} />
        <StatCell label="Venue check-ins" value={String(passport.stadiumVerified)} />
        <StatCell label="Badges" value={`${badgesUnlocked}/${badgesTotal}`} />
      </div>
    </div>
  );
}

function StatCell({
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
    <div className="bg-card px-3.5 py-3.5">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-black tabular-nums ${
          hot ? "text-live" : accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
