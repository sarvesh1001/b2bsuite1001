// packages/api-client/src/leave.ts
import { axiosInstance, isAllLocations } from './axios-instance';
import {
  idempotentPost,
  idempotentPut,
  idempotentPatch,
  idempotentDelete,
} from './idempotency';
import type {
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
  LeaveTransaction,
  LeavePolicyRuleResolution,
  LeavePolicyResolutionResult,
  LeaveTypesListData,
  EntitlementsListData,
  LeaveRequestsListData,
  PendingRequestsData,
  BalancesListData,
  BalancesForUserData,
  BalanceForUserByTypeData,
  AccrualsListData,
  AccrualProcessData,
  UserOnLeaveData,
  LeaveHistoryData,
  TransactionsData,
  EffectivePoliciesData,
  MessageResponse,
} from '@b2b/shared-types';

// ========================================================================
// HEADERS — all handled by axios-instance interceptors.
// ========================================================================
const getBaseHeaders = (
  _companyId: string,
  _deviceId: string,
  _accessToken: string,
) => ({});

const selfServiceHeaders = (
  companyId: string,
  deviceId: string,
  accessToken: string,
) => ({
  ...getBaseHeaders(companyId, deviceId, accessToken),
  'X-Location-ID': 'ALL',
});

// ------------------------------------------------------------------------
// Date normalizer — bridges YYYY-MM-DD → RFC3339 for Go's time.Time DTOs.
// ------------------------------------------------------------------------
const toRFC3339 = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T00:00:00.000Z`).toISOString();
  }
  return v;
};

// ------------------------------------------------------------------------
// Backend quirk: Go marshals a nil slice as `null`, not `[]`.
// Normalize every list endpoint so screens never see null for an array.
// ------------------------------------------------------------------------
const arr = <T>(v: T[] | null | undefined): T[] =>
  Array.isArray(v) ? v : [];

type Envelope<T> = { success: boolean; data: T; message?: string };

const assertWritableLocation = () => {
  if (isAllLocations()) {
    throw new Error(
      'Pick a specific location before saving. All-Locations view is read-only for changes.',
    );
  }
};

// ========================================================================
// POLICY CONFIG
// ========================================================================

export const createPolicyConfig = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: CreatePolicyConfigPayload,
): Promise<LeavePolicyConfig> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config`;
  const body = {
    ...payload,
    effective_from: toRFC3339(payload.effective_from) ?? payload.effective_from,
    effective_to: toRFC3339(payload.effective_to),
  };
  const res = await idempotentPost<Envelope<LeavePolicyConfig>>(
    url,
    body,
    'createPolicyConfig',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const listPolicyConfigs = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeavePolicyConfig[]> => {
  const url = `/companies/${companyId}/leave/hr/policy-config`;
  const res = await axiosInstance.get<Envelope<LeavePolicyConfig[]>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  return arr(res.data?.data);
};

export const getPolicyConfig = async (
  companyId: string,
  policyId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeavePolicyConfig> => {
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}`;
  const res = await axiosInstance.get<Envelope<LeavePolicyConfig>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  return res.data.data;
};

export const updatePolicyConfig = async (
  companyId: string,
  policyId: string,
  deviceId: string,
  accessToken: string,
  payload: UpdatePolicyConfigPayload,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}`;
  const body = {
    ...payload,
    ...(payload.effective_from !== undefined && {
      effective_from: toRFC3339(payload.effective_from) ?? payload.effective_from,
    }),
    ...(payload.effective_to !== undefined && {
      effective_to: toRFC3339(payload.effective_to),
    }),
  };
  const res = await idempotentPatch<Envelope<never>>(
    url,
    body,
    'updatePolicyConfig',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Policy updated' };
};

export const deletePolicyConfig = async (
  companyId: string,
  policyId: string,
  deviceId: string,
  accessToken: string,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}`;
  const res = await idempotentDelete<Envelope<never>>(
    url,
    {},
    'deletePolicyConfig',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Policy deactivated' };
};

// ========================================================================
// POLICY RULES
// ========================================================================

export const addPolicyRule = async (
  companyId: string,
  policyId: string,
  deviceId: string,
  accessToken: string,
  payload: CreatePolicyRulePayload,
): Promise<PolicyRule> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}/rules`;
  const res = await idempotentPost<Envelope<PolicyRule>>(
    url,
    payload,
    'addPolicyRule',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const getPolicyRules = async (
  companyId: string,
  policyId: string,
  deviceId: string,
  accessToken: string,
): Promise<PolicyRule[]> => {
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}/rules`;
  const res = await axiosInstance.get<Envelope<PolicyRule[]>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  return arr(res.data?.data);
};

export const updatePolicyRule = async (
  companyId: string,
  policyId: string,
  ruleId: string,
  deviceId: string,
  accessToken: string,
  payload: UpdatePolicyRulePayload,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}/rules/${ruleId}`;
  const res = await idempotentPatch<Envelope<never>>(
    url,
    payload,
    'updatePolicyRule',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Rule updated' };
};

export const deletePolicyRule = async (
  companyId: string,
  policyId: string,
  ruleId: string,
  deviceId: string,
  accessToken: string,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policy-config/${policyId}/rules/${ruleId}`;
  const res = await idempotentDelete<Envelope<never>>(
    url,
    {},
    'deletePolicyRule',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Rule deleted' };
};

// ========================================================================
// LEAVE TYPES
// ========================================================================

export const listLeaveTypes = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeaveTypesListData> => {
  const url = `/companies/${companyId}/leave/hr/leave-types`;
  const res = await axiosInstance.get<Envelope<LeaveTypesListData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  const raw = res.data?.data;
  return {
    leave_types: arr(raw?.leave_types),
    total_count: raw?.total_count ?? 0,
    company_id: raw?.company_id ?? '',
    current_date: raw?.current_date ?? '',
  };
};

export const createLeaveType = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: CreateLeaveTypePayload,
): Promise<LeaveType> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/leave-types`;
  const res = await idempotentPost<Envelope<LeaveType>>(
    url,
    payload,
    'createLeaveType',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const getLeaveType = async (
  companyId: string,
  leaveTypeId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeaveType> => {
  const url = `/companies/${companyId}/leave/hr/leave-types/${leaveTypeId}`;
  const res = await axiosInstance.get<Envelope<LeaveType>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  return res.data.data;
};

export const updateLeaveType = async (
  companyId: string,
  leaveTypeId: string,
  deviceId: string,
  accessToken: string,
  payload: UpdateLeaveTypePayload,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/leave-types/${leaveTypeId}`;
  const res = await idempotentPut<Envelope<never>>(
    url,
    payload,
    'updateLeaveType',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Leave type updated' };
};

export const deleteLeaveType = async (
  companyId: string,
  leaveTypeId: string,
  deviceId: string,
  accessToken: string,
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/leave-types/${leaveTypeId}`;
  const res = await idempotentDelete<Envelope<never>>(
    url,
    {},
    'deleteLeaveType',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Leave type deleted' };
};

// ========================================================================
// ENTITLEMENTS
// ========================================================================

export const createEntitlement = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: CreateEntitlementPayload,
): Promise<Entitlement> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/entitlements`;
  const body = {
    ...payload,
    effective_from: toRFC3339(payload.effective_from) ?? payload.effective_from,
    effective_to: toRFC3339(payload.effective_to),
  };
  const res = await idempotentPost<Envelope<Entitlement>>(
    url,
    body,
    'createEntitlement',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const listEntitlements = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  params?: { user_id?: string; page?: number; page_size?: number },
): Promise<EntitlementsListData> => {
  const url = `/companies/${companyId}/leave/hr/entitlements`;
  const res = await axiosInstance.get<Envelope<EntitlementsListData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params,
  });
  const raw = res.data?.data;
  return {
    entitlements: arr(raw?.entitlements),
    pagination: {
      page: raw?.pagination?.page ?? 1,
      page_size: raw?.pagination?.page_size ?? 50,
      total: raw?.pagination?.total ?? 0,
      total_pages: raw?.pagination?.total_pages ?? 0,
    },
    company_id: raw?.company_id ?? '',
    user_id: raw?.user_id ?? null,
  };
};

// ========================================================================
// ACCRUALS
// ========================================================================

export const processMonthlyAccruals = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: { accrual_date?: string } = {},
): Promise<AccrualProcessData> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/accruals/monthly`;
  const body = payload.accrual_date
    ? { accrual_date: toRFC3339(payload.accrual_date) }
    : {};
  const res = await idempotentPost<Envelope<AccrualProcessData>>(
    url,
    body,
    'processMonthlyAccruals',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const getAccrualsByDate = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  date: string,
): Promise<AccrualsListData> => {
  const url = `/companies/${companyId}/leave/hr/accruals`;
  const res = await axiosInstance.get<Envelope<AccrualsListData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params: { date },
  });
  const raw = res.data?.data;
  return {
    accruals: arr(raw?.accruals),
    date: raw?.date ?? date,
    total_count: raw?.total_count ?? 0,
  };
};

// ========================================================================
// RECALCULATE ENTITLEMENT
// ========================================================================

export const recalculateEntitlement = async (
  companyId: string,
  entitlementId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeaveBalance> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/recalculate/${entitlementId}`;
  const res = await idempotentPost<Envelope<LeaveBalance>>(
    url,
    {},
    'recalculateEntitlement',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

// ========================================================================
// POLICY RESOLUTION
// ========================================================================

export const resolveSingleUser = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
  payload: { as_of?: string; reason?: string } = {},
): Promise<MessageResponse> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policies/resolve/user/${userId}`;
  const body = payload.as_of
    ? { ...payload, as_of: toRFC3339(payload.as_of) }
    : payload;
  const res = await idempotentPost<Envelope<never>>(
    url,
    body,
    'resolveSingleUser',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return { message: (res as any)?.message ?? 'Resolved' };
};

export const resolveBatchUsers = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: { user_ids: string[]; as_of?: string; reason?: string },
): Promise<LeavePolicyResolutionResult> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/hr/policies/resolve/batch`;
  const body = payload.as_of
    ? { ...payload, as_of: toRFC3339(payload.as_of) }
    : payload;
  const res = await idempotentPost<Envelope<LeavePolicyResolutionResult>>(
    url,
    body,
    'resolveBatchUsers',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const getEffectivePolicies = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
  asOf?: string,
): Promise<EffectivePoliciesData> => {
  const url = `/companies/${companyId}/leave/hr/policies/effective/${userId}`;
  const res = await axiosInstance.get<Envelope<EffectivePoliciesData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params: asOf ? { as_of: asOf } : undefined,
  });
  const raw = res.data?.data;
  return {
    policies: arr(raw?.policies),
    company_id: raw?.company_id ?? companyId,
    user_id: raw?.user_id ?? userId,
    as_of: raw?.as_of ?? '',
    count: raw?.count ?? 0,
  };
};

// ========================================================================
// LEAVE REQUESTS
// ========================================================================

export const createLeaveRequest = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/requests`;
  const body = {
    ...payload,
    start_date: toRFC3339(payload.start_date) ?? payload.start_date,
    end_date: toRFC3339(payload.end_date) ?? payload.end_date,
  };
  const res = await idempotentPost<Envelope<LeaveRequest>>(
    url,
    body,
    'createLeaveRequest',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const listLeaveRequests = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  params?: { status?: string; start_date?: string; end_date?: string },
): Promise<LeaveRequestsListData> => {
  const url = `/companies/${companyId}/leave/requests`;
  const res = await axiosInstance.get<Envelope<LeaveRequestsListData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params,
  });
  const raw = res.data?.data;
  return {
    requests: arr(raw?.requests),
    total_count: raw?.total_count ?? 0,
    start_date: raw?.start_date ?? '',
    end_date: raw?.end_date ?? '',
    status: raw?.status ?? '',
  };
};

export const getLeaveRequest = async (
  companyId: string,
  requestId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeaveRequest> => {
  const url = `/companies/${companyId}/leave/requests/${requestId}`;
  const res = await axiosInstance.get<Envelope<LeaveRequest>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  return res.data.data;
};

export const approveLeaveRequest = async (
  companyId: string,
  requestId: string,
  deviceId: string,
  accessToken: string,
  payload: ApproveRejectPayload = {},
): Promise<LeaveRequest> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/requests/${requestId}/approve`;
  const res = await idempotentPost<Envelope<LeaveRequest>>(
    url,
    payload,
    'approveLeaveRequest',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const rejectLeaveRequest = async (
  companyId: string,
  requestId: string,
  deviceId: string,
  accessToken: string,
  payload: ApproveRejectPayload = {},
): Promise<LeaveRequest> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/requests/${requestId}/reject`;
  const res = await idempotentPost<Envelope<LeaveRequest>>(
    url,
    payload,
    'rejectLeaveRequest',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const cancelLeaveRequest = async (
  companyId: string,
  requestId: string,
  deviceId: string,
  accessToken: string,
): Promise<LeaveRequest> => {
  assertWritableLocation();
  const url = `/companies/${companyId}/leave/requests/${requestId}/cancel`;
  const res = await idempotentPost<Envelope<LeaveRequest>>(
    url,
    {},
    'cancelLeaveRequest',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) },
  );
  return res.data;
};

export const getPendingLeaveRequests = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<PendingRequestsData> => {
  const url = `/companies/${companyId}/leave/requests/pending`;
  const res = await axiosInstance.get<Envelope<PendingRequestsData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
  });
  const raw = res.data?.data;
  return {
    pending_requests: arr(raw?.pending_requests),
    total_count: raw?.total_count ?? 0,
    company_id: raw?.company_id ?? companyId,
    approver_id: raw?.approver_id ?? '',
  };
};

