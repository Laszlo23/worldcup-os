import { SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import type * as anchor from "@coral-xyz/anchor";
import type { Txoracle } from "./types/txoracle";
import { getTxoracleAccounts } from "./accounts";

export async function subscribeToTxline(
  program: anchor.Program<Txoracle>,
  params: {
    serviceLevelId: number;
    durationWeeks: number;
    selectedLeagues?: number[];
  },
): Promise<string> {
  const owner = program.provider.publicKey;
  if (!owner) throw new Error("Wallet public key required");

  const accounts = getTxoracleAccounts(owner, program.programId);

  return program.methods
    .subscribe(params.serviceLevelId, params.durationWeeks)
    .accounts({
      user: owner,
      pricingMatrix: accounts.pricingMatrixPda,
      tokenMint: accounts.txlTokenMint,
      userTokenAccount: accounts.userTokenAccount,
      tokenTreasuryVault: accounts.tokenTreasuryVault,
      tokenTreasuryPda: accounts.tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
