// packages/shared-types/src/leave.ts

// ========================================================================
// SHARED ENUMS (must match backend + DB constraints)
// ========================================================================

export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LedgerEntryType =
  | 'accrual'
  | 'consumption'
  | 'reversal';

export type AccrualMethod =
  | 'none'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

// DB also allows 'org_unit', but the Go service currently rejects it.
// Hide 'org_unit' from the UI until the service is patched.
export type AppliesToType =
  | 'company'
  | 'position'
  | 'work_center';

export type EntitlementSource = 'policy' | 'manual';

// ========================================================================
// POLICY CONFIG  (DB: leave.leave_policy)
// ========================================================================

export interface LeavePolicyConfig {
  policy_id: string;                          // ⚠️ NOT "id"
  company_id: string;
  policy_name: string;
  applies_to_type: AppliesToType;
  applies_to_position_id?: string | null;
  applies_to_work_center_code?: string | null;
  applies_to_id?: string | null;              // legacy — ignore in UI
  priority: number;                           // must be > 0
  effective_from: string;                     // DATE — YYYY-MM-DD
  effective_to?: string | null;               // DATE — YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CreatePolicyConfigPayload {
  policy_name: string;
  applies_to_type: AppliesToType;
  applies_to_position_id?: string | null;
  applies_to_work_center_code?: string | null;
  priority: number;                           // must be > 0
  effective_from: string;                     // YYYY-MM-DD
  effective_to?: string | null;               // YYYY-MM-DD
}

export interface UpdatePolicyConfigPayload {
  policy_name?: string;
  applies_to_type?: AppliesToType;
  applies_to_position_id?: string | null;
  applies_to_work_center_code?: string | null;
  priority?: number;
  effective_from?: string;
  effective_to?: string | null;
  is_active?: boolean;
}

// ========================================================================
// POLICY RULE  (DB: leave.leave_policy_rule)
//
// ⚠️ The rule is now the SOURCE OF TRUTH for accrual_method and
//    carry_forward_limit. SAP-aligned: the accrual schedule belongs to
//    the policy rule (Quota Type / Generation Rule), not the leave type.
// ========================================================================

