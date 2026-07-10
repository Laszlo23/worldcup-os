import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useProfile } from "@/lib/queries/hooks";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { DataSourceBadge } from "@/components/data-source-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { pageTitle } from "@/lib/seo";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, User, Wallet } from "lucide-react";
import type { UserProfile } from "@/lib/types/profile";

const FarcasterConnect = lazy(() =>
  import("@/components/farcaster-connect").then((m) => ({ default: m.FarcasterConnect })),
);

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: pageTitle("Profile") }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const wallet = useAppStore((s) => s.wallet);
  const { data, isLoading, refetch } = useProfile();
  const qc = useQueryClient();

  if (!wallet.connected) {
    return (
      <div className="glass rounded-2xl p-16 text-center max-w-md mx-auto">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-display font-semibold mb-2">Your profile</h2>
        <p className="text-sm text-muted-foreground mb-6">Connect your Solana wallet to view and edit your World Cup OS profile.</p>
        <ConnectWalletButton />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading profile…
      </div>
    );
  }

  return (
    <ProfileEditor
      profile={data.profile}
      portfolio={data.portfolio}
      onSaved={() => {
        void refetch();
        void qc.invalidateQueries({ queryKey: ["profile"] });
      }}
    />
  );
}

function ProfileEditor({
  profile,
  portfolio,
  onSaved,
}: {
  profile: UserProfile;
  portfolio: {
    balance: number;
    inEscrow: number;
    pendingRewards: number;
    totalEarnings: number;
    openCount: number;
    wonCount: number;
  };
  onSaved: () => void;
}) {
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [xHandle, setXHandle] = useState(profile.xHandle ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          nickname: nickname.trim() || undefined,
          bio: bio.trim() || null,
          xHandle: xHandle.trim().replace(/^@/, "") || null,
        }),
      });
      toast.success("Profile saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const copyWallet = () => {
    void navigator.clipboard.writeText(profile.walletPubkey);
    toast.success("Address copied");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-2">Identity</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Wallet identity, social links, and on-chain activity.</p>
      </div>

      <Card className="glass p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={profile.avatar ?? `https://api.dicebear.com/9.x/shapes/svg?seed=${profile.walletPubkey}`}
            alt=""
            className="h-20 w-20 rounded-2xl border border-border/60 bg-muted object-cover"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-semibold text-xl truncate">{profile.nickname ?? "Trader"}</h2>
              {profile.farcasterUsername && (
                <Badge className="bg-[#8a63d2]/20 text-[#c4b5fd] border-[#8a63d2]/40 font-mono text-[10px]">
                  @{profile.farcasterUsername} · verified
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={copyWallet}
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              {profile.walletPubkey.slice(0, 8)}…{profile.walletPubkey.slice(-6)}
              <Copy className="h-3 w-3" />
            </button>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(profile.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="glass p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold">On-chain summary</h3>
          <DataSourceBadge source="on-chain" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="USDC balance" value={portfolio.balance.toFixed(2)} />
          <Stat label="In escrow" value={portfolio.inEscrow.toFixed(2)} />
          <Stat label="Pending rewards" value={portfolio.pendingRewards.toFixed(2)} />
          <Stat label="Total earnings" value={(portfolio.totalEarnings >= 0 ? "+" : "") + portfolio.totalEarnings.toFixed(2)} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="glass">
            <Link to="/portfolio">
              <Wallet className="h-3.5 w-3.5 mr-1.5" /> Portfolio ({portfolio.openCount} open)
            </Link>
          </Button>
          {portfolio.wonCount > 0 && (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground border-0">
              <Link to="/portfolio">
                Claim {portfolio.wonCount} reward{portfolio.wonCount > 1 ? "s" : ""}
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">Edit profile</h3>
        <div className="space-y-3">
          <label className="text-xs font-mono uppercase text-muted-foreground">Display name</label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="glass" maxLength={64} />
        </div>
        <div className="space-y-3">
          <label className="text-xs font-mono uppercase text-muted-foreground">Bio</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="glass min-h-[80px]" maxLength={280} />
        </div>
        <Button onClick={() => void save()} disabled={saving} className="bg-gradient-primary text-primary-foreground border-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
        </Button>
      </Card>

      <Card className="glass p-6 space-y-4">
        <h3 className="font-display font-semibold">Social connections</h3>

        <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-black/10">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">Farcaster</span>
            {profile.farcasterFid ? (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Verified</Badge>
            ) : null}
          </div>
          {profile.farcasterFid ? (
            <div className="flex items-center justify-between gap-2">
              <a
                href={`https://warpcast.com/${profile.farcasterUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                @{profile.farcasterUsername} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <ClientOnly fallback={<Button disabled className="w-full glass">Connect Farcaster</Button>}>
              <Suspense
                fallback={
                  <Button disabled className="w-full glass">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
                  </Button>
                }
              >
                <FarcasterConnect onLinked={onSaved} />
              </Suspense>
            </ClientOnly>
          )}
        </div>

        <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-black/10">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">X (Twitter)</span>
            <Badge variant="outline" className="text-[10px] font-mono">Unverified link</Badge>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground self-center">@</span>
            <Input
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value.replace(/^@/, ""))}
              placeholder="handle"
              className="glass"
              maxLength={15}
            />
          </div>
          {profile.xHandle && (
            <a
              href={`https://x.com/${profile.xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              x.com/{profile.xHandle} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {["Lens", "Dialect"].map((name) => (
            <Badge key={name} variant="outline" className="text-[10px] font-mono text-muted-foreground">
              {name} · coming soon
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-display font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}
