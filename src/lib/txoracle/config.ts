import { PublicKey } from "@solana/web3.js";

export type SolanaNetwork = "mainnet" | "devnet";

export type TxoracleNetworkConfig = {
  rpcUrl: string;
  apiOrigin: string;
  programId: PublicKey;
  txlTokenMint: PublicKey;
};

export const TXORACLE_CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const satisfies Record<SolanaNetwork, TxoracleNetworkConfig>;

function readNetwork(): SolanaNetwork {
  const raw =
    (typeof import.meta !== "undefined" ? import.meta.env.VITE_SOLANA_NETWORK : undefined) ??
    (typeof process !== "undefined" ? process.env.SOLANA_NETWORK : undefined) ??
    "devnet";
  return raw === "mainnet" ? "mainnet" : "devnet";
}

export function getTxoracleNetwork(): SolanaNetwork {
  return readNetwork();
}

function readEnv(name: string): string | undefined {
  const metaEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  if (metaEnv?.[name]) return metaEnv[name];
  if (typeof process !== "undefined" && process.env[name]) return process.env[name];
  return undefined;
}

export function getTxoracleConfig(network: SolanaNetwork = getTxoracleNetwork()): TxoracleNetworkConfig {
  const base = TXORACLE_CONFIG[network];
  const programIdOverride = readEnv("TXORACLE_PROGRAM_ID") ?? readEnv("VITE_TXORACLE_PROGRAM_ID");
  const txlMintOverride = readEnv("TXL_TOKEN_MINT") ?? readEnv("VITE_TXL_TOKEN_MINT");

  return {
    rpcUrl: readEnv("VITE_SOLANA_RPC_URL") ?? readEnv("SOLANA_RPC_URL") ?? base.rpcUrl,
    apiOrigin: readEnv("TXLINE_API_ORIGIN") ?? base.apiOrigin,
    programId: programIdOverride ? new PublicKey(programIdOverride) : base.programId,
    txlTokenMint: txlMintOverride ? new PublicKey(txlMintOverride) : base.txlTokenMint,
  };
}

export function getTxoracleApiBaseUrl(network: SolanaNetwork = getTxoracleNetwork()): string {
  return `${getTxoracleConfig(network).apiOrigin}/api`;
}
