import * as anchor from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import type { Txoracle } from "./types/txoracle";
import txoracleIdl from "./idl/txoracle.json";
import { getTxoracleConfig } from "./config";

export function createTxoracleProgram(
  connection: Connection,
  wallet: AnchorWallet,
): anchor.Program<Txoracle> {
  const network = getTxoracleConfig();
  const provider = new anchor.AnchorProvider(connection, wallet as anchor.Wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program<Txoracle>(txoracleIdl as Txoracle, provider);

  if (!program.programId.equals(network.programId)) {
    throw new Error(
      `Loaded IDL program ${program.programId.toBase58()} does not match configured program ${network.programId.toBase58()}`,
    );
  }

  return program;
}
