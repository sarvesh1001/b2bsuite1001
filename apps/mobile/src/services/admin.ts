// apps/mobile/src/services/admin.ts
import { axiosInstance } from '@b2b/api-client';
import { Platform } from 'react-native';
import { idempotentPost, idempotentPut, idempotentPatch } from '../utils/idempotencyRequest';

// ---------- Type Definitions (unchanged) ----------
export interface SystemDepartment { system_department_id: string; name: string; module_code: string; description: string; bitmask: number; }
export interface Permission { permission_id: string; permission_name: string; description: string; category: string; module: string; scope: string; requires_tier: string; bit_index: number; created_at: string; }
export interface Company { company_id: string; company_name: string; owner_user_id: string; subscription_tier: string; subscription_status: string; max_employees: number; max_departments: number; data_region: string; is_active: boolean; created_at: string; updated_at: string; FinancialYearStartMonth?: number; }
export interface CompanyEmployee { company_id: string; user_id: string; employee_id: string; role_id: string; hire_date: string; is_active: boolean; created_at: string; updated_at: string; }
export interface CompanyDepartment { department_id: string; company_id: string; department_name: string; system_department_id: string | null; system_department_name: string; module_code: string; parent_department_id: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface CompanyRole { role_id: string; role_name: string; role_level: number; company_id: string; is_system_role: boolean; description: string; created_at: string; updated_at: string; }
export interface User { user_id: string; username: string; full_name: string; phone_hash?: string; email?: string; role?: string; is_super_admin?: boolean; is_active?: boolean; is_verified?: boolean; kyc_status?: string; kyc_level?: string; created_at?: string; updated_at?: string; last_login?: string; data_region?: string; }

export interface CreateCompanyPayload { company_name: string; owner_phone: string; owner_username: string; owner_full_name: string; owner_position_title: string; subscription_tier: string; max_employees: number; max_departments: number; data_region: string; subscription_months: number; subscription_days?: number; financial_year_start_month: number; departments: string[]; work_center_code?: string; work_center_name?: string; work_center_description?: string; work_center_timezone?: string; work_center_is_active?: boolean; }
export interface UpdateSubscriptionPayload { tier?: string; status?: string; max_employees?: number; }
export interface ExtendSubscriptionPayload { additional_months: number; additional_days?: number; }
export interface UpdateUserPayload { username?: string; full_name?: string; data_region?: string; email?: string; phone?: string; }
export interface UpdateKycPayload { status: string; level: string; reason?: string; }
export interface UserSearchFilters { username?: string; full_name?: string; kyc_status?: string; is_active?: boolean; data_region?: string; phone_hash?: string; user_id?: string; }
export interface AuditFilters { user_id?: string; action?: string; resource_type?: string; resource_id?: string; from_date?: string; to_date?: string; }

// ---------- System Endpoints (GET – unchanged) ----------
export const getSystemDepartments = async (): Promise<SystemDepartment[]> => {
  const response = await axiosInstance.get('/admin/system/departments');
  return response.data?.data ?? response.data;
};

export const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await axiosInstance.get('/admin/system/permissions');
  return response.data?.data ?? response.data;
};

export const getPermissionsByModule = async (moduleCode: string): Promise<Permission[]> => {
  const response = await axiosInstance.get(`/admin/system/permissions/module/${moduleCode}`);
  return response.data?.data?.permissions ?? response.data;
};

// ---------- Company Management ----------

/**
 * 14.1 Create Company (POST, idempotent)
 */
export const createCompany = async (payload: CreateCompanyPayload): Promise<Company> => {
  const result = await idempotentPost('/admin/companies', payload, 'createCompany');
  return result?.data ?? result;
};

/**
 * 14.2 Get Recent Companies (GET)
 */
export const getRecentCompanies = async (limit = 50): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies', { params: { limit } });
  return response.data?.data ?? response.data;
};

/**
 * 14.3 Search Companies (GET)
 */
