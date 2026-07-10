import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getSolanaRpcUrl } from "./config";

export type WalletTxFns = {
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
};

export async function sendBase64Transaction(
  base64Tx: string,
  fns: WalletTxFns,
): Promise<string> {
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const raw = Buffer.from(base64Tx, "base64");
  const tx = Transaction.from(raw);
  const signed = await fns.signTransaction(tx);
  if (fns.sendTransaction) {
    return fns.sendTransaction(signed, connection);
  }
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
