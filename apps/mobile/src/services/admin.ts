// apps/mobile/src/services/admin.ts
import { axiosInstance } from '@b2b/api-client';
import { Platform } from 'react-native';
import {
  idempotentPost,
  idempotentPut,
  idempotentPatch,
  idempotentDelete,
} from '../utils/idempotencyRequest';

// ============================================================
// Types
// ============================================================

export interface SystemDepartment {
  system_department_id: string;
  name: string;
  module_code: string;
  description: string;
  bitmask: number;
}

export interface Permission {
  permission_id: string;
  permission_name: string;
  description: string;
  category: string;
  module: string;
  scope: string;
  requires_tier: string;
  bit_index: number;
  created_at: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  owner_user_id: string;
  subscription_tier: string;
  subscription_status: string;
  max_employees: number;
  max_departments: number;
  data_region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  FinancialYearStartMonth?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
}

export interface CompanyEmployee {
  company_id: string;
  user_id: string;
  employee_id: string;
  role_id: string;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyDepartment {
  department_id: string;
  company_id: string;
  department_name: string;
  system_department_id: string | null;
  system_department_name: string;
  module_code: string;
  parent_department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyRole {
  role_id: string;
  role_name: string;
  role_level: number;
  company_id: string;
  is_system_role: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  username: string;
  full_name: string;
  phone_hash?: string;
  email?: string;
  role?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  kyc_status?: string;
  kyc_level?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  data_region?: string;
}

export interface CreateCompanyPayload {
  company_name: string;
  owner_phone: string;
  owner_username: string;
  owner_full_name: string;
  owner_position_title: string;
  subscription_tier: string;
  max_employees: number;
  max_departments: number;
  data_region: string;
  subscription_months: number;
  subscription_days?: number;
  financial_year_start_month: number;
  departments: string[];
  work_center_code?: string;
  work_center_name?: string;
  work_center_description?: string;
  work_center_timezone?: string;
  work_center_is_active?: boolean;
}

export interface UpdateSubscriptionPayload {
  tier?: string;
  status?: string;
  max_employees?: number;
}

export interface ExtendSubscriptionPayload {
  additional_months: number;
  additional_days?: number;
}

export interface UpdateUserPayload {
  username?: string;
  full_name?: string;
  data_region?: string;
  email?: string;
  phone?: string;
}

export interface UpdateKycPayload {
  status: string;
  level: string;
  reason?: string;
}

export interface UserSearchFilters {
  username?: string;
  full_name?: string;
  kyc_status?: string;
  is_active?: boolean;
  data_region?: string;
  phone_hash?: string;
  user_id?: string;
}

export interface AuditFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface AddDepartmentPayload {
  department_name?: string;          // Custom name (optional if system_department_id is provided)
  system_department_id?: string;     // Link to a system department (optional)
  parent_department_id?: string;     // Optional parent
}

export interface UpdateMaxDepartmentsPayload {
  max_departments: number;
}

// ============================================================
// Department APIs
// ============================================================

export const getSystemDepartments = async (): Promise<SystemDepartment[]> => {
  const response = await axiosInstance.get('/admin/system/departments');
  return response.data?.data ?? response.data;
};

export const getCompanyDepartments = async (
  companyId: string,
  limit = 50,
  offset = 0
): Promise<{ departments: CompanyDepartment[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/departments`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

// 🆕 Get deactivated (soft-deleted) departments
export const getDeactivatedDepartments = async (companyId: string): Promise<CompanyDepartment[]> => {
  const response = await axiosInstance.get(`/companies/${companyId}/deactivated-departments`);
  return response.data?.data ?? response.data;
};

// 🆕 Activate a previously deactivated department
export const activateDepartment = async (companyId: string, deptId: string): Promise<any> => {
  const result = await idempotentPatch(
    `/companies/${companyId}/departments/${deptId}/activate`,
    {},
    'activateDepartment'
  );
  return result?.data ?? result;
};

// Soft-delete (deactivate) a department
export const softDeleteDepartment = async (companyId: string, deptId: string): Promise<any> => {
  const result = await idempotentDelete(
    `/companies/${companyId}/departments/${deptId}/soft`,
    undefined,
    'softDeleteDepartment'
  );
  return result?.data ?? result;
};

// Add a new department (linked to a system department)
export const addCompanyDepartment = async (companyId: string, payload: AddDepartmentPayload): Promise<any> => {
    console.log('📤 [addCompanyDepartment] URL:', `/admin/companies/${companyId}`);
    console.log('📤 [addCompanyDepartment] Payload:', payload);
    const result = await idempotentPost(
      `/admin/companies/${companyId}`,   // 👈 removed '/departments'
      payload,
      'addCompanyDepartment'
    );
    console.log('✅ [addCompanyDepartment] Response:', result);
    return result?.data ?? result;
  };
// Get active department count
export const getActiveDepartmentCount = async (companyId: string): Promise<{ active_departments: number }> => {
  const response = await axiosInstance.get(`/companies/${companyId}/active-departments-count`);
  return response.data.data;
};

// Update max departments limit
export const updateMaxDepartments = async (companyId: string, maxDepartments: number): Promise<any> => {
  const result = await idempotentPut(
    `/admin/companies/${companyId}/max-departments`,
    { max_departments: maxDepartments },
    'updateMaxDepartments'
  );
  return result?.data ?? result;
};

// ============================================================
// Company APIs
// ============================================================

export const createCompany = async (payload: CreateCompanyPayload): Promise<Company> => {
  const result = await idempotentPost('/admin/companies', payload, 'createCompany');
  return result?.data ?? result;
};

export const getRecentCompanies = async (limit = 50): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies', { params: { limit } });
  return response.data?.data ?? response.data;
};

export const searchCompanies = async (
  q: string,
  limit = 20
): Promise<{ companies: Company[]; total: number; page: number; page_size: number; has_more: boolean }> => {
  const response = await axiosInstance.get('/admin/companies/search', { params: { q, limit } });
  return response.data?.data ?? response.data;
};

export const getCompanySearchAnalytics = async (): Promise<any> => {
  const response = await axiosInstance.get('/admin/companies/analytics/search');
  return response.data?.data ?? response.data;
};

export const benchmarkCompanySearch = async (testQueries: string[], iterations: number): Promise<any> => {
  const response = await axiosInstance.post('/admin/companies/search/benchmark', { test_queries: testQueries, iterations });
  return response.data?.data ?? response.data;
};

export const getCompanyById = async (companyId: string): Promise<Company> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}`);
  return response.data?.data ?? response.data;
};

export const getCompanyStats = async (companyId: string): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/stats`);
  return response.data?.data ?? response.data;
};

export const getCompanyEmployees = async (
  companyId: string,
  limit = 50,
  offset = 0
): Promise<{ employees: CompanyEmployee[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/employees`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const getCompanyRbacStats = async (companyId: string): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/rbac-stats`);
  return response.data?.data ?? response.data;
};

export const getCompanyRoles = async (
  companyId: string,
  limit = 50,
  offset = 0
): Promise<{ roles: CompanyRole[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/roles`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const updateSubscription = async (companyId: string, payload: UpdateSubscriptionPayload): Promise<any> => {
  const result = await idempotentPut(`/admin/companies/${companyId}/subscription`, payload, 'updateSubscription');
  return result?.data ?? result;
};

export const extendSubscription = async (companyId: string, payload: ExtendSubscriptionPayload): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/subscription/extend`, payload, 'extendSubscription');
  return result?.data ?? result;
};

export const deactivateCompany = async (companyId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/deactivate`, { reason }, 'deactivateCompany');
  return result?.data ?? result;
};

