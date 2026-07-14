"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useWalletStore } from "@/lib/store/wallet";
import { FundAgentPanel } from "@/components/wallet/fund-agent-panel";

type DeployedAgent = {
  name: string;
  displayName: string;
  treasuryPubkey?: string;
  treasuryExplorer?: string;
  active?: boolean;
  minTreasury?: number;
};

type DeployAgentPanelProps = {
  onDeployed?: (agentName: string) => void;
};

export function DeployAgentPanel({ onDeployed }: DeployAgentPanelProps) {
  const wallet = useWalletStore((s) => s.wallet);
  const [template, setTemplate] = useState<"alpha" | "beta">("alpha");
  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const { data: mine } = useQuery({
    queryKey: ["agents-mine"],
    queryFn: () =>
      apiFetch<{
        agents: {
          name: string;
          displayName: string;
          active: boolean;
          treasuryBalance?: number;
          treasuryPubkey?: string;
          treasuryExplorer?: string;
          minTreasury?: number;
        }[];
      }>("/api/agents/mine"),
    enabled: wallet.connected,
  });

  const existing = mine?.agents.find((a) => a.name.endsWith(`-${template}`));

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-gold" />
        <p className="text-sm font-semibold">Deploy Your Agent</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Deploy is free — one click, no on-chain transaction. Fund the treasury with devnet USDC to activate trading.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["alpha", "beta"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            className={`rounded-lg border p-3 text-left text-sm transition ${
              template === t ? "border-gold bg-gold/10" : "border-border bg-background/50"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-medium capitalize">
              {t === "alpha" ? <Shield className="h-3.5 w-3.5 text-gold" /> : <Zap className="h-3.5 w-3.5 text-purple" />}
              {t}
            </div>
            <p className="text-[10px] text-muted-foreground">{t === "alpha" ? "Home momentum" : "Contrarian away"}</p>
          </button>
        ))}
      </div>

      {!wallet.connected ? (
        <p className="text-xs text-muted-foreground">Connect wallet to deploy your agent.</p>
      ) : existing && !deployedAgent ? (
        <FundAgentPanel
          agentName={existing.name}
          treasuryPubkey={existing.treasuryPubkey}
          treasuryBalance={existing.treasuryBalance ?? 0}
          minTreasury={existing.minTreasury}
          treasuryExplorer={existing.treasuryExplorer}
          active={existing.active}
        />
      ) : (
        <>
          <Button
            className="w-full"
            size="sm"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void (async () => {
                try {
                  const res = await apiFetch<{
                    agent: {
                      name: string;
                      displayName: string;
                      treasuryPubkey?: string;
                      treasuryExplorer?: string;
                    };
                  }>("/api/agents/deploy", {
                    method: "POST",
                    body: JSON.stringify({ template, displayName: `My ${template}` }),
                  });
                  setDeployedAgent({
                    name: res.agent.name,
                    displayName: res.agent.displayName,
                    treasuryPubkey: res.agent.treasuryPubkey,
                    treasuryExplorer: res.agent.treasuryExplorer,
                    active: false,
                    minTreasury: 10,
                  });
                  toast.success(`Deployed ${res.agent.displayName} — fund treasury to activate`);
                  void qc.invalidateQueries({ queryKey: ["agents"] });
                  void qc.invalidateQueries({ queryKey: ["agents-mine"] });
                  onDeployed?.(res.agent.name);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Deploy failed");
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            Deploy {template} agent
          </Button>
          {deployedAgent && (
            <FundAgentPanel
              agentName={deployedAgent.name}
              treasuryPubkey={deployedAgent.treasuryPubkey}
              treasuryBalance={0}
              minTreasury={deployedAgent.minTreasury}
              treasuryExplorer={deployedAgent.treasuryExplorer}
              active={false}
            />
          )}
        </>
      )}
    </div>
  );
}
