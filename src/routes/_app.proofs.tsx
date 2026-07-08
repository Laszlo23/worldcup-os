import { createFileRoute } from "@tanstack/react-router";
import { useProofs } from "@/lib/queries/hooks";
import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MatchCertificate } from "@/components/proofs/match-certificate";

export const Route = createFileRoute("/_app/proofs")({
  head: () => ({ meta: [{ title: "Verified Match Certificates — World Cup OS" }] }),
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
          <h1 className="text-3xl font-display font-bold">Verified Match Certificates</h1>
          <p className="text-muted-foreground mt-1">Cryptographically verifiable settlement proofs — Etherscan-grade trust.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {proofs.map((p) => (
          <MatchCertificate key={p.matchId} proof={p} match={getMatch(p.matchId)} />
        ))}
        {proofs.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No proofs yet — complete a replay or wait for settlement.</p>
        )}
      </div>
    </div>
  );
}
