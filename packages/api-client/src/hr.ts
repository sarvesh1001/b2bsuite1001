// packages/api-client/src/hr.ts
import {
  HREmployeeProfile,
  EmployeeDocument,
  EmployeeExit,
  DepartmentHistoryEntry,
  RoleHistoryEntry,
  CreateExitPayload,
  UploadDocumentPayload,
  AddMemberPayload,
  UpdateMemberRequest,
  ApiResponse,
  EmployeeFormOptions,        // 👈 ADD THIS
  ListRemindersParams,
  Reminder,
  ReminderFeedPayload,
  ReminderCountsPayload,


} from '@b2b/shared-types';
import type {
  EmployeeStatusNow,
  EmployeeProbation,
  EmployeeNotice,
  EmployeeOnHold,
  ConfirmProbationRequest,
  FailProbationRequest,
  ExtendProbationRequest,
  StartNoticeRequest,
  CancelNoticeRequest,
  StartOnHoldRequest,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentPatch, idempotentDelete } from './idempotency';

// ---------- helper: base headers ----------
const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

/**
 * Same as getBaseHeaders but optionally adds X-Location-ID.
 *
 * Writes that touch location-granted resources require a location header;
 * the backend rejects X-Location-ID: ALL on writes, so callers must pass
 * a concrete location id (typically the caller's current selection, falling
 * back to the primary).
 */
const getWriteHeaders = (
  companyId: string,
  deviceId: string,
  accessToken: string,
  locationId?: string,
) => {
  const headers: Record<string, string> = getBaseHeaders(companyId, deviceId, accessToken);
  if (locationId && locationId !== 'ALL') {
    headers['X-Location-ID'] = locationId;
  }
  return headers;
};

// -------------------- Employee Profiles --------------------

// GET – no idempotency
export const listEmployees = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  page = 1,
  pageSize = 50
): Promise<ApiResponse<{ employees: HREmployeeProfile[]; total: number }>> => {
  const url = `/companies/${companyId}/hr/employees`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, {
    headers,
    params: { page, page_size: pageSize },
  });
  return response.data;
};

// ============================================================
// Atomic employee creation
// POST /companies/{companyId}/hr/employees
//
// Backend writes user + company_employees + employee_profiles
// (+ location grants) in a single transaction. Any failure rolls
// everything back — no orphan users, no roster rows without
// profiles. Use this for all "create employee" flows.
// ============================================================
export const createEmployee = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: AddMemberPayload,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    payload,
    'createEmployee',
    { headers },
  );
};

// ============================================================
// Full HR update — PATCH /companies/{cid}/rbac/members/{userId}
//
// Mirrors AddMember's writable surface (everything except user_id,
// company_id, employee_id). Updates all four tables atomically:
//   users · company_employees · employee_location_access ·
//   employee_profiles
//
// Every body field is optional; only provided keys are updated.
// `selected_locations` is replace-on-present:
//   - omit the key entirely → grants untouched
//   - send []               → all grants cleared
//   - send [{ ... }]        → grants replaced with this set
//
// @param locationId Concrete location id for X-Location-ID. Required
//                   by the backend on writes; pass the caller's
//                   current selection (or their primary location).
//                   Do NOT pass 'ALL' — the backend rejects it.
// ============================================================
export const updateMember = async (
  companyId: string,
  userId: string,
  payload: UpdateMemberRequest,
  deviceId: string,
  accessToken: string,
  locationId?: string,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/rbac/members/${userId}`;
  const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
  return idempotentPatch<ApiResponse<{ message: string }>>(
    url,
    payload,
    `updateMember:${companyId}:${userId}`,
    { headers },
  );
};

// POST – uses idempotentPost
// @deprecated — kept for legacy callers. Prefer `createEmployee` above,
// which is atomic (user + roster + profile in one tx). This older function
// only writes a profile row and requires the roster to already exist.
export const createEmployeeProfile = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  payload: Omit<HREmployeeProfile, 'id' | 'company_id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<HREmployeeProfile>> => {
  const url = `/companies/${companyId}/hr/employees`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<HREmployeeProfile>>(
    url,
    payload,
    'createEmployeeProfile',
    { headers }
  );
};

// GET – no idempotency
export const getEmployeeProfile = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<HREmployeeProfile>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// PUT – uses idempotentPut
//
// @deprecated — this hits the PII-only handler (PUT /hr/employees/{id}).
// For full HR updates (roster + grants + dossier) use `updateMember` above.
export const updateEmployeeProfile = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string,
  payload: Partial<Omit<HREmployeeProfile, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<HREmployeeProfile>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPut<ApiResponse<HREmployeeProfile>>(
    url,
    payload,
    'updateEmployeeProfile',
    { headers }
  );
};

// DELETE – uses idempotentDelete
export const deleteEmployeeProfile = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentDelete<ApiResponse<{ message: string }>>(
    url,
    {},
    'deleteEmployeeProfile',
    { headers }
  );
};

// GET – no idempotency
export const searchEmployeeProfiles = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  queryParams: {
    employment_type?: string;
    employment_status?: string;
    department_id?: string;
    grade?: string;
    page?: number;
    page_size?: number;
  }
): Promise<ApiResponse<{ employees: HREmployeeProfile[]; total: number }>> => {
  const url = `/companies/${companyId}/hr/employees/search`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers, params: queryParams });
  return response.data;
};

// GET – no idempotency
export const getEmployeeStats = async (
  companyId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<any>> => {
  const url = `/companies/${companyId}/hr/employees/stats`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// GET – no idempotency
export const exportEmployeeData = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  const url = `/companies/${companyId}/hr/employees/export`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, {
    headers,
    params: { format },
    responseType: 'blob',
  });
  return response.data;
};

// -------------------- Employee Documents --------------------

// GET – no idempotency
export const getEmployeeDocuments = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string,
  includeConfidential = false
): Promise<ApiResponse<EmployeeDocument[]>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/documents`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, {
    headers,
    params: { include_confidential: includeConfidential },
  });
  return response.data;
};

