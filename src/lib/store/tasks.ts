import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TasksState {
  completedIds: string[];
  walletScope: string;
  completeTask: (taskId: string, walletAddress?: string) => void;
  isCompleted: (taskId: string) => boolean;
  totalPoints: () => number;
  setWalletScope: (address: string) => void;
}

const STORAGE_KEY = "worldcup-os-tasks";

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      walletScope: "",

      setWalletScope: (address) => set({ walletScope: address }),

      completeTask: (taskId, walletAddress) => {
        const scope = walletAddress ?? get().walletScope ?? "anonymous";
        const key = `${scope}:${taskId}`;
        set((s) => ({
          completedIds: s.completedIds.includes(key) ? s.completedIds : [...s.completedIds, key],
          walletScope: scope,
        }));
      },

      isCompleted: (taskId) => {
        const scope = get().walletScope || "anonymous";
        return get().completedIds.includes(`${scope}:${taskId}`);
      },

      totalPoints: () => get().completedIds.length * 25, // simplified; cards show individual points
    }),
    { name: STORAGE_KEY },
  ),
);
