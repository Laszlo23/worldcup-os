"use client";

import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WMOS_URL = process.env.NEXT_PUBLIC_WMOS_URL ?? "https://wmos.buildingcultureid.space";
const DEFAULT_ASSET = process.env.NEXT_PUBLIC_AGENT_8004_ASSET ?? "";

type Reputation = {
  configured: boolean;
  trustTierLabel: string;
  averageScore: number | null;
  totalFeedbacks: number;
  alive: boolean | null;
};

async function fetchReputation(asset: string): Promise<Reputation> {
  const res = await fetch(`${WMOS_URL}/api/trust8004/reputation?asset=${encodeURIComponent(asset)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`trust8004 ${res.status}`);
  const body = (await res.json()) as { reputation: Reputation };
  return body.reputation;
}

const TIER_STYLES: Record<string, string> = {
  Platinum: "border-cyan-400/50 text-cyan-300 bg-cyan-500/10",
  Gold: "border-amber-400/50 text-amber-300 bg-amber-500/10",
  Silver: "border-slate-300/50 text-slate-200 bg-slate-500/10",
  Bronze: "border-orange-400/50 text-orange-300 bg-orange-500/10",
  Unrated: "border-muted-foreground/30 text-muted-foreground",
};

export function Trust8004Badge({ asset = DEFAULT_ASSET }: { asset?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trust8004", asset],
    queryFn: () => fetchReputation(asset),
    enabled: Boolean(asset),
    staleTime: 60_000,
    retry: 1,
  });

  if (!asset) return null;
  if (isLoading) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <Shield className="h-3 w-3" /> 8004…
      </Badge>
    );
  }
  if (isError || !data?.configured) return null;

  const tier = data.trustTierLabel ?? "Unrated";
  const style = TIER_STYLES[tier] ?? TIER_STYLES.Unrated;

  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${style}`} title={`MPL Core · ERC-8004 · ${data.totalFeedbacks} feedback(s)`}>
      <Shield className="h-3 w-3" />
      ERC-8004 {tier}
      {data.averageScore != null ? ` · ${data.averageScore.toFixed(0)}` : ""}
    </Badge>
  );
}

export function Trust8004ArenaCard() {
  const asset = DEFAULT_ASSET;
  const { data } = useQuery({
    queryKey: ["trust8004-card", asset],
    queryFn: () => fetchReputation(asset),
    enabled: Boolean(asset),
    staleTime: 60_000,
  });

  if (!asset || !data?.configured) return null;

  return (
    <div className="mb-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-400">MPL Core · ERC-8004</p>
          <p className="text-sm text-muted-foreground">
            Platform agent identity on Solana — {data.trustTierLabel} tier
            {data.averageScore != null ? ` · ${data.averageScore.toFixed(1)} avg score` : ""}
          </p>
        </div>
        <a
          href={`https://explorer.solana.com/address/${asset}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-300 hover:underline font-mono truncate max-w-[200px]"
        >
          {asset.slice(0, 8)}…{asset.slice(-6)}
        </a>
      </div>
    </div>
  );
}