// ========================================================================
// LEAVE QUERY — BALANCE
// ========================================================================

export const getMyLeaveBalance = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  asOf?: string,
): Promise<BalancesListData> => {
  const url = `/companies/${companyId}/leave/query/balance`;
  const res = await axiosInstance.get<Envelope<BalancesListData>>(url, {
    headers: selfServiceHeaders(companyId, deviceId, accessToken),
    params: asOf ? { as_of: asOf } : undefined,
  });
  const raw = res.data?.data;
  return {
    balances: arr(raw?.balances),
    user_id: raw?.user_id ?? '',
    company_id: raw?.company_id ?? companyId,
    as_of_date: raw?.as_of_date ?? '',
    total_types: raw?.total_types ?? 0,
  };
};

export const getMyLeaveBalanceByType = async (
  companyId: string,
  leaveTypeId: string,
  deviceId: string,
  accessToken: string,
  asOf?: string,
): Promise<LeaveBalance> => {
  const url = `/companies/${companyId}/leave/query/balance/${leaveTypeId}`;
  const res = await axiosInstance.get<Envelope<LeaveBalance>>(url, {
    headers: selfServiceHeaders(companyId, deviceId, accessToken),
    params: asOf ? { as_of: asOf } : undefined,
  });
  return res.data.data;
};

