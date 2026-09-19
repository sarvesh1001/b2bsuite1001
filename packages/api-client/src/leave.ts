// packages/api-client/src/leave.ts
import {
    LeavePolicyConfig,
    CreatePolicyConfigPayload,
    UpdatePolicyConfigPayload,
    PolicyRule,
    CreatePolicyRulePayload,
    UpdatePolicyRulePayload,
    LeaveType,
    CreateLeaveTypePayload,
    UpdateLeaveTypePayload,
    Entitlement,
    CreateEntitlementPayload,
    Accrual,
    LeaveRequest,
    CreateLeaveRequestPayload,
    ApproveRejectPayload,
    LeaveBalance,
    LeaveAvailability,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import { idempotentPost, idempotentPut, idempotentPatch, idempotentDelete } from './idempotency';
  
  const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ============ Policy Configuration ============
  
  export const createPolicyConfig = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreatePolicyConfigPayload
  ): Promise<ApiResponse<LeavePolicyConfig>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<LeavePolicyConfig>>(url, payload, 'createPolicyConfig', { headers });
  };
  
  export const listPolicyConfigs = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeavePolicyConfig[]>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getPolicyConfig = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeavePolicyConfig>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updatePolicyConfig = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdatePolicyConfigPayload
  ): Promise<ApiResponse<LeavePolicyConfig>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPatch<ApiResponse<LeavePolicyConfig>>(url, payload, 'updatePolicyConfig', { headers });
  };
  
  export const deletePolicyConfig = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deletePolicyConfig', { headers });
  };
  
  // ============ Policy Rules ============
  
  export const addPolicyRule = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreatePolicyRulePayload
  ): Promise<ApiResponse<PolicyRule>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}/rules`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PolicyRule>>(url, payload, 'addPolicyRule', { headers });
  };
  
  export const getPolicyRules = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PolicyRule[]>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}/rules`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updatePolicyRule = async (
    companyId: string,
    policyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdatePolicyRulePayload
  ): Promise<ApiResponse<PolicyRule>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}/rules/${ruleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPatch<ApiResponse<PolicyRule>>(url, payload, 'updatePolicyRule', { headers });
  };
  
  export const deletePolicyRule = async (
    companyId: string,
    policyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/policy-config/${policyId}/rules/${ruleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deletePolicyRule', { headers });
  };
  
  // ============ Leave Types ============
  
  export const listLeaveTypes = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeaveType[]>> => {
    const url = `/companies/${companyId}/leave/admin/leave-types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createLeaveType = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateLeaveTypePayload
  ): Promise<ApiResponse<LeaveType>> => {
    const url = `/companies/${companyId}/leave/admin/leave-types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<LeaveType>>(url, payload, 'createLeaveType', { headers });
  };
  
  export const getLeaveType = async (
    companyId: string,
    leaveTypeId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeaveType>> => {
    const url = `/companies/${companyId}/leave/admin/leave-types/${leaveTypeId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateLeaveType = async (
    companyId: string,
    leaveTypeId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateLeaveTypePayload
  ): Promise<ApiResponse<LeaveType>> => {
    const url = `/companies/${companyId}/leave/admin/leave-types/${leaveTypeId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<LeaveType>>(url, payload, 'updateLeaveType', { headers });
  };
  
  export const deleteLeaveType = async (
    companyId: string,
    leaveTypeId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/leave-types/${leaveTypeId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteLeaveType', { headers });
  };
  
  // ============ Entitlements ============
  
  export const createEntitlement = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateEntitlementPayload
  ): Promise<ApiResponse<Entitlement>> => {
    const url = `/companies/${companyId}/leave/admin/entitlements`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Entitlement>>(url, payload, 'createEntitlement', { headers });
  };
  
  export const listEntitlements = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { user_id?: string; page?: number; page_size?: number }
  ): Promise<ApiResponse<{ entitlements: Entitlement[]; total: number }>> => {
    const url = `/companies/${companyId}/leave/admin/entitlements`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Accruals ============
  
  export const processMonthlyAccruals = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: { accrual_date: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/accruals/monthly`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'processMonthlyAccruals', { headers });
  };
  
  export const getAccrualsByDate = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    date: string
  ): Promise<ApiResponse<Accrual[]>> => {
    const url = `/companies/${companyId}/leave/admin/accruals`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { date } });
    return response.data;
  };
  
  // ============ Recalculate Entitlement ============
  
  export const recalculateEntitlement = async (
    companyId: string,
    entitlementId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/recalculate/${entitlementId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, {}, 'recalculateEntitlement', { headers });
  };
  
  // ============ Policy Resolution ============
  
  export const resolveSingleUser = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: { as_of: string; reason?: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/policies/resolve/user/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'resolveSingleUser', { headers });
  };
  
  export const resolveBatchUsers = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: { user_ids: string[]; as_of: string; reason?: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/admin/policies/resolve/batch`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'resolveBatchUsers', { headers });
  };
  
  export const getEffectivePolicies = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    asOf: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/leave/admin/policies/effective/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  // ============ Leave Requests ============
  
  export const createLeaveRequest = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateLeaveRequestPayload
  ): Promise<ApiResponse<LeaveRequest>> => {
    const url = `/companies/${companyId}/leave/requests`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<LeaveRequest>>(url, payload, 'createLeaveRequest', { headers });
  };
  
  export const listLeaveRequests = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { status?: string; start_date?: string; end_date?: string }
  ): Promise<ApiResponse<LeaveRequest[]>> => {
    const url = `/companies/${companyId}/leave/requests`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getLeaveRequest = async (
    companyId: string,
    requestId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeaveRequest>> => {
    const url = `/companies/${companyId}/leave/requests/${requestId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const approveLeaveRequest = async (
    companyId: string,
    requestId: string,
    deviceId: string,
    accessToken: string,
    payload: ApproveRejectPayload
  ): Promise<ApiResponse<LeaveRequest>> => {
    const url = `/companies/${companyId}/leave/requests/${requestId}/approve`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<LeaveRequest>>(url, payload, 'approveLeaveRequest', { headers });
  };
  
  export const rejectLeaveRequest = async (
    companyId: string,
    requestId: string,
    deviceId: string,
    accessToken: string,
    payload: ApproveRejectPayload
  ): Promise<ApiResponse<LeaveRequest>> => {
    const url = `/companies/${companyId}/leave/requests/${requestId}/reject`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<LeaveRequest>>(url, payload, 'rejectLeaveRequest', { headers });
  };
  
  export const cancelLeaveRequest = async (
    companyId: string,
    requestId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/leave/requests/${requestId}/cancel`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, {}, 'cancelLeaveRequest', { headers });
  };
  
  export const getPendingLeaveRequests = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<LeaveRequest[]>> => {
    const url = `/companies/${companyId}/leave/requests/pending`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============ Leave Query ============
  
  export const getMyLeaveBalance = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    asOf?: string
  ): Promise<ApiResponse<LeaveBalance[]>> => {
    const url = `/companies/${companyId}/leave/query/balance`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  export const getMyLeaveBalanceByType = async (
    companyId: string,
    leaveTypeId: string,
    deviceId: string,
    accessToken: string,
    asOf?: string
  ): Promise<ApiResponse<LeaveBalance>> => {
    const url = `/companies/${companyId}/leave/query/balance/${leaveTypeId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  export const getUserLeaveBalance = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    asOf?: string
  ): Promise<ApiResponse<LeaveBalance[]>> => {
    const url = `/companies/${companyId}/leave/query/users/${userId}/balance`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  export const getUserLeaveBalanceByType = async (
    companyId: string,
    userId: string,
    leaveTypeId: string,
    deviceId: string,
    accessToken: string,
    asOf?: string
  ): Promise<ApiResponse<LeaveBalance>> => {
    const url = `/companies/${companyId}/leave/query/users/${userId}/balance/${leaveTypeId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  export const checkUserOnLeave = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    date: string
  ): Promise<ApiResponse<{ on_leave: boolean; user_ids?: string[] }>> => {
    const url = `/companies/${companyId}/leave/query/status`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { date } });
    return response.data;
  };
  
  export const getUserLeaveHistory = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<ApiResponse<LeaveRequest[]>> => {
    const url = `/companies/${companyId}/leave/query/users/${userId}/history`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getUserLeaveTransactions = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<ApiResponse<any[]>> => {
    const url = `/companies/${companyId}/leave/query/users/${userId}/transactions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getLeaveForecast = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    months = 6
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/leave/query/forecast`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { months } });
    return response.data;
  };
  
  export const checkLeaveAvailabilityGet = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: { leave_type_id: string; days: number; start_date: string }
  ): Promise<ApiResponse<LeaveAvailability>> => {
    const url = `/companies/${companyId}/leave/query/availability`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const checkLeaveAvailabilityPost = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: { leave_type_id: string; days: number; start_date: string }
  ): Promise<ApiResponse<LeaveAvailability>> => {
    const url = `/companies/${companyId}/leave/query/availability`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    // Not idempotent – simple POST (optional to add idempotency if needed)
    const response = await axiosInstance.post(url, payload, { headers });
    return response.data;
  };
  
  export const getLeaveUtilizationReport = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: { start_date: string; end_date: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/leave/query/report/utilization`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Internal Leave Resolution ============
  
  export const resolveOnboarding = async (
    deviceId: string,
    accessToken: string,
    payload: { company_id: string; user_id: string; joined_at: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/internal/leave/resolve/onboarding`;
    const headers = {
      'X-Device-ID': deviceId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'resolveOnboarding', { headers });
  };
  
  export const resolvePositionChange = async (
    deviceId: string,
    accessToken: string,
    payload: { company_id: string; user_id: string; changed_at: string }
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/internal/leave/resolve/position-change`;
    const headers = {
      'X-Device-ID': deviceId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'resolvePositionChange', { headers });
  };