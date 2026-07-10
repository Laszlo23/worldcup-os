"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Shield, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { FundAgentPanel } from "@/components/wallet/fund-agent-panel";
import { formatPct } from "@/lib/utils";

export default function ArenaPage() {
  const { data } = useQuery({ queryKey: ["agents"], queryFn: () => api.agents() });
  const agents = data?.agents || [];

  return (
    <AppShell backdropVariant="infight">
      <h1 className="mb-2 text-xl font-bold">AI Agent Arena</h1>
      <p className="mb-4 text-sm text-muted-foreground">Autonomous strategy competition on identical TxLINE feeds</p>

      <div className="space-y-4">
        {agents.map((agent, i) => (
          <motion.div key={agent.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className={agent.name === "Alpha" ? "gold-glow" : "purple-glow"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${agent.name === "Alpha" ? "bg-gold/20" : "bg-purple/20"}`}>
                    {agent.name === "Alpha" ? <Shield className="h-5 w-5 text-gold" /> : <Zap className="h-5 w-5 text-purple" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold">Agent {agent.name}</h2>
                      <Badge variant="gold">#{agent.rank}</Badge>
                      {agent.active === false && (
                        <Badge variant="outline" className="text-amber-400">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs capitalize text-muted-foreground">{agent.strategy} strategy</p>
                  </div>
                </div>
                <Trophy className="h-5 w-5 text-gold" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ROI</p>
                  <p className="font-bold text-green">{formatPct(agent.roi)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="font-bold">{agent.winRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="font-bold">{agent.totalTrades}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk</p>
                  <p className="font-bold">{agent.riskScore.toFixed(0)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Virtual balance: {agent.balance.toLocaleString()} USDC</p>
              <FundAgentPanel
                agentName={agent.name}
                treasuryPubkey={agent.treasuryPubkey}
                treasuryBalance={agent.treasuryBalance}
                minTreasury={agent.minTreasury}
                treasuryExplorer={agent.treasuryExplorer}
                active={agent.active}
              />
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
