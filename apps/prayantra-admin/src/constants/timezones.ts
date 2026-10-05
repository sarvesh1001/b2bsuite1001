// src/constants/timezones.ts
// ============================================================
// Canonical IANA timezone list shared across the admin app.
//
// Storage: always the IANA string (e.g. 'Asia/Kolkata').
// Never store a raw offset ('+05:30') or abbreviation ('IST').
//
// Offsets below are HINTS for display only. The correct offset for
// any given instant depends on DST rules and must be computed at
// runtime via `Intl.DateTimeFormat` (see utils/timezone.ts).
// ============================================================

export type TimezoneRegion =
  | 'UTC'
  | 'Asia'
  | 'Europe'
  | 'Africa'
  | 'Americas'
  | 'Oceania'
  | 'Atlantic'
  | 'Indian'
  | 'Pacific';

export interface TimezoneOption {
  /** IANA name. This is what gets stored. */
  name: string;
  /** Region for grouped UI dropdowns. */
  region: TimezoneRegion;
  /** Freeform hint shown as a subtitle. */
  note?: string;
}

/**
 * Curated list of supported timezones. ~90 zones covering 99.9% of
 * B2B customers. Not exhaustive — add more only when a customer needs
 * a zone that isn't here.
 */
export const TIMEZONES: TimezoneOption[] = [
  // ── UTC ─────────────────────────────────────────────
  { name: 'UTC', region: 'UTC', note: 'Coordinated Universal Time' },

  // ── Asia ────────────────────────────────────────────
  { name: 'Asia/Jerusalem', region: 'Asia', note: 'IST (Israel, DST IDT)' },
  { name: 'Asia/Beirut', region: 'Asia', note: 'EET (DST EEST)' },
  { name: 'Asia/Riyadh', region: 'Asia', note: 'AST (no DST)' },
  { name: 'Asia/Kuwait', region: 'Asia', note: 'AST (no DST)' },
  { name: 'Asia/Qatar', region: 'Asia', note: 'AST (no DST)' },
  { name: 'Asia/Dubai', region: 'Asia', note: 'GST (no DST)' },
  { name: 'Asia/Tehran', region: 'Asia', note: 'IRST (DST abolished 2022)' },
  { name: 'Asia/Kabul', region: 'Asia', note: 'AFT (+04:30, no DST)' },
  { name: 'Asia/Karachi', region: 'Asia', note: 'PKT (+05:00, no DST)' },
  { name: 'Asia/Tashkent', region: 'Asia', note: 'UZT (no DST)' },
  { name: 'Asia/Kolkata', region: 'Asia', note: 'IST (+05:30, no DST)' },
  { name: 'Asia/Colombo', region: 'Asia', note: 'IST (+05:30, no DST)' },
  { name: 'Asia/Kathmandu', region: 'Asia', note: 'NPT (+05:45, no DST)' },
  { name: 'Asia/Dhaka', region: 'Asia', note: 'BST (no DST)' },
  { name: 'Asia/Almaty', region: 'Asia', note: 'ALMT (no DST)' },
  { name: 'Asia/Yangon', region: 'Asia', note: 'MMT (+06:30, no DST)' },
  { name: 'Asia/Bangkok', region: 'Asia', note: 'ICT (no DST)' },
  { name: 'Asia/Jakarta', region: 'Asia', note: 'WIB (no DST)' },
  { name: 'Asia/Ho_Chi_Minh', region: 'Asia', note: 'ICT (no DST)' },
  { name: 'Asia/Singapore', region: 'Asia', note: 'SGT (no DST)' },
  { name: 'Asia/Kuala_Lumpur', region: 'Asia', note: 'MYT (no DST)' },
  { name: 'Asia/Manila', region: 'Asia', note: 'PST (no DST)' },
  { name: 'Asia/Hong_Kong', region: 'Asia', note: 'HKT (no DST)' },
  { name: 'Asia/Shanghai', region: 'Asia', note: 'CST (China, no DST)' },
  { name: 'Asia/Taipei', region: 'Asia', note: 'CST (no DST)' },
  { name: 'Asia/Ulaanbaatar', region: 'Asia', note: 'ULAT (no DST)' },
  { name: 'Asia/Tokyo', region: 'Asia', note: 'JST (no DST)' },
  { name: 'Asia/Seoul', region: 'Asia', note: 'KST (no DST)' },

  // ── Europe ──────────────────────────────────────────
  { name: 'Europe/London', region: 'Europe', note: 'GMT (DST BST)' },
  { name: 'Europe/Dublin', region: 'Europe', note: 'GMT (DST IST)' },
  { name: 'Europe/Lisbon', region: 'Europe', note: 'WET (DST WEST)' },
  { name: 'Europe/Paris', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Berlin', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Madrid', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Rome', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Amsterdam', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Brussels', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Zurich', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Vienna', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Prague', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Warsaw', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Budapest', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Stockholm', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Oslo', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Copenhagen', region: 'Europe', note: 'CET (DST CEST)' },
  { name: 'Europe/Helsinki', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Athens', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Bucharest', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Sofia', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Kiev', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Riga', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Vilnius', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Tallinn', region: 'Europe', note: 'EET (DST EEST)' },
  { name: 'Europe/Istanbul', region: 'Europe', note: 'TRT (no DST)' },
  { name: 'Europe/Moscow', region: 'Europe', note: 'MSK (no DST)' },

  // ── Africa ──────────────────────────────────────────
  { name: 'Africa/Casablanca', region: 'Africa', note: 'WEST (Ramadan adjusts)' },
  { name: 'Africa/Algiers', region: 'Africa', note: 'CET (no DST)' },
  { name: 'Africa/Tunis', region: 'Africa', note: 'CET (no DST)' },
  { name: 'Africa/Lagos', region: 'Africa', note: 'WAT (no DST)' },
  { name: 'Africa/Cairo', region: 'Africa', note: 'EET (DST reintroduced 2023)' },
  { name: 'Africa/Johannesburg', region: 'Africa', note: 'SAST (no DST)' },
  { name: 'Africa/Nairobi', region: 'Africa', note: 'EAT (no DST)' },
  { name: 'Africa/Addis_Ababa', region: 'Africa', note: 'EAT (no DST)' },

  // ── Americas ────────────────────────────────────────
  { name: 'America/St_Johns', region: 'Americas', note: 'NST (−03:30, DST −02:30)' },
  { name: 'America/Halifax', region: 'Americas', note: 'AST (DST ADT)' },
  { name: 'America/Santiago', region: 'Americas', note: 'CLT (DST CLST)' },
  { name: 'America/Sao_Paulo', region: 'Americas', note: 'BRT (no DST since 2019)' },
  { name: 'America/Buenos_Aires', region: 'Americas', note: 'ART (no DST)' },
  { name: 'America/Montevideo', region: 'Americas', note: 'UYT (no DST)' },
  { name: 'America/Bogota', region: 'Americas', note: 'COT (no DST)' },
  { name: 'America/Lima', region: 'Americas', note: 'PET (no DST)' },
  { name: 'America/Panama', region: 'Americas', note: 'EST (no DST)' },
  { name: 'America/Caracas', region: 'Americas', note: 'VET (no DST)' },
  { name: 'America/New_York', region: 'Americas', note: 'EST (DST EDT)' },
  { name: 'America/Toronto', region: 'Americas', note: 'EST (DST EDT)' },
  { name: 'America/Havana', region: 'Americas', note: 'CST (Cuba DST)' },
  { name: 'America/Chicago', region: 'Americas', note: 'CST (DST CDT)' },
  { name: 'America/Mexico_City', region: 'Americas', note: 'CST (no DST since 2022)' },
  { name: 'America/Guatemala', region: 'Americas', note: 'CST (no DST)' },
  { name: 'America/Costa_Rica', region: 'Americas', note: 'CST (no DST)' },
  { name: 'America/Denver', region: 'Americas', note: 'MST (DST MDT)' },
  { name: 'America/Edmonton', region: 'Americas', note: 'MST (DST MDT)' },
  { name: 'America/Phoenix', region: 'Americas', note: 'MST (no DST)' },
  { name: 'America/Los_Angeles', region: 'Americas', note: 'PST (DST PDT)' },
  { name: 'America/Vancouver', region: 'Americas', note: 'PST (DST PDT)' },
  { name: 'America/Anchorage', region: 'Americas', note: 'AKST (DST AKDT)' },
  { name: 'America/Adak', region: 'Americas', note: 'HST (DST HDT)' },

  // ── Pacific ─────────────────────────────────────────
  { name: 'Pacific/Honolulu', region: 'Pacific', note: 'HST (no DST)' },
  { name: 'Pacific/Auckland', region: 'Pacific', note: 'NZST (DST NZDT)' },
  { name: 'Pacific/Fiji', region: 'Pacific', note: 'FJT (DST suspended 2022)' },
  { name: 'Pacific/Apia', region: 'Pacific', note: 'WSST (+13:00)' },
  { name: 'Pacific/Tongatapu', region: 'Pacific', note: 'TOT (+13:00)' },
  { name: 'Pacific/Guam', region: 'Pacific', note: 'ChST (no DST)' },
  { name: 'Pacific/Port_Moresby', region: 'Pacific', note: 'PGT (no DST)' },
  { name: 'Pacific/Noumea', region: 'Pacific', note: 'NCT (no DST)' },
  { name: 'Pacific/Tahiti', region: 'Pacific', note: 'TAHT (no DST)' },
  { name: 'Pacific/Midway', region: 'Pacific', note: 'SST (no DST)' },

  // ── Oceania ─────────────────────────────────────────
  { name: 'Australia/Perth', region: 'Oceania', note: 'AWST (no DST)' },
  { name: 'Australia/Adelaide', region: 'Oceania', note: 'ACST (DST ACDT)' },
  { name: 'Australia/Darwin', region: 'Oceania', note: 'ACST (no DST)' },
  { name: 'Australia/Brisbane', region: 'Oceania', note: 'AEST (no DST)' },
  { name: 'Australia/Sydney', region: 'Oceania', note: 'AEST (DST AEDT)' },
  { name: 'Australia/Melbourne', region: 'Oceania', note: 'AEST (DST AEDT)' },

  // ── Atlantic ────────────────────────────────────────
  { name: 'Atlantic/Azores', region: 'Atlantic', note: 'AZOT (DST UTC+00)' },
  { name: 'Atlantic/Reykjavik', region: 'Atlantic', note: 'GMT (no DST)' },
  { name: 'Atlantic/Canary', region: 'Atlantic', note: 'WET (DST WEST)' },
];

/** Group zones by region for grouped pickers. */
export const TIMEZONES_BY_REGION: Record<TimezoneRegion, TimezoneOption[]> =
  TIMEZONES.reduce((acc, tz) => {
    (acc[tz.region] = acc[tz.region] || []).push(tz);
    return acc;
  }, {} as Record<TimezoneRegion, TimezoneOption[]>);

/** Flat list of IANA names, for fast validation lookups. */
export const TIMEZONE_NAMES: string[] = TIMEZONES.map((tz) => tz.name);

/** Sensible default when nothing else is known. */
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_COMPANY_TIMEZONE = 'Asia/Kolkata';

/** Preferred display order for grouped dropdowns. */
export const REGION_ORDER: TimezoneRegion[] = [
  'UTC',
  'Asia',
  'Europe',
  'Africa',
  'Americas',
  'Oceania',
  'Pacific',
  'Atlantic',
  'Indian',
];

/**
 * Country → default tz. HINT only, used to pre-fill the picker during
 * onboarding. For multi-zone countries the picker must still prompt the
 * admin to confirm.
 */
export const COUNTRY_DEFAULT_TIMEZONE: Record<string, string> = {
  // South Asia
  IN: 'Asia/Kolkata', PK: 'Asia/Karachi', BD: 'Asia/Dhaka', LK: 'Asia/Colombo',
  NP: 'Asia/Kathmandu', AF: 'Asia/Kabul',
  // Middle East
  AE: 'Asia/Dubai', SA: 'Asia/Riyadh', QA: 'Asia/Qatar', KW: 'Asia/Kuwait',
  BH: 'Asia/Bahrain', OM: 'Asia/Muscat', IQ: 'Asia/Baghdad', IR: 'Asia/Tehran',
  IL: 'Asia/Jerusalem', JO: 'Asia/Jerusalem', LB: 'Asia/Beirut', TR: 'Europe/Istanbul',
  // Southeast / East Asia
  SG: 'Asia/Singapore', MY: 'Asia/Kuala_Lumpur', TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh', PH: 'Asia/Manila', ID: 'Asia/Jakarta',
  MM: 'Asia/Yangon', CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong',
  TW: 'Asia/Taipei', JP: 'Asia/Tokyo', KR: 'Asia/Seoul',
  // Central Asia
  KZ: 'Asia/Almaty', UZ: 'Asia/Tashkent',
  // Europe
  GB: 'Europe/London', IE: 'Europe/Dublin', FR: 'Europe/Paris', DE: 'Europe/Berlin',
  IT: 'Europe/Rome', ES: 'Europe/Madrid', PT: 'Europe/Lisbon',
  NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', CH: 'Europe/Zurich',
  AT: 'Europe/Vienna', SE: 'Europe/Stockholm', NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen', FI: 'Europe/Helsinki', PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague', HU: 'Europe/Budapest', RO: 'Europe/Bucharest',
  BG: 'Europe/Sofia', GR: 'Europe/Athens', RU: 'Europe/Moscow', UA: 'Europe/Kiev',
  LV: 'Europe/Riga', LT: 'Europe/Vilnius', EE: 'Europe/Tallinn',
  // Africa
  ZA: 'Africa/Johannesburg', EG: 'Africa/Cairo', NG: 'Africa/Lagos',
  KE: 'Africa/Nairobi', MA: 'Africa/Casablanca', DZ: 'Africa/Algiers',
  TN: 'Africa/Tunis', ET: 'Africa/Addis_Ababa',
  // Americas
  US: 'America/New_York', CA: 'America/Toronto', MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo', AR: 'America/Buenos_Aires', CL: 'America/Santiago',
  CO: 'America/Bogota', PE: 'America/Lima', VE: 'America/Caracas',
  PA: 'America/Panama', CR: 'America/Costa_Rica',
  // Oceania / Pacific
  AU: 'Australia/Sydney', NZ: 'Pacific/Auckland', FJ: 'Pacific/Fiji',
  PG: 'Pacific/Port_Moresby', NC: 'Pacific/Noumea', GU: 'Pacific/Guam',
  // Atlantic
  IS: 'Atlantic/Reykjavik',
};

/**
 * Countries where a single default isn't enough. The UI prompts the admin
 * to pick a specific zone even after pre-filling from COUNTRY_DEFAULT_TIMEZONE.
 */
export const COUNTRIES_WITH_MULTIPLE_TIMEZONES: Record<string, boolean> = {
  US: true, CA: true, AU: true, RU: true, BR: true, MX: true,
  ID: true, KZ: true, NZ: true, CL: true, ES: true, PT: true,
  // Explicitly single-zone countries that people mistakenly think are multi
  CN: false, IN: false, MY: false, SG: false, ZA: false, EG: false,
};