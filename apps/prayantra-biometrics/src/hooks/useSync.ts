// src/hooks/useSync.ts
import { useDevice } from './useDevice';
import { useSyncStore } from '../store/syncStore';
import { getPendingAttendance } from '../services/DatabaseService';

export const useSync = () => {
  const { getSyncManager, isConfigured } = useDevice();
  const {
    isSyncing,
    lastSyncTime,
    pendingCount,
    error,
    syncProgress,
    startSync,
    finishSync,
    setError,
    updateProgress,
    setPendingCount,
  } = useSyncStore();

  const performSync = async () => {
    if (!isConfigured) {
      setError('Device not configured');
      return;
    }
    if (isSyncing) return;

    startSync();
    try {
      const syncManager = getSyncManager();
      // Simulate progress (optional)
      updateProgress(10);
      await syncManager.fullSync();
      updateProgress(80);
      const pending = await getPendingAttendance();
      setPendingCount(pending.length);
      finishSync(pending.length);
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    }
  };

  return {
    isSyncing,
    lastSyncTime,
    pendingCount,
    error,
    syncProgress,
    performSync,
    clearError: useSyncStore.getState().clearError,
  };
};