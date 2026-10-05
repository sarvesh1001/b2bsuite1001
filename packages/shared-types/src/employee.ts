// packages/shared-types/src/employee.ts

// If you want to use the full Avatar type, uncomment the import below:
// import { Avatar } from './avatar';

// Reuse canonical location types from ./location to avoid duplicate-export
// conflicts at the package barrel (src/index.ts).
import type {
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
} from './location';
export type {
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
};

export interface CompanyEmployee {
  user_id: string;
  company_id: string;
  employee_id: string;
  role_id: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // additional fields from user (optional, but may be returned)
  phone?: string;
  username?: string;
  full_name?: string;
  email?: string;
  // Fields from joined data (returned by search endpoints)
  role_name?: string;
  department_name?: string;
  department_id?: string;
  reports_to?: string;
  reports_to_name?: string;
  // 👇 New: avatar URL (primary avatar, usually a small or medium variant)
  avatar_url?: string | null;
  // Alternatively, if your backend returns the full avatar object:
  // avatar?: Avatar | null;
}

export interface AddEmployeePayload {
  phone: string;
  username?: string;
  full_name?: string;
  employee_id?: string;
  role_id: string;
  reports_to?: string;
  position_id?: string;
}

export interface AddManagerPayload {
  phone: string;
  username?: string;
  full_name?: string;
  role_id: string;
  employee_id?: string;
  reports_to?: string;
  position_id?: string;
}

// ============================================================
// Unified AddMember (POST /companies/{companyId}/rbac/members)
// ------------------------------------------------------------
// Replaces the split AddEmployee / AddManager flow for new
// callers. Existing callers can keep using the legacy DTOs.
// ============================================================

export type MemberType = 'employee' | 'manager';

export interface SelectedLocationGrant {
  /** UUID of the location */
  location_id: string;
  /**
   * Access level for this grant. Defaults to VIEW on the backend when omitted.
   * Note: member-creation grants only accept VIEW | MANAGE
   * (ADMIN is reserved for other flows).
   */
  access_level?: LocationAccessLevel;
}

export interface AddMemberPayload {
  /**
   * "employee" | "manager". Omitted → "employee".
   */
  member_type?: MemberType;

  // --- Identity (required) ---
  phone: string;
  username: string;
  full_name: string;

  // --- Employment ---
  employee_id?: string;
  role_id: string;
  reports_to?: string;

  // ============================================================
  // Position — choose ONE of the two paths below:
  //
  //   1. position_id  → link to an existing seat
  //   2. job_id       → backend auto-creates a seat
  //
  // When using path 2, the four fields below become meaningful:
  //   department_id, location_id, work_center_code, title_override.
  // Only department_id is required for that path; the rest are optional.
  //
  // The two paths are NOT mutually exclusive on the wire (both fields
  // may be present), but position_id takes precedence if both are set.
  // ============================================================
  position_id?: string;

  /** NEW — auto-create path. */
  job_id?: string;
  /** NEW — only used when job_id is provided. */
  department_id?: string;
  location_id?: string;
  work_center_code?: string;
  title_override?: string;

  // --- Employee location assignment (separate from the seat's location) ---
  primary_location_id?: string;
  location_access_scope?: LocationAccessScope;
  selected_locations?: SelectedLocationGrant[];
  selected_location_ids?: string[];

  // ============================================================
  // HR profile — all optional at hire. HR can enrich later.
  // ============================================================
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null;
  nationality?: string | null;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | null;
  employment_status?: 'active' | 'inactive' | 'probation' | 'terminated' | null;
  probation_end_date?: string | null;
  confirmation_date?: string | null;
  grade?: string | null;
  cost_center?: string | null;
  tax_id?: string | null;
  social_security_id?: string | null;
  email?: string | null;
}

export interface SearchEmployeesPayload {
  query: string;           // The search text (required)
  search_type?: string;    // 'fulltext' or 'autocomplete' (default: 'fulltext')
  limit?: number;
  offset?: number;
}