export const searchCompanies = async (q: string, limit = 20): Promise<{ companies: Company[]; total: number; page: number; page_size: number; has_more: boolean }> => {
  const response = await axiosInstance.get('/admin/companies/search', { params: { q, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 14.5 Get Company Search Analytics (GET)
 */
export const getCompanySearchAnalytics = async (): Promise<any> => {
  const response = await axiosInstance.get('/admin/companies/analytics/search');
  return response.data?.data ?? response.data;
};

/**
 * 14.6 Benchmark Company Search (POST – not idempotent, keep as is)
 */
export const benchmarkCompanySearch = async (testQueries: string[], iterations: number): Promise<any> => {
  const response = await axiosInstance.post('/admin/companies/search/benchmark', { test_queries: testQueries, iterations });
  return response.data?.data ?? response.data;
};

/**
 * 14.7 Get Company Details (GET)
 */
export const getCompanyById = async (companyId: string): Promise<Company> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}`);
  return response.data?.data ?? response.data;
};

/**
 * 14.8 Get Company Stats (GET)
 */
export const getCompanyStats = async (companyId: string): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/stats`);
  return response.data?.data ?? response.data;
};

/**
 * 14.9 Get Company Employees (GET)
 */
export const getCompanyEmployees = async (companyId: string, limit = 50, offset = 0): Promise<{ employees: CompanyEmployee[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/employees`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 14.10 Get Company Departments (GET)
 */
export const getCompanyDepartments = async (companyId: string, limit = 50, offset = 0): Promise<{ departments: CompanyDepartment[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/departments`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 14.12 Get Company RBAC Stats (GET)
 */
export const getCompanyRbacStats = async (companyId: string): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/rbac-stats`);
  return response.data?.data ?? response.data;
};

/**
 * 14.13 Get Company Roles (GET)
 */
export const getCompanyRoles = async (companyId: string, limit = 50, offset = 0): Promise<{ roles: CompanyRole[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/${companyId}/roles`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 14.14 Update Subscription (PUT, idempotent)
 */
export const updateSubscription = async (companyId: string, payload: UpdateSubscriptionPayload): Promise<any> => {
  const result = await idempotentPut(`/admin/companies/${companyId}/subscription`, payload, 'updateSubscription');
  return result?.data ?? result;
};

/**
 * 14.15 Extend Subscription (POST, idempotent)
 */
export const extendSubscription = async (companyId: string, payload: ExtendSubscriptionPayload): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/subscription/extend`, payload, 'extendSubscription');
  return result?.data ?? result;
};

/**
 * 14.16 Deactivate Company (POST, idempotent)
 */
export const deactivateCompany = async (companyId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/deactivate`, { reason }, 'deactivateCompany');
  return result?.data ?? result;
};

/**
 * 14.17 Reactivate Company (POST, idempotent)
 */
export const reactivateCompany = async (companyId: string): Promise<any> => {
  const result = await idempotentPost(`/admin/companies/${companyId}/reactivate`, {}, 'reactivateCompany');
  return result?.data ?? result;
};

/**
 * 14.18 Get Companies by Status (GET)
 */
export const getCompaniesByStatus = async (status: 'active' | 'inactive', limit = 50, offset = 0): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/status/${status}`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 14.19 Get Companies by Tier (GET)
 */
export const getCompaniesByTier = async (tier: string, limit = 50, offset = 0): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/companies/tier/${tier}`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 14.20 Get Companies with Expiring Subscription (GET)
 */
export const getExpiringCompanies = async (days = 30, limit = 50): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies/expiring', { params: { days, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 14.21 Search Companies by Owner (GET)
 */
export const searchCompaniesByOwner = async (userId: string, q: string, limit = 20): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/owner/${userId}/search`, { params: { q, limit } });
  return response.data?.data ?? response.data;
};

// ---------- User Management ----------

/**
 * 15.1 Advanced User Search (GET)
 */
export const advancedUserSearch = async (filters: UserSearchFilters, limit = 50, offset = 0): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/advanced', { params: { ...filters, limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 15.2 Search Users by Username (GET)
 */
export const searchUsersByUsername = async (username: string, limit = 20): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/username', { params: { username, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 15.3 Search Users by Full Name (GET)
 */
export const searchUsersByFullName = async (fullName: string, limit = 20): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/search/full-name', { params: { full_name: fullName, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 15.4 Get User Suggestions (GET)
 */
export const getUserSuggestions = async (prefix: string, limit = 10): Promise<User[]> => {
  const response = await axiosInstance.get('/admin/user-management/suggestions', { params: { prefix, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 15.5 List Users by KYC Status (GET)
 */
export const getUsersByKycStatus = async (status: string, limit = 100, offset = 0): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get(`/admin/user-management/kyc/${status}`, { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 15.6 Get Recently Active Users (GET)
 */
export const getRecentlyActiveUsers = async (days = 7, limit = 100): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/recently-active', { params: { days, limit } });
  return response.data?.data ?? response.data;
};

/**
 * 15.7 Get Banned Users (GET)
 */
export const getBannedUsers = async (limit = 100, offset = 0): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/banned', { params: { limit, offset } });
  return response.data?.data ?? response.data;
};

/**
 * 15.8 Update User (PUT, idempotent)
 */
export const updateUser = async (userId: string, payload: UpdateUserPayload): Promise<any> => {
  const result = await idempotentPut(`/admin/user-management/${userId}`, payload, 'updateUser');
  return result?.data ?? result;
};

/**
 * 15.9 Update User KYC (PATCH, idempotent)
 */
export const updateUserKyc = async (userId: string, payload: UpdateKycPayload): Promise<any> => {
  const result = await idempotentPatch(`/admin/user-management/${userId}/kyc`, payload, 'updateUserKyc');
  return result?.data ?? result;
};

/**
 * 15.10 Ban User (POST, idempotent)
 */
export const banUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/user-management/${userId}/ban`, { reason }, 'banUser');
  return result?.data ?? result;
};

/**
 * 15.11 Unban User (POST, idempotent)
 */
export const unbanUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(`/admin/user-management/${userId}/unban`, { reason }, 'unbanUser');
  return result?.data ?? result;
};

// ---------- Audit Logs ----------
export const getAuditLogs = async (filters: AuditFilters = {}, limit = 50, offset = 0): Promise<any> => {
  const response = await axiosInstance.get('/admin/audit-logs', { params: { ...filters, limit, offset } });
  return response.data?.data ?? response.data;
};