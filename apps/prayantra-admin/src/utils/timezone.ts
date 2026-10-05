// src/utils/timezone.ts
// ============================================================
// Timezone helpers — pure functions, no side effects.
//
// RULE: every display of a UTC instant must go through
// formatInstantInTz(). Never call .toLocaleString() directly —
// that uses the device tz and produces wrong output for admin
// users viewing another company's data.
// ============================================================

import { TIMEZONE_NAMES, DEFAULT_TIMEZONE } from '../constants/timezones';

/**
 * Returns true if tz is one of the supported IANA names.
 * Uses Intl for a runtime validity check as a fallback.
 */
export function isSupportedTimezone(tz: string): boolean {
  if (!tz) return false;
  if (TIMEZONE_NAMES.includes(tz)) return true;
  // Fallback: any IANA name the runtime accepts is technically valid.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve an effective timezone by hierarchy.
 * Priority: workCenter > location > company > fallback.
 * Empty strings are treated as "not set".
 */
export function resolveTimezone(opts: {
  workCenterTz?: string | null;
  locationTz?: string | null;
  companyTz?: string | null;
  fallback?: string;
}): string {
  return (
    opts.workCenterTz?.trim() ||
    opts.locationTz?.trim() ||
    opts.companyTz?.trim() ||
    opts.fallback ||
    DEFAULT_TIMEZONE
  );
}

/**
 * Format a UTC instant in a target tz for display.
 * Default output: "15 Jan 2026, 14:30" (24-hour, no tz suffix).
 */
export function formatInstantInTz(
  utcInstant: string | Date | null | undefined,
  tz: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!utcInstant) return '—';
  const date =
    typeof utcInstant === 'string' ? new Date(utcInstant) : utcInstant;
  if (isNaN(date.getTime())) return '—';
  const targetTz = tz || DEFAULT_TIMEZONE;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: targetTz,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...options,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Today's date in the target tz, formatted as 'YYYY-MM-DD'.
 * Use when filtering "today's data for location X".
 */
export function todayInTz(tz: string): string {
  const targetTz = tz || DEFAULT_TIMEZONE;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * UTC offset in minutes for a tz at a given instant.
 * DST-aware.
 *
 *   getOffsetMinutes(new Date(), 'Asia/Kolkata')   → 330
 *   getOffsetMinutes(new Date('2026-01-15'), 'America/New_York') → -300
 *   getOffsetMinutes(new Date('2026-07-15'), 'America/New_York') → -240
 */
export function getOffsetMinutes(utcInstant: Date, tz: string): number {
  const targetTz = tz || DEFAULT_TIMEZONE;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTz,
      timeZoneName: 'shortOffset',
    });
    const parts = dtf.formatToParts(utcInstant);
    const offsetPart =
      parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const m = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    const sign = m[1] === '+' ? 1 : -1;
    const hours = parseInt(m[2], 10);
    const minutes = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

/**
 * Format offset minutes as "UTC+05:30" / "UTC−04:00".
 * Uses a typographic minus (−) for consistency with the desktop admin.
 */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0
    ? `UTC${sign}${String(h).padStart(2, '0')}:00`
    : `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Convenience: "UTC+05:30" for a tz evaluated at now.
 */
export function describeTz(tz: string): string {
  return formatOffset(getOffsetMinutes(new Date(), tz));
}

/**
 * Full display label: "Asia/Kolkata (UTC+05:30)".
 * Use in list rows and picker options.
 */
export function describeTzFull(tz: string): string {
  return `${tz} (${describeTz(tz)})`;
}