// src/constants/attendance.ts
// ============================================================
// Attendance module constants. The tz list now lives in
// constants/timezones.ts — re-exported here for backward compat.
// ============================================================

export {
    TIMEZONES as ATTENDANCE_TIMEZONES,
    DEFAULT_TIMEZONE,
  } from './timezones';
  
  export type { TimezoneRegion as AttendanceTimezone } from './timezones';