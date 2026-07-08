import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Radio, ShieldCheck } from "lucide-react";
import type { ReplaySession } from "@/lib/types";

export const Route = createFileRoute("/_app/replay")({
  head: () => ({ meta: [{ title: "Replay Mode — World Cup OS" }] }),
  component: ReplayMode,
});

function ReplayMode() {
  const updateMatch = useAppStore((s) => s.updateMatch);
  const [fixtureId, setFixtureId] = useState("17952170");
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settlementQueued, setSettlementQueued] = useState(false);

  async function startReplay() {
    const res = await apiFetch<{ session: ReplaySession }>("/api/replay/start", {
      method: "POST",
      body: JSON.stringify({ fixtureId: Number(fixtureId) }),
    });
    setSession(res.session);
    setPlaying(true);
    setProgress(0);
    setSettlementQueued(false);

    for (const event of res.session.events) {
      await new Promise((r) => setTimeout(r, event.atMs - progress));
      setProgress(event.atMs);
      const payload = event.payload as Record<string, unknown>;
      const score = payload.score as { home?: number; away?: number } | undefined;
      updateMatch(res.session.matchId, {
        scoreHome: Number(score?.home ?? payload.scoreHome ?? 0),
        scoreAway: Number(score?.away ?? payload.scoreAway ?? 0),
        minute: Number(payload.minute ?? 0),
        status: String(payload.gameState) === "5" ? "finished" : "live",
      });
    }

    updateMatch(res.session.matchId, { status: "settled" });
    setPlaying(false);

    await apiFetch("/api/replay/settle", {
      method: "POST",
      body: JSON.stringify({
        matchExternalId: res.session.matchId,
        fixtureId: res.session.fixtureId,
      }),
    });
    setSettlementQueued(true);
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-display font-bold">Replay mode</h1>
        <p className="text-muted-foreground mt-1">Replay a historical World Cup match in under 90 seconds.</p>
      </div>

      <Card className="glass p-6 space-y-4 max-w-xl">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">TxLINE fixture ID</label>
          <Input value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className="glass font-mono" />
        </div>
        <Button
          className="bg-gradient-primary text-primary-foreground border-0 gap-2"
          onClick={() => void startReplay()}
          disabled={playing}
        >
          <Play className="h-4 w-4" /> {playing ? "Replaying…" : "Start replay"}
        </Button>
        {session && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="h-4 w-4 text-primary" />
            Match {session.matchId} · {session.events.length} events · {session.durationMs / 1000}s
          </div>
        )}
        {playing && (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-live-dot" /> LIVE REPLAY
          </Badge>
        )}
        {settlementQueued && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <ShieldCheck className="h-4 w-4" />
            Settlement job queued — proof will appear in Proof Explorer.
          </div>
        )}
      </Card>
    </div>
  );
}
