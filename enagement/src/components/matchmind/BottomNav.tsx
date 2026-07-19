import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Sparkles, Layers, IdCard, Gift } from "lucide-react";

const items = [
  { to: "/", label: "Live", icon: Activity },
  { to: "/predict", label: "Polls", icon: Sparkles },
  { to: "/moments", label: "Drops", icon: Layers },
  { to: "/passport", label: "Pass", icon: IdCard },
  { to: "/rewards", label: "Shop", icon: Gift },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 glass-strong border-t border-accent/15">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-between px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5"
            >
              {active ? (
                <span className="absolute inset-0 rounded-xl bg-accent/10 ring-1 ring-accent/25" aria-hidden />
              ) : null}
              <Icon
                className={`relative size-[18px] transition-colors ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className={`relative font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${
                  active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}