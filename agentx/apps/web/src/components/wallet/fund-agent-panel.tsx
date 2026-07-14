"use client";

import { useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { refreshWalletSession } from "@/lib/wallet/auth";
import { useWalletStore } from "@/lib/store/wallet";
import { useWalletSigning } from "@/lib/wallet/use-wallet-signing";
import { sendBase64Transaction } from "@/lib/wallet/signing";
import { toast } from "sonner";

type FundAgentPanelProps = {
  agentName: string;
  treasuryPubkey?: string;
  treasuryBalance?: number;
  minTreasury?: number;
  treasuryExplorer?: string;
  active?: boolean;
};

export function FundAgentPanel({
  agentName,
  treasuryPubkey,
  treasuryBalance = 0,
  minTreasury = 10,
  treasuryExplorer,
  active = true,
}: FundAgentPanelProps) {
  const { ready, ensureReady, sessionConnected } = useWalletSigning();
  const updateWalletBalance = useWalletStore((s) => s.updateWalletBalance);
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const funded = treasuryBalance >= minTreasury;
  const encodedName = encodeURIComponent(agentName);

  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Treasury</p>
        {!funded && !active ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Fund to activate
          </span>
        ) : (
          <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-medium text-green">
            {funded ? "Active" : "Ready to fund"}
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-gold">{treasuryBalance.toFixed(2)} USDC</p>
      {treasuryPubkey && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{treasuryPubkey.slice(0, 6)}…{treasuryPubkey.slice(-4)}</span>
          {treasuryExplorer && (
            <a href={treasuryExplorer} target="_blank" rel="noopener noreferrer" className="text-gold">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      {sessionConnected ? (
        <div className="mt-3 space-y-2">
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-gold"
          />
          <p className="text-center text-sm">Fund {amount} USDC</p>
          {!ready && (
            <p className="text-center text-xs text-muted-foreground">
              Approve wallet access when prompted to sign the transfer.
            </p>
          )}
          <Button
            className="w-full gap-2"
            size="sm"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void (async () => {
                try {
                  const txFns = await ensureReady();
                  const build = await apiFetch<{ transaction: string }>(`/api/agents/${encodedName}/fund/build`, {
                    method: "POST",
                    body: JSON.stringify({ amount }),
                  });
                  const sig = await sendBase64Transaction(build.transaction, txFns);
                  const confirm = await apiFetch<{ treasuryBalance: number; explorerUrl?: string }>(
                    `/api/agents/${encodedName}/fund/confirm`,
                    {
                      method: "POST",
                      body: JSON.stringify({ txSignature: sig, amount }),
                    },
                  );
                  toast.success(`Funded agent treasury (${confirm.treasuryBalance.toFixed(2)} USDC on-chain)`);
                  const session = await refreshWalletSession();
                  if (session) updateWalletBalance(session.balance);
                  void qc.invalidateQueries({ queryKey: ["agents"] });
                  void qc.invalidateQueries({ queryKey: ["agents-mine"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Fund failed");
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            <Wallet className="h-4 w-4" />
            {loading ? "Funding…" : `Fund ${agentName}`}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Connect wallet to fund this agent treasury.</p>
      )}
    </div>
  );
}
