/** SPL token account rent (~0.00203928 SOL). */
const TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

export function formatInsufficientSolMessage(params: {
  solBalance: number;
  requiredLamports: number;
  needsUserAta: boolean;
  needsEscrowAta?: boolean;
}): string {
  const requiredSol = params.requiredLamports / 1_000_000_000;
  const rentSol = TOKEN_ACCOUNT_RENT_LAMPORTS / 1_000_000_000;
  const parts = [`You need ~${requiredSol.toFixed(3)} SOL in your wallet for network fees`];

  if (params.needsUserAta && params.needsEscrowAta) {
    parts.push(`including ~${(rentSol * 2).toFixed(3)} SOL to open your USDC and escrow accounts`);
  } else if (params.needsUserAta) {
    parts.push(`including ~${rentSol.toFixed(3)} SOL to open your USDC account`);
  } else if (params.needsEscrowAta) {
    parts.push(`including ~${rentSol.toFixed(3)} SOL to open the escrow vault for this market`);
  }

  return `${parts.join(" ")}. You have ${params.solBalance.toFixed(4)} SOL. Devnet faucet: https://faucet.solana.com`;
}

export function formatSettlementPoolLowSolMessage(): string {
  return "Payout pool is low on SOL — contact ops or retry later. Your wallet balance is fine; this affects server-side claim transfers only.";
}

export function parseWalletSimulationError(message: string): string | null {
  if (/insufficient lamports/i.test(message)) {
    return "Not enough SOL in your wallet for transaction fees and token account rent (~0.002 SOL per new account). Get devnet SOL at faucet.solana.com, then retry.";
  }
  if (/escrow/i.test(message) && /not found|missing|failed to build/i.test(message)) {
    return "Could not prepare escrow transaction — retry in a few seconds or pick a different market.";
  }
  return null;
}
