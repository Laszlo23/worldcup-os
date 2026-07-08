import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { Separator } from "@/components/ui/separator";
import { Fragment } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/matches": "Matches",
  "/markets": "Prediction Markets",
  "/leaderboard": "Leaderboard",
  "/analytics": "Analytics",
  "/proofs": "Proof Explorer",
  "/portfolio": "Portfolio",
  "/settings": "Settings",
};

function AppLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title =
    Object.entries(titles).find(([k]) => pathname === k || (k !== "/" && pathname.startsWith(k)))?.[1] ??
    "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border backdrop-blur-xl bg-background/60">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="ml-auto">
              <ConnectWalletButton size="sm" />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <Fragment>
              <Outlet />
            </Fragment>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
