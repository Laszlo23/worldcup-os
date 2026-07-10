"use client";

import { useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useWalletStore } from "@/lib/store/wallet";
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
  const wallet = useWalletStore((s) => s.wallet);
  const walletTxFns = useWalletStore((s) => s.walletTxFns);
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const inactive = !active || treasuryBalance < minTreasury;

  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Treasury</p>
        {inactive ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Fund to activate
          </span>
        ) : (
          <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-medium text-green">Active</span>
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
      {wallet.connected && (
        <div className="mt-3 space-y-2">
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-center text-sm">Fund {amount} USDC</p>
          <Button
            className="w-full gap-2"
            size="sm"
            disabled={loading || !walletTxFns}
            onClick={() => {
              if (!walletTxFns) {
                toast.error("Reconnect wallet to sign transactions");
                return;
              }
              setLoading(true);
              void (async () => {
                try {
                  const build = await apiFetch<{ transaction: string }>(`/api/agents/${agentName}/fund/build`, {
                    method: "POST",
                    body: JSON.stringify({ amount }),
                  });
                  const sig = await sendBase64Transaction(build.transaction, walletTxFns);
                  await apiFetch(`/api/agents/${agentName}/fund/confirm`, {
                    method: "POST",
                    body: JSON.stringify({ txSignature: sig }),
                  });
                  toast.success(`Funded Agent ${agentName}`);
                  void qc.invalidateQueries({ queryKey: ["agents"] });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Fund failed");
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            <Wallet className="h-4 w-4" />
            Fund Agent {agentName}
          </Button>
        </div>
      )}
    </div>
  );
}
