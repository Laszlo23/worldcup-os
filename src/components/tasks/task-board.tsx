import { useEffect, useState } from "react";
import { COMMUNITY_TASKS, type TaskFilter } from "@/lib/mock/tasks";
import { FeaturedTask } from "./featured-task";
import { TaskCard } from "./task-card";
import { useTasksStore } from "@/lib/store/tasks";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { ShareActions } from "@/components/social/share-actions";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy" },
  { id: "community", label: "Community" },
  { id: "builder", label: "Builder" },
];

export function TaskBoard() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const wallet = useAppStore((s) => s.wallet);
  const { completedIds, setWalletScope, syncFromServer } = useTasksStore();

  useEffect(() => {
    setWalletScope(wallet.address || "anonymous");
  }, [wallet.address, setWalletScope]);

  useEffect(() => {
    if (wallet.connected && wallet.address) {
      void syncFromServer(wallet.address);
    }
  }, [wallet.connected, wallet.address, syncFromServer]);

  const featured = COMMUNITY_TASKS.find((t) => t.featured)!;
  const filtered = COMMUNITY_TASKS.filter((t) => !t.featured && (filter === "all" || t.category === filter));
  const scope = wallet.address || "anonymous";
  const completedCount = completedIds.filter((id) => id.startsWith(`${scope}:`)).length;
  const totalPoints = COMMUNITY_TASKS.filter((t) => completedIds.includes(`${scope}:${t.id}`)).reduce((s, t) => s + t.points, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Community Tasks</h1>
          <p className="text-muted-foreground mt-1">Complete tasks, earn points, grow the World Cup OS network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-gold border-gold/40">{totalPoints} PTS earned</Badge>
          <Badge variant="outline">{completedCount} / {COMMUNITY_TASKS.length} done</Badge>
          <ShareActions app="wmos" contentType="tasks" contentId="board" title="World Cup OS Community Tasks" />
        </div>
      </div>

      <FeaturedTask task={featured} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id ? "bg-gold/20 text-gold border border-gold/40" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
