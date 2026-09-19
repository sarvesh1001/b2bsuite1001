import {
  HREmployeeProfile,
  EmployeeDocument,
  EmployeeExit,
  DepartmentHistoryEntry,
  RoleHistoryEntry,
  CreateExitPayload,
  UploadDocumentPayload,
  AddMemberPayload,
  ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

// ---------- helper: base headers ----------
const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

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