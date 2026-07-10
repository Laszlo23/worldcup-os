import { getClientSolanaNetwork } from "./config";

/** Solana cluster genesis hashes (OKX `changeNetwork` + chain IDs). */
export const SOLANA_GENESIS_HASH = {
  mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  devnet: "EtWTRABZaYq6iMfeYKouRu166Oy2LelxQeVRCoAoDmM",
} as const;

export function getAppGenesisHash(): string {
  return SOLANA_GENESIS_HASH[getClientSolanaNetwork()];
}

export function getOkxChainId(): string {
  const network = getClientSolanaNetwork();
  const hash = SOLANA_GENESIS_HASH[network];
  return `solana:${hash}`;
}
