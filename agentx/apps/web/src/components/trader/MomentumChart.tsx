"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Match } from "@/lib/types";

export function MomentumChart({ match }: { match: Match }) {
  const history = match.oddsHistory?.length
    ? match.oddsHistory.map((h, i) => ({ m: i * 15, v: 100 - h.home * 30 + match.momentum * 0.3 }))
    : Array.from({ length: 10 }, (_, i) => ({ m: i * 9, v: 40 + match.momentum * 0.5 + Math.sin(i) * 10 }));

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history}>
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="oklch(0.78 0.14 85)" fill="url(#goldGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