export const reactivateCompany = async (companyId: string): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/reactivate`, {}, 'reactivateCompany');
  return result?.data ?? result;
};

export const getCompaniesByStatus = async (
  status: 'active' | 'inactive',
  limit = 50,
  offset = 0
): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/status/${status}`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const getCompaniesByTier = async (
  tier: string,
  limit = 50,
  offset = 0
): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/tier/${tier}`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const getExpiringCompanies = async (days = 30, limit = 50): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies/expiring', { params: { days, limit } });
  return response.data?.data ?? response.data;
};

export const searchCompaniesByOwner = async (userId: string, q: string, limit = 20): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/owner/${userId}/search`, { params: { q, limit } });
  return response.data?.data ?? response.data;
};

// ============================================================
// User Management APIs
// ============================================================

export const advancedUserSearch = async (
  filters: UserSearchFilters,
  limit = 50,
  offset = 0
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/advanced', {
    params: { ...filters, limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const searchUsersByUsername = async (
  username: string,
  limit = 20
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/username', {
    params: { username, limit },
  });
  return response.data?.data ?? response.data;
};

export const searchUsersByFullName = async (
  fullName: string,
  limit = 20
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/full-name', {
    params: { full_name: fullName, limit },
  });
  return response.data?.data ?? response.data;
};

export const getUserSuggestions = async (prefix: string, limit = 10): Promise<User[]> => {
  const response = await axiosInstance.get('/admin/user-management/suggestions', {
    params: { prefix, limit },
  });
  return response.data?.data ?? response.data;
};

export const getUsersByKycStatus = async (
  status: string,
  limit = 100,
  offset = 0
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/user-management/kyc/${status}`, {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const getRecentlyActiveUsers = async (days = 7, limit = 100): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/recently-active', {
    params: { days, limit },
  });
  return response.data?.data ?? response.data;
};

export const getBannedUsers = async (limit = 100, offset = 0): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/banned', {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const updateUser = async (userId: string, payload: UpdateUserPayload): Promise<any> => {
  const result = await idempotentPut(`/admin/user-management/${userId}`, payload, 'updateUser');
  return result?.data ?? result;
};

export const updateUserKyc = async (userId: string, payload: UpdateKycPayload): Promise<any> => {
  const result = await idempotentPatch(`/admin/user-management/${userId}/kyc`, payload, 'updateUserKyc');
  return result?.data ?? result;
};

export const banUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/user-management/${userId}/ban`, { reason }, 'banUser');
  return result?.data ?? result;
};

export const unbanUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/user-management/${userId}/unban`, { reason }, 'unbanUser');
  return result?.data ?? result;
};

// ============================================================
// Audit Log APIs
// ============================================================

export const getAuditLogs = async (filters: AuditFilters = {}, limit = 50, offset = 0): Promise<any> => {
  const response = await axiosInstance.get('/admin/audit-logs', {
    params: { ...filters, limit, offset },
  });
  return response.data?.data ?? response.data;
};

// ============================================================
// Permissions APIs (already present)
// ============================================================

export const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await axiosInstance.get('/admin/system/permissions');
  return response.data?.data ?? response.data;
};

export const getPermissionsByModule = async (moduleCode: string): Promise<Permission[]> => {
  const response = await axiosInstance.get(`/admin/system/permissions/module/${moduleCode}`);
  return response.data?.data?.permissions ?? response.data;
};