export interface AdvancedSearchEmployeesParams {
  role_id?: string;
  department_id?: string;
  limit?: number;
  offset?: number;
  // Some backends might also accept a query param for advanced search
  query?: string;
  search_type?: string;
}

// ============================================================
// HR Employee Profile (matches the new HR endpoints)
// ============================================================

export interface HREmployeeProfile {
  id: string;                    // employee ID (UUID)
  user_id: string;               // user ID
  company_id: string;
  date_of_birth?: string;        // ISO date
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;          // country code
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  employment_status?: 'active' | 'inactive' | 'probation' | 'terminated';
  probation_end_date?: string;
  confirmation_date?: string;
  grade?: string;
  cost_center?: string;
  tax_id?: string;
  social_security_id?: string;
  email?: string;                // could be same as user email
  job_title?: string;            // may come from position/role
  department_id?: string;
  department_name?: string;
  role_id?: string;
  role_name?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Employee Documents
// ============================================================

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;          // e.g. 'resume', 'offer_letter'
  file_size?: number;
  mime_type?: string;
  is_confidential: boolean;
  uploaded_by?: string;
  uploaded_at: string;
  updated_at: string;
}

export interface UploadDocumentPayload {
  file: File | Blob;
  document_type: string;
  document_name: string;
  is_confidential?: boolean;
}

// ============================================================
// Employee Exit
// ============================================================

export interface EmployeeExit {
  id: string;
  employee_id: string;
  exit_date: string;
  exit_reason: string;           // e.g. 'resignation', 'termination', 'retirement'
  eligible_for_rehire: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExitPayload {
  exit_date: string;
  exit_reason: string;
  eligible_for_rehire: boolean;
  notes?: string;
}

// ============================================================
// Employee History
// ============================================================

export interface DepartmentHistoryEntry {
  department_id: string;
  department_name: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
}

export interface RoleHistoryEntry {
  role_id: string;
  role_name: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
}

// ============================================================
// EMPLOYEE TYPEAHEAD SEARCH + BATCH HYDRATE  (NEW)
// ------------------------------------------------------------
// Backs the two new HR endpoints:
//   GET  /companies/{cid}/hr/employees/typeahead
//   POST /companies/{cid}/hr/employees/details
//
// The server auto-selects a search mode based on query length:
//   query == ""      → recommendation feed (all visible employees)
//   1-2 chars        → prefix match (username / full_name)
//   3+ chars         → trigram + full-text (typo-tolerant)
//
// Location scope is resolved server-side from the caller's session;
// the client never passes a location filter.
// ============================================================

/**
 * Fully-decrypted employee record returned by the search + hydrate flow.
 * Every PII field here is PLAINTEXT. Do not persist to logs / analytics
 * without applying your normal masking rules.
 */
export interface DecryptedEmployeeDetails {
  // Identity
  user_id: string;
  company_id: string;
  username: string;
  full_name?: string | null;

  // Decrypted contact
  phone_number?: string | null;
  email?: string | null;

  // Roster (company_employees + joined names)
  employee_id: string;
  role_id: string;
  role_name: string;
  position_id?: string | null;
  position_title?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  primary_location_id?: string | null;
  primary_location_name?: string | null;
  location_access_scope: LocationAccessScope;
  reports_to?: string | null;
  hire_date: string;
  is_active: boolean;

  // Profile — non-PII
  employee_profile_id?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  employment_type?:
    | 'full_time'
    | 'part_time'
    | 'contract'
    | 'internship'
    | null;
  /**
   * Current lifecycle status as returned by the read projection.
   * The union here is the read-side view (excludes 'inactive', which
   * only appears on the write side). Kept as a literal set so consumers
   * narrow cleanly.
   */
  employment_status?:
    | 'active'
    | 'probation'
    | 'notice'
    | 'on_hold'
    | 'terminated'
    | 'resigned'
    | null;
  job_title?: string | null;
  grade?: string | null;

