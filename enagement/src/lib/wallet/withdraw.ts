import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { getClientSolanaNetwork } from "@/lib/wallet/config";

function getClientUsdcMint(): string {
  return (
    import.meta.env.VITE_USDC_MINT ||
    import.meta.env.VITE_USDC_MINT_DEVNET ||
    "ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh"
  );
}
import { ensureOnchainGas } from "@/lib/wallet/fund-wallet";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
import { useAppStore } from "@/lib/store";

function explorerUrl(signature: string): string {
  const net = getClientSolanaNetwork();
  const cluster = net === "mainnet-beta" ? "" : `?cluster=${net}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

/** Withdraw USDC from the unlocked MatchMind wallet to any Solana address. */
export async function withdrawUsdc(params: {
  destination: string;
  amount: number;
}): Promise<{ signature: string; explorerUrl: string }> {
  const { wallet } = useAppStore.getState();
  if (!wallet.connected) throw new Error("Connect wallet first");
  if (params.amount <= 0) throw new Error("Amount must be positive");
  if (params.amount > wallet.balance + 0.0001) throw new Error("Insufficient USDC");

  let dest: PublicKey;
  try {
    dest = new PublicKey(params.destination.trim());
  } catch {
    throw new Error("Invalid destination address");
  }

  await ensureOnchainGas();
  const txFns = await resolveWalletTxFns();
  const rpc = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const mint = new PublicKey(getClientUsdcMint());
  const owner = new PublicKey(wallet.address);
  const fromAta = getAssociatedTokenAddressSync(mint, owner);
  const toAta = getAssociatedTokenAddressSync(mint, dest);
  const lamports = BigInt(Math.round(params.amount * 1_000_000));

  const fromAccount = await getAccount(connection, fromAta).catch(() => null);
  if (!fromAccount || fromAccount.amount < lamports) {
    throw new Error("Insufficient USDC in wallet");
  }

  const tx = new Transaction();
  const toInfo = await connection.getAccountInfo(toAta);
  if (!toInfo) {
    tx.add(createAssociatedTokenAccountInstruction(owner, toAta, dest, mint));
  }
  tx.add(createTransferInstruction(fromAta, toAta, owner, lamports));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = owner;

  const signature = await submitTransaction(tx, txFns, connection);
  useAppStore.getState().updateWalletBalance(Math.max(0, wallet.balance - params.amount));
  return { signature, explorerUrl: explorerUrl(signature) };
}

/** Withdraw SOL (leave a small gas buffer). */
export async function withdrawSol(params: {
  destination: string;
  amount: number;
}): Promise<{ signature: string; explorerUrl: string }> {
  const { wallet } = useAppStore.getState();
  if (!wallet.connected) throw new Error("Connect wallet first");
  if (params.amount <= 0) throw new Error("Amount must be positive");

  let dest: PublicKey;
  try {
    dest = new PublicKey(params.destination.trim());
  } catch {
    throw new Error("Invalid destination address");
  }

  const txFns = await resolveWalletTxFns();
  const rpc = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const owner = new PublicKey(wallet.address);
  const balance = await connection.getBalance(owner);
  const lamports = Math.floor(params.amount * LAMPORTS_PER_SOL);
  const feeBuffer = 5_000;
  if (balance < lamports + feeBuffer) {
    throw new Error("Insufficient SOL (keep a little for fees)");
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: owner, toPubkey: dest, lamports }),
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = owner;

  const signature = await submitTransaction(tx, txFns, connection);
  return { signature, explorerUrl: explorerUrl(signature) };
}
