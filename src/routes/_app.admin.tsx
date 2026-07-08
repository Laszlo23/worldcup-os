import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { useAdminDashboard } from "@/lib/queries/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { Activity, Users, Trophy, ShieldCheck, Database, Server } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — World Cup OS" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const wallet = useAppStore((s) => s.wallet);
  const { data, isError } = useAdminDashboard();

  if (!wallet.connected) {
    return (
      <div className="glass rounded-2xl p-16 text-center max-w-md mx-auto">
        <h2 className="text-xl font-display font-semibold mb-2">Admin access</h2>
        <p className="text-sm text-muted-foreground">Connect an authorized wallet to view the admin dashboard.</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass rounded-2xl p-16 text-center max-w-md mx-auto">
        <h2 className="text-xl font-display font-semibold mb-2">Access denied</h2>
        <p className="text-sm text-muted-foreground">This wallet is not on the admin allowlist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Admin dashboard</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{wallet.address}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Users" value={String(data.users)} />
        <StatCard icon={Trophy} label="Matches" value={String(data.matches)} />
        <StatCard icon={Activity} label="Markets" value={String(data.markets)} />
        <StatCard icon={ShieldCheck} label="Settlements" value={String(data.settlements)} />
        <StatCard icon={Database} label="Proofs" value={String(data.proofs)} />
        <StatCard icon={Server} label="Transactions" value={String(data.transactions)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">API status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">TxLINE</span>
              <Badge className={data.txlineStatus === "healthy" ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"}>
                {data.txlineStatus}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">Worker status</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(data.workerStatus).length === 0 && (
              <div className="text-muted-foreground">No worker runs recorded yet.</div>
            )}
            {Object.entries(data.workerStatus).map(([name, status]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-mono">{status.status} · {status.lastRun ? new Date(status.lastRun).toLocaleString() : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass overflow-hidden">
        <div className="px-6 py-3 border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          Recent worker jobs
        </div>
        {data.recentJobs.map((job) => (
          <div key={job.id} className="grid grid-cols-[1fr_120px_120px] gap-4 px-6 py-3 border-b border-border last:border-0 text-sm">
            <div className="font-mono">{job.type}</div>
            <div>{job.status}</div>
            <div className="text-muted-foreground truncate">{job.lastError ?? new Date(job.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
