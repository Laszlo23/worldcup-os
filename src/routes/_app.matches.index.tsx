import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { MatchCard } from "@/components/match-card";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useHealth } from "@/lib/queries/hooks";
import { getMatchFeedPhase, matchStatusRank, statusCountsForMatches } from "@/lib/match-phase";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/matches/")({
  head: () => ({ meta: [{ title: "Matches — World Cup OS" }] }),
  component: Matches,
});

function Matches() {
  const matches = useAppStore((s) => s.matches);
  const { data: health } = useHealth();
  const counts = useMemo(() => statusCountsForMatches(matches), [matches]);
  const defaultTab = counts.live + counts.inProgress > 0 ? "live" : "upcoming";
  const [tab, setTab] = useState(defaultTab);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = matches.filter((m) => {
      const phase = getMatchFeedPhase(m);
      if (tab === "all") {
        // no status filter
      } else if (tab === "live" && !(phase === "live" || phase === "halftime" || phase === "awaiting_feed")) return false;
      else if (tab === "upcoming" && !(phase === "predictable" || phase === "closing_soon" || phase === "locked")) return false;
      else if (tab === "finished" && phase !== "finished") return false;
      if (q && !`${m.home.name} ${m.away.name} ${m.stage}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return [...list].sort(
      (a, b) => matchStatusRank(a.status, a.kickoff) - matchStatusRank(b.status, b.kickoff) || a.kickoff - b.kickoff,
    );
  }, [matches, tab, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Matches</h1>
          <p className="text-muted-foreground mt-1">Predict upcoming fixtures · follow live scores from TxLINE.</p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or stage" className="pl-9 w-64 glass" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass">
          <TabsTrigger value="live">
            Live{counts.live + counts.inProgress > 0 ? ` (${counts.live + counts.inProgress})` : ""}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
          <TabsTrigger value="finished">Finished ({counts.finished})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "live" && counts.inProgress > 0 && !health?.txline?.lastSseAt && (
        <p className="text-xs font-mono text-warning border border-warning/30 bg-warning/5 rounded-lg px-3 py-2">
          {counts.inProgress} fixture(s) past kickoff — markets locked, waiting for TxLINE devnet live score stream (SSE idle).
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4">
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
      {!filtered.length && (
        <div className="glass rounded-2xl p-16 text-center text-muted-foreground space-y-2">
          <div>No matches match your filters.</div>
          <div className="text-xs">
            {q
              ? `If this fixture is not showing up, TxLINE SL${health?.txline?.serviceLevel ?? 12} may not currently expose it in the live snapshot.`
              : `TxLINE SL${health?.txline?.serviceLevel ?? 12} currently has ${health?.fixtures?.total ?? 0} synced fixtures${health?.fixtures?.lastSyncAt ? ` · last sync ${new Date(health.fixtures.lastSyncAt).toLocaleTimeString()}` : ""}.`}
          </div>
        </div>
      )}
    </div>
  );
}
