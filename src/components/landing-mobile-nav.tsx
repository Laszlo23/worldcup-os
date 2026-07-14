import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { label: "Oracle Command Center", to: "/oracle" },
  { label: "Proof Replay", to: "/replay" },
  { label: "Proof Explorer", to: "/proofs" },
  { label: "Community Tasks", to: "/tasks" },
  { label: "Dashboard", to: "/dashboard" },
] as const;

export function LandingMobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="glass-strong w-[min(100vw-2rem,20rem)]">
        <SheetHeader>
          <SheetTitle className="font-display text-left">World Cup OS</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted/60 transition-colors min-h-[44px] flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
