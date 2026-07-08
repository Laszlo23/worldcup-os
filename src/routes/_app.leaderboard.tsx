import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLeaderboard } from "@/lib/queries/hooks";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Flame } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — World Cup OS" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const [tab, setTab] = useState("all");
  const period = tab === "week" ? "weekly" : "all_time";
  const { data: leaderboard = [] } = useLeaderboard(period);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top predictors, ranked by profit.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass">
          <TabsTrigger value="all">All-time</TabsTrigger>
          <TabsTrigger value="week">This week</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-3 gap-4">
        {leaderboard.slice(0, 3).map((r, i) => (
          <Card key={r.address} className={`glass p-6 text-center relative overflow-hidden ${i === 0 ? "border-primary/40 glow-primary" : ""}`}>
            <div className="absolute inset-0 -z-10 opacity-30" style={{ background: i === 0 ? "radial-gradient(circle at 50% 0%, oklch(0.72 0.19 155 / 40%), transparent 60%)" : "" }} />
            <Trophy className={`h-8 w-8 mx-auto mb-2 ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-accent"}`} />
            <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-primary/40">
              <AvatarImage src={r.avatar} />
              <AvatarFallback>{r.address.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="font-mono text-sm">{r.address}</div>
            <div className="text-3xl font-display font-bold text-primary mt-2 tabular-nums">+${r.profit.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Win rate {r.winRate}% · Streak {r.streak}</div>
          </Card>
        ))}
      </div>

      <Card className="glass overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px_100px_100px_100px] gap-4 px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
          <div>Rank</div>
          <div>Trader</div>
          <div className="text-right">Profit</div>
          <div className="text-right">Win rate</div>
          <div className="text-right">Correct</div>
          <div className="text-right">Streak</div>
        </div>
        {leaderboard.map((r) => (
          <div key={r.address} className="grid grid-cols-[60px_1fr_100px_100px_100px_100px] gap-4 px-6 py-3 items-center border-b border-border last:border-0 hover:bg-muted/30 transition">
            <div className="font-display font-bold text-lg">{r.rank}</div>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-8 w-8"><AvatarImage src={r.avatar} /><AvatarFallback>{r.address.slice(0, 2)}</AvatarFallback></Avatar>
              <span className="font-mono text-sm truncate">{r.address}</span>
            </div>
            <div className="text-right font-mono font-semibold text-primary">+${r.profit.toLocaleString()}</div>
            <div className="text-right font-mono">{r.winRate}%</div>
            <div className="text-right font-mono">{r.correct}</div>
            <div className="text-right font-mono flex items-center justify-end gap-1"><Flame className="h-3 w-3 text-warning" />{r.streak}</div>
          </div>
        ))}
      </Card>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <TrendingUp className="h-3 w-3" /> Rankings update in real time as TxLINE settles markets.
      </p>
    </div>
  );
}
