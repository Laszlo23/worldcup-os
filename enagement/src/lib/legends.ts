/** Curated soccer legends — stats + collectible sticker ids (set-legends). */
export type LegendCard = {
  id: string;
  stickerId: string;
  name: string;
  nation: string;
  era: string;
  position: string;
  imageUrl: string;
  mintXp: number;
  stats: { label: string; value: string }[];
  blurb: string;
};

export const LEGENDS: LegendCard[] = [
  {
    id: "messi",
    stickerId: "legend-messi",
    name: "Lionel Messi",
    nation: "Argentina",
    era: "2004–",
    position: "Forward",
    imageUrl: "/soccer/221219105607-messi-crowd-world-cup-121822.webp",
    mintXp: 400,
    stats: [
      { label: "Goals", value: "850+" },
      { label: "Assists", value: "380+" },
      { label: "Ballon d'Or", value: "8" },
      { label: "World Cups", value: "1" },
    ],
    blurb: "Lusail night. Armband on. The final chapter of the GOAT debate for a generation.",
  },
  {
    id: "maradona",
    stickerId: "legend-maradona",
    name: "Diego Maradona",
    nation: "Argentina",
    era: "1976–1997",
    position: "Attacking mid",
    imageUrl: "/soccer/powerful-kick-of-a-soccer-player-with-fiery-ball-photo.webp",
    mintXp: 350,
    stats: [
      { label: "Club goals", value: "311" },
      { label: "Caps", value: "91" },
      { label: "World Cups", value: "1" },
      { label: "Icon plays", value: "∞" },
    ],
    blurb: "Hand of God and the Goal of the Century — chaos and genius in the same shirt.",
  },
  {
    id: "pele",
    stickerId: "legend-pele",
    name: "Pelé",
    nation: "Brazil",
    era: "1956–1977",
    position: "Forward",
    imageUrl: "/soccer/football-or-soccer-player-in-action-on-stadium-with-flashlights-kicking-ball-for-winning-goal.webp",
    mintXp: 350,
    stats: [
      { label: "Career goals", value: "1,283*" },
      { label: "World Cups", value: "3" },
      { label: "Santos titles", value: "26" },
      { label: "Era", value: "King" },
    ],
    blurb: "The original global superstar. Three stars on the shirt before most had one.",
  },
  {
    id: "cruyff",
    stickerId: "legend-cruyff",
    name: "Johan Cruyff",
    nation: "Netherlands",
    era: "1964–1984",
    position: "Forward / 10",
    imageUrl: "/soccer/soccer-players-heading.webp",
    mintXp: 300,
    stats: [
      { label: "Ballon d'Or", value: "3" },
      { label: "Ajax titles", value: "8" },
      { label: "Philosophy", value: "Total" },
      { label: "Turn", value: "Cruyff" },
    ],
    blurb: "He didn't just play the game — he redesigned how teams think about space.",
  },
  {
    id: "ronaldinho",
    stickerId: "legend-ronaldinho",
    name: "Ronaldinho",
    nation: "Brazil",
    era: "1998–2015",
    position: "Attacking mid",
    imageUrl:
      "/soccer/Richarlison-of-Brazil-scores-second-goal-FIFA-World-Cup-Qatar-2022-Group-G-match-Brazil-and-Serbia-Lusail-Stadium-November-24-2022-Lusail-City-Qatar.webp",
    mintXp: 300,
    stats: [
      { label: "Ballon d'Or", value: "1" },
      { label: "World Cups", value: "1" },
      { label: "Elasticos", value: "∞" },
      { label: "Joy index", value: "10/10" },
    ],
    blurb: "Samba in boots. The smile that made defenders forget their jobs.",
  },
  {
    id: "zidane",
    stickerId: "legend-zidane",
    name: "Zinedine Zidane",
    nation: "France",
    era: "1989–2006",
    position: "Attacking mid",
    imageUrl: "/soccer/close-up-of-a-football-action-scene-with-competing-soccer-players-at-the-stadium-photo.webp",
    mintXp: 300,
    stats: [
      { label: "World Cups", value: "1" },
      { label: "Ballon d'Or", value: "1" },
      { label: "UCL as player", value: "1" },
      { label: "Volley", value: "Glasgow" },
    ],
    blurb: "Silk touch, steel will — and that left-foot volley in Glasgow.",
  },
];

export function legendByStickerId(stickerId: string): LegendCard | undefined {
  return LEGENDS.find((l) => l.stickerId === stickerId);
}
