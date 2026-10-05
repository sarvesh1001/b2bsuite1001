// packages/shared-types/src/lifecycle.ts

// ============================================================
// EMPLOYEE LIFECYCLE — probation / notice / on-hold / exit
// ------------------------------------------------------------
// Mirrors the Go models + the /status-now endpoint payload.
// ============================================================

export type EmploymentStatus =
  | 'active'
  | 'probation'
  | 'notice'
  | 'on_hold'
  | 'terminated';

export interface EmployeeProbation {
  probation_id: string;
  company_id: string;
  user_id: string;
  start_date: string;      // YYYY-MM-DD
  end_date: string;        // YYYY-MM-DD
  extension_count: number;
  pay_percentage: number;
  status: 'pending' | 'confirmed' | 'extended' | 'failed';
  outcome_reason?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeNotice {
  notice_id: string;
  company_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  initiated_by: 'employee' | 'employer';
  served: boolean;
  pay_percentage: number;
  status: 'active' | 'completed' | 'cancelled';
  exit_id?: string | null;
  created_at: string;
  created_by?: string | null;
  days_total?: number;
  days_served?: number;
  days_remaining?: number;
}

export interface EmployeeOnHold {
  on_hold_id: string;
  company_id: string;
  user_id: string;
  start_date: string;
  end_date?: string | null;
  reason: string;
  previous_status: EmploymentStatus;
  pay_percentage: number;
  status: 'active' | 'ended';
  ended_at?: string | null;
  ended_by?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface EmployeeExitRecord {
  exit_id: string;
  user_id: string;
  company_id: string;
  exit_date?: string | null;
  exit_reason?: string | null;
  eligible_for_rehire?: boolean | null;
  exit_state: 'scheduled' | 'effective' | 'cancelled' | 'rehired';
  notice_id?: string | null;
  enforced_at?: string | null;
  enforced_by?: string | null;
  created_at: string;
}

export interface EmployeeStatusNow {
  user_id: string;
  company_id: string;
  employment_status: EmploymentStatus | '';
  probation?: EmployeeProbation | null;
  notice?: EmployeeNotice | null;
  on_hold?: EmployeeOnHold | null;
  exit?: EmployeeExitRecord | null;
}

// ---- Request payloads ----

export interface ConfirmProbationRequest {
  note?: string;
}

export interface FailProbationRequest {
  reason: string;
  termination_date: string;    // YYYY-MM-DD
}

export interface ExtendProbationRequest {
  new_end_date: string;        // YYYY-MM-DD
  reason?: string;
}

export interface StartNoticeRequest {
  end_date: string;            // YYYY-MM-DD
  reason: string;
  initiated_by: 'employee' | 'employer';
  served: boolean;
  pay_percentage?: number;
}

export interface CancelNoticeRequest {
  reason?: string;
}

export interface StartOnHoldRequest {
  start_date: string;          // YYYY-MM-DD
  end_date?: string | null;    // YYYY-MM-DD | null for open-ended
  reason: string;
  pay_percentage?: number;
}