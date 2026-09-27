export type OrgUnitType = 'class' | 'team' | 'batch' | 'project';
export type OrgUnitRoleType = 'teacher' | 'supervisor' | 'coordinator';

/* ---------------- Org Unit ---------------- */

export interface OrgUnit {
  org_unit_id: string;
  company_id: string;
  org_unit_type: OrgUnitType;
  name: string;
  description?: string | null;
  department_id?: string | null;

  /**
   * Locations this org unit is BOUND to.
   *   []  → universal (anyone from any location can be assigned)
   *   [x] → restricted; a user must be authorized for at least one of these
   *
   * On create/update the field is the whole list (replace semantics).
   * Omitting it on update = no change.
   */
  home_location_ids: string[];

  is_active: boolean;

  /**
   * Derived — computed server-side, not settable.
   *   location_count = distinct locations among active MEMBERS (footprint)
   *   member_count   = active members
   */
  location_count: number;
  member_count: number;

  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

/* Detail extends OrgUnit. */
export interface OrgUnitWithDetails extends OrgUnit {
  active_members?: OrgUnitMember[];
  roles?: OrgUnitRole[];
  department?: string | null;

  /**
   * The locations the org is BOUND to (with code + name).
   * Mirror of `home_location_ids` but enriched for display.
   */
  home_locations?: LocationBrief[];

  /**
   * The locations active members are actually AT (footprint).
   * Different from home_locations: an org bound to [Delhi, Mumbai]
   * can have a footprint of just [Delhi] if no members sit in Mumbai.
   */
  locations?: LocationBrief[];
}

/* ---------------- Membership / Role ---------------- */

export interface OrgUnitMember {
  org_unit_id: string;
  user_id: string;
  /**
   * Optional per-assignment pin. When set, this member is explicitly
   * authorized for this location regardless of their own scope.
   */
  location_id?: string | null;
  effective_from: string;
  effective_to?: string | null;

  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrgUnitRole {
  org_unit_id: string;
  user_id: string;
  role: OrgUnitRoleType;
  position_id?: string | null;
  location_id?: string | null;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;

  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserMembership {
  org_unit_id: string;
  user_id: string;
  org_unit_name: string;
  org_unit_type: OrgUnitType;
  role?: OrgUnitRoleType | null;
  position_id?: string | null;
  location_id?: string | null;
}

/* ---------------- Location brief ---------------- */

export interface LocationBrief {
  location_id: string;
  location_code: string;
  location_name: string;
  /** Only set on footprint entries (from `locations`), not on `home_locations`. */
  member_count?: number;
}

/* ---------------- Payloads ---------------- */

export interface CreateOrgUnitPayload {
  org_unit_type: OrgUnitType;
  name: string;
  description?: string | null;
  department_id?: string | null;
  /** Empty/missing = universal. */
  home_location_ids?: string[];
  is_active?: boolean;
}

export interface UpdateOrgUnitPayload {
  name?: string;
  description?: string | null;
  department_id?: string | null;
  /**
   * Replace semantics:
   *   undefined → no change
   *   []        → make universal
   *   [...]     → bind to exactly these locations
   */
  home_location_ids?: string[];
  is_active?: boolean;
}

export interface AddOrgUnitMemberPayload {
  user_id: string;
  location_id?: string | null;
  effective_from: string;
  effective_to?: string | null;
}

export interface UpdateOrgUnitMemberPayload {
  effective_from: string;
  effective_to?: string | null;
}

export interface AssignOrgUnitRolePayload {
  user_id: string;
  role: OrgUnitRoleType;
  position_id?: string | null;
  location_id?: string | null;
  is_primary?: boolean;
  effective_from: string;
  effective_to?: string | null;
}

/* ---------------- Search filters (query params) ---------------- */

export interface SearchOrgUnitsParams {
  name?: string;
  type?: OrgUnitType;
  is_active?: boolean;
  department_id?: string;

  /** Orgs bound to exactly this location. */
  location_id?: string;

  /**
   * Orgs bound to ANY of these locations.
   * Serialized comma-separated on the wire.
   */
  location_ids?: string[];

  /**
   * true  → only orgs with NO configured locations (universal).
   * false → only orgs bound to ≥1 location.
   */
  is_universal?: boolean;

  page?: number;
  page_size?: number;
}

/* ---------------- Envelope ---------------- */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
  error?: string;
  code?: number;
}