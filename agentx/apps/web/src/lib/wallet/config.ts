export function getSolanaRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

export function getSolanaNetwork(): "devnet" | "mainnet" {
  const raw = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  return raw === "mainnet" ? "mainnet" : "devnet";
}

export function getUsdcMint(): string {
  return process.env.NEXT_PUBLIC_USDC_MINT ?? "";
}