  // Cost center — FK + resolved name/code from accounting.cost_centers.
  // `cost_center` is the legacy text column; the resolved pair lives
  // in `cost_center_name` / `cost_center_code`.
  cost_center_id?: string | null;
  cost_center?: string | null;
  cost_center_name?: string | null;
  cost_center_code?: string | null;

  // Probation / confirmation windows (mirrors employee_profiles)
  probation_end_date?: string | null;
  confirmation_date?: string | null;

  // Profile — decrypted PII
  date_of_birth?: string | null;      // ISO 8601
  nationality?: string | null;        // country code
  marital_status?:
    | 'single'
    | 'married'
    | 'divorced'
    | 'widowed'
    | null;
  tax_id?: string | null;
  social_security_id?: string | null;

  // Timestamps
  profile_created_at?: string | null;
  profile_updated_at?: string | null;
  user_created_at: string;
  user_last_login?: string | null;
}

/**
 * Meta block returned alongside the search results.
 * Mirrors the shape of `meta` on other paginated endpoints.
 *
 * Notes:
 *   - `status` echoes the filter that was applied; "" when no filter.
 *   - `total` is the row count BEFORE LIMIT — use it for the
 *     "Showing X of Y" indicator on paginated lists.
 *   - `total_pages` is derived as ceil(total / page_size); 0 when
 *     total is 0.
 */
export interface EmployeeTypeaheadMeta {
  query: string;
  /** Echo of the applied status filter; "" when none. */
  status: string;
  page: number;
  page_size: number;
  /** Row count BEFORE LIMIT — drives the "X of Y" bar. */
  total: number;
  /** ceil(total / page_size); 0 when total is 0. */
  total_pages: number;
  return_count: number;
  ids_only: boolean;
  duration: string;   // e.g. "42.1ms"
}

/**
 * Response envelope for GET .../typeahead.
 *
 * The `data` type is conditional on `ids_only`:
 *   - ids_only = true  → string[]  (just user IDs, cheap)
 *   - ids_only = false → DecryptedEmployeeDetails[]
 *
 * Two helper types are exported below for callers that want a
 * discriminated response without manual casting.
 */
export interface EmployeeTypeaheadResponse {
  success: true;
  data: DecryptedEmployeeDetails[] | string[];
  meta: EmployeeTypeaheadMeta;
}

export type EmployeeTypeaheadIDsResponse = Omit<EmployeeTypeaheadResponse, 'data'> & {
  data: string[];
};

export type EmployeeTypeaheadDetailsResponse = Omit<EmployeeTypeaheadResponse, 'data'> & {
  data: DecryptedEmployeeDetails[];
};

/**
 * Filter values accepted by the typeahead endpoint's `employment_status`
 * query param. `''` and `'all'` are treated identically by the backend
 * — no filter is applied. Kept as its own union so the UI's chip state
 * and the api-client param type stay in lockstep.
 *
 * NOTE: this is deliberately NOT named `EmploymentStatus` to avoid a
 * collision with the canonical lifecycle union exported elsewhere in
 * this package. If you need a general-purpose lifecycle status union,
 * import the existing one from its home module rather than redeclaring
 * it here.
 */
export type EmploymentStatusFilter =
  | 'active'
  | 'probation'
  | 'notice'
  | 'on_hold'
  | 'terminated'
  | 'resigned'
  | 'all'
  | '';

/**
 * Query params accepted by GET .../typeahead.
 * All are optional — sending none returns the recommendation feed.
 */
export interface SearchEmployeesTypeaheadParams {
  /** Search text. Empty / omitted → recommendation feed. */
  q?: string;
  /** 1-based page number. Default 1. */
  page?: number;
  /** Items per page. 1..100; default 30. */
  page_size?: number;
  /**
   * If true, skip hydration and return only user IDs.
   * Useful for prefetching or when the caller already has cached details.
   */
  ids_only?: boolean;
  /**
   * Filter results by employment_status. `''`, `'all'`, and omitted
   * are all treated as "no filter" by the backend — safe to send
   * unconditionally if the caller prefers.
   */
  employment_status?: EmploymentStatusFilter;
}

/**
 * Request body for POST .../details.
 * Max 200 IDs per call (server-enforced).
 */
export interface GetEmployeeDetailsByIDsPayload {
  user_ids: string[];
}

/**
 * Response envelope for POST .../details.
 * `data` only contains employees matching BOTH the input IDs AND the
 * caller's company + location scope; mismatched IDs are silently dropped,
 * so `returned_ids` may be < `requested_ids`.
 */
export interface GetEmployeeDetailsByIDsResponse {
  success: true;
  data: DecryptedEmployeeDetails[];
  meta: {
    requested_ids: number;
    returned_ids: number;
    duration: string;
  };
}

// ============================================================
// REACTIVATE EMPLOYEE
// ------------------------------------------------------------
// PATCH /companies/{cid}/hr/employees/user/{userId}/reactivate
//
// Restores a terminated or resigned employee to active. The backend
// flips three rows in one transaction (profile status, roster
// is_active, latest exit → 'rehired') and enqueues a leave
// resolution job. Idempotent — calling on an already-active
// employee returns 200 with a no-op.
//
// Keyed by user_id (NOT employee_profile_id) — deliberately
// different from the sibling lifecycle routes.
// ============================================================

/**
 * Success payload for the reactivate endpoint.
 * Backend always returns status: 'active' on success.
 */
export interface ReactivateEmployeeResponse {
  user_id: string;
  company_id: string;
  status: 'active';
}

// ============================================================
// EMPLOYEE FORM OPTIONS  (single-call prefetch)
// ------------------------------------------------------------
// Backs GET /companies/{cid}/hr/employee-form/options
//
// Everything here is already scoped to the CALLER's location
// access on the server. The client never widens it.
// ============================================================

/** A single role, bundled with its granted departments. */
export interface RoleWithDepartments {
  role_id: string;
  role_name: string;
  role_level: number;
  description?: string | null;
  is_system_role: boolean;
  departments: RoleDepartmentSummary[];
}

export interface RoleDepartmentSummary {
  department_id: string;
  department_name: string;
  is_active: boolean;
  system_department_id?: string | null;
}

/**
 * A position row as returned by the form-options endpoint.
 * Includes joined job / department / location / WC names.
 *
 * `location_id === null` means the position is UNIVERSAL — it can
 * be filled from any location the caller can see.
 */
export interface FormPositionView {
  position_id: string;
  company_id: string;
  department_id: string;
  job_id: string;
  location_id: string | null;
  title_override: string | null;
  is_open: boolean;
  work_center_code: string | null;
  created_at: string;
  updated_at: string;
  // joined from `jobs`
  job_code: string;
  job_title: string;
  is_schedulable: boolean;
  attendance_required: boolean;
  overtime_allowed: boolean;
  // joined from `departments` / `locations` / `attendance.work_centers`
  department_name?: string | null;
  location_name?: string | null;
  work_center_name?: string | null;
}

/**
 * A work-center row as returned by the form-options endpoint.
 * `is_universal === true` means the WC is not tied to a single
 * location and can be used from anywhere.
 */
export interface FormWorkCenterView {
  work_center_code: string;
  company_id: string;
  location_id: string | null;
  name: string;
  description?: string | null;
  timezone: string;
  is_active: boolean;
  is_universal: boolean;
}

/**
 * The full payload returned by the single-call prefetch.
 *
 * Notes:
 *   - `allowed_locations` is the caller's effective location set
 *     (respects PRIMARY / SELECTED / ALL scope).
 *   - `positions` and `work_centers` are already filtered to that
 *     set, plus any "universal" rows (location_id IS NULL).
 *   - `roles[].departments` is what the frontend matches positions
 *     against to enforce the role↔department invariant.
 */
export interface EmployeeFormOptions {
  primary_location_id: string | null;
  location_scope: LocationAccessScope;
  allowed_locations: AccessibleLocation[];
  roles: RoleWithDepartments[];
  positions: FormPositionView[];
  work_centers: FormWorkCenterView[];
  include_universal: boolean;
}