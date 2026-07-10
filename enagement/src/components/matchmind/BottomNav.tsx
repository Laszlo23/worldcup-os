import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Sparkles, Layers, IdCard, Gift } from "lucide-react";

const items = [
  { to: "/", label: "Match", icon: Activity },
  { to: "/predict", label: "Predict", icon: Sparkles },
  { to: "/moments", label: "Moments", icon: Layers },
  { to: "/passport", label: "Passport", icon: IdCard },
  { to: "/rewards", label: "Rewards", icon: Gift },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mm-glass border-t border-border">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-between px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-1 flex-col items-center gap-1 py-1.5"
            >
              <Icon
                className={`size-[18px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.14em] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {active ? (
                <span className="absolute -top-2 h-[3px] w-8 rounded-full bg-primary mm-pulse-glow" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}