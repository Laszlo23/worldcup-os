import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { Button } from "@/components/ui/button";
import { LEGENDS } from "@/lib/legends";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys, usePassport, useStickerAlbum } from "@/lib/queries/hooks";

export const Route = createFileRoute("/legends")({
  component: LegendsScreen,
});

function LegendsScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { data: passportData } = usePassport(wallet.connected);
  const { data: album } = useStickerAlbum(wallet.connected);
  const xp = passportData?.passport.xp ?? 0;
  const qc = useQueryClient();

  const owned = new Set(
    (album?.sets ?? [])
      .flatMap((s) => s.stickers)
      .filter((s) => s.owned)
      .map((s) => s.id),
  );

  const mint = useMutation({
    mutationFn: (stickerId: string) =>
      apiFetch<{ ok: boolean; xpSpent?: number }>("/api/engagement/legends/mint", {
        method: "POST",
        body: JSON.stringify({ stickerId }),
      }),
    onSuccess: (_res, stickerId) => {
      toast.success("Legend collectable minted", { description: stickerId });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Mint failed");
    },
  });

  return (
    <AppShell title="Legends" subtitle="Stats · collectables · trade on Market">
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gold/8 p-5">
          <div className="pointer-events-none absolute inset-0 pitch-lines opacity-15" />
          <p className="relative inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            <Crown className="size-3.5" />
            Hall of legends
          </p>
          <h2 className="relative mt-1 font-display text-2xl font-bold italic tracking-tight">
            Immortal cards
          </h2>
          <p className="relative mt-1 text-xs text-muted-foreground">
            Mint legend collectables with XP into your album — then list them on the market.
          </p>
          <div className="relative mt-3 flex flex-wrap items-center gap-2">
            {wallet.connected ? (
              <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
                {xp.toLocaleString()} XP
              </span>
            ) : (
              <ConnectWalletButton size="sm" />
            )}
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold text-accent"
            >
              <Store className="size-3" />
              Open market
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-4 px-4 pb-4">
        {LEGENDS.map((legend) => {
          const has = owned.has(legend.stickerId);
          const canMint = wallet.connected && !has && xp >= legend.mintXp;
          return (
            <article
              key={legend.id}
              className="overflow-hidden rounded-3xl border border-border bg-card/80"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={legend.imageUrl}
                  alt={legend.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold">
                    {legend.nation} · {legend.era}
                  </p>
                  <h3 className="font-display text-xl font-bold italic tracking-tight">{legend.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{legend.position}</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">{legend.blurb}</p>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {legend.stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-border/80 bg-background/50 px-1.5 py-2 text-center"
                    >
                      <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-sm font-black tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    Mint · {legend.mintXp} XP
                  </span>
                  {has ? (
                    <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-mono text-[10px] font-bold text-primary">
                      In album
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!canMint || mint.isPending}
                      onClick={() => mint.mutate(legend.stickerId)}
                    >
                      {mint.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Mint collectable"}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
