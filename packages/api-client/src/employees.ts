import {
    CompanyEmployee,
    AddEmployeePayload,
    AddManagerPayload,
    SearchEmployeesPayload,
    AdvancedSearchEmployeesParams,
    ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost } from './idempotency';

const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
});

// ---- Get company employees ----
export const getCompanyEmployees = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/getemployees`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
};

// ---- Get company hierarchy ----
export const getCompanyHierarchy = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
): Promise<ApiResponse<{ hierarchy: any[]; meta: any }>> => {
    const url = `/companies/${companyId}/hierarchy`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
};

// ---- Search employees (extended to support filters) ----
export const searchEmployees = async (
    companyId: string,
    deviceId: string,
    payload: SearchEmployeesPayload & { role_id?: string; department_id?: string },
    accessToken: string,
): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/employees/search`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const body: any = {
        query: payload.query || '',
        search_type: payload.search_type || 'fulltext',
        limit: payload.limit || 20,
        offset: payload.offset || 0,
    };
    // Add optional filters if present
    if (payload.role_id) body.role_id = payload.role_id;
    if (payload.department_id) body.department_id = payload.department_id;
    const response = await axiosInstance.post(url, body, { headers });
    return response.data;
};

// ---- Advanced search ----
export const advancedSearchEmployees = async (
    companyId: string,
    deviceId: string,
    params: AdvancedSearchEmployeesParams,
    accessToken: string,
): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/employees/search/advanced`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
};

// ---- Get employee suggestions ----
export const getEmployeeSuggestions = async (
    companyId: string,
    deviceId: string,
    prefix: string,
    limit: number,
    accessToken: string,
): Promise<ApiResponse<CompanyEmployee[]>> => {
    const url = `/companies/${companyId}/employees/suggestions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { prefix, limit } });
    return response.data;
};

// ---- Find employee by username ----
export const findEmployeeByUsername = async (
    companyId: string,
    deviceId: string,
    username: string,
    accessToken: string,
): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/employees/username/${encodeURIComponent(username)}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<CompanyEmployee>>(url, { headers });
    return response.data;
};

// ---- Add employee (idempotent) ----
export const addEmployee = async (
    companyId: string,
    deviceId: string,
    payload: AddEmployeePayload,
    accessToken: string,
): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/rbac/employees`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<CompanyEmployee>>(url, payload, 'addEmployee', { headers });
};

// ---- Add manager (idempotent) ----
export const addManager = async (
    companyId: string,
    deviceId: string,
    payload: AddManagerPayload,
    accessToken: string,
): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/rbac/managers`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<CompanyEmployee>>(url, payload, 'addManager', { headers });
};

// ================================================================
// NEW / UPDATED APIs for Employee Details and Update
// ================================================================

/**
 * Get full employee details including role, position, department, work center.
 * Uses the RBAC GET endpoint: /companies/{companyId}/rbac/employees/{userId}
 * Returns the employee data object inside `data`.
 */
export const getEmployeeDetails = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
): Promise<CompanyEmployee & {
    role_name?: string;
    position_title?: string;
    department_name?: string;
    work_center_code?: string;
    hire_date?: string;
    created_at?: string;
    updated_at?: string;
}> => {
    const url = `/companies/${companyId}/rbac/employees/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<any>>(url, { headers });
    // The API returns { success, data: { ...employee }, message, timestamp }
    return response.data.data;
};

/**
 * Update employee fields using PATCH.
 * Supports partial updates; only provided fields will be updated.
 * Endpoint: PATCH /companies/{companyId}/rbac/employees/{userId}
 */
export const updateEmployee = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: {
        employee_id?: string;
        role_id?: string;
        position_id?: string;
        reports_to?: string | null;
        is_active?: boolean;
        phone?: string;
        username?: string;
        full_name?: string;
        hire_date?: string;
    }
): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/rbac/employees/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.patch(url, payload, { headers });
    return response.data;
};

// ---- Get departments for a user ----
export const getUserDepartments = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
): Promise<ApiResponse<Array<{
    department_id: string;
    department_name: string;
    system_department_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}>>> => {
    const url = `/companies/${companyId}/rbac/companies/${companyId}/users/${userId}/departments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
};