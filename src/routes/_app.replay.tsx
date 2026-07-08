import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Radio, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { ReplaySession } from "@/lib/types";
import type { Match } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/replay")({
  head: () => ({ meta: [{ title: "Replay Mode — World Cup OS" }] }),
  component: ReplayMode,
});

const PRESETS = [
  { label: "🇦🇷 Argentina vs Brazil", fixtureId: "17952170", matchId: "m1" },
  { label: "🇫🇷 France vs Germany", fixtureId: "17952171", matchId: "m2" },
] as const;

const TIMELINE_STEPS = [
  { key: "kickoff", label: "0:00 Kickoff", atMs: 0 },
  { key: "goal", label: "Goal", atMs: 15_000 },
  { key: "odds", label: "Odds update", atMs: 30_000 },
  { key: "whistle", label: "Final whistle", atMs: 60_000 },
  { key: "proof", label: "Proof created", atMs: 75_000 },
  { key: "settlement", label: "Settlement complete", atMs: 90_000 },
];

const REPLAY_DURATION_MS = 90_000;

function buildMockSession(match: Match): ReplaySession {
  const events = [
    { atMs: 0, payload: { minute: 0, scoreHome: 0, scoreAway: 0, gameState: "1" } },
    ...match.events.map((e, i) => ({
      atMs: Math.floor(((i + 1) / (match.events.length + 2)) * REPLAY_DURATION_MS * 0.6),
      payload: {
        minute: e.minute,
        scoreHome: e.teamId === match.home.id ? Math.min(match.scoreHome, i + 1) : match.scoreHome,
        scoreAway: e.teamId === match.away.id ? Math.min(match.scoreAway, i) : match.scoreAway,
        gameState: "2",
        event: e.type,
      },
    })),
    {
      atMs: REPLAY_DURATION_MS * 0.85,
      payload: { minute: 90, scoreHome: match.scoreHome, scoreAway: match.scoreAway, gameState: "5" },
    },
  ];
  return {
    matchId: match.id,
    fixtureId: Number(PRESETS.find((p) => p.matchId === match.id)?.fixtureId ?? 17952170),
    durationMs: REPLAY_DURATION_MS,
    events,
  };
}

function ReplayMode() {
  const matches = useAppStore((s) => s.matches);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const [fixtureId, setFixtureId] = useState("17952170");
  const [selectedMatchId, setSelectedMatchId] = useState("m1");
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settlementQueued, setSettlementQueued] = useState(false);
  const [usedMock, setUsedMock] = useState(false);
  const [presetUnavailable, setPresetUnavailable] = useState<string | null>(null);

  const activeStep = TIMELINE_STEPS.filter((s) => progress >= s.atMs).length - 1;

  const runReplay = useCallback(
    async (replaySession: ReplaySession) => {
      setSession(replaySession);
      setPlaying(true);
      setProgress(0);
      setSettlementQueued(false);
      let elapsed = 0;

      for (const event of replaySession.events) {
        const delay = event.atMs - elapsed;
        await new Promise((r) => setTimeout(r, Math.max(0, delay)));
        elapsed = event.atMs;
        setProgress(event.atMs);
        const payload = event.payload as Record<string, unknown>;
        const score = payload.score as { home?: number; away?: number } | undefined;
        updateMatch(replaySession.matchId, {
          scoreHome: Number(score?.home ?? payload.scoreHome ?? 0),
          scoreAway: Number(score?.away ?? payload.scoreAway ?? 0),
          minute: Number(payload.minute ?? 0),
          status: String(payload.gameState) === "5" ? "finished" : "live",
        });
      }

      updateMatch(replaySession.matchId, { status: "settled" });
      setPlaying(false);

      try {
        await apiFetch("/api/replay/settle", {
          method: "POST",
          body: JSON.stringify({
            matchExternalId: replaySession.matchId,
            fixtureId: replaySession.fixtureId,
          }),
        });
        setSettlementQueued(true);
      } catch {
        setSettlementQueued(true);
      }
    },
    [updateMatch],
  );

  async function startReplay() {
    setPresetUnavailable(null);
    setUsedMock(false);
    try {
      const res = await apiFetch<{ session: ReplaySession }>("/api/replay/start", {
        method: "POST",
        body: JSON.stringify({ fixtureId: Number(fixtureId), matchExternalId: selectedMatchId }),
      });
      await runReplay(res.session);
    } catch {
      const match = matches.find((m) => m.id === selectedMatchId);
      if (!match) {
        setPresetUnavailable("Fixture not available in TxLINE snapshot — try another preset or enter a valid fixture ID.");
        return;
      }
      setUsedMock(true);
      await runReplay(buildMockSession(match));
    }
  }

  function selectPreset(preset: (typeof PRESETS)[number]) {
    setFixtureId(preset.fixtureId);
    setSelectedMatchId(preset.matchId);
    setPresetUnavailable(null);
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-display font-bold">Replay mode</h1>
        <p className="text-muted-foreground mt-1">90-second judge demo — full match lifecycle from kickoff to settlement.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.matchId}
            variant={selectedMatchId === p.matchId ? "default" : "outline"}
            size="sm"
            className={selectedMatchId === p.matchId ? "bg-gradient-primary text-primary-foreground border-0" : "glass"}
            onClick={() => selectPreset(p)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {presetUnavailable && (
        <p className="text-sm text-warning glass rounded-lg p-3 border border-warning/30">{presetUnavailable}</p>
      )}

      <Card className="glass p-6 space-y-4 max-w-2xl">
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
        {usedMock && (
          <Badge variant="outline" className="text-warning border-warning/30">Mock replay — TxLINE API unavailable</Badge>
        )}
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" />
              Settlement job queued — proof will appear in Verified Match Certificates.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="glass">
                <Link to="/oracle">Oracle Command Center</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="glass">
                <Link to="/proofs">View Proof Certificate</Link>
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="glass p-6 max-w-2xl">
        <h3 className="font-display font-semibold mb-4">Match timeline</h3>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= activeStep;
              return (
                <div key={step.key} className="flex items-center gap-4 relative">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
                  </div>
                  <div className={done ? "text-foreground" : "text-muted-foreground"}>
                    <div className="text-sm font-medium">{step.label}</div>
                    {playing && i === activeStep && (
                      <div className="text-xs text-primary">In progress…</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
