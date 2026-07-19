import type { Match } from "@/lib/types";
import type { LiveEvent } from "@/lib/queries/hooks";
import { DROP_ART_POOL, SOCCER_BACKGROUNDS } from "@/lib/soccer-assets";

export type BallNewsItem = {
  id: string;
  kind: "breaking" | "wire" | "feature" | "desk";
  kicker: string;
  headline: string;
  lede: string;
  /** Full article body for the readable post page */
  body: string;
  image: string;
  minuteLabel?: string;
  createdAt: string;
  matchId?: string;
};

/** Path param helper — router encodes; avoid double-encoding. */
export function encodeNewsPostId(id: string): string {
  return id;
}

export function decodeNewsPostId(raw: string): string {
  try {
    // Tolerate one or two decode passes if a link was pre-encoded
    let out = raw;
    if (out.includes("%")) out = decodeURIComponent(out);
    if (out.includes("%")) out = decodeURIComponent(out);
    return out;
  } catch {
    return raw;
  }
}

/** Find a post in a built feed (or null if wire aged out). */
export function findBallNewsItem(items: BallNewsItem[], id: string): BallNewsItem | null {
  return items.find((i) => i.id === id) ?? null;
}

function artFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return DROP_ART_POOL[hash % DROP_ART_POOL.length]!;
}

function eventKind(type: string): BallNewsItem["kind"] {
  const t = type.toLowerCase();
  if (t.includes("goal")) return "breaking";
  if (t.includes("card") || t.includes("yellow") || t.includes("red")) return "wire";
  if (t.includes("half") || t.includes("kick")) return "desk";
  return "wire";
}

function eventKicker(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("goal")) return "Goal flash";
  if (t.includes("yellow")) return "Booking";
  if (t.includes("red")) return "Red card";
  if (t.includes("corner")) return "Set piece";
  if (t.includes("half")) return "Interval";
  return "Match wire";
}

