import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Trophy,
  BarChart3,
  ShieldCheck,
  Wallet,
  Settings,
  Activity,
  Users,
  Home,
  Radio,
  Play,
  ListChecks,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Oracle Command Center", url: "/oracle", icon: Radio },
  { title: "Matches", url: "/matches", icon: Trophy },
  { title: "Predictions", url: "/markets", icon: Activity },
  { title: "Proof Replay", url: "/replay", icon: Play },
  { title: "Community Tasks", url: "/tasks", icon: ListChecks },
  { title: "Leaderboard", url: "/leaderboard", icon: Users },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Proof Explorer", url: "/proofs", icon: ShieldCheck },
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => pathname === u || (u !== "/" && pathname.startsWith(u));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border/80">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/brand/logo.svg"
            alt="World Cup OS"
            width={36}
            height={36}
            className="brand-mark relative h-9 w-9 rounded-xl transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display font-bold text-base tracking-tight">World Cup OS</span>
            <span className="text-[10px] text-primary/75 uppercase tracking-[0.22em] font-mono">WMOS · TxLINE</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Landing">
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Landing</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
