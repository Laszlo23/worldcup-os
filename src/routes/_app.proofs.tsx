import { createFileRoute } from "@tanstack/react-router";
import { useProofs } from "@/lib/queries/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/proofs")({
  head: () => ({ meta: [{ title: "Proof Explorer — World Cup OS" }] }),
  component: ProofExplorer,
});

function ProofExplorer() {
  const matches = useAppStore((s) => s.matches);
  const { data: proofs = [] } = useProofs();
  const getMatch = (id: string) => matches.find((m) => m.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Proof Explorer</h1>
          <p className="text-muted-foreground mt-1">Every settled match, cryptographically verifiable.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {proofs.map((p) => {
          const m = getMatch(p.matchId);
          return (
            <Card key={p.matchId} className="glass p-6">
              <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><CheckCircle2 className="h-3 w-3" /> VERIFIED</Badge>
                  <div className="text-lg font-display font-semibold">
                    {m ? `${m.home.flag} ${m.home.name} ${p.finalScore[0]} – ${p.finalScore[1]} ${m.away.name} ${m.away.flag}` : `Match ${p.matchId}`}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Validated {new Date(p.validatedAt).toLocaleString()}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <ProofField label="Match ID" value={p.matchId} />
                <ProofField label="Final score" value={`${p.finalScore[0]} – ${p.finalScore[1]}`} />
                <ProofField label="Merkle root" value={p.merkleRoot} />
                <ProofField label="Proof hash" value={p.proofHash} />
                <ProofField label="TxLINE signature" value={p.signature} />
                <ProofField label="Solana tx" value={p.solanaTx} link />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="glass gap-1"
                  onClick={() => window.open(`https://explorer.solana.com/tx/${p.solanaTx}?cluster=devnet`, "_blank")}
                  disabled={!p.solanaTx}
                >
                  Open on Solana Explorer <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ProofField({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div className="glass rounded-lg p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs font-mono truncate flex-1">{value}</code>
        <button onClick={() => { navigator.clipboard.writeText(value); toast("Copied"); }} className="text-muted-foreground hover:text-foreground shrink-0">
          <Copy className="h-3 w-3" />
        </button>
        {link && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
      </div>
    </div>
  );
}