export const getUserLeaveBalance = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
  asOf?: string,
): Promise<BalancesForUserData> => {
  const url = `/companies/${companyId}/leave/query/users/${userId}/balance`;
  const res = await axiosInstance.get<Envelope<BalancesForUserData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params: asOf ? { as_of: asOf } : undefined,
  });
  const raw = res.data?.data;
  return {
    user_id: raw?.user_id ?? userId,
    company_id: raw?.company_id ?? companyId,
    as_of: raw?.as_of ?? '',
    balances: arr(raw?.balances),
  };
};

export const getUserLeaveBalanceByType = async (
  companyId: string,
  userId: string,
  leaveTypeId: string,
  deviceId: string,
  accessToken: string,
  asOf?: string,
): Promise<BalanceForUserByTypeData> => {
  const url = `/companies/${companyId}/leave/query/users/${userId}/balance/${leaveTypeId}`;
  const res = await axiosInstance.get<Envelope<BalanceForUserByTypeData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params: asOf ? { as_of: asOf } : undefined,
  });
  return res.data.data;
};

// ========================================================================
// LEAVE QUERY — STATUS / HISTORY / TRANSACTIONS / FORECAST
// ========================================================================

export const checkUserOnLeave = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  date?: string,
): Promise<UserOnLeaveData> => {
  const url = `/companies/${companyId}/leave/query/status`;
  const res = await axiosInstance.get<Envelope<UserOnLeaveData>>(url, {
    headers: selfServiceHeaders(companyId, deviceId, accessToken),
    params: date ? { date } : undefined,
  });
  return res.data.data;
};

