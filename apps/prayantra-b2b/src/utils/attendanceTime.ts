// apps/prayantra-b2b/src/utils/attendanceTime.ts
import type { AttendancePunchEvent } from '@b2b/shared-types';

export function formatEventLocalTime(
  event: Pick<AttendancePunchEvent, 'event_time' | 'event_tz' | 'event_offset_minutes'>,
): string {
  const offset = event.event_offset_minutes ?? 0;
  const utc = new Date(event.event_time);
  const shifted = new Date(utc.getTime() + offset * 60_000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const tz = event.event_tz || 'UTC';
  return `${hh}:${mm} (${tz})`;
}

export function formatEventClock(
  event: Pick<AttendancePunchEvent, 'event_time' | 'event_offset_minutes'>,
): string {
  const offset = event.event_offset_minutes ?? 0;
  const utc = new Date(event.event_time);
  const shifted = new Date(utc.getTime() + offset * 60_000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatEventLocalDate(
  event: Pick<AttendancePunchEvent, 'event_date_local'>,
): string {
  return event.event_date_local;
}
/**
 * Formats a UTC instant using an explicit offset (e.g. summary.offset_minutes).
 * Use this when you have the snapshot fields split out, rather than a full
 * AttendancePunchEvent.
 */
export function formatInstantWithOffset(
    utcInstant: string | null | undefined,
    offsetMinutes: number | null | undefined,
    tz?: string | null,
  ): string {
    if (!utcInstant) return '—';
    const offset = offsetMinutes ?? 0;
    const utc = new Date(utcInstant);
    if (isNaN(utc.getTime())) return '—';
    const shifted = new Date(utc.getTime() + offset * 60_000);
    const hh = String(shifted.getUTCHours()).padStart(2, '0');
    const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
    return tz ? `${hh}:${mm} (${tz})` : `${hh}:${mm}`;
  }

  /**
 * Formats a UTC instant in the given IANA tz (DST-aware via Intl).
 * Use this for schedule instance expected_start/end, which carry a
 * `timezone` snapshot on the row itself.
 *
 * Pass showTz=true to append the tz label — useful when the tz is not
 * obvious from context (e.g. cross-location admin views).
 */
export function formatInstantInTz(
    utcInstant: string | null | undefined,
    tz: string | null | undefined,
    showTz: boolean = false,
  ): string {
    if (!utcInstant) return '—';
    const utc = new Date(utcInstant);
    if (isNaN(utc.getTime())) return '—';
    const targetTz = tz || 'UTC';
    try {
      const dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: targetTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const hhmm = dtf.format(utc);
      return showTz ? `${hhmm} (${targetTz})` : hhmm;
    } catch {
      const hh = String(utc.getUTCHours()).padStart(2, '0');
      const mm = String(utc.getUTCMinutes()).padStart(2, '0');
      return showTz ? `${hh}:${mm} (UTC)` : `${hh}:${mm}`;
    }
  }