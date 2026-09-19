// src/hooks/useDevice.ts
import { useDeviceStore } from '../store/deviceStore';
import { useSyncStore } from '../store/syncStore';
import { SyncManager } from '../services/SyncManager';
import { getPendingAttendance } from '../services/DatabaseService';
import { useEffect } from 'react';

export const useDevice = () => {
  const {
    deviceToken,
    companyId,
    deviceId,
    serverUrl,
    isConfigured,
    setCredentials,
    clearCredentials,
  } = useDeviceStore();

  const { setPendingCount } = useSyncStore();

  // Sync manager instance – created only when configured
  const getSyncManager = () => {
    if (!deviceToken || !companyId || !deviceId) {
      throw new Error('Device not configured');
    }
    return new SyncManager(deviceToken, companyId, deviceId);
  };

  // Refresh pending count periodically
  useEffect(() => {
    if (isConfigured) {
      const updatePending = async () => {
        const pending = await getPendingAttendance();
        setPendingCount(pending.length);
      };
      updatePending();
      const interval = setInterval(updatePending, 30000); // every 30s
      return () => clearInterval(interval);
    }
  }, [isConfigured]);

  return {
    deviceToken,
    companyId,
    deviceId,
    serverUrl,
    isConfigured,
    setCredentials,
    clearCredentials,
    getSyncManager,
  };
};