// POST with FormData – still use idempotentPost (it will add the key)
export const uploadEmployeeDocument = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string,
  payload: UploadDocumentPayload
): Promise<ApiResponse<EmployeeDocument>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/documents`;
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('document_type', payload.document_type);
  formData.append('document_name', payload.document_name);
  formData.append('is_confidential', String(payload.is_confidential ?? false));

  const headers = {
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
  };
  return idempotentPost<ApiResponse<EmployeeDocument>>(
    url,
    formData,
    'uploadEmployeeDocument',
    { headers }
  );
};

// GET – no idempotency
export const downloadEmployeeDocument = async (
  companyId: string,
  employeeId: string,
  documentId: string,
  deviceId: string,
  accessToken: string
): Promise<Blob> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/documents/${documentId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, {
    headers,
    responseType: 'blob',
  });
  return response.data;
};

// GET – no idempotency
export const generateDocumentUrl = async (
  companyId: string,
  employeeId: string,
  documentId: string,
  deviceId: string,
  accessToken: string,
  expiry = '1h'
): Promise<ApiResponse<{ url: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/documents/${documentId}/url`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, {
    headers,
    params: { expiry },
  });
  return response.data;
};

// DELETE – uses idempotentDelete
export const deleteEmployeeDocument = async (
  companyId: string,
  employeeId: string,
  documentId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/documents/${documentId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentDelete<ApiResponse<{ message: string }>>(
    url,
    {},
    'deleteEmployeeDocument',
    { headers }
  );
};

// -------------------- Employee History & Exit --------------------

// GET – no idempotency
export const getDepartmentHistory = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<DepartmentHistoryEntry[]>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/department-history`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// GET – no idempotency
export const getRoleHistory = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<RoleHistoryEntry[]>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/role-history`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// GET – no idempotency
export const getEmployeeExit = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<EmployeeExit>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/exit`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// POST – uses idempotentPost
export const createEmployeeExit = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string,
  payload: CreateExitPayload
): Promise<ApiResponse<EmployeeExit>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/exit`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<EmployeeExit>>(
    url,
    payload,
    'createEmployeeExit',
    { headers }
  );
};

// POST – uses idempotentPost (empty payload)
export const rehireEmployee = async (
  companyId: string,
  employeeId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeId}/exit/rehire`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    {},
    'rehireEmployee',
    { headers }
  );
};


// ============================================================
// GET EMPLOYEE FORM OPTIONS  (single-call prefetch)
// ------------------------------------------------------------
// GET /companies/{cid}/hr/employee-form/options
//
// Returns, in one round trip:
//   • the caller's allowed locations (scope-aware)
//   • every role, each bundled with its granted departments
//   • every open position the caller may fill
//   • every active work center the caller may use
//
// Location scoping is done server-side from the caller's session.
// The client cannot widen it.
//
// IMPORTANT: This endpoint must be reachable WITHOUT an
// X-Location-ID header. It lives outside LocationValidationMiddleware.
// ============================================================
export const getEmployeeFormOptions = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<EmployeeFormOptions>> => {
  const url = `/companies/${companyId}/me/employee-form-options`;   // 👈 was /hr/employee-form/options
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get<ApiResponse<EmployeeFormOptions>>(url, { headers });
  return response.data;
};


// ============================================================
// HR REMINDERS — in-app feed for HR lifecycle events
// ------------------------------------------------------------
// These are per-HR-user, not location-scoped, but the routes live
// under the company-scoped /hr mount so the interceptor still adds
// X-Location-ID. That's fine — the backend ignores it for these
// endpoints; the recipient is always derived from the JWT.
// ============================================================

/**
 * List the caller's reminders, newest first, grouped by day.
 *
 * @example
 *   // Unread only
 *   const unread = await listReminders(cid, did, tok, { status: 'unread' });
 *
 *   // Critical probation reminders
 *   const critical = await listReminders(cid, did, tok, {
 *     severity: 'critical',
 *     type_prefix: 'probation_',
 *   });
 */
export const listReminders = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
  params: ListRemindersParams = {},
): Promise<ApiResponse<ReminderFeedPayload> & {
  meta: { page: number; page_size: number; total_count: number };
}> => {
  const url = `/companies/${companyId}/hr/reminders`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  const query: Record<string, string | number> = {};
  if (params.status)      query.status      = params.status;
  if (params.severity)    query.severity    = params.severity;
  if (params.type)        query.type        = params.type;
  if (params.type_prefix) query.type_prefix = params.type_prefix;
  if (params.since)       query.since       = params.since;
  if (params.page !== undefined)      query.page      = params.page;
  if (params.page_size !== undefined) query.page_size = params.page_size;

  const response = await axiosInstance.get(url, { headers, params: query });
  return response.data;
};

/**
 * Badge count for the bell icon.
 * Cheap enough to poll every 60s.
 */
export const getReminderCounts = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<ReminderCountsPayload>> => {
  const url = `/companies/${companyId}/hr/reminders/count`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/**
 * Mark a single reminder read. Idempotent — re-marking a read row is a
 * no-op on the server, so we still send Idempotency-Key for safety.
 */
export const markReminderRead = async (
  companyId: string,
  reminderId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/reminders/${reminderId}/read`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    {},
    `markReminderRead:${companyId}:${reminderId}`,
    { headers },
  );
};

