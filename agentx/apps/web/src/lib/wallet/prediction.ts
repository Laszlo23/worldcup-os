import { apiFetch } from "@/lib/api";
import { sendBase64Transaction, type WalletTxFns } from "@/lib/wallet/signing";

export type LivePredictionResult = {
  prediction: {
    id: string;
    marketId: string;
    outcomeLabel: string;
    amount: number;
    price: number;
    status: string;
  };
  txSignature: string;
};

export async function placeLivePredictionOnChain(params: {
  marketExternalId: string;
  optionExternalId: string;
  amount: number;
  walletTx: WalletTxFns;
}): Promise<LivePredictionResult> {
  const built = await apiFetch<{ transaction: string; escrowPda: string }>("/api/predictions/build-tx", {
    method: "POST",
    body: JSON.stringify({
      marketExternalId: params.marketExternalId,
      amount: params.amount,
    }),
  });

  const txSignature = await sendBase64Transaction(built.transaction, params.walletTx);

  const placed = await apiFetch<{ prediction: LivePredictionResult["prediction"] }>("/api/predictions/place", {
    method: "POST",
    body: JSON.stringify({
      marketExternalId: params.marketExternalId,
      optionExternalId: params.optionExternalId,
      amount: params.amount,
      txSignature,
      escrowPda: built.escrowPda,
    }),
  });

  return { prediction: placed.prediction, txSignature };
}
