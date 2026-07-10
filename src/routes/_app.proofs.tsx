import { createFileRoute } from "@tanstack/react-router";
import { useMatches, useProofs, queryKeys } from "@/lib/queries/hooks";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MatchCertificate } from "@/components/proofs/match-certificate";
import { EscrowProofCard } from "@/components/proofs/escrow-proof-card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { apiFetch } from "@/lib/api/client";
import type { EscrowProof, TxLineProof } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/proofs")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.proofs,
      queryFn: async () => {
        const res = await apiFetch<{ proofs: TxLineProof[]; escrowProofs: EscrowProof[] }>("/api/proofs");
        return res;
      },
    });
  },
  head: () => ({ meta: [{ title: "Proof Explorer — World Cup OS" }] }),
  component: ProofExplorer,
});

function ProofExplorer() {
  const storeMatches = useAppStore((s) => s.matches);
  const { data: apiMatches } = useMatches();
  const matches = apiMatches?.length ? apiMatches : storeMatches;
  const { data, isPending, isError } = useProofs();
  const proofs = data?.proofs ?? [];
  const escrowProofs = data?.escrowProofs ?? [];
  const getMatch = (id: string) => matches.find((m) => m.id === id);

  const verifiedCerts = proofs.filter((p) => p.status === "verified");
  const pendingCerts = proofs.filter((p) => p.status !== "verified");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Proof Explorer</h1>
          <p className="text-muted-foreground mt-1">
            TxLINE settlement certificates and on-chain escrow locks — public, no wallet required.
          </p>
        </div>
      </div>

      {isPending && (
        <div className="glass rounded-xl p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          Loading on-chain proofs from the indexer…
        </div>
      )}

      {isError && (
        <div className="glass rounded-xl p-6 border border-destructive/30 text-sm text-muted-foreground">
          Could not load proofs right now. Refresh the page or try again in a moment.
        </div>
      )}

      {!isPending && !isError && (
      <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          <h2 className="text-xl font-display font-semibold">On-chain escrow proofs</h2>
          <DataSourceBadge source="on-chain" />
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Confirmed Solana transactions that locked USDC in escrow. Payouts are sent from the settlement pool when you claim a win.
        </p>
        <div className="grid gap-4">
          {escrowProofs.map((p) => (
            <EscrowProofCard key={p.id} proof={p} match={getMatch(p.matchId)} />
          ))}
          {escrowProofs.length === 0 && (
            <p className="text-muted-foreground text-center py-10 glass rounded-xl">
              No on-chain escrow locks indexed yet. When someone places a prediction, the Solana tx and escrow PDA appear here for everyone.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-display font-semibold">TxLINE match certificates</h2>
          <DataSourceBadge source="txline" />
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Issued only after TxLINE reports the fixture finished (final whistle). Merkle roots come from stat-validation — not from replay simulation.
        </p>
        <div className="grid gap-6">
          {verifiedCerts.map((p) => (
            <MatchCertificate key={`${p.matchId}-verified`} proof={p} match={getMatch(p.matchId)} />
          ))}
          {pendingCerts.map((p) => (
            <MatchCertificate key={`${p.matchId}-pending`} proof={p} match={getMatch(p.matchId)} />
          ))}
          {proofs.length === 0 && (
            <p className="text-muted-foreground text-center py-10 glass rounded-xl">
              No TxLINE certificates yet — certificates appear after match settlement with oracle validation.
            </p>
          )}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
