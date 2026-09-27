import type { EmployeeLocationGrantRequest } from './location';

// ============================================================
// HR full update — mirrors PATCH /companies/{cid}/rbac/members/{uid}
//
// Every field optional. Immutable (never accepted):
//   user_id, company_id, employee_id
// ============================================================
export interface UpdateMemberRequest {
  // users
  username?: string;
  full_name?: string;

  // roster
  role_id?: string;
  position_id?: string;
  reports_to?: string;
  primary_location_id?: string;
  location_access_scope?: 'PRIMARY' | 'SELECTED' | 'ALL';

  // grants — replace-on-present; [] clears all
  selected_locations?: EmployeeLocationGrantRequest[];

  // profile — dossier (PII)
  email?: string;
  tax_id?: string;
  social_security_id?: string;
  date_of_birth?: string;         // ISO
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  employment_status?: 'active' | 'probation' | 'notice' | 'on_hold' | 'terminated';
  probation_end_date?: string;    // ISO
  confirmation_date?: string;     // ISO
  grade?: string;
  cost_center?: string;
  cost_center_id?: string;
}