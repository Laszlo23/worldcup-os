const SOCCER_BASE = "/soccer";

export const SOCCER_BACKGROUNDS = {
  stadium: {
    src: `${SOCCER_BASE}/ball-on-the-green-field-in-soccer-stadium-ready-for-game-photo.webp`,
    alt: "Soccer ball on a green pitch in a stadium",
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
} as const;

export type SoccerBackdropVariant = keyof typeof SOCCER_BACKGROUNDS;

export function getSoccerBackground(variant: SoccerBackdropVariant) {
  return SOCCER_BACKGROUNDS[variant];
}

/** Fallback thumbnails when moment has generic image path */
export const SOCCER_MOMENT_FALLBACKS = [
  SOCCER_BACKGROUNDS.goalCelebration.src,
  SOCCER_BACKGROUNDS.heading.src,
  SOCCER_BACKGROUNDS.action.src,
] as const;
