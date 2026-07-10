import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Lock } from "lucide-react";
import type { EscrowProof, Match } from "@/lib/mock/types";
import { toast } from "sonner";
import { DataSourceBadge } from "@/components/data-source-badge";

interface EscrowProofCardProps {
  proof: EscrowProof;
  match?: Match;
}

export function EscrowProofCard({ proof, match }: EscrowProofCardProps) {
  const title = match
    ? `${match.home.flag} ${match.home.name} vs ${match.away.name} ${match.away.flag}`
    : `Match ${proof.matchId}`;

  const statusLabel =
    proof.status === "open"
      ? "ESCROW LOCKED"
      : proof.status === "won"
        ? "AWAITING CLAIM"
        : proof.status === "settled"
          ? "CLAIMED"
          : "LOST";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 md:p-8 border border-border/60"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-warning/15 border border-warning/30 flex items-center justify-center">
            <Lock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                On-chain escrow
              </Badge>
              <DataSourceBadge source="on-chain" />
            </div>
            <h2 className="text-lg md:text-xl font-display font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {proof.amount.toFixed(2)} USDC on <span className="text-foreground">{proof.outcomeLabel}</span> @{" "}
              {proof.price.toFixed(2)}x
            </p>
          </div>
        </div>
        <Badge
          className={
            proof.status === "open"
              ? "bg-warning/15 text-warning border-warning/30"
              : proof.status === "won"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border"
          }
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <Field label="Prediction id" value={proof.id} copy />
        <Field label="Placed" value={new Date(proof.placedAt).toLocaleString()} />
        <Field label="Solana tx" value={proof.txSignature} truncate copy />
        {proof.escrowPda ? <Field label="Escrow PDA" value={proof.escrowPda} truncate copy /> : null}
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="glass gap-1"
          onClick={() => window.open(proof.explorerUrl, "_blank")}
        >
          View on Solana Explorer <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  truncate,
  copy,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  copy?: boolean;
}) {
  const display = truncate && value.length > 28 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
  return (
    <div className="glass rounded-lg p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs font-mono truncate flex-1">{display}</code>
        {copy && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(value);
              toast("Copied");
            }}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