/** Turn live oracle events + match context into a Ball News desk feed. */
export function buildBallNews(match: Match, events: LiveEvent[]): BallNewsItem[] {
  const items: BallNewsItem[] = [];
  const home = match.home.name;
  const away = match.away.name;
  const scoreline = `${match.scoreHome}–${match.scoreAway}`;
  const stadium = match.stadium || "the arena";
  const stage = match.stage || "World Cup";

  for (const e of events.slice(0, 12)) {
    const lede = e.body || `${home} vs ${away} — developing at ${stadium}.`;
    items.push({
      id: `wire-${e.id}`,
      kind: eventKind(e.event_type),
      kicker: eventKicker(e.event_type),
      headline: e.title || "Live update",
      lede,
      body: [
        lede,
        "",
        `Fixture: ${home} vs ${away}`,
        `Stage: ${stage}`,
        `Venue: ${stadium}`,
        "",
        "This flash came straight from the TxLINE oracle into the MatchMind Ball News desk. Open Live Hub for the next XP window, or drop into Crew to react with the terrace.",
      ].join("\n"),
      image: artFor(e.id + e.event_type),
      createdAt: e.created_at,
      matchId: match.id,
    });
  }

  // Editorial desk pieces so the blog never feels empty
  const scoreLede =
    match.status === "live"
      ? `${match.minute}' at ${stadium}. ${stage} — the terrace is locked in.`
      : match.status === "halftime"
        ? `Half-time at ${stadium}. ${home} and ${away} reset for the second half.`
        : match.status === "finished" || match.status === "settled"
          ? `Final whistle at ${stadium}. ${home} ${scoreline} ${away} in the ${stage}.`
          : `${home} face ${away} in the ${stage}. Kickoff approaching at ${stadium}.`;

  const desk: BallNewsItem[] = [
    {
      id: `desk-score-${match.id}-${scoreline}`,
      kind: "breaking",
      kicker: match.status === "live" || match.status === "halftime" ? "Live score" : "Scoreline",
      headline: `${home} ${scoreline} ${away}`,
      lede: scoreLede,
      body: [
        scoreLede,
        "",
        `Current scoreline: ${home} ${scoreline} ${away}.`,
        match.stats?.xg
          ? `xG: ${match.stats.xg[0]?.toFixed(2)} – ${match.stats.xg[1]?.toFixed(2)}.`
          : "xG feed warming up.",
        match.stats?.possession
          ? `Possession: ${match.stats.possession[0]}% – ${match.stats.possession[1]}%.`
          : "",
        "",
        "Read the next XP window on Live Hub, claim goal drops in the Album, and shout in Crew when the net ripples.",
      ]
        .filter(Boolean)
        .join("\n"),
      image: SOCCER_BACKGROUNDS.action.src,
      minuteLabel: match.status === "live" ? `${match.minute}'` : undefined,
      createdAt: new Date().toISOString(),
      matchId: match.id,
    },
    {
      id: `desk-xg-${match.id}`,
      kind: "feature",
      kicker: "Tactical desk",
      headline:
        match.stats?.possession != null
          ? `Possession story: ${match.stats.possession[0]}% vs ${match.stats.possession[1]}%`
          : `${home} vs ${away} — the midfield battle`,
      lede:
        match.stats?.xg != null
          ? `Expected goals sit at ${match.stats.xg[0]?.toFixed(2)} – ${match.stats.xg[1]?.toFixed(2)}. MatchMind fans are calling the next window on the Live Hub.`
          : `Pressure swings with every TxLINE pulse. Stay on Ball News for the next flash.`,
      body: [
        match.stats?.xg != null
          ? `Expected goals sit at ${match.stats.xg[0]?.toFixed(2)} – ${match.stats.xg[1]?.toFixed(2)}.`
          : "Pressure swings with every TxLINE pulse.",
        "",
        "The tactical desk watches territory, tempo, and terrace conviction. When the numbers lean one way, Crowd mode locks with the majority — Agent mode copies AgentX signals into your vote.",
        "",
        `Tonight's stage: ${stage} at ${stadium}. ${home} vs ${away}.`,
      ].join("\n"),
      image: SOCCER_BACKGROUNDS.infight.src,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      matchId: match.id,
    },
    {
      id: `desk-drop-${match.id}`,
      kind: "desk",
      kicker: "Fan desk",
      headline: "Goal drops and XP polls open while the ball rolls",
      lede: `Claim moments in the Album, ride Crowd or Agent on 7-minute windows, and keep your passport hot. ${stage} never sleeps.`,
      body: [
        `Claim moments in the Album, ride Crowd or Agent on 7-minute windows, and keep your passport hot. ${stage} never sleeps.`,
        "",
        "Every XP poll is signed on-chain with your MatchMind smart wallet. Goal drops mint stickers into your album. Stadium QR check-ins prove you were pitchside.",
        "",
        "Bring a friend with your referral link — both of you earn bonus XP when they lace up and lock their first vote.",
      ].join("\n"),
      image: SOCCER_BACKGROUNDS.crowd.src,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
      matchId: match.id,
    },
    {
      id: `desk-stadium-${match.id}`,
      kind: "feature",
      kicker: "Pitchside",
      headline: stadium !== "the arena" ? `Atmosphere report · ${stadium}` : `World Cup night under the lights`,
      lede: `From the stands to Solana — MatchMind turns every flash into XP, stickers, and Crew noise. ${home} and ${away} write the script.`,
      body: [
        `From the stands to Solana — MatchMind turns every flash into XP, stickers, and Crew noise. ${home} and ${away} write the script.`,
        "",
        `Venue energy at ${stadium} carries into the terrace chat. React with the Crew, follow predictors on the board, and keep Ball News open for the next breaking flash.`,
      ].join("\n"),
      image: SOCCER_BACKGROUNDS.goalCelebration.src,
      createdAt: new Date(Date.now() - 180_000).toISOString(),
      matchId: match.id,
    },
  ];

  // Put live wires first, then fill with desk copy (dedupe by id)
  const seen = new Set<string>();
  const merged = [...items, ...desk].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return merged.sort((a, b) => {
    const rank = (k: BallNewsItem["kind"]) =>
      k === "breaking" ? 0 : k === "wire" ? 1 : k === "desk" ? 2 : 3;
    const r = rank(a.kind) - rank(b.kind);
    if (r !== 0) return r;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
