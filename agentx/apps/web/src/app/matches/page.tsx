"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Match } from "@/lib/types";

function MatchRow({ match }: { match: Match }) {
  return (
    <GlassCard className="mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{match.homeTeam.flag}</span>
          <div>
            <p className="text-sm font-medium">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </p>
            <p className="text-xs text-muted-foreground">{match.stage}</p>
          </div>
          <span className="text-lg">{match.awayTeam.flag}</span>
        </div>
        <div className="text-right">
          {match.status === "live" ? (
            <>
              <Badge variant="green">LIVE</Badge>
              <p className="mt-1 font-mono text-sm">
                {match.scoreHome}-{match.scoreAway} · {match.minute}&apos;
              </p>
            </>
          ) : match.status === "scheduled" ? (
            <Badge variant="outline">Upcoming</Badge>
          ) : (
            <p className="font-mono text-sm">
              {match.scoreHome}-{match.scoreAway}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default function MatchesPage() {
  const { data } = useQuery({ queryKey: ["matches"], queryFn: () => api.liveMatches() });
  const matches = data?.matches || [];
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled");
  const finished = matches.filter((m) => m.status === "finished");

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Matches</h1>
      <Tabs defaultValue="live">
        <TabsList className="w-full">
          <TabsTrigger value="live" className="flex-1">Live</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
          <TabsTrigger value="finished" className="flex-1">Finished</TabsTrigger>
        </TabsList>
        <TabsContent value="live">{live.map((m) => <MatchRow key={m.id} match={m} />)}</TabsContent>
        <TabsContent value="upcoming">{upcoming.map((m) => <MatchRow key={m.id} match={m} />)}</TabsContent>
        <TabsContent value="finished">{finished.length ? finished.map((m) => <MatchRow key={m.id} match={m} />) : <p className="text-sm text-muted-foreground">No finished matches yet</p>}</TabsContent>
      </Tabs>
    </AppShell>
  );
}
