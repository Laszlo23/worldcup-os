const PLACEHOLDER_PROGRAM_ID = "Wcup111111111111111111111111111111111111111";

export function getClientSolanaNetwork(): "devnet" | "mainnet" | "mainnet-beta" {
  const raw = import.meta.env.VITE_SOLANA_NETWORK ?? "devnet";
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  return "devnet";
}

export function getClientWorldcupProgramId(): string {
  return import.meta.env.VITE_WORLDCUP_PROGRAM_ID ?? "";
}

/** True when a real program is configured (not the placeholder). */
export function canUseOnChainPredictions(): boolean {
  const id = getClientWorldcupProgramId();
  return Boolean(id && id !== PLACEHOLDER_PROGRAM_ID);
}

export function isMockDataMode(): boolean {
  return import.meta.env.VITE_REQUIRE_LIVE_DATA !== "true" && import.meta.env.VITE_DATABASE_URL !== "true";
}
