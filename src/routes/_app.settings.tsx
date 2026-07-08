import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — World Cup OS" }] }),
  component: Settings,
});

function Settings() {
  const wallet = useAppStore((s) => s.wallet);
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      apiFetch<{
        status: string;
        txline: { status: string; serviceLevel: number };
        database: boolean;
        fixtures: { total: number; lastSyncAt: string | null };
        solana: { programId: string | null; network: string };
      }>("/api/health"),
  });

  const { data: authReady } = useQuery({
    queryKey: ["auth-nonce-health"],
    queryFn: async () => {
      const res = await fetch("/api/auth/nonce?pubkey=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
      return res.ok;
    },
    staleTime: 60_000,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, wallet, and notifications.</p>
      </div>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">System status</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={authReady ? "border-primary/40 text-primary gap-1" : "border-destructive/40 text-destructive gap-1"}>
            {authReady ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {authReady ? "API reachable" : "API unreachable"}
          </Badge>
          <Badge variant="outline" className={authReady ? "border-primary/40 text-primary gap-1" : "border-destructive/40 text-destructive gap-1"}>
            {authReady ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {authReady ? "Auth ready" : "Auth offline"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Run <code className="font-mono">npm run dev</code> (not <code className="font-mono">dev:vite</code> alone) so <code className="font-mono">/api/auth/nonce</code> proxies to Nitro.
        </p>
      </Card>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">Wallet</h3>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Connected address</div>
          <div className="font-mono text-xs break-all glass rounded-lg p-3">{wallet.address || "Not connected"}</div>
        </div>
        <ConnectWalletButton />
      </Card>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">Notifications</h3>
        {[
          "Goal scored",
          "Odds changed significantly",
          "Market closed",
          "Prediction won",
          "Settlement completed",
          "Reward available to claim",
        ].map((label) => (
          <div key={label} className="flex items-center justify-between">
            <Label>{label}</Label>
            <Switch defaultChecked />
          </div>
        ))}
      </Card>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">TxLINE endpoint</h3>
        <div className="space-y-2">
          <Label>SSE feed URL</Label>
          <Input readOnly value="https://txline.txodds.com/api/scores/stream" className="glass font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label>Validation endpoint</Label>
          <Input readOnly value="https://txline.txodds.com/api/scores/stat-validation?fixtureId=&seq=&statKey=1" className="glass font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label>Solana program ID</Label>
          <Input readOnly value={import.meta.env.VITE_WORLDCUP_PROGRAM_ID || "Wcup111111111111111111111111111111111111111"} className="glass font-mono text-xs" />
        </div>
        <div className="text-xs text-muted-foreground">
          TxLINE status: <span className="text-primary">{health?.txline?.status ?? "checking…"}</span>
          {" · "}Database: <span className="text-primary">{health?.database ? "connected" : "fallback mode"}</span>
          {" · "}SL{health?.txline?.serviceLevel ?? 12}
          {" · "}Fixtures: <span className="text-primary">{health?.fixtures?.total ?? 0}</span>
        </div>
      </Card>
    </div>
  );
}
