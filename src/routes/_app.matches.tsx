import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { MatchCard } from "@/components/match-card";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useHealth } from "@/lib/queries/hooks";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/matches")({
  head: () => ({ meta: [{ title: "Matches — World Cup OS" }] }),
  component: Matches,
});

function Matches() {
  const matches = useAppStore((s) => s.matches);
  const { data: health } = useHealth();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const filtered = matches.filter((m) => {
    if (tab === "live" && !(m.status === "live" || m.status === "halftime")) return false;
    if (tab === "upcoming" && m.status !== "scheduled") return false;
    if (tab === "finished" && !(m.status === "finished" || m.status === "settled")) return false;
    if (q && !`${m.home.name} ${m.away.name} ${m.stage}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Matches</h1>
          <p className="text-muted-foreground mt-1">Every game, streamed live via TxLINE.</p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or stage" className="pl-9 w-64 glass" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="finished">Finished</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => <MatchCard key={m.id} match={m} />)}
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
