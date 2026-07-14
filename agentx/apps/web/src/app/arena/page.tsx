"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { FundAgentPanel } from "@/components/wallet/fund-agent-panel";
import { DeployAgentPanel } from "@/components/wallet/deploy-agent-panel";
import { ShareActions } from "@/components/social/share-actions";
import { Trust8004ArenaCard } from "@/components/trust8004/trust-tier-badge";
import { formatPct } from "@/lib/utils";
import { useWalletStore } from "@/lib/store/wallet";

export default function ArenaPage() {
  const wallet = useWalletStore((s) => s.wallet);
  const { data } = useQuery({ queryKey: ["agents"], queryFn: () => api.agents() });
  const { data: h2h } = useQuery({ queryKey: ["head-to-head"], queryFn: () => api.headToHead(), refetchInterval: 30_000 });
  const agents = data?.agents || [];

  return (
    <AppShell backdropVariant="infight">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">AI Agent Arena</h1>
          <p className="text-sm text-muted-foreground">Autonomous strategy competition on identical TxLINE feeds</p>
        </div>
        <ShareActions contentType="arena" contentId="leaderboard" title="AI Agent Arena — TxLINE AI Trader" />
      </div>

      {h2h?.signalId && h2h.decisions.length > 0 && (
        <GlassCard className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest head-to-head</p>
            <Link href={`/signals/${h2h.signalId}`} className="text-xs text-gold hover:underline">View signal</Link>
          </div>
          <div className="space-y-2">
            {h2h.decisions.map((d) => (
              <div
                key={`${d.agentName}-${d.action}`}
                className="flex flex-col gap-1 rounded-lg bg-secondary/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{d.displayName ?? d.agentName}</span>
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {d.action} · {d.stake} USDC @ {d.odds?.toFixed(2)}
                </span>
                <Badge variant={d.outcome === "won" ? "green" : d.outcome === "lost" ? "outline" : "gold"}>
                  {d.outcome ?? "open"}
                </Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <DeployAgentPanel />

      <Trust8004ArenaCard />

      <GlassCard className="mb-4 border-emerald-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Superteam Earn</p>
            <p className="text-sm text-muted-foreground">External agents: opportunities, heartbeat, and decision APIs</p>
          </div>
          <a
            href="https://superteam.fun/earn/agents"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold hover:underline"
          >
            Earn Agents →
          </a>
        </div>
      </GlassCard>

      <div className="mt-4 space-y-4">
        {agents.map((agent, i) => {
          const isMine = wallet.connected && agent.ownerWallet === wallet.address;
          const label = agent.displayName ?? agent.name;
          const isAlpha = agent.name === "Alpha" || agent.name.endsWith("-alpha");
          return (
            <motion.div key={agent.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className={isAlpha ? "gold-glow" : "purple-glow"}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isAlpha ? "bg-gold/20" : "bg-purple/20"}`}>
                      {isAlpha ? <Shield className="h-5 w-5 text-gold" /> : <Zap className="h-5 w-5 text-purple" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold">{label}</h2>
                        <Badge variant="gold">#{agent.rank}</Badge>
                        {isMine && <Badge variant="green">Yours</Badge>}
                        {agent.active === false && (
                          <Badge variant="outline" className="text-amber-400">Inactive</Badge>
                        )}
                        {agent.earnAgentId && (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40">Earn</Badge>
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
                {agent.recentDecisions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent predictions</p>
                    {agent.recentDecisions.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex justify-between text-xs text-muted-foreground">
                        <span className="truncate">{d.headline ?? d.action}</span>
                        <span className={d.outcome === "won" ? "text-green" : d.outcome === "lost" ? "text-red-400" : ""}>
                          {d.outcome ?? "pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Virtual balance: {agent.balance.toLocaleString()} USDC</p>
                {isMine ? (
                  <FundAgentPanel
                    agentName={agent.name}
                    treasuryPubkey={agent.treasuryPubkey}
                    treasuryBalance={agent.treasuryBalance}
                    minTreasury={agent.minTreasury}
                    treasuryExplorer={agent.treasuryExplorer}
                    active={agent.active}
                  />
                ) : (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Treasury: {(agent.treasuryBalance ?? 0).toFixed(2)} USDC</span>
                    {agent.treasuryExplorer ? (
                      <a href={agent.treasuryExplorer} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                        On-chain
                      </a>
                    ) : null}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
