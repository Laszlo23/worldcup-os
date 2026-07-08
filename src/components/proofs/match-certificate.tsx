import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react";
import type { TxLineProof } from "@/lib/mock/types";
import type { Match } from "@/lib/mock/types";
import { toast } from "sonner";

interface MatchCertificateProps {
  proof: TxLineProof;
  match?: Match;
}

export function MatchCertificate({ proof, match }: MatchCertificateProps) {
  const title = match
    ? `${match.home.flag} ${match.home.name} vs ${match.away.name} ${match.away.flag}`
    : `Match ${proof.matchId}`;
  const secondsAfterWhistle =
    match && proof.validatedAt
      ? Math.max(0, Math.round((proof.validatedAt - (match.kickoff + 90 * 60_000)) / 1000))
      : null;
  const settlementStatus = proof.solanaTx ? "CONFIRMED" : "PENDING";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 glow-primary"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

      <div className="relative flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="h-12 w-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <ShieldCheck className="h-6 w-6 text-primary" />
            </motion.div>
          </motion.div>
          <div>
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-2">VERIFIED MATCH CERTIFICATE</Badge>
            <h2 className="text-xl md:text-2xl font-display font-bold">{title}</h2>
            <p className="text-3xl font-mono font-bold mt-1 gradient-text">
              {proof.finalScore[0]} – {proof.finalScore[1]}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Validated</div>
          <div className="font-mono">{new Date(proof.validatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 relative">
        <CertField label="Oracle signature" value="VALID" highlight />
        <CertField label="Solana settlement" value={settlementStatus} highlight={settlementStatus === "CONFIRMED"} />
        <CertField label="Merkle root" value={proof.merkleRoot} truncate copy />
        <CertField label="Proof hash" value={proof.proofHash} truncate copy />
        <CertField label="TxLINE signature" value={proof.signature} truncate copy />
        <CertField label="Solana tx" value={proof.solanaTx || "—"} truncate copy />
      </div>

      {secondsAfterWhistle !== null && (
        <p className="mt-6 text-sm text-muted-foreground border-t border-border/50 pt-4">
          Proof generated <span className="text-primary font-semibold">{secondsAfterWhistle}s</span> after final whistle
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="glass gap-1"
          onClick={() => window.open(`https://explorer.solana.com/tx/${proof.solanaTx}?cluster=devnet`, "_blank")}
          disabled={!proof.solanaTx}
        >
          Verify on Solana Explorer <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

function CertField({
  label,
  value,
  truncate,
  copy,
  highlight,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  copy?: boolean;
  highlight?: boolean;
}) {
  const display = truncate && value.length > 24 ? value.slice(0, 12) + "…" + value.slice(-8) : value;
  return (
    <div className="glass rounded-lg p-4 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <code className={`text-sm font-mono flex-1 ${highlight ? "text-primary font-semibold" : ""} ${truncate ? "truncate" : ""}`}>
          {display}
        </code>
        {copy && value !== "—" && (
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(value); toast("Copied"); }}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
