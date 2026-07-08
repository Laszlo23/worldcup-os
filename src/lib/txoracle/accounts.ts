import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getTxoracleConfig } from "./config";

export function getTokenTreasuryPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], programId);
  return pda;
}

export function getPricingMatrixPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], programId);
  return pda;
}

export function getTokenTreasuryVault(programId: PublicKey, txlTokenMint: PublicKey): PublicKey {
  const tokenTreasuryPda = getTokenTreasuryPda(programId);
  return getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function getUserTxlTokenAccount(owner: PublicKey, txlTokenMint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    txlTokenMint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function getTxoracleAccounts(owner: PublicKey, programId = getTxoracleConfig().programId) {
  const { txlTokenMint } = getTxoracleConfig();
  const tokenTreasuryPda = getTokenTreasuryPda(programId);
  return {
    tokenTreasuryPda,
    tokenTreasuryVault: getTokenTreasuryVault(programId, txlTokenMint),
    pricingMatrixPda: getPricingMatrixPda(programId),
    userTokenAccount: getUserTxlTokenAccount(owner, txlTokenMint),
    txlTokenMint,
  };
}
