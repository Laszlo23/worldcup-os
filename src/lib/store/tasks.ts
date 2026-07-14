import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch } from "../api/client";

interface TasksState {
  completedIds: string[];
  walletScope: string;
  synced: boolean;
  completeTask: (taskId: string, walletAddress?: string) => Promise<void>;
  isCompleted: (taskId: string) => boolean;
  totalPoints: () => number;
  setWalletScope: (address: string) => void;
  syncFromServer: (walletAddress: string) => Promise<void>;
}

const STORAGE_KEY = "worldcup-os-tasks";

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      walletScope: "",
      synced: false,

      setWalletScope: (address) => set({ walletScope: address }),

      syncFromServer: async (walletAddress) => {
        try {
          const res = await apiFetch<{ completedTaskIds: string[] }>("/api/superfan/tasks");
          const scope = walletAddress;
          const keys = res.completedTaskIds.map((id) => `${scope}:${id}`);
          set({ completedIds: keys, walletScope: scope, synced: true });
        } catch {
          set({ synced: false });
        }
      },

      completeTask: async (taskId, walletAddress) => {
        const scope = walletAddress ?? get().walletScope ?? "anonymous";
        const key = `${scope}:${taskId}`;
        if (get().completedIds.includes(key)) return;

        try {
          await apiFetch("/api/superfan/task-complete", {
            method: "POST",
            body: JSON.stringify({ taskId }),
          });
        } catch {
          // still mark locally if offline; server validates on next sync
        }

        set((s) => ({
          completedIds: s.completedIds.includes(key) ? s.completedIds : [...s.completedIds, key],
          walletScope: scope,
        }));
      },

      isCompleted: (taskId) => {
        const scope = get().walletScope || "anonymous";
        return get().completedIds.includes(`${scope}:${taskId}`);
      },

      totalPoints: () => get().completedIds.length * 25,
    }),
    { name: STORAGE_KEY },
  ),
);