export interface PolicyRule {
  policy_rule_id: string;                     // ⚠️ NOT "id"
  policy_id: string;
  leave_type_id: string;
  total_days: number;                         // INT
  accrual_method: AccrualMethod;
  carry_forward_limit?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreatePolicyRulePayload {
  leave_type_id: string;
  total_days: number;
  accrual_method: AccrualMethod;
  carry_forward_limit?: number | null;
}

export interface UpdatePolicyRulePayload {
  total_days?: number;
  accrual_method?: AccrualMethod;
  carry_forward_limit?: number | null;
}

// ========================================================================
// LEAVE TYPE  (DB: leave.leave_type)
//
// ⚠️ Pure classification. No accrual_method, no carry_forward_limit —
//    those live on the policy rule.
// ========================================================================

export interface LeaveType {
  leave_type_id: string;                      // ⚠️ NOT "id"
  company_id: string;
  code: string;
  name: string;
  is_paid: boolean;
  requires_approval: boolean;
  created_at: string;
  // ⚠️ NO is_active — the table has no such column
  // ⚠️ NO updated_at — the table has no such column
  // ⚠️ NO accrual_method — moved to leave_policy_rule
  // ⚠️ NO carry_forward_limit — moved to leave_policy_rule
}

export interface CreateLeaveTypePayload {
  code: string;
  name: string;
  is_paid: boolean;
  requires_approval: boolean;
}

export interface UpdateLeaveTypePayload {
  name?: string;
  is_paid?: boolean;
  requires_approval?: boolean;
}

// ========================================================================
// ENTITLEMENT  (DB: leave.leave_entitlement)
// ========================================================================

export interface Entitlement {
  entitlement_id: string;                     // ⚠️ NOT "id"
  company_id: string;
  user_id: string;
  leave_type_id: string;
  policy_id?: string | null;
  source: EntitlementSource;
  total_days: number;
  effective_from: string;                     // DATE
  effective_to?: string | null;               // DATE
  position_id?: string | null;
  work_center_code?: string | null;
  created_at: string;
  updated_at?: string | null;
  // ⚠️ NO is_active — the table has no such column
}

export interface CreateEntitlementPayload {
  user_id: string;
  leave_type_id: string;
  total_days: number;
  effective_from: string;                     // YYYY-MM-DD
  effective_to?: string | null;               // YYYY-MM-DD
}

// ========================================================================
// ACCRUAL  (DB: leave.leave_accrual)
// ========================================================================

export interface Accrual {
  accrual_id: string;                         // ⚠️ NOT "id"
  entitlement_id: string;                     // ⚠️ NOT user_id / leave_type_id
  accrual_date: string;                       // DATE
  days_accrued: number;                       // INT
  fractional_days: number;                    // DECIMAL(10,4)
  cumulative_balance: number;                 // GENERATED = days_accrued + fractional_days
  created_at: string;
  // ⚠️ NO company_id, user_id, leave_type_id, balance_before, balance_after, reference
}

// ========================================================================
// LEAVE REQUEST  (DB: leave.leave_request)
// ========================================================================

export interface LeaveRequest {
  leave_request_id: string;                   // ⚠️ NOT "id"
  company_id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;                         // DATE
  end_date: string;                           // DATE
  total_days: number;
  status: LeaveRequestStatus;
  requested_by?: string | null;
  approved_by?: string | null;
  requested_at: string;                       // ⚠️ NOT "created_at"
  approved_at?: string | null;
  // ⚠️ NO updated_at — the table has no such column
  // ⚠️ NO rejection_reason — reasons are only logged in audit metadata
}

export interface CreateLeaveRequestPayload {
  user_id: string;
  leave_type_id: string;
  start_date: string;                         // YYYY-MM-DD
  end_date: string;                           // YYYY-MM-DD
  total_days: number;
}

export interface ApproveRejectPayload {
  approved_by?: string;
  reason?: string;
}

// ========================================================================
// BALANCE
// ========================================================================

export interface LeaveBalance {
  user_id: string;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  total_entitled: number;                     // float64 in Go
  accrued: number;                            // float64
  consumed: number;                           // ⚠️ NOT "used"
  balance: number;                            // float64
  carry_forward?: number | null;
}

// ========================================================================
// AVAILABILITY
// ========================================================================

export interface LeaveAvailability {
  is_available: boolean;                      // ⚠️ NOT "available"
  available_days: number;                     // ⚠️ new field
  // ⚠️ NO message, balance_after, required_days
}

// ========================================================================
// TRANSACTIONS
// ========================================================================

export interface LeaveTransaction {
  transaction_id: string;
  user_id: string;
  leave_type_id: string;
  entry_type: LedgerEntryType;
  days: number;
  entry_date: string;
  reference_id?: string | null;
  reference_type?: string | null;
  description: string;
}

// ========================================================================
// POLICY RESOLUTION
// ========================================================================

// ⚠️ Backend struct has NO json tags → Go emits PascalCase
export interface LeavePolicyRuleResolution {
  PolicyID: string;
  LeaveTypeID: string;
  TotalDays: number;
  AccrualMethod: string;
  CarryForwardLimit?: number | null;
}

// ⚠️ Same — PascalCase
export interface LeavePolicyResolutionResult {
  TotalUsers: number;
  ProcessedUsers: number;
  FailedUsers: string[];
  Errors: string[];
}

// ========================================================================
// RESPONSE ENVELOPES — inner `data` shapes returned by the backend
// ========================================================================

export interface LeaveTypesListData {
  leave_types: LeaveType[];
  total_count: number;
  company_id: string;
  current_date: string;
}

export interface EntitlementsListData {
  entitlements: Entitlement[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  company_id: string;
  user_id?: string | null;
}

export interface LeaveRequestsListData {
  requests: LeaveRequest[];
  total_count: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface PendingRequestsData {
  pending_requests: LeaveRequest[];
  total_count: number;
  company_id: string;
  approver_id: string;
}

export interface BalancesListData {
  balances: LeaveBalance[];
  user_id: string;
  company_id: string;
  as_of_date: string;
  total_types: number;
}

export interface BalancesForUserData {
  user_id: string;
  company_id: string;
  as_of: string;
  balances: LeaveBalance[];
}

export interface BalanceForUserByTypeData {
  user_id: string;
  company_id: string;
  leave_type_id: string;
  as_of: string;
  balance: LeaveBalance;
}

export interface AccrualsListData {
  accruals: Accrual[];
  date: string;
  total_count: number;
}

export interface AccrualProcessData {
  processed_count: number;
  accrual_month: string;
  company_id: string;
}

export interface UserOnLeaveData {
  is_on_leave: boolean;
  leave_request?: LeaveRequest | null;
  user_id: string;
  company_id: string;
  checked_at: string;
}

export interface LeaveHistoryData {
  history: LeaveRequest[];
  user_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  total_count: number;
}

export interface TransactionsData {
  transactions: LeaveTransaction[];
  total_count: number;
  user_id: string;
  company_id: string;
}

export interface EffectivePoliciesData {
  policies: LeavePolicyRuleResolution[];
  company_id: string;
  user_id: string;
  as_of: string;
  count: number;
}

// ========================================================================
// MESSAGE-ONLY RESPONSES
// ========================================================================

export interface MessageResponse {
  message: string;
}