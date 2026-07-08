import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { useMatchDetail } from "@/lib/queries/hooks";
import { buildMarketsForMatch } from "@/lib/mock/data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, MapPin, ShieldCheck, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Market, MarketOutcome } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/matches/$id")({
  head: ({ params }) => ({ meta: [{ title: `Match — World Cup OS` }, { name: "description", content: `Live prediction markets for match ${params.id}` }] }),
  component: MatchDetail,
  notFoundComponent: () => <div className="glass p-10 rounded-2xl text-center">Match not found.</div>,
});

function MatchDetail() {
  const { id } = Route.useParams();
  const { data } = useMatchDetail(id);
  const storeMatch = useAppStore((s) => s.matches.find((m) => m.id === id));
  const match = storeMatch ?? data?.match;
  if (!match) throw notFound();
  const markets = data?.markets?.length ? data.markets : buildMarketsForMatch(match);

  return (
    <div className="space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to matches
      </Link>

      {/* Header card */}
      <Card className="glass p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{ background: `radial-gradient(circle at 30% 20%, ${match.home.color}30, transparent 50%), radial-gradient(circle at 70% 80%, ${match.away.color}30, transparent 50%)` }} />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {match.status === "live" && (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-live-dot" /> LIVE · {match.minute}'
              </Badge>
            )}
            {match.status === "halftime" && <Badge className="bg-warning/20 text-warning border-warning/30">HALF-TIME</Badge>}
            {(match.status === "finished" || match.status === "settled") && (
              <Badge className="bg-primary/20 text-primary border-primary/30">{match.status.toUpperCase()}</Badge>
            )}
            <Badge variant="outline">{match.stage}</Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {match.stadium}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl md:text-7xl">{match.home.flag}</span>
            <div className="text-lg font-display font-semibold text-center">{match.home.name}</div>
          </div>
          <div className="flex items-center gap-3 text-6xl md:text-7xl font-display font-bold tabular-nums">
            <motion.span key={match.scoreHome} initial={{ scale: 1.4, color: "oklch(0.72 0.19 155)" }} animate={{ scale: 1, color: "currentColor" }} transition={{ duration: 0.5 }}>{match.scoreHome}</motion.span>
            <span className="text-muted-foreground text-4xl">–</span>
            <motion.span key={match.scoreAway} initial={{ scale: 1.4, color: "oklch(0.72 0.19 155)" }} animate={{ scale: 1, color: "currentColor" }} transition={{ duration: 0.5 }}>{match.scoreAway}</motion.span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl md:text-7xl">{match.away.flag}</span>
            <div className="text-lg font-display font-semibold text-center">{match.away.name}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <OddsPill label={match.home.code} value={match.odds.home} />
          <OddsPill label="Draw" value={match.odds.draw} />
          <OddsPill label={match.away.code} value={match.odds.away} />
        </div>
      </Card>

      {match.status === "settled" && <SettlementCard matchId={match.id} proof={data?.proof ?? null} />}

      <Tabs defaultValue="markets">
        <TabsList className="glass">
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="odds">Odds movement</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="grid md:grid-cols-2 gap-4 mt-6">
          {markets.map((m) => <MarketCard key={m.id} match={match} market={m} />)}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card className="glass p-6">
            <h3 className="font-display font-semibold mb-4">Live timeline</h3>
            <div className="space-y-3">
              {match.events.length === 0 && <div className="text-sm text-muted-foreground">No events yet.</div>}
              {match.events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="w-10 font-mono text-sm text-muted-foreground">{e.minute}'</div>
                  <div className="text-lg">
                    {e.type === "goal" && "⚽"}
                    {e.type === "yellow" && "🟨"}
                    {e.type === "red" && "🟥"}
                    {e.type === "corner" && "🚩"}
                    {e.type === "penalty" && "🎯"}
                    {e.type === "var" && "📺"}
                    {e.type === "sub" && "🔁"}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{e.type}{e.player ? ` — ${e.player}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{e.teamId === match.home.id ? match.home.name : match.away.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <Card className="glass p-6 space-y-5">
            <StatBar label="Possession" a={match.stats.possession[0]} b={match.stats.possession[1]} suffix="%" />
            <StatBar label="Shots" a={match.stats.shots[0]} b={match.stats.shots[1]} />
            <StatBar label="Shots on target" a={match.stats.shotsOnTarget[0]} b={match.stats.shotsOnTarget[1]} />
            <StatBar label="Expected goals (xG)" a={match.stats.xg[0]} b={match.stats.xg[1]} />
            <StatBar label="Corners" a={match.stats.corners[0]} b={match.stats.corners[1]} />
            <StatBar label="Fouls" a={match.stats.fouls[0]} b={match.stats.fouls[1]} />
          </Card>
        </TabsContent>

        <TabsContent value="odds" className="mt-6">
          <Card className="glass p-6">
            <h3 className="font-display font-semibold mb-4">Odds movement</h3>
            <div className="h-80">
              <ResponsiveContainer>
                <LineChart data={match.oddsHistory}>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} stroke="oklch(0.68 0.02 260)" fontSize={11} />
                  <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
                  <Line dataKey="home" stroke="oklch(0.72 0.19 155)" strokeWidth={2} dot={false} />
                  <Line dataKey="draw" stroke="oklch(0.82 0.17 85)" strokeWidth={2} dot={false} />
                  <Line dataKey="away" stroke="oklch(0.62 0.22 300)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OddsPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-bold tabular-nums">{value.toFixed(2)}</div>
    </div>
  );
}

function StatBar({ label, a, b, suffix = "" }: { label: string; a: number; b: number; suffix?: string }) {
  const total = a + b || 1;
  const ap = (a / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-mono tabular-nums">{a}{suffix}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{b}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="bg-primary" style={{ width: `${ap}%` }} />
        <div className="bg-accent" style={{ width: `${100 - ap}%` }} />
      </div>
    </div>
  );
}

function MarketCard({ match, market }: { match: ReturnType<typeof useMatch>; market: Market }) {
  const [selected, setSelected] = useState<MarketOutcome | null>(null);
  const [amount, setAmount] = useState<number>(50);
  const place = useAppStore((s) => s.placePrediction);
  if (!match) return null;

  return (
    <Card className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold">{market.title}</h3>
        <Badge variant="outline" className="text-xs">
          ${(market.totalLiquidity / 1000).toFixed(1)}k liquidity
        </Badge>
      </div>

      <div className="space-y-2">
        {market.outcomes.map((o) => {
          const implied = ((1 / o.price) * 100).toFixed(1);
          const active = selected?.id === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              disabled={market.closed}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                active ? "border-primary bg-primary/10 glow-primary" : "border-border glass hover:border-primary/40"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{implied}% implied · {o.participants} traders</div>
                </div>
                <div className="text-xl font-display font-bold tabular-nums text-primary">{o.price.toFixed(2)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && !market.closed && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} className="glass" min={1} />
            <span className="text-sm text-muted-foreground">USDC</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Potential payout</span>
            <span className="font-mono font-semibold text-foreground">{(amount * selected.price).toFixed(2)} USDC</span>
          </div>
          <Button
            className="w-full bg-gradient-primary text-primary-foreground glow-primary border-0"
            onClick={() => {
              place({
                marketId: market.id,
                matchId: match.id,
                outcomeId: selected.id,
                outcomeLabel: `${market.title}: ${selected.label}`,
                amount,
                price: selected.price,
              });
              setSelected(null);
            }}
          >
            Lock in escrow · {amount} USDC
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Funds are locked in a Solana escrow. Settlement is automatic once TxLINE verifies the final result.
          </p>
        </div>
      )}
      {market.closed && <div className="mt-4 text-xs text-muted-foreground">Market closed. Awaiting settlement.</div>}
    </Card>
  );
}

function useMatch() {
  const { id } = Route.useParams();
  return useAppStore((s) => s.matches.find((m) => m.id === id));
}

function SettlementCard({
  matchId,
  proof,
}: {
  matchId: string;
  proof: {
    merkleRoot: string;
    proofHash: string;
    signature: string;
    solanaTx: string;
    validatedAt: number;
    status?: string;
  } | null;
}) {
  if (!proof) {
    return (
      <Card className="glass p-6 border-primary/30">
        <p className="text-sm text-muted-foreground">Settlement proof pending for match {matchId}.</p>
      </Card>
    );
  }
  return (
    <Card className="glass p-6 border-primary/30 glow-primary">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-lg">Verified by TxLINE</h3>
            <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
              <CheckCircle2 className="h-3 w-3" /> SETTLED
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Final result signed by TxLINE and anchored on Solana. Escrow released to winners automatically.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <ProofRow label="Merkle root" value={proof.merkleRoot} />
            <ProofRow label="Proof hash" value={proof.proofHash} />
            <ProofRow label="Signature" value={proof.signature} />
            <ProofRow
              label="Solana tx"
              value={proof.solanaTx}
              link={proof.solanaTx ? `https://explorer.solana.com/tx/${proof.solanaTx}` : undefined}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProofRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="glass rounded-lg p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs font-mono truncate flex-1">{value}</code>
        <button onClick={() => { navigator.clipboard.writeText(value); toast("Copied"); }} className="text-muted-foreground hover:text-foreground shrink-0">
          <Copy className="h-3 w-3" />
        </button>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// suppress unused Progress import warning by referencing it (kept for future)
void Progress;
