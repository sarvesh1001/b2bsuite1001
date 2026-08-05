import {
    Role,
    CreateRolePayload,
    UpdateRolePayload,
    ListRolesParams,
    AssignPermissionsPayload,
    BulkAssignPayload,
    ApiResponse,
    Permission,
    Department,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
});

// ---- List roles ----
export const listRoles = async (
    companyId: string,
    deviceId: string,
    params: ListRolesParams,
    accessToken: string,
): Promise<ApiResponse<{ roles: Role[]; total: number; page: number; limit: number }>> => {
    const url = `/companies/${companyId}/rbac/roles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
};

// ---- Get role by ID ----
export const getRole = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    accessToken: string,
): Promise<ApiResponse<Role>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<Role>>(url, { headers });
    return response.data;
};

// ---- Create role (idempotent) ----
export const createRole = async (
    companyId: string,
    deviceId: string,
    payload: CreateRolePayload,
    accessToken: string,
): Promise<ApiResponse<Role>> => {
    const url = `/companies/${companyId}/rbac/roles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Role>>(url, payload, 'createRole', { headers });
};

// ---- Update role (idempotent) ----
export const updateRole = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    payload: UpdateRolePayload,
    accessToken: string,
): Promise<ApiResponse<Role>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<Role>>(url, payload, 'updateRole', { headers });
};

// ---- Delete role (idempotent) ----
export const deleteRole = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    accessToken: string,
): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<null>>(url, undefined, 'deleteRole', { headers });
};

// ---- Assign permissions to role ----
export const assignPermissionsToRole = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    payload: AssignPermissionsPayload,
    accessToken: string,
): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}/permissions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<null>>(url, payload, 'assignPermissions', { headers });
};

// ---- Get role permissions (DEPRECATED: returns only permission names) ----
export const getRolePermissions = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    accessToken: string,
): Promise<ApiResponse<string[]>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}/permissions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<string[]>>(url, { headers });
    return response.data;
};

// ---- Get detailed role permissions (returns full Permission objects) ----
export const getRolePermissionsDetailed = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    accessToken: string,
): Promise<ApiResponse<Permission[]>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}/permissions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<Permission[]>>(url, { headers });
    return response.data;
};

// ---- Get role departments ----
export const getRoleDepartments = async (
    companyId: string,
    deviceId: string,
    roleId: string,
    accessToken: string,
): Promise<ApiResponse<Department[]>> => {
    const url = `/companies/${companyId}/rbac/roles/${roleId}/departments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<Department[]>>(url, { headers });
    return response.data;
};

// ---- Get user permissions ----
export const getUserPermissions = async (
    companyId: string,
    deviceId: string,
    userId: string,
    accessToken: string,
): Promise<ApiResponse<string[]>> => {
    const url = `/companies/${companyId}/rbac/users/${userId}/permissions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<string[]>>(url, { headers });
    return response.data;
};

// ---- Check user permission ----
export const checkUserPermission = async (
    companyId: string,
    deviceId: string,
    userId: string,
    permission: string,
    accessToken: string,
): Promise<ApiResponse<{ has_permission: boolean }>> => {
    const url = `/companies/${companyId}/rbac/users/${userId}/permissions/check`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<{ has_permission: boolean }>>(url, {
        headers,
        params: { permission },
    });
    return response.data;
};

// ---- Bulk assign roles ----
export const bulkAssignRoles = async (
    companyId: string,
    deviceId: string,
    payload: BulkAssignPayload,
    accessToken: string,
): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/rbac/bulk-assign`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<null>>(url, payload, 'bulkAssignRoles', { headers });
};