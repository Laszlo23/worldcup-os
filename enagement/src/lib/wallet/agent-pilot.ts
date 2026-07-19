import { apiFetch } from "@/lib/api/client";
import { votePollOnChain } from "@/lib/wallet/poll-vote";
import { placePredictionOnChain } from "@/lib/wallet/prediction";
import { resolveWalletTxFns } from "@/lib/wallet/signing";
import { ensureOnchainGas } from "@/lib/wallet/fund-wallet";
import { useAppStore } from "@/lib/store";

export type PilotPlan = {
  planned?: { pollId: string; choice: "yes" | "no" }[];
  plannedMarkets?: {
    marketExternalId: string;
    optionExternalId: string;
    amount: number;
    label: string;
    matchExternalId: string;
  }[];
};

/** Execute a planned Agent Pilot batch — signs XP memos + USDC places on-chain. */
export async function executeAgentPilotPlan(plan: PilotPlan): Promise<{
  lockedVotes: number;
  lockedMarkets: number;
  spent: number;
}> {
  const planned = plan.planned ?? [];
  const plannedMarkets = plan.plannedMarkets ?? [];
  if (!planned.length && !plannedMarkets.length) {
    return { lockedVotes: 0, lockedMarkets: 0, spent: 0 };
  }

  await ensureOnchainGas();
  const txFns = await resolveWalletTxFns();
  const address = useAppStore.getState().wallet.address;

  let lockedVotes = 0;
  for (const p of planned) {
    try {
      await votePollOnChain({ pollId: p.pollId, choice: p.choice });
      lockedVotes += 1;
    } catch {
      /* skip */
    }
  }
  if (lockedVotes > 0) {
    await apiFetch("/api/engagement/auto-agent", {
      method: "POST",
      body: JSON.stringify({ action: "record-votes", votesLocked: lockedVotes }),
    }).catch(() => undefined);
  }

  let lockedMarkets = 0;
  let spent = 0;
  for (const m of plannedMarkets) {
    const bal = useAppStore.getState().wallet.balance;
    if (bal + 0.001 < m.amount) break;
    try {
      await placePredictionOnChain({
        marketExternalId: m.marketExternalId,
        optionExternalId: m.optionExternalId,
        amount: m.amount,
        walletAddress: address,
        signTransaction: txFns.signTransaction,
        sendTransaction: txFns.sendTransaction,
      });
      await apiFetch("/api/engagement/auto-agent", {
        method: "POST",
        body: JSON.stringify({ action: "record-usdc", amount: m.amount }),
      });
      spent += m.amount;
      lockedMarkets += 1;
      useAppStore.getState().updateWalletBalance(Math.max(0, bal - m.amount));
    } catch {
      /* skip */
    }
  }

  return { lockedVotes, lockedMarkets, spent };
}
