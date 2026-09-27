import type { OrgUnitType, OrgUnitRoleType } from '@b2b/shared-types';

/* ---------------- Org Unit Types ---------------- */
export const ORG_UNIT_TYPES = ['class', 'team', 'batch', 'project'] as const;

export const ORG_UNIT_TYPE_LABEL: Record<OrgUnitType, string> = {
  class: 'Class',
  team: 'Team',
  batch: 'Batch',
  project: 'Project',
};

export const ORG_UNIT_TYPE_ICON: Record<OrgUnitType, string> = {
  class: 'google-classroom',
  team: 'account-group',
  batch: 'calendar-clock',
  project: 'clipboard-text',
};

export const ORG_UNIT_TYPE_COLOR: Record<OrgUnitType, string> = {
  class: '#6366f1',
  team: '#10b981',
  batch: '#f59e0b',
  project: '#8b5cf6',
};

/* ---------------- Org Unit Roles ---------------- */
export const ORG_UNIT_ROLES = ['teacher', 'supervisor', 'coordinator'] as const;

export const ORG_UNIT_ROLE_LABEL: Record<OrgUnitRoleType, string> = {
  teacher: 'Teacher',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator',
};

export const ORG_UNIT_ROLE_ICON: Record<OrgUnitRoleType, string> = {
  teacher: 'human-male-board',
  supervisor: 'shield-account',
  coordinator: 'account-tie',
};

/* ---------------- UI ---------------- */
export const ORG_UNIT_STATUS = {
  active: { label: 'Active', color: '#10b981' },
  inactive: { label: 'Inactive', color: '#ef4444' },
} as const;

export const ORG_UNIT_PAGE_SIZE = 20;
export const ORG_UNIT_MAX_PAGE_SIZE = 100;

export const DATE_FORMAT = 'YYYY-MM-DD';

/* ---------------- Scope (Global / Local / Empty) ---------------- */
export const ORG_UNIT_SCOPE = {
  global: { label: 'Global', icon: 'earth',         color: '#6366f1' },
  local:  { label: 'Local',  icon: 'map-marker',    color: '#10b981' },
  empty:  { label: 'Empty',  icon: 'inbox-outline', color: '#94a3b8' },
} as const;

export type OrgUnitScope = keyof typeof ORG_UNIT_SCOPE;

/**
 * Derive the scope of an org unit from its member-location count.
 *   0 → empty (no members with a location yet)
 *   1 → local (all members share one location)
 *   2+ → global (members span multiple locations)
 */
export const getOrgUnitScope = (locationCount: number): OrgUnitScope => {
  if (!locationCount || locationCount <= 0) return 'empty';
  if (locationCount === 1) return 'local';
  return 'global';
};

export const isGlobalOrgUnit = (locationCount: number): boolean =>
  getOrgUnitScope(locationCount) === 'global';

/* ---------------- Type helpers ---------------- */
export const getOrgUnitTypeLabel = (t: string) =>
  ORG_UNIT_TYPE_LABEL[t as OrgUnitType] ?? t;

export const getOrgUnitTypeIcon = (t: string) =>
  ORG_UNIT_TYPE_ICON[t as OrgUnitType] ?? 'office-building';

export const getOrgUnitTypeColor = (t: string) =>
  ORG_UNIT_TYPE_COLOR[t as OrgUnitType] ?? '#6b7280';

export const getOrgUnitRoleLabel = (r: string) =>
  ORG_UNIT_ROLE_LABEL[r as OrgUnitRoleType] ?? r;

export const getOrgUnitRoleIcon = (r: string) =>
  ORG_UNIT_ROLE_ICON[r as OrgUnitRoleType] ?? 'account-key';

export const formatDate = (d?: string | null) =>
  d ? d.split('T')[0] : '—';

/* ---------------- Location helpers ---------------- */
export interface LocationOption {
  location_id: string;
  location_code: string;
  location_name: string;
  city?: string | null;
}

export const formatLocationOption = (l?: LocationOption | null): string =>
  l ? (l.city ? `${l.location_name} · ${l.city}` : l.location_name) : '—';