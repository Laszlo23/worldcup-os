import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getSolanaRpcUrl } from "./config";

export type WalletTxFns = {
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
};

async function waitForConfirmedTx(connection: Connection, signature: string): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error("Transaction failed on-chain");
  }
}

export async function sendBase64Transaction(
  base64Tx: string,
  fns: WalletTxFns,
): Promise<string> {
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const raw = Buffer.from(base64Tx, "base64");
  const tx = Transaction.from(raw);
  let signature: string;
  if (fns.sendTransaction) {
    signature = await fns.sendTransaction(tx, connection);
  } else {
    const signed = await fns.signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize());
  }
  await waitForConfirmedTx(connection, signature);
  return signature;
}
