import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { MomentCard } from "@/components/matchmind/MomentCard";
import { StickerAlbum } from "@/components/matchmind/StickerAlbum";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useActiveMatchId } from "@/lib/use-active-match";
import { useEngagementMoments, useStickerAlbum } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/moments")({
  loader: async ({ context }) => {
    try {
      await prefetchMatchFeed(context.queryClient);
    } catch {
      // Client retry via queries
    }
  },
  component: StickerAlbumScreen,
});

function StickerAlbumScreen() {
  const matchId = useActiveMatchId();
  const wallet = useAppStore((s) => s.wallet);
  const { data: matchMoments = [], isPending: matchMomentsPending } = useEngagementMoments(matchId ?? undefined);
  const { data: allMoments = [] } = useEngagementMoments(undefined, { requireMatch: false });
  const { data: album, isPending: albumPending, isError: albumError } = useStickerAlbum(wallet.connected);

  const unclaimed = (matchMoments.length ? matchMoments : allMoments).filter((m) => !m.claimed);
  const featured = unclaimed[0];
  const moreUnclaimed = unclaimed.slice(1);

  return (
    <AppShell
      title="Moment Album"
      subtitle="Claim goal drops · collect stickers"
      backdropVariant="goalCelebration"
      backdropIntensity="hero"
    >
      <section className="px-4 pt-4">
        <div className="glass rounded-xl p-3 text-sm text-muted-foreground">
          <p className="font-display text-sm font-semibold text-foreground">How it works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
            <li>TxLINE goals drop collectible moments here</li>
            <li>Connect wallet and sign a Solana memo to claim (+50 XP)</li>
            <li>Claimed moments unlock in your sticker album & passport</li>
          </ol>
          <Link to="/predict" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
            Also earn XP from live polls <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>

      {featured ? (
        <section className="px-4 pt-5">
          <div className="glass-strong relative overflow-hidden rounded-2xl p-3 ambient-orbs">
            <p className="section-label text-accent">Ready to claim</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight">
              {unclaimed.length > 1 ? `${unclaimed.length} goal drops waiting` : "Latest goal drop"}
            </p>
            <div className="mt-3">
              <MomentCard moment={featured} />
            </div>
          </div>
        </section>
      ) : null}

      {moreUnclaimed.length > 0 ? (
        <section className="px-4 pt-4">
          <p className="section-label mb-3">More unclaimed drops</p>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {moreUnclaimed.map((m) => (
              <MomentCard key={m.id} moment={m} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-4 pt-5">
        <p className="section-label mb-3">Sticker collection</p>
        {!wallet.connected ? (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Connect wallet to track stickers earned from polls, claims, and stadium check-in.
            </p>
            <ConnectWalletButton size="default" />
          </div>
        ) : albumPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : albumError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Could not load your album. Pull to refresh or reconnect wallet.
          </p>
        ) : album ? (
          <StickerAlbum
            sets={album.sets.map((set) => ({
              ...set,
              stickers: set.stickers.map((s) => ({
                id: s.id,
                title: s.title,
                description: s.description,
                rarity: s.rarity,
                imageUrl: s.imageUrl,
                owned: s.owned,
                earnedAt: s.earnedAt,
                serial: s.serial,
                kind: s.kind,
              })),
            }))}
          />
        ) : null}
      </section>

      {matchMomentsPending ? null : unclaimed.length === 0 && !album?.totalOwned ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No drops yet — watch the live match. Goals from TxLINE mint new moments automatically.
        </p>
      ) : null}

      <section className="flex flex-wrap gap-4 px-4 pb-6 pt-2 text-xs font-semibold">
        <Link to="/" className="text-accent hover:text-accent/80">
          ← Live match
        </Link>
        <Link to="/passport" className="text-accent hover:text-accent/80">
          Passport shelf →
        </Link>
        <Link to="/rewards" className="text-muted-foreground hover:text-accent">
          Spend XP →
        </Link>
      </section>
    </AppShell>
  );
}
