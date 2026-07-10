"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, Check, ExternalLink, ArrowLeft, PenLine } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/utils";
import { useWalletStore } from "@/lib/store/wallet";
import { sendBase64Transaction } from "@/lib/wallet/signing";
import { useState } from "react";
import { toast } from "sonner";

export default function ProofPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, refetch } = useQuery({ queryKey: ["prediction", id], queryFn: () => api.prediction(id) });
  const pred = data?.prediction as Record<string, unknown> | undefined;
  const wallet = useWalletStore((s) => s.wallet);
  const walletTxFns = useWalletStore((s) => s.walletTxFns);
  const [signing, setSigning] = useState(false);
  const [userSigned, setUserSigned] = useState(false);

  if (!pred) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading proof...</p>
      </AppShell>
    );
  }

  const txHash = String(pred.tx_hash || pred.txHash || "");
  const explorer = String(pred.explorer_url || pred.explorerUrl || `https://explorer.solana.com/tx/demo?cluster=devnet`);
  const hasOnChain = Boolean(txHash && !txHash.includes("demo"));

  const timeline = [
    { step: "AI Signal Generated", done: true },
    { step: "Data Verified via TxLINE", done: true },
    { step: "User Signed Certificate", done: userSigned || hasOnChain },
    { step: "Anchored on Solana", done: hasOnChain },
  ];

  return (
    <AppShell>
      <Link href="/portfolio" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <GlassCard className="purple-glow mb-4 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple/20">
          <Shield className="h-7 w-7 text-purple" />
        </div>
        <h1 className="text-lg font-bold">Prediction Certificate</h1>
        <Badge variant={hasOnChain ? "green" : "outline"} className="mt-2">
          {hasOnChain ? "Verified On-Chain" : "Pending Anchor"}
        </Badge>
      </GlassCard>

      {hasOnChain && (
        <GlassCard className="mb-4">
          <p className="mb-2 text-xs text-muted-foreground">Transaction Hash</p>
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 font-mono text-sm">
            <span>{truncateHash(txHash, 8, 6)}</span>
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="text-gold">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </GlassCard>
      )}

      <GlassCard className="mb-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {[
              ["Market", String(pred.market_label || pred.marketLabel || "")],
              ["Prediction", String(pred.prediction || pred.headline || "YES")],
              ["Confidence", `${pred.confidence || pred.signal_confidence || pred.signalConfidence}%`],
              ["Odds", String(pred.odds || "1.68")],
              ["Virtual Stake", `${pred.virtual_stake || pred.virtualStake || 100} USDC`],
              ["Result", String(pred.result || "PENDING").toUpperCase()],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-2 text-muted-foreground">{k}</td>
                <td className="py-2 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {wallet.connected && !hasOnChain && (
        <GlassCard className="mb-4">
          <p className="mb-3 text-sm text-muted-foreground">Sign a memo transaction to anchor this prediction on Solana devnet.</p>
          <Button
            className="w-full gap-2"
            disabled={signing || !walletTxFns}
            onClick={() => {
              if (!walletTxFns) {
                toast.error("Reconnect wallet to sign");
                return;
              }
              setSigning(true);
              void (async () => {
                try {
                  const build = await api.certificateBuild(id);
                  const sig = await sendBase64Transaction(build.transaction, walletTxFns);
                  await api.certificateSubmit(id, sig);
                  setUserSigned(true);
                  toast.success("Certificate anchored on-chain");
                  void refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Sign failed");
                } finally {
                  setSigning(false);
                }
              })();
            }}
          >
            <PenLine className="h-4 w-4" />
            {signing ? "Signing…" : "Sign & Anchor on Solana"}
          </Button>
        </GlassCard>
      )}

      <GlassCard>
        <p className="mb-4 font-semibold">Transaction Timeline</p>
        <div className="space-y-4">
          {timeline.map((t, i) => (
            <div key={t.step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${t.done ? "bg-green/20" : "bg-secondary"}`}>
                  {t.done ? <Check className="h-3 w-3 text-green" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground" />}
                </div>
                {i < timeline.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
              </div>
              <p className={`text-sm ${t.done ? "" : "text-muted-foreground"}`}>{t.step}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
