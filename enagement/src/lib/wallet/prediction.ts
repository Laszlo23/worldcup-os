import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { decodeBase64 } from "../base64";
import { apiFetch } from "../api/client";

export async function placePredictionOnChain(params: {
  marketExternalId: string;
  optionExternalId: string;
  amount: number;
  walletAddress: string;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction?: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<string>;
}): Promise<{ prediction: import("../mock/types").Prediction; txSignature: string }> {
  const built = await apiFetch<{ transaction: string; escrowPda: string }>("/api/predictions/build-tx", {
    method: "POST",
    body: JSON.stringify({
      marketExternalId: params.marketExternalId,
      amount: params.amount,
    }),
  });

  const tx = Transaction.from(decodeBase64(built.transaction));

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  let signature: string;
  // Wallet sendTransaction signs internally — never pass an already-signed tx (Phantom rejects re-sign).
  if (params.sendTransaction) {
    signature = await params.sendTransaction(tx, connection);
  } else {
    const signed = await params.signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(signature, "confirmed");
  }

  return {
    ...(await apiFetch<{ prediction: import("../mock/types").Prediction }>("/api/predictions/place", {
      method: "POST",
      body: JSON.stringify({
        marketExternalId: params.marketExternalId,
        optionExternalId: params.optionExternalId,
        amount: params.amount,
        txSignature: signature,
        escrowPda: built.escrowPda,
      }),
    })),
    txSignature: signature,
  };
}
