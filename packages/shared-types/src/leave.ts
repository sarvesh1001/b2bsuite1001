// Policy Config
export interface LeavePolicyConfig {
    id: string;
    company_id: string;
    policy_name: string;
    applies_to_type: 'company' | 'department' | 'team' | 'user';
    applies_to_id?: string | null;
    priority: number;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreatePolicyConfigPayload {
    policy_name: string;
    applies_to_type: string;
    priority: number;
    effective_from: string;
    effective_to?: string | null;
  }
  
  export interface UpdatePolicyConfigPayload {
    policy_name?: string;
    priority?: number;
    effective_to?: string | null;
  }
  
  // Policy Rule
  export interface PolicyRule {
    id: string;
    policy_id: string;
    leave_type_id: string;
    total_days: number;
    accrual_method: string;
    carry_forward_limit?: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreatePolicyRulePayload {
    leave_type_id: string;
    total_days: number;
    accrual_method: string;
    carry_forward_limit?: number;
  }
  
  export interface UpdatePolicyRulePayload {
    total_days?: number;
    accrual_method?: string;
    carry_forward_limit?: number;
  }
  
  // Leave Type
  export interface LeaveType {
    id: string;
    company_id: string;
    code: string;
    name: string;
    is_paid: boolean;
    requires_approval: boolean;
    accrual_method: string;
    carry_forward_limit?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateLeaveTypePayload {
    code: string;
    name: string;
    is_paid: boolean;
    requires_approval: boolean;
    accrual_method: string;
    carry_forward_limit?: number;
  }
  
  export interface UpdateLeaveTypePayload {
    name?: string;
    is_paid?: boolean;
    requires_approval?: boolean;
    accrual_method?: string;
    carry_forward_limit?: number;
  }
  
  // Entitlement
  export interface Entitlement {
    id: string;
    company_id: string;
    user_id: string;
    leave_type_id: string;
    total_days: number;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateEntitlementPayload {
    user_id: string;
    leave_type_id: string;
    total_days: number;
    effective_from: string;
    effective_to?: string | null;
  }
  
  // Accrual
  export interface Accrual {
    id: string;
    company_id: string;
    user_id: string;
    leave_type_id: string;
    accrual_date: string;
    days_accrued: number;
    balance_before: number;
    balance_after: number;
    reference?: string;
  }
  
  // Leave Request
  export interface LeaveRequest {
    id: string;
    company_id: string;
    user_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approved_by?: string | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateLeaveRequestPayload {
    user_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
  }
  
  export interface ApproveRejectPayload {
    approved_by?: string;
    reason?: string;
  }
  
  // Balance
  export interface LeaveBalance {
    leave_type_id: string;
    leave_type_name: string;
    total_entitled: number;
    used: number;
    balance: number;
    carry_forward?: number;
  }
  
  // Availability
  export interface LeaveAvailability {
    available: boolean;
    message?: string;
    balance_after?: number;
    required_days?: number;
  }