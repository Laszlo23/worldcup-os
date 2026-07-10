"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { SignalCard } from "@/components/trader/MatchCards";

export default function SignalsPage() {
  const { data } = useQuery({ queryKey: ["signals"], queryFn: () => api.signals(30) });

  return (
    <AppShell showDisclaimer>
      <h1 className="mb-4 text-xl font-bold">AI Signals</h1>
      <p className="mb-4 text-sm text-muted-foreground">Autonomous signals generated every 60s from TxLINE data</p>
      {data?.signals.map((s) => <SignalCard key={s.id} signal={s} />)}
      {!data?.signals.length && <p className="text-sm text-muted-foreground">Waiting for signals...</p>}
    </AppShell>
  );
}
