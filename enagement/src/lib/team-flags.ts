/** FIFA-style codes → emoji + kit colors for Live Hub finals chrome. */
const FLAG_EMOJI: Record<string, string> = {
  ARG: "🇦🇷",
  BRA: "🇧🇷",
  FRA: "🇫🇷",
  GER: "🇩🇪",
  ESP: "🇪🇸",
  SPA: "🇪🇸",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  POR: "🇵🇹",
  NED: "🇳🇱",
  ITA: "🇮🇹",
  BEL: "🇧🇪",
  USA: "🇺🇸",
  MEX: "🇲🇽",
};

const KIT: Record<string, { from: string; to: string }> = {
  ESP: { from: "#AA151B", to: "#F1BF00" },
  SPA: { from: "#AA151B", to: "#F1BF00" },
  ARG: { from: "#75AADB", to: "#FFFFFF" },
  BRA: { from: "#009C3B", to: "#FEDF00" },
  FRA: { from: "#002395", to: "#ED2939" },
  GER: { from: "#000000", to: "#DD0000" },
};

export function normalizeTeamCode(code: string): string {
  const c = code.trim().toUpperCase();
  return c === "SPA" ? "ESP" : c;
}

export function flagEmojiForCode(code: string, fallback?: string): string {
  const c = normalizeTeamCode(code);
  return FLAG_EMOJI[c] ?? fallback ?? "⚽";
}

export function kitColorsForCode(code: string): { from: string; to: string } {
  const c = normalizeTeamCode(code);
  return KIT[c] ?? { from: "#1a8f6a", to: "#0e3d32" };
}

export function isSpainArgentinaFinal(homeCode: string, awayCode: string): boolean {
  const a = new Set([normalizeTeamCode(homeCode), normalizeTeamCode(awayCode)]);
  return a.has("ESP") && a.has("ARG");
}
