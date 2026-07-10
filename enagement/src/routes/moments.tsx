import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { MomentCard } from "@/components/matchmind/MomentCard";
import { useActiveMatchId } from "@/lib/use-active-match";
import { useEngagementMoments } from "@/lib/queries/hooks";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/moments")({
  component: MomentsScreen,
});

function MomentsScreen() {
  const matchId = useActiveMatchId();
  const { data: moments = [], isPending } = useEngagementMoments(matchId ?? undefined);

  return (
    <AppShell title="Moments Vault" subtitle="On-chain collectibles from live TxLINE events" backdropVariant="goalCelebration">
      <section className="px-4 pt-4">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {moments.map((m) => (
              <MomentCard key={m.id} moment={m} />
            ))}
          </div>
        )}
        {!isPending && moments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">
            Moments are minted when goals hit the TxLINE feed. Check back during a live match.
          </p>
        )}
      </section>
    </AppShell>
  );
}
