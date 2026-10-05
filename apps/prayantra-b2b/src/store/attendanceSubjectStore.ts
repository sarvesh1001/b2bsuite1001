import { create } from 'zustand';
import type { AttendanceSubjectType } from '@b2b/shared-types';

interface AttendanceStoreState {
  activeSubjectType: AttendanceSubjectType;
  activeSubjectId: string | null;
  activeSubjectName: string | null;
  setSubjectContext: (
    type: AttendanceSubjectType,
    id?: string | null,
    name?: string | null,
  ) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceStoreState>((set) => ({
  activeSubjectType: 'employee',
  activeSubjectId: null,
  activeSubjectName: null,
  setSubjectContext: (type, id = null, name = null) =>
    set({ activeSubjectType: type, activeSubjectId: id, activeSubjectName: name }),
  reset: () =>
    set({ activeSubjectType: 'employee', activeSubjectId: null, activeSubjectName: null }),
}));