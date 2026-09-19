import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  error: string | null;
  syncProgress: number; // 0–100

  // Actions
  startSync: () => void;
  finishSync: (pendingCount: number) => void;
  setError: (error: string) => void;
  clearError: () => void;
  updateProgress: (progress: number) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  error: null,
  syncProgress: 0,

  startSync: () => set({ isSyncing: true, error: null, syncProgress: 0 }),
  finishSync: (pendingCount) =>
    set({
      isSyncing: false,
      lastSyncTime: new Date().toISOString(),
      pendingCount,
      syncProgress: 100,
    }),
  setError: (error) => set({ isSyncing: false, error }),
  clearError: () => set({ error: null }),
  updateProgress: (progress) => set({ syncProgress: progress }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));