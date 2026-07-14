import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { LiveFeedPanel, LiveFeedMobileTrigger } from "@/components/live-feed-panel";
import { Separator } from "@/components/ui/separator";
import { SoccerBackdrop } from "@/components/soccer-image";
import { useAppStore } from "@/lib/store";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/matches": "Matches",
  "/markets": "Predictions",
  "/profile": "Profile",
  "/leaderboard": "Leaderboard",
  "/analytics": "Analytics",
  "/proofs": "Proof Explorer",
  "/oracle": "Oracle Command Center",
  "/replay": "Replay Mode",
  "/tasks": "Community Tasks",
  "/portfolio": "Portfolio",
  "/settings": "Settings",
};

function AppLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title =
    Object.entries(titles).find(([k]) => pathname === k || (k !== "/" && pathname.startsWith(k)))?.[1] ??
    "Dashboard";

  const [mobileFeedOpen, setMobileFeedOpen] = useState(false);
  const feedUnreadCount = useAppStore((s) => s.feedUnreadCount);
  const clearFeedUnread = useAppStore((s) => s.clearFeedUnread);

  return (
    <SidebarProvider className="flex-col">
      <DevnetBanner className="w-full shrink-0" />
      <SoccerBackdrop variant="stadium" />
      <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-1">
        <AppSidebar />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 min-h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 pt-[env(safe-area-inset-top)] border-b border-border backdrop-blur-xl bg-background/60">
            <SidebarTrigger className="shrink-0" />
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
              <Link to="/" className="text-muted-foreground hover:text-foreground hidden sm:inline shrink-0">
                Home
              </Link>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="font-medium truncate">{title}</span>
            </div>
            <div className="shrink-0 max-w-[45%] sm:max-w-none">
              <ConnectWalletButton size="sm" />
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-8 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-8 min-h-0 overflow-auto">
            <Outlet />
          </main>
          <PartnerFooter compact />
          <MobileBottomNav />
        </SidebarInset>
        <LiveFeedPanel mode="rail" />
      </div>
      <LiveFeedMobileTrigger
        onClick={() => {
          setMobileFeedOpen(true);
          clearFeedUnread();
        }}
        newCount={feedUnreadCount}
      />
      <LiveFeedPanel mode="sheet" open={mobileFeedOpen} onOpenChange={setMobileFeedOpen} />
    </SidebarProvider>
  );
}
