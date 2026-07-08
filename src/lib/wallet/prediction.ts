import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { apiFetch } from "../api/client";

export async function placePredictionOnChain(params: {
  marketExternalId: string;
  optionExternalId: string;
  amount: number;
  walletAddress: string;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<string>;
}): Promise<{ prediction: import("../mock/types").Prediction }> {
  const built = await apiFetch<{ transaction: string; escrowPda: string }>("/api/predictions/build-tx", {
    method: "POST",
    body: JSON.stringify({
      marketExternalId: params.marketExternalId,
      amount: params.amount,
    }),
  });

  const tx = Transaction.from(Buffer.from(built.transaction, "base64"));
  const signed = await params.signTransaction(tx);

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  let signature: string;
  if (params.sendTransaction) {
    signature = await params.sendTransaction(signed, connection);
  } else {
    signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");
  }

  return apiFetch<{ prediction: import("../mock/types").Prediction }>("/api/predictions/place", {
    method: "POST",
    body: JSON.stringify({
      marketExternalId: params.marketExternalId,
      optionExternalId: params.optionExternalId,
      amount: params.amount,
      txSignature: signature,
      escrowPda: built.escrowPda,
    }),
  });
}
