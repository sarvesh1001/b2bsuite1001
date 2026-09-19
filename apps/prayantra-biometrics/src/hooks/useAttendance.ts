// src/hooks/useAttendance.ts
import { logAttendance, getPendingAttendance, getAttendanceHistory } from '../services/DatabaseService';
import { useSyncStore } from '../store/syncStore';
import { useState, useEffect } from 'react';

export const useAttendance = () => {
  const [history, setHistory] = useState<any[]>([]);
  const { setPendingCount } = useSyncStore();

  const refreshHistory = async () => {
    const records = await getAttendanceHistory(); // implement this in DB service
    setHistory(records);
    const pending = await getPendingAttendance();
    setPendingCount(pending.length);
  };

  const log = async (employeeId: string) => {
    await logAttendance(employeeId);
    await refreshHistory();
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  return { history, log, refreshHistory };
};