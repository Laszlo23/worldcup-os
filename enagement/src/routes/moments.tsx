import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { MomentCard } from "@/components/matchmind/MomentCard";
import { StickerAlbum } from "@/components/matchmind/StickerAlbum";
import { useActiveMatchId } from "@/lib/use-active-match";
import { useEngagementMoments, useStickerAlbum } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { Loader2 } from "lucide-react";

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
  const { data: moments = [], isPending: momentsPending } = useEngagementMoments(matchId ?? undefined);
  const { data: album, isPending: albumPending } = useStickerAlbum(wallet.connected);

  const unclaimedDrop = moments.find((m) => !m.claimed);

  return (
    <AppShell title="Sticker Album" subtitle="Collect moments & earn engagement stickers" backdropVariant="goalCelebration">
      {unclaimedDrop ? (
        <section className="px-4 pt-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Latest drop</p>
          <div className="mt-2">
            <MomentCard moment={unclaimedDrop} />
          </div>
        </section>
      ) : null}

      <section className="px-4 pt-4">
        {!wallet.connected ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Connect wallet to track your sticker collection and earn growth badges.
          </p>
        ) : albumPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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

      {momentsPending ? null : moments.length === 0 && !album?.totalOwned ? (
        <p className="px-4 text-center text-sm text-muted-foreground py-8">
          Goal stickers drop when TxLINE reports a goal. Vote polls and share to earn more.
        </p>
      ) : null}

      <section className="px-4 pb-6">
        <Link to="/passport" className="text-xs font-semibold text-primary">
          View passport shelf →
        </Link>
      </section>
    </AppShell>
  );
}
