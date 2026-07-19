const SOCCER_BASE = "/soccer";

export const SOCCER_MOMENTS = {
  volley: {
    src: "/moment-volley-night.jpg",
    alt: "Player strikes a volley under stadium floodlights",
  },
  save: {
    src: "/moment-save-dive.jpg",
    alt: "Goalkeeper makes a full-stretch save",
  },
  topbin: {
    src: "/moment-topbin-curl.jpg",
    alt: "Ball bends into the top corner of the net",
  },
  header: {
    src: "/moment-header.jpg",
    alt: "Player leaps for a headed goal",
  },
  celebration: {
    src: "/moment-celebration.jpg",
    alt: "Player celebration after scoring",
  },
  thunderbolt: {
    src: "/moment-thunderbolt.jpg",
    alt: "Long-range thunderbolt strike on goal",
  },
} as const;

export const SOCCER_REWARDS = {
  jersey: {
    src: "/reward-jersey.jpg",
    alt: "Limited-edition prediction league jersey",
    label: "Jersey",
    points: "2,500 PTS",
  },
  boots: {
    src: "/reward-boots.jpg",
    alt: "Pro-grade football boots reward",
    label: "Boots",
    points: "5,000 PTS",
  },
  vip: {
    src: "/reward-vip.jpg",
    alt: "VIP stadium lounge experience",
    label: "VIP",
    points: "10,000 PTS",
  },
} as const;

/** Full-bleed backdrop photos (webp in public/soccer/) */
export const SOCCER_BACKGROUNDS = {
  stadium: {
    src: `${SOCCER_BASE}/ball-on-the-green-field-in-soccer-stadium-ready-for-game-photo.webp`,
    alt: "Soccer ball on a green pitch in a stadium",
  },
  worldCup: {
    src: `${SOCCER_BASE}/2026soccerworldcup.webp`,
    alt: "2026 World Cup branding",
  },
  crowd: {
    src: `${SOCCER_BASE}/221219105607-messi-crowd-world-cup-121822.webp`,
    alt: "Messi celebrating with the crowd at the World Cup",
  },
  action: {
    src: `${SOCCER_BASE}/football-or-soccer-player-in-action-on-stadium-with-flashlights-kicking-ball-for-winning-goal.webp`,
    alt: "Soccer player kicking for a winning goal under stadium lights",
  },
  pitch: {
    src: `${SOCCER_BASE}/grassimage.webp`,
    alt: "Close-up of football pitch grass",
  },
  playersDark: {
    src: `${SOCCER_BASE}/darkfaraway-players.webp`,
    alt: "Soccer players on a distant pitch",
  },
  infight: {
    src: `${SOCCER_BASE}/infight_soccer.webp`,
    alt: "Players competing for the ball",
  },
  goalCelebration: {
    src: `${SOCCER_BASE}/Richarlison-of-Brazil-scores-second-goal-FIFA-World-Cup-Qatar-2022-Group-G-match-Brazil-and-Serbia-Lusail-Stadium-November-24-2022-Lusail-City-Qatar.webp`,
    alt: "Richarlison scores at the World Cup",
  },
  heading: {
    src: `${SOCCER_BASE}/soccer-players-heading.webp`,
    alt: "Soccer players heading the ball",
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
export type SoccerMomentKey = keyof typeof SOCCER_MOMENTS;
export type SoccerRewardKey = keyof typeof SOCCER_REWARDS;

export function getSoccerBackground(variant: SoccerBackdropVariant) {
  return SOCCER_BACKGROUNDS[variant];
}

/** Shared moment art pool for watermarks / fallbacks */
export const SOCCER_MOMENT_FALLBACKS = [
  SOCCER_MOMENTS.topbin.src,
  SOCCER_MOMENTS.volley.src,
  SOCCER_MOMENTS.save.src,
  SOCCER_MOMENTS.header.src,
  SOCCER_MOMENTS.celebration.src,
  SOCCER_MOMENTS.thunderbolt.src,
] as const;
