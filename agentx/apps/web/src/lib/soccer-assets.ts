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

export function getSoccerBackground(variant: SoccerBackdropVariant) {
  return SOCCER_BACKGROUNDS[variant];
}
