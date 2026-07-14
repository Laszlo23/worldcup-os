"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { MatchRow } from "@/components/matches/match-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isFinishedTabMatch, isLiveTabMatch, isUpcomingTabMatch } from "@/lib/match-phase";
import type { Match } from "@/lib/types";

const MATCHES_REFETCH_MS = 45_000;

export default function MatchesPage() {
  const { data } = useQuery({
    queryKey: ["matches"],
    queryFn: () => api.liveMatches(),
    placeholderData: (prev) => prev,
    staleTime: 10_000,
    refetchInterval: MATCHES_REFETCH_MS,
  });

  const matches = data?.matches ?? [];

  const { live, upcoming, finished } = useMemo(() => {
    const liveList: Match[] = [];
    const upcomingList: Match[] = [];
    const finishedList: Match[] = [];
    for (const m of matches) {
      if (isFinishedTabMatch(m)) finishedList.push(m);
      else if (isLiveTabMatch(m)) liveList.push(m);
      else if (isUpcomingTabMatch(m)) upcomingList.push(m);
    }
    return { live: liveList, upcoming: upcomingList, finished: finishedList };
  }, [matches]);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Matches</h1>
      <Tabs defaultValue="live">
        <TabsList className="w-full">
          <TabsTrigger value="live" className="flex-1">
            Live{live.length ? ` (${live.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="finished" className="flex-1">
            Finished
          </TabsTrigger>
        </TabsList>
        <TabsContent value="live">
          {live.length ? live.map((m) => <MatchRow key={m.id} match={m} />) : (
            <p className="text-sm text-muted-foreground">No live matches right now</p>
          )}
        </TabsContent>
        <TabsContent value="upcoming">
          {upcoming.length ? upcoming.map((m) => <MatchRow key={m.id} match={m} />) : (
            <p className="text-sm text-muted-foreground">No upcoming matches</p>
          )}
        </TabsContent>
        <TabsContent value="finished">
          {finished.length ? (
            finished.map((m) => <MatchRow key={m.id} match={m} />)
          ) : (
            <p className="text-sm text-muted-foreground">No finished matches yet</p>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
