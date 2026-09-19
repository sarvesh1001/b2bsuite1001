import {
  Department,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  ListDepartmentsParams,
  ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

// ---- Get root departments (no idempotency needed) ----
export const getRootDepartments = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<Department[]>> => {
  const url = `/companies/${companyId}/departments/root`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get<ApiResponse<Department[]>>(url, { headers });
  return response.data;
};

// ---- List departments (currently uses root endpoint; no idempotency) ----
// (If a paginated list endpoint is added later, update this function.)
export const listDepartments = async (
  companyId: string,
  deviceId: string,
  params: ListDepartmentsParams, // ignored for now; kept for future compatibility
  accessToken: string,
): Promise<ApiResponse<Department[]>> => {
  // Use the root endpoint; pagination params are not supported.
  return getRootDepartments(companyId, deviceId, accessToken);
};

// ---- Create department (idempotent) ----
export const createDepartment = async (
  companyId: string,
  deviceId: string,
  payload: CreateDepartmentPayload,
  accessToken: string,
): Promise<ApiResponse<Department>> => {
  const url = `/companies/${companyId}/departments`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<Department>>(
    url,
    payload,
    'createDepartment',
    { headers }
  );
};

// ---- Update department (idempotent) ----
export const updateDepartment = async (
  companyId: string,
  deviceId: string,
  departmentId: string,
  payload: UpdateDepartmentPayload,
  accessToken: string,
): Promise<ApiResponse<Department>> => {
  const url = `/companies/${companyId}/departments/${departmentId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPut<ApiResponse<Department>>(
    url,
    payload,
    'updateDepartment',
    { headers }
  );
};

// ---- Delete department (idempotent) ----
export const deleteDepartment = async (
  companyId: string,
  deviceId: string,
  departmentId: string,
  accessToken: string,
): Promise<ApiResponse<null>> => {
  const url = `/companies/${companyId}/departments/${departmentId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentDelete<ApiResponse<null>>(
    url,
    {},                     // pass empty object for consistency
    'deleteDepartment',
    { headers }
  );
};