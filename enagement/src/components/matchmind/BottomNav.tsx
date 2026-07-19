import { useEffect, useState, type ComponentType } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { MatchDesk } from "./MatchDesk";
import { PRIMARY_RAIL } from "@/lib/nav-desk";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [deskOpen, setDeskOpen] = useState(false);

  // Close desk on route change (belt + suspenders with Link onClick)
  useEffect(() => {
    setDeskOpen(false);
  }, [pathname]);

  const left = PRIMARY_RAIL.slice(0, 2);
  const right = PRIMARY_RAIL.slice(2);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-[480px] px-3 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2">
          <div className="relative flex items-end justify-between rounded-[1.75rem] border border-white/10 bg-background/85 px-1.5 py-1.5 shadow-[0_12px_40px_-16px_oklch(0_0_0_/_0.7)] backdrop-blur-2xl">
            {left.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <RailLink key={to} to={to} label={label} Icon={Icon} active={active} />
              );
            })}

            <div className="relative flex w-[4.5rem] shrink-0 justify-center">
              <motion.button
                type="button"
                aria-label="Open Match Desk"
                aria-expanded={deskOpen}
                onClick={() => setDeskOpen(true)}
                whileTap={{ scale: 0.94 }}
                className="relative -mt-7 grid size-[3.65rem] place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_32px_-6px_oklch(0.84_0.22_155_/_0.55)] ring-4 ring-background"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
                <Compass className="relative size-6" strokeWidth={2.2} />
                <span className="absolute -bottom-5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-primary">
                  Desk
                </span>
              </motion.button>
            </div>

            {right.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <RailLink key={to} to={to} label={label} Icon={Icon} active={active} />
              );
            })}
          </div>
        </div>
      </nav>

      <MatchDesk open={deskOpen} onOpenChange={setDeskOpen} />
    </>
  );
}

function RailLink({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2"
    >
      {active ? (
        <span
          className="absolute inset-1 rounded-2xl bg-primary/12 ring-1 ring-primary/30"
          aria-hidden
        />
      ) : null}
      <Icon
        className={`relative size-[18px] transition-colors ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span
        className={`relative font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
