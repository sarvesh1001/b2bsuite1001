// apps/prayantra-b2b/src/api/employee.ts
// (path may differ — this is the file that currently exports
//  addEmployee / addManager / getEmployeeDetails / updateEmployee)

import {
    CompanyEmployee,
    AddEmployeePayload,
    AddManagerPayload,
    AddMemberPayload,
    SearchEmployeesPayload,
    AdvancedSearchEmployeesParams,
    // 👇 NEW — typeahead + batch hydrate
    SearchEmployeesTypeaheadParams,
    EmployeeTypeaheadResponse,
    EmployeeTypeaheadIDsResponse,
    EmployeeTypeaheadDetailsResponse,
    GetEmployeeDetailsByIDsPayload,
    GetEmployeeDetailsByIDsResponse,
    ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPatch } from './idempotency';

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

// ---- Add employee (idempotent, legacy) ----
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

// ---- Add manager (idempotent, legacy) ----
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
// UNIFIED MEMBER CREATION  (NEW — preferred for all new callers)
// ----------------------------------------------------------------
// Single endpoint replacing addEmployee / addManager.
// Backend dispatches based on `member_type` ("employee" | "manager").
// Also supports optional location assignment fields.
// ================================================================
export const addMember = async (
    companyId: string,
    deviceId: string,
    payload: AddMemberPayload,
    accessToken: string,
): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/rbac/members`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<CompanyEmployee>>(
        url,
        payload,
        'addMember',
        { headers },
    );
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
 * Now uses idempotentPatch to add Idempotency-Key header.
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
    return idempotentPatch<ApiResponse<{ message: string }>>(
        url,
        payload,
        'updateEmployee',          // unique operation name for key caching
        { headers }
    );
};


// ================================================================
// TYPEAHEAD SEARCH + BATCH HYDRATE  (NEW)
// ----------------------------------------------------------------
// Backs the two new /hr/employees/* endpoints. Both are location-scoped
// server-side from the caller's session, so the client does NOT pass any
// location filter — the backend applies it via locationctx.
// ================================================================

/**
 * Free-text employee search with automatic mode selection:
 *   - empty query      → recommendation feed
 *   - 1-2 chars        → prefix match
 *   - 3+ chars         → trigram + full-text (typo-tolerant)
 *
 * Two overloads:
 *   - `idsOnly = true`  → resolves to `data: string[]` (cheap; no decrypt)
 *   - `idsOnly = false` → resolves to `data: DecryptedEmployeeDetails[]`
 *
 * @param companyId   Company UUID (path param)
 * @param deviceId    Device UUID (X-Device-ID header)
 * @param accessToken Bearer token
 * @param params      Query parameters (all optional)
 * @param idsOnly     When true, returns only user IDs; default false
 *
 * @example
 *   // Feed (no query)
 *   const feed = await searchEmployeesTypeahead(cid, did, tok, {});
 *
 *   // Type-ahead
 *   const hits = await searchEmployeesTypeahead(cid, did, tok, {
 *     q: 'ravi', page: 1, page_size: 30,
 *   });
 *
 *   // IDs-only prefetch
 *   const ids = await searchEmployeesTypeahead(
 *     cid, did, tok, { q: 'ravi', ids_only: true }, true,
 *   );
 */
export function searchEmployeesTypeahead(
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: SearchEmployeesTypeaheadParams | undefined,
    idsOnly: true,
): Promise<EmployeeTypeaheadIDsResponse>;

export function searchEmployeesTypeahead(
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: SearchEmployeesTypeaheadParams,
    idsOnly?: false,
): Promise<EmployeeTypeaheadDetailsResponse>;

export async function searchEmployeesTypeahead(
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: SearchEmployeesTypeaheadParams = {},
    idsOnly = false,
): Promise<EmployeeTypeaheadResponse> {
    const url = `/companies/${companyId}/hr/employees/typeahead`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);

    // Only send explicitly-set params — avoid `?q=` on the wire so the
    // backend cleanly hits the recommendation-feed branch.
    const query: Record<string, string | number | boolean> = {};
    if (params.q !== undefined) query.q = params.q;
    if (params.page !== undefined) query.page = params.page;
    if (params.page_size !== undefined) query.page_size = params.page_size;

    // ids_only is a transport hint — default to false (server default too)
    query.ids_only = idsOnly;

    const response = await axiosInstance.get<EmployeeTypeaheadResponse>(url, {
        headers,
        params: query,
    });
    return response.data;
}

/**
 * Batch hydrate + decrypt a caller-supplied list of user IDs.
 *
 * Intended for clients that already have IDs (e.g. from a previous
 * `ids_only=true` search) and want the full record for a subset —
 * e.g. to refresh a visible page after a websocket invalidation.
 *
 * Server enforces:
 *   - max 200 IDs per call
 *   - company + location scope (IDs outside scope are silently dropped)
 *
 * @example
 *   const details = await getEmployeeDetailsByIDs(cid, did, tok, {
 *     user_ids: ['uuid-1', 'uuid-2'],
 *   });
 *   // details.data  → DecryptedEmployeeDetails[]
 */
export const getEmployeeDetailsByIDs = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: GetEmployeeDetailsByIDsPayload,
): Promise<GetEmployeeDetailsByIDsResponse> => {
    const url = `/companies/${companyId}/hr/employees/details`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);

    // Client-side guard mirrors the server cap so we fail fast with a
    // clear message instead of a 400 from the backend.
    if (payload.user_ids.length > 200) {
        throw new Error(
            `getEmployeeDetailsByIDs: max 200 user_ids per call (got ${payload.user_ids.length})`,
        );
    }

    const response = await axiosInstance.post<GetEmployeeDetailsByIDsResponse>(
        url,
        payload,
        { headers },
    );
    return response.data;
};



// ================================================================
// GET MY DEPARTMENTS  (self-service)
// ----------------------------------------------------------------
// Calls the new self-service endpoint:
//     GET /companies/{companyId}/me/departments
//
// The backend reads user identity from the JWT — there is NO {userId}
// in the URL, so an employee can only ever read their OWN departments,
// regardless of role. This replaces the old permission-gated route:
//     GET /companies/{companyId}/rbac/companies/{companyId}/users/{userId}/departments
//
// The `userId` parameter is intentionally retained for backwards
// compatibility with existing call sites (e.g. ModuleGridScreen),
// but it is NOT sent to the server anymore — the server derives it
// from the token.
// ================================================================
export const getUserDepartments = async (
    companyId: string,
    userId: string, // 👈 kept for caller compat; ignored by the API
    deviceId: string,
    accessToken: string,
): Promise<ApiResponse<Array<{
    department_id: string;
    department_name: string;
    system_department_id?: string;
    parent_department_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}>>> => {
    const url = `/companies/${companyId}/me/departments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
};