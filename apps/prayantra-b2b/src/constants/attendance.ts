// src/constants/attendance.ts
// ============================================================
// Attendance module constants.
//
// The canonical tz list now lives in constants/timezones.ts —
// re-exported here so existing `ATTENDANCE_TIMEZONES` imports
// keep working. New code should import from './timezones'
// directly.
// ============================================================

export {
    TIMEZONES as ATTENDANCE_TIMEZONES,
    DEFAULT_TIMEZONE,
  } from './timezones';
  
  export type { TimezoneRegion as AttendanceTimezone } from './timezones';