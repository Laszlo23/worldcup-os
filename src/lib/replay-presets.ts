/** Offline replay timelines for judge demos when TxLINE historical API is unavailable. */

export type ReplayPresetKey = "arg-bra" | "fra-ger";

export type ReplayPreset = {
  key: ReplayPresetKey;
  label: string;
  matchExternalId: string;
  fixtureId: number;
  durationMs: number;
  events: { atMs: number; payload: Record<string, unknown> }[];
};

const DURATION_MS = 90_000;

export const REPLAY_PRESETS: Record<ReplayPresetKey, ReplayPreset> = {
  "arg-bra": {
    key: "arg-bra",
    label: "Argentina vs Brazil",
    matchExternalId: "m1",
    fixtureId: 900001,
    durationMs: DURATION_MS,
    events: [
      { atMs: 0, payload: { minute: 0, gameState: "1", score: { home: 0, away: 0 } } },
      { atMs: 15_000, payload: { minute: 23, gameState: "2", score: { home: 1, away: 0 }, event: "goal" } },
      { atMs: 30_000, payload: { minute: 34, gameState: "2", score: { home: 1, away: 0 }, event: "odds" } },
      { atMs: 45_000, payload: { minute: 41, gameState: "2", score: { home: 1, away: 1 }, event: "goal" } },
      { atMs: 60_000, payload: { minute: 90, gameState: "5", score: { home: 2, away: 1 }, event: "whistle" } },
      { atMs: 75_000, payload: { minute: 90, gameState: "5", score: { home: 2, away: 1 }, event: "proof" } },
      { atMs: 90_000, payload: { minute: 90, gameState: "5", score: { home: 2, away: 1 }, event: "settlement" } },
    ],
  },
  "fra-ger": {
    key: "fra-ger",
    label: "France vs Germany",
    matchExternalId: "m2",
    fixtureId: 900002,
    durationMs: DURATION_MS,
    events: [
      { atMs: 0, payload: { minute: 0, gameState: "1", score: { home: 0, away: 0 } } },
      { atMs: 20_000, payload: { minute: 18, gameState: "2", score: { home: 1, away: 0 }, event: "goal" } },
      { atMs: 40_000, payload: { minute: 52, gameState: "2", score: { home: 1, away: 1 }, event: "goal" } },
      { atMs: 60_000, payload: { minute: 90, gameState: "5", score: { home: 1, away: 1 }, event: "whistle" } },
      { atMs: 75_000, payload: { minute: 90, gameState: "5", score: { home: 1, away: 1 }, event: "proof" } },
      { atMs: 90_000, payload: { minute: 90, gameState: "5", score: { home: 1, away: 1 }, event: "settlement" } },
    ],
  },
};

export function getReplayPreset(fixtureId: number, matchExternalId?: string): ReplayPreset | null {
  const byFixture = Object.values(REPLAY_PRESETS).find((p) => p.fixtureId === fixtureId);
  if (byFixture) return byFixture;
  if (matchExternalId) {
    const byMatch = Object.values(REPLAY_PRESETS).find((p) => p.matchExternalId === matchExternalId);
    if (byMatch) return byMatch;
  }
  return REPLAY_PRESETS["arg-bra"];
}

export function buildOfflineReplaySession(fixtureId: number, matchExternalId?: string) {
  const preset = getReplayPreset(fixtureId, matchExternalId) ?? REPLAY_PRESETS["arg-bra"];
  return {
    session: {
      matchId: matchExternalId ?? preset.matchExternalId,
      fixtureId: preset.fixtureId,
      durationMs: preset.durationMs,
      events: preset.events,
      source: "offline_preset" as const,
    },
  };
}
