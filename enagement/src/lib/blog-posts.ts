import { SOCCER_BACKGROUNDS } from "@/lib/soccer-assets";

const APP = "https://match.buildingcultureid.space";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; cite?: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  tags: string[];
  image: string;
  imageAlt: string;
  body: BlogBlock[];
};

/** Absolute URL for Open Graph / sitemap. */
export function blogPostUrl(slug: string): string {
  return `${APP}/news/${encodeURIComponent(slug)}`;
}

export function blogImageAbsolute(path: string): string {
  if (path.startsWith("http")) return path;
  return `${APP}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function listBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function isEditorialSlug(slug: string): boolean {
  return BLOG_POSTS.some((p) => p.slug === slug);
}

/** Map editorial posts into Ball News card shape for shared UI. */
export function editorialAsNewsItems(): Array<{
  id: string;
  kind: "feature" | "desk" | "breaking" | "wire";
  kicker: string;
  headline: string;
  lede: string;
  body: string;
  image: string;
  createdAt: string;
}> {
  return listBlogPosts().map((p) => ({
    id: p.slug,
    kind: "feature" as const,
    kicker: p.kicker,
    headline: p.title,
    lede: p.description,
    body: p.body
      .filter((b): b is Extract<BlogBlock, { type: "p" }> => b.type === "p")
      .map((b) => b.text)
      .join("\n\n"),
    image: p.image,
    createdAt: p.publishedAt,
  }));
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "argentina-spain-finals-night-terrace-energy",
    title: "Argentina vs Spain: finals night on the terrace",
    description:
      "Flags, chants, and seven-minute swings — how a Argentina–Spain showpiece night feels when the whole Crew is watching together.",
    kicker: "Match night",
    author: "MatchMind Desk",
    publishedAt: "2026-07-19T11:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 6,
    tags: ["argentina", "spain", "finals", "fan culture"],
    image: SOCCER_BACKGROUNDS.crowd.src,
    imageAlt: "World Cup crowd celebrating under the lights",
    body: [
      {
        type: "p",
        text: "Some fixtures are football. Others are weather systems. Argentina versus Spain on a finals-shaped night is the second kind — humidity, drums, and a terrace that refuses to sit down between corners.",
      },
      {
        type: "p",
        text: "You hear it before you see it: the low roar when the teams walk out, the sudden silence when a back pass looks too casual, the explosion when someone dares a shot from distance. MatchMind’s Crew chat is built for that rhythm — hot takes in real time, not post-match essays nobody finishes.",
      },
      {
        type: "h2",
        text: "Why this rivalry still crackles",
      },
      {
        type: "p",
        text: "Spain’s midfield patience meets Argentina’s counterbite. One side wants to braid passes until the defence softens; the other waits for a single loose touch and turns the pitch into a sprint. That clash writes drama in short chapters — perfect for fans who live inside the minute, not the full ninety.",
      },
      {
        type: "ul",
        items: [
          "Early possession can look like Spain control — until a transition flips the mood.",
          "Set pieces become national festivals; every delivery feels like a referendum.",
          "The chat goes wildest between the 55th and 75th minute, when legs tire and gaps open.",
        ],
      },
      {
        type: "quote",
        text: "Finals nights aren’t about being right. They’re about being present when the net ripples.",
        cite: "Terrace Chief",
      },
      {
        type: "h2",
        text: "How to ride the pulse with the Crew",
      },
      {
        type: "p",
        text: "Open Live Hub for the score and video feel, drop into Polls when a seven-minute window opens, and keep Crew unmuted. When a goal lands, claim the moment drop into your collectables album — a keepsake for the night you actually watched with friends.",
      },
      {
        type: "p",
        text: "Whether you’re in sky blue and white or red and gold, the rule is the same: stay loud, stay kind, and never leave before the last stoppage-time corner.",
      },
    ],
  },
  {
    slug: "world-cup-2026-fan-pulse-what-to-watch",
    title: "World Cup 2026 fan pulse: what to watch between kickoffs",
    description:
      "A fun guide to tournament rhythm — group-stage chaos, knockouts, collectables drops, and how fans stay in the story when the ball isn’t rolling.",
    kicker: "World Cup 2026",
    author: "MatchMind Desk",
    publishedAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 7,
    tags: ["world cup 2026", "fans", "tournament", "collectibles"],
    image: SOCCER_BACKGROUNDS.worldCup.src,
    imageAlt: "2026 Soccer World Cup branding",
    body: [
      {
        type: "p",
        text: "World Cup 2026 stretches across cities, time zones, and group tables that rewrite themselves every forty-eight hours. The trick for fans isn’t watching every kick — it’s catching the moments that become lore.",
      },
      {
        type: "h2",
        text: "Group stage: chaos with a smile",
      },
      {
        type: "p",
        text: "Early tournament football is gloriously messy. Favourites look human. Debutants look fearless. A 2–2 draw at midnight can feel bigger than a routine win at noon. That’s when Ball News flashes and Crew chats turn into group therapy with better punchlines.",
      },
      {
        type: "h3",
        text: "Fan checklist for a double-header day",
      },
      {
        type: "ul",
        items: [
          "Pick one “main” match and one “chaos watch” — don’t doomscroll three at once.",
          "Hit Polls during the live window; short calls beat all-night scrolling.",
          "Claim goal collectables when the album lights up — those drops age like vinyl.",
          "Bring a friend into Crew. Tournaments are better with a co-commentator.",
        ],
      },
      {
        type: "h2",
        text: "Knockouts: every minute is a plot twist",
      },
      {
        type: "p",
        text: "From the round of 16 onward, the air changes. A single red card becomes a novel. Extra time turns strangers into lifelong chat allies. Keep your passport warm — streaks, XP, and collectables become the scrapbook of how you lived the summer.",
      },
      {
        type: "quote",
        text: "The World Cup isn’t a schedule. It’s a mood with a whistle.",
      },
      {
        type: "p",
        text: "Between kickoffs, read Ball News for desk colour, check the XP board to see who’s eating, and rest your voice for the next anthem. The tournament will still be there when you come back — louder than before.",
      },
    ],
  },
  {
    slug: "last-minute-winners-football-drama",
    title: "Last-minute winners: why stoppage time feels supernatural",
    description:
      "Injury-time goals rewire stadiums and group chats alike. A love letter to the craziest minutes in football — and how fans ride that spike.",
    kicker: "Drama",
    author: "MatchMind Desk",
    publishedAt: "2026-07-17T15:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 5,
    tags: ["goals", "drama", "stoppage time", "soccer"],
    image: SOCCER_BACKGROUNDS.goalCelebration.src,
    imageAlt: "Player celebrating a World Cup goal",
    body: [
      {
        type: "p",
        text: "There is a specific silence in the 89th minute — not quiet, exactly, more like the whole stadium holding the same breath. Then the ball breaks, a runner finds half a yard, and the net bulges. Phones go up. Voices break. Somebody knocks over a drink two rows back.",
      },
      {
        type: "p",
        text: "Last-minute winners aren’t just goals. They’re narrative theft. Whatever story the match was telling gets rewritten in six seconds, and everyone who stayed becomes a witness.",
      },
      {
        type: "h2",
        text: "Why fans chase those spikes",
      },
      {
        type: "ul",
        items: [
          "The emotional swing is unmatched — despair to delirium without a commercial break.",
          "Collectable drops often fire around big moments; the album remembers what the scoreboard already forgot.",
          "Crew chat becomes poetry and memes at the same time.",
        ],
      },
      {
        type: "h2",
        text: "How to stay in the pocket",
      },
      {
        type: "p",
        text: "Don’t leave early. Don’t mute the feed. If a prediction window is still open, trust the chaos — late games reward fans who respect stoppage time as a second match. When the drop hits, claim it. That image of the winner will outlive the highlight package.",
      },
      {
        type: "quote",
        text: "Football’s best plot twist always arrives after you’ve already checked the train times.",
        cite: "NightOwl",
      },
    ],
  },
  {
    slug: "possession-vs-chaos-modern-football",
    title: "Possession vs chaos: the midfield argument that never ends",
    description:
      "Do teams that keep the ball deserve the win — or do the counters write better stories? A fan-friendly look at modern football’s favourite debate.",
    kicker: "Tactics, loosely",
    author: "MatchMind Desk",
    publishedAt: "2026-07-16T12:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 6,
    tags: ["tactics", "possession", "counter attack", "soccer"],
    image: SOCCER_BACKGROUNDS.infight.src,
    imageAlt: "Players competing for the ball in midfield",
    body: [
      {
        type: "p",
        text: "Every watch party has That Friend. They point at the possession bar like it’s a court verdict. Across the sofa, someone else is screaming for a long ball over the top. Both are right. Both are wrong. That’s football.",
      },
      {
        type: "h2",
        text: "When the ball-keepers look beautiful",
      },
      {
        type: "p",
        text: "High possession can be hypnotic — triangles, switches, a full-back who thinks like a number ten. It tires defenders and invents space where there was none. On those nights, Polls that ask about shot volume or next-goal pressure often lean with the team on the ball.",
      },
      {
        type: "h2",
        text: "When the chaos merchants steal the night",
      },
      {
        type: "p",
        text: "Then there’s the other movie: sit deep, spring the trap, three passes and a finish. Possession becomes a trap you dug for yourself. The terrace loves this script because it feels like justice for the underdog — and because the highlights slap harder.",
      },
      {
        type: "ul",
        items: [
          "Watch transitions, not just the bar chart.",
          "A 62% possession team can still lose 2–0 and deserve it.",
          "Live Hub stats (xG, shots) beat vibes — but vibes still matter in Crew.",
        ],
      },
      {
        type: "p",
        text: "MatchMind doesn’t force you to pick a philosophy. Crowd mode rides the terrace; Agent mode chases the signal. Either way, you’re arguing about football the way fans always have — with more data, and better memes.",
      },
    ],
  },
  {
    slug: "goal-collectables-football-keepsakes",
    title: "Goal collectables: keeping the nights that mattered",
    description:
      "How MatchMind moment drops and legend collectables turn big plays into album pieces you can trade, show off, and remember.",
    kicker: "Collectables",
    author: "MatchMind Desk",
    publishedAt: "2026-07-15T09:30:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 5,
    tags: ["collectables", "moments", "album", "fan culture"],
    image: SOCCER_BACKGROUNDS.action.src,
    imageAlt: "Football player striking for goal under stadium lights",
    body: [
      {
        type: "p",
        text: "Football memory used to live in VHS tapes and group chats that got deleted. Now the best nights can land as collectables — visual keepsakes tied to the goal, the save, the volley that made the terrace lose its mind.",
      },
      {
        type: "h2",
        text: "Moments vs legends",
      },
      {
        type: "ul",
        items: [
          "Moment drops appear around live match energy — claim them into your album while the buzz is fresh.",
          "Legend collectables are intentional mints — spend XP for icons that define your kit and shelf.",
          "The Market lets fans trade collectables for XP with other predictors — terrace culture, peer to peer.",
        ],
      },
      {
        type: "h2",
        text: "Why albums beat infinite scroll",
      },
      {
        type: "p",
        text: "A feed forgets. An album doesn’t. Completing a set is a tiny ceremony — proof you showed up for a run of drops, not that you doomscrolled through fifty tabs. Show your shelf on Profile. Flex kindly. Invite your crew to chase the same set.",
      },
      {
        type: "quote",
        text: "Collect the nights. The scoreline already has enough copies online.",
      },
      {
        type: "p",
        text: "After the next big goal, open Moments, claim the drop, and let the album grow. That’s fandom with receipts — the fun kind.",
      },
    ],
  },
  {
    slug: "crew-chat-community-pulse-matchnight",
    title: "Crew chat & community pulse: matchnight as a group sport",
    description:
      "Why the terrace chat is half the fun — reactions, leaderboards, follow predictors, and the pulse that makes remote fans feel pitchside.",
    kicker: "Community",
    author: "MatchMind Desk",
    publishedAt: "2026-07-14T16:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 5,
    tags: ["community", "crew", "chat", "fans"],
    image: SOCCER_BACKGROUNDS.stadium.src,
    imageAlt: "Soccer ball on the pitch ready for kickoff",
    body: [
      {
        type: "p",
        text: "Watching alone is fine. Watching with a Crew that loses its mind in the same second is better. MatchMind’s community tab is the digital terrace — chat, pulse, XP board, and the people you follow because their calls slap.",
      },
      {
        type: "h2",
        text: "What “pulse” actually means",
      },
      {
        type: "p",
        text: "Pulse is the living feed of what fans are doing: votes locking, moments claimed, stadium check-ins, spicy chat lines. It’s less “news ticker” and more “can you feel the room?” When the pulse spikes, something just happened — or is about to.",
      },
      {
        type: "h3",
        text: "Ways to stay in the vibe",
      },
      {
        type: "ul",
        items: [
          "Drop a take in Crew when the tempo flips — don’t wait for full-time.",
          "Follow predictors on the XP board so their form shows up in your night.",
          "React hard. Football is an emoji sport and we accept that.",
          "Invite friends with your referral link — bonus XP when they lace up and lock a vote.",
        ],
      },
      {
        type: "p",
        text: "Agents on the terrace will keep the chat warm. Real fans make it legendary. Bring your kit colours, your superstitions, and your worst puns.",
      },
    ],
  },
  {
    slug: "seven-minute-windows-live-predictions-fun",
    title: "Seven-minute windows: the fun way to predict live football",
    description:
      "Short prediction windows turn a match into a series of spicy decisions — Crowd vs Agent, streaks, and bragging rights without waiting until full time.",
    kicker: "Predict",
    author: "MatchMind Desk",
    publishedAt: "2026-07-13T11:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 6,
    tags: ["predictions", "live", "xp", "polls"],
    image: SOCCER_BACKGROUNDS.heading.src,
    imageAlt: "Soccer players contesting a header",
    body: [
      {
        type: "p",
        text: "Full-time tips are yesterday’s radio. Live football moves in bursts — a press, a booking, a five-minute siege. MatchMind’s XP polls open for short windows so you can call the next chapter while it’s still being written.",
      },
      {
        type: "h2",
        text: "Crowd mode vs Agent mode",
      },
      {
        type: "p",
        text: "Crowd locks with the terrace majority when the room knows something. Agent leans on signal when you want structured conviction — or when Auto Pilot is running while you fetch snacks. Switch whenever the match state changes. No loyalty oath required.",
      },
      {
        type: "ul",
        items: [
          "Correct calls grow XP, streaks, and passport reputation.",
          "Wrong calls still teach tempo — and keep you honest.",
          "USDC markets sit beside XP when you want real-funds spice on an open fixture.",
        ],
      },
      {
        type: "h2",
        text: "Make it a party game",
      },
      {
        type: "p",
        text: "Split the sofa: one friend on Crowd, one on Agent, compare streaks at half-time. Winner picks the next watch-party snack. That’s the sport inside the sport — and why seven minutes can feel longer than ninety.",
      },
      {
        type: "quote",
        text: "If you only predict before kickoff, you miss half the jokes.",
        cite: "XPHunter",
      },
    ],
  },
  {
    slug: "stadium-stations-watch-parties-live-drops",
    title: "Stadium stations & watch parties: unlocking live drops",
    description:
      "Official MatchMind QRs at stadium stations and watch parties unlock exclusive live collectables — here’s how the night works for fans on site.",
    kicker: "Venue nights",
    author: "MatchMind Desk",
    publishedAt: "2026-07-12T14:00:00.000Z",
    updatedAt: "2026-07-19T14:00:00.000Z",
    readingMinutes: 5,
    tags: ["stadium", "watch party", "drops", "collectables"],
    image: SOCCER_BACKGROUNDS.cornerKick.src,
    imageAlt: "Football player taking a corner kick in the stadium",
    body: [
      {
        type: "p",
        text: "Some collectables are for everyone on the internet. Others are for people who actually showed up — concourse, fan zone, or the bar with the official screen and the sticky floor.",
      },
      {
        type: "h2",
        text: "Scan only the real QR",
      },
      {
        type: "p",
        text: "Look for MatchMind boards at stadium stations or partner watch parties. Scan that code, land on Venue scan, and check in for the fixture. Random codes from group chats won’t unlock venue-only live drops — and that’s the point.",
      },
      {
        type: "ul",
        items: [
          "Stadium stations: concourse kiosks and partner gates.",
          "Watch parties: official host screens with the MatchMind QR.",
          "After check-in: +XP, a stadium mark on your passport, and eligibility for live drops while the match runs.",
        ],
      },
      {
        type: "h2",
        text: "Then enjoy the night",
      },
      {
        type: "p",
        text: "Keep MatchMind open. When the station feed fires a drop, claim it into your album. Sing. Argue. Spill nothing on your jersey if you can help it. The collectables will still be there tomorrow — the night won’t.",
      },
      {
        type: "quote",
        text: "Pitchside proof isn’t a flex. It’s a souvenir with better lighting.",
      },
    ],
  },
];
