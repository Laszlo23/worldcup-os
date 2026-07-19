const SOCCER_BASE = "/soccer";

export const SOCCER_BACKGROUNDS = {
  stadium: {
    src: `${SOCCER_BASE}/ball-on-the-green-field-in-soccer-stadium-ready-for-game-photo.webp`,
    alt: "Soccer ball on a green pitch in a stadium",
  },
  worldCup: {
    src: `${SOCCER_BASE}/2026soccerworldcup.webp`,
    alt: "2026 World Cup branding",
  },
  pitch: {
    src: `${SOCCER_BASE}/grassimage.webp`,
    alt: "Close-up of football pitch grass",
  },
  goalCelebration: {
    src: `${SOCCER_BASE}/Richarlison-of-Brazil-scores-second-goal-FIFA-World-Cup-Qatar-2022-Group-G-match-Brazil-and-Serbia-Lusail-Stadium-November-24-2022-Lusail-City-Qatar.webp`,
    alt: "Richarlison scores at the World Cup",
  },
  heading: {
    src: `${SOCCER_BASE}/soccer-players-heading.webp`,
    alt: "Soccer players heading the ball",
  },
  action: {
    src: `${SOCCER_BASE}/football-or-soccer-player-in-action-on-stadium-with-flashlights-kicking-ball-for-winning-goal.webp`,
    alt: "Soccer player in action",
  },
  crowd: {
    src: `${SOCCER_BASE}/221219105607-messi-crowd-world-cup-121822.webp`,
    alt: "World Cup crowd celebration",
  },
  playersDark: {
    src: `${SOCCER_BASE}/darkfaraway-players.webp`,
    alt: "Soccer players on a distant pitch",
  },
  infight: {
    src: `${SOCCER_BASE}/infight_soccer.webp`,
    alt: "Players competing for the ball",
  },
  cornerKick: {
    src: `${SOCCER_BASE}/football-player-taking-a-corner-kick-while-playing-at-the-stadium.webp`,
    alt: "Corner kick at the stadium",
  },
  closeUp: {
    src: `${SOCCER_BASE}/close-up-of-a-football-action-scene-with-competing-soccer-players-at-the-stadium-photo.webp`,
    alt: "Close-up football action",
  },
  powerfulKick: {
    src: `${SOCCER_BASE}/powerful-kick-of-a-soccer-player-with-fiery-ball-photo.webp`,
    alt: "Powerful soccer kick",
  },
  portugalUruguay: {
    src: `${SOCCER_BASE}/221128155448-01-portugal-uruguay-world-cup-1128.webp`,
    alt: "Portugal vs Uruguay World Cup match",
  },
  englandWales: {
    src: `${SOCCER_BASE}/221203174011-05-england-wales-world-cup-1129.webp`,
    alt: "England vs Wales World Cup match",
  },
} as const;

export type SoccerBackdropVariant = keyof typeof SOCCER_BACKGROUNDS;

export function getSoccerBackground(variant: SoccerBackdropVariant) {
  return SOCCER_BACKGROUNDS[variant];
}

/** Expanded drop art — classic moments + new pack + stadium stills */
export const DROP_ART_POOL = [
  "/moment-drop-slide.jpg",
  "/moment-drop-bicycle.jpg",
  "/moment-drop-keeper.jpg",
  "/moment-drop-corner.jpg",
  "/moment-topbin-curl.jpg",
  "/moment-volley-night.jpg",
  "/moment-save-dive.jpg",
  "/moment-header.jpg",
  "/moment-celebration.jpg",
  "/moment-thunderbolt.jpg",
  "/moment-volley.jpg",
  "/moment-topbin.jpg",
  "/moment-save.jpg",
  SOCCER_BACKGROUNDS.goalCelebration.src,
  SOCCER_BACKGROUNDS.action.src,
  SOCCER_BACKGROUNDS.heading.src,
  SOCCER_BACKGROUNDS.infight.src,
  SOCCER_BACKGROUNDS.cornerKick.src,
  SOCCER_BACKGROUNDS.closeUp.src,
  SOCCER_BACKGROUNDS.powerfulKick.src,
  SOCCER_BACKGROUNDS.portugalUruguay.src,
  SOCCER_BACKGROUNDS.englandWales.src,
  SOCCER_BACKGROUNDS.crowd.src,
] as const;

export function dropArtForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return DROP_ART_POOL[hash % DROP_ART_POOL.length]!;
}

export const SOCCER_MOMENTS = {
  slide: { src: "/moment-drop-slide.jpg", alt: "Knee-slide goal celebration" },
  bicycle: { src: "/moment-drop-bicycle.jpg", alt: "Bicycle kick finish" },
  keeper: { src: "/moment-drop-keeper.jpg", alt: "Goalkeeper diving save" },
  corner: { src: "/moment-drop-corner.jpg", alt: "Corner into the box" },
  volley: { src: "/moment-volley-night.jpg", alt: "Player strikes a volley under stadium floodlights" },
  save: { src: "/moment-save-dive.jpg", alt: "Goalkeeper makes a full-stretch save" },
  topbin: { src: "/moment-topbin-curl.jpg", alt: "Ball bends into the top corner of the net" },
  header: { src: "/moment-header.jpg", alt: "Player leaps for a headed goal" },
  celebration: { src: "/moment-celebration.jpg", alt: "Player celebration after scoring" },
  thunderbolt: { src: "/moment-thunderbolt.jpg", alt: "Long-range thunderbolt strike on goal" },
} as const;

/** Fallback thumbnails when moment has no image path */
export const SOCCER_MOMENT_FALLBACKS = DROP_ART_POOL;