export const getUserLeaveHistory = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
  params?: { start_date?: string; end_date?: string },
): Promise<LeaveHistoryData> => {
  const url = `/companies/${companyId}/leave/query/users/${userId}/history`;
  const res = await axiosInstance.get<Envelope<LeaveHistoryData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params,
  });
  const raw = res.data?.data;
  return {
    history: arr(raw?.history),
    user_id: raw?.user_id ?? userId,
    company_id: raw?.company_id ?? companyId,
    start_date: raw?.start_date ?? '',
    end_date: raw?.end_date ?? '',
    total_count: raw?.total_count ?? 0,
  };
};

export const getUserLeaveTransactions = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
  params?: { start_date?: string; end_date?: string },
): Promise<TransactionsData> => {
  const url = `/companies/${companyId}/leave/query/users/${userId}/transactions`;
  const res = await axiosInstance.get<Envelope<TransactionsData>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params,
  });
  const raw = res.data?.data;
  return {
    transactions: arr(raw?.transactions),
    total_count: raw?.total_count ?? 0,
    user_id: raw?.user_id ?? userId,
    company_id: raw?.company_id ?? companyId,
  };
};

export const getLeaveForecast = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  months = 6,
): Promise<LeaveBalance[]> => {
  const url = `/companies/${companyId}/leave/query/forecast`;
  const res = await axiosInstance.get<Envelope<LeaveBalance[]>>(url, {
    headers: selfServiceHeaders(companyId, deviceId, accessToken),
    params: { months },
  });
  return arr(res.data?.data);
};

