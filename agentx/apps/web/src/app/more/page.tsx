"use client";

import Link from "next/link";
import { ChevronRight, Swords, MessageSquare, Shield, Play } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { api } from "@/lib/api";

const LINKS = [
  { href: "/arena", icon: Swords, label: "Agent Arena", desc: "Alpha vs Beta competition" },
  { href: "/chat", icon: MessageSquare, label: "AI Analyst", desc: "Ask about signals & data" },
  { href: "/portfolio", icon: Shield, label: "On-Chain Proofs", desc: "View prediction certificates" },
];

export default function MorePage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">More</h1>
      <div className="space-y-3">
        {LINKS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <GlassCard className="mb-3 flex items-center gap-3 hover:border-gold/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </GlassCard>
          </Link>
        ))}

        <GlassCard>
          <p className="mb-2 font-medium">Demo Mode</p>
          <p className="mb-3 text-xs text-muted-foreground">Trigger the full hackathon pipeline: goal → signal → on-chain → P&L</p>
          <button
            onClick={async () => {
              try {
                const r = await api.demoTrigger();
                toast.success(`Pipeline triggered — ${r.triggered} signals processed`);
              } catch {
                toast.error("Engine not reachable");
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl gold-gradient py-3 text-sm font-semibold text-primary-foreground"
          >
            <Play className="h-4 w-4" /> Run Demo Pipeline
          </button>
        </GlassCard>
      </div>
    </AppShell>
  );
}
