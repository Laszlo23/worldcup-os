import { Connection, Transaction } from "@solana/web3.js";
import { apiFetch } from "@/lib/api/client";
import { decodeBase64 } from "@/lib/base64";
import { ensureOnchainGas } from "@/lib/wallet/fund-wallet";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";

/** Lock an XP poll vote on-chain (memo receipt) then record it server-side. */
export async function votePollOnChain(params: {
  pollId: string;
  choice: "yes" | "no";
}): Promise<{
  ok: boolean;
  choice: "yes" | "no";
  txSignature: string;
  explorerUrl?: string;
  newSticker?: { id: string; title: string; rarity: string; imageUrl: string };
}> {
  await ensureOnchainGas();
  const txFns = await resolveWalletTxFns();
  const connection = new Connection(
    import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );

  const built = await apiFetch<{ transaction: string }>(`/api/engagement/polls/${params.pollId}/vote`, {
    method: "POST",
    body: JSON.stringify({ action: "build", choice: params.choice }),
  });

  const tx = Transaction.from(decodeBase64(built.transaction));
  const txSignature = await submitTransaction(tx, txFns, connection);

  return apiFetch(`/api/engagement/polls/${params.pollId}/vote`, {
    method: "POST",
    body: JSON.stringify({ choice: params.choice, txSignature }),
  });
}
