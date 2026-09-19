// packages/shared-types/src/employee.ts

// If you want to use the full Avatar type, uncomment the import below:
// import { Avatar } from './avatar';

// Reuse canonical location types from ./location to avoid duplicate-export
// conflicts at the package barrel (src/index.ts).
import type {
  LocationAccessScope,
  LocationAccessLevel,
} from './location';
export type { LocationAccessScope, LocationAccessLevel };

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
   * "employee" | "manager". Determines default validation rules.
   * Empty / omitted → backend treats as "employee".
   */
  member_type?: MemberType;

  // --- Identity (required by backend) ---
  phone: string;
  username: string;
  full_name: string;

  // --- Employment ---
  employee_id?: string;
  role_id: string;
  reports_to?: string;   // uuid
  position_id?: string;  // uuid

  // --- Location (all optional) ---
  primary_location_id?: string;                 // uuid
  location_access_scope?: LocationAccessScope;  // 'PRIMARY' | 'SELECTED' | 'ALL'
  selected_locations?: SelectedLocationGrant[]; // new-style grants
  selected_location_ids?: string[];             // legacy: defaults to VIEW

  // ============================================================
  // HR profile — all optional at hire. HR can enrich later.
  // These fields flow into employee_profiles via the atomic
  // POST /companies/{companyId}/hr/employees endpoint.
  // ============================================================
  date_of_birth?: string | null;                 // ISO date
  gender?: 'male' | 'female' | 'other' | null;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null;
  nationality?: string | null;                   // country code
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | null;
  employment_status?: 'active' | 'inactive' | 'probation' | 'terminated' | null;
  probation_end_date?: string | null;            // ISO date
  confirmation_date?: string | null;             // ISO date
  grade?: string | null;
  cost_center?: string | null;
  tax_id?: string | null;
  social_security_id?: string | null;
  email?: string | null;                         // HR contact email (profile)
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