/**
 * Mark every unread reminder read for the caller.
 * Returns the affected count so the UI can flip its badge in one shot.
 */
export const markAllRemindersRead = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<{ affected_count: number }>> => {
  const url = `/companies/${companyId}/hr/reminders/read-all`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ affected_count: number }>>(
    url,
    {},
    `markAllRemindersRead:${companyId}`,
    { headers },
  );
};

/**
 * Dismiss a reminder — soft-delete from the feed. Read-only rows and
 * already-dismissed rows are no-ops.
 */
export const dismissReminder = async (
  companyId: string,
  reminderId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/reminders/${reminderId}/dismiss`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    {},
    `dismissReminder:${companyId}:${reminderId}`,
    { headers },
  );
};


// ============================================================
// EMPLOYEE LIFECYCLE — probation / notice / on-hold
// ------------------------------------------------------------
// Path pattern: /companies/{cid}/hr/employees/{employeeProfileId}/...
// `employeeProfileId` is the employee_profile_id (not user_id).
// All writes go through idempotentPost.
// Location is attached automatically by the axios interceptor.
// ============================================================

// ---- Status read ----

export const getEmployeeStatusNow = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<EmployeeStatusNow>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/status-now`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get<ApiResponse<EmployeeStatusNow>>(url, { headers });
  return response.data;
};

// ---- Probation ----

export const confirmProbation = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: ConfirmProbationRequest,
): Promise<ApiResponse<EmployeeProbation>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/probation/confirm`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<EmployeeProbation>>(
    url,
    payload,
    `confirmProbation:${employeeProfileId}`,
    { headers },
  );
};

export const failProbation = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: FailProbationRequest,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/probation/fail`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    payload,
    `failProbation:${employeeProfileId}`,
    { headers },
  );
};

export const extendProbation = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: ExtendProbationRequest,
): Promise<ApiResponse<EmployeeProbation>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/probation/extend`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<EmployeeProbation>>(
    url,
    payload,
    `extendProbation:${employeeProfileId}`,
    { headers },
  );
};

// ---- Notice ----

export const startNotice = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: StartNoticeRequest,
): Promise<ApiResponse<EmployeeNotice>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/notice/start`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<EmployeeNotice>>(
    url,
    payload,
    `startNotice:${employeeProfileId}`,
    { headers },
  );
};

export const cancelNotice = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: CancelNoticeRequest,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/notice/cancel`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    payload,
    `cancelNotice:${employeeProfileId}`,
    { headers },
  );
};

// ---- On-hold ----

export const startOnHold = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
  payload: StartOnHoldRequest,
): Promise<ApiResponse<EmployeeOnHold>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/on-hold/start`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<EmployeeOnHold>>(
    url,
    payload,
    `startOnHold:${employeeProfileId}`,
    { headers },
  );
};

export const endOnHold = async (
  companyId: string,
  employeeProfileId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/hr/employees/${employeeProfileId}/on-hold/end`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<{ message: string }>>(
    url,
    {},
    `endOnHold:${employeeProfileId}`,
    { headers },
  );
};

// ============================================================
// Reactivate — PATCH /companies/{companyId}/hr/employees/user/{userId}/reactivate
//
// Restores a terminated or resigned employee to active.
// Idempotent on the backend: already-active is a no-op 200.
//
// NOTE: keyed by user_id (not employee_profile_id) — deliberately
// different from the sibling lifecycle routes under /employees/{employeeId}.
// The mobile list already carries user_id per row and doesn't want to
// do a profile lookup just to hit this.
//
// Errors surfaced as-is:
//   400 — status guard blocked (probation / notice / on_hold)
//   403 — employee outside caller's location scope
//   404 — employee not found
// ============================================================
export const reactivateEmployee = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<{ user_id: string; company_id: string; status: string }>> => {
  const url = `/companies/${companyId}/hr/employees/user/${userId}/reactivate`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPatch<
    ApiResponse<{ user_id: string; company_id: string; status: string }>
  >(
    url,
    {},
    `reactivateEmployee:${companyId}:${userId}`,
    { headers },
  );
};