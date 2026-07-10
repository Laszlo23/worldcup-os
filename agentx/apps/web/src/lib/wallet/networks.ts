/** Solana cluster genesis hashes (OKX changeNetwork). */
export const SOLANA_GENESIS_HASH = {
  mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166Oy2LelxQeVRCoAoDmM",
} as const;

export function getAppGenesisHash(network: "devnet" | "mainnet"): string {
  return SOLANA_GENESIS_HASH[network];
}
