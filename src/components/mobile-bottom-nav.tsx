import { Link, useRouterState } from "@tanstack/react-router";
import { Radio, Play, Trophy, ListChecks, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Oracle", url: "/oracle", icon: Radio },
  { title: "Replay", url: "/replay", icon: Play },
  { title: "Matches", url: "/matches", icon: Trophy },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-primary/15 glass pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-5 h-14 px-1">
        {items.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[44px] rounded-xl",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-1 rounded-xl bg-primary/10 ring-1 ring-primary/20" aria-hidden />
              )}
              <item.icon className={cn("relative h-5 w-5", active && "drop-shadow-[0_0_8px_oklch(0.8_0.19_155_/_0.7)]")} />
              <span className="relative">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