// ========================================================================
// LEAVE QUERY — AVAILABILITY (POST only)
// ========================================================================

export const checkLeaveAvailabilityPost = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: { leave_type_id: string; days: number; start_date: string },
): Promise<LeaveAvailability> => {
  const url = `/companies/${companyId}/leave/query/availability`;
  const body = {
    ...payload,
    start_date: toRFC3339(payload.start_date) ?? payload.start_date,
  };
  const res = await axiosInstance.post<Envelope<LeaveAvailability>>(
    url,
    body,
    { headers: selfServiceHeaders(companyId, deviceId, accessToken) },
  );
  return res.data.data;
};

export const checkLeaveAvailabilityGet = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  params: { leave_type_id: string; days: number; start_date: string },
): Promise<LeaveAvailability> => {
  return checkLeaveAvailabilityPost(companyId, deviceId, accessToken, params);
};

// ========================================================================
// LEAVE QUERY — UTILIZATION REPORT
// ========================================================================

export const getLeaveUtilizationReport = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  params: { start_date: string; end_date: string },
): Promise<LeaveBalance[]> => {
  const url = `/companies/${companyId}/leave/query/report/utilization`;
  const res = await axiosInstance.get<Envelope<LeaveBalance[]>>(url, {
    headers: getBaseHeaders(companyId, deviceId, accessToken),
    params,
  });
  return arr(res.data?.data);
};

// ========================================================================
// INTERNAL
// ========================================================================

export const resolveOnboarding = async (
  deviceId: string,
  accessToken: string,
  payload: { company_id: string; user_id: string; joined_at: string },
): Promise<MessageResponse> => {
  const url = `/internal/leave/resolve/onboarding`;
  const body = {
    ...payload,
    joined_at: toRFC3339(payload.joined_at) ?? payload.joined_at,
  };
  const res = await idempotentPost<Envelope<never>>(
    url,
    body,
    'resolveOnboarding',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
      },
    },
  );
  return { message: (res as any)?.message ?? 'Onboarding resolved' };
};

export const resolvePositionChange = async (
  deviceId: string,
  accessToken: string,
  payload: { company_id: string; user_id: string; changed_at: string },
): Promise<MessageResponse> => {
  const url = `/internal/leave/resolve/position-change`;
  const body = {
    ...payload,
    changed_at: toRFC3339(payload.changed_at) ?? payload.changed_at,
  };
  const res = await idempotentPost<Envelope<never>>(
    url,
    body,
    'resolvePositionChange',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
      },
    },
  );
  return { message: (res as any)?.message ?? 'Position change resolved' };
};