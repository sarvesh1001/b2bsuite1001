// apps/prayantra-admin/src/services/admin.ts
import { axiosInstance } from '@b2b/api-client';
import {
  idempotentPost,
  idempotentPut,
  idempotentPatch,
  idempotentDelete,
} from '../utils/idempotencyRequest';

// ============================================================
// Types – Core Entities
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

export interface CompanyWorkCenter {
  code: string;
  name: string;
  description?: string;
  timezone?: string;
  is_active: boolean;
}

export interface CompanyLocation {
  code: string;
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  owner_user_id: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_plan_code?: string;
  max_employees: number;
  max_departments: number;
  max_locations?: number;
  data_region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  FinancialYearStartMonth?: number;
  financial_year_start_month?: number;
  grace_period_days?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  work_center?: CompanyWorkCenter;
  location?: CompanyLocation;
}
const EXCLUDED_DEPARTMENTS = ['Administration', 'Super Admin Management'];

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

// ============================================================
// Payloads – Company
// ============================================================

export interface CreateCompanyPayload {
  company_name: string;
  owner_phone: string;
  owner_username: string;
  owner_full_name: string;
  owner_position_title: string;

  subscription_tier: string;
  subscription_plan_code?: string;
  max_employees: number;
  max_locations?: number;
  max_departments?: number;
  trial_days?: number;

  data_region: string;
  subscription_months: number;
  subscription_days?: number;
  financial_year_start_month: number;

  departments: string[];

  // Work center
  work_center_code?: string;
  work_center_name?: string;
  work_center_description?: string;
  work_center_timezone?: string;
  work_center_is_active?: boolean;

  // Location
  location_code?: string;
  location_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  // ============================================================
  // 👇 Owner HR profile — optional / nullable.
  //    Mirrors backend service.CreateCompanyRequest.
  //    Cost center (text + FK) is intentionally nullable.
  // ============================================================
  owner_email?: string | null;
  owner_date_of_birth?: string | null;         // RFC3339 (e.g. "1988-04-12T00:00:00.000Z")
  owner_gender?: string | null;                // male | female | other | prefer_not_to_say
  owner_marital_status?: string | null;        // single | married | divorced | widowed | separated
  owner_nationality?: string | null;
  owner_employment_type?: string | null;       // full_time | part_time | contract | intern | consultant | temporary
  owner_employment_status?: string | null;     // active | probation | on_leave | suspended | terminated | resigned
  owner_probation_end_date?: string | null;    // RFC3339
  owner_confirmation_date?: string | null;     // RFC3339
  owner_grade?: string | null;
  owner_tax_id?: string | null;
  owner_social_security_id?: string | null;
  owner_cost_center?: string | null;           // nullable text
  owner_cost_center_id?: string | null;        // nullable UUID string
}

/**
 * Response returned by POST /admin/companies.
 * Superset of `Company` — carries subscription and department metadata
 * produced by the create flow.
 */
export interface CreateCompanyResponse extends Company {
  subscription_plan?: string;
  subscription_months?: number;
  subscription_days?: number;
  trial_days?: number;
  departments_created?: number;
}

export interface UpdateCompanyDetailsPayload {
  company_name?: string;
  data_region?: string;
  financial_year_start_month?: number;
  max_employees?: number;
  max_locations?: number;
  is_active?: boolean;
  subscription_plan_code?: string;
  subscription_status?: string;
  grace_period_days?: number;
  extend_by_months?: number;
  extend_by_days?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_start_date?: string;
  trial_end_date?: string;
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

export interface AddDepartmentPayload {
  department_name?: string;
  system_department_id?: string;
  parent_department_id?: string;
}

// ============================================================
// Types – Subscription Plans / Reminders
// ============================================================

export interface SubscriptionPlan {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  description?: string;
  duration_days: number;
  price: number;
  currency: string;
  gateway_plan_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateSubscriptionPlanPayload {
  plan_code: string;
  plan_name: string;
  description?: string;
  duration_days: number;
  price: number;
  currency: string;
  gateway_plan_id?: string;
}

export interface UpdateSubscriptionPlanPayload {
  plan_name?: string;
  description?: string;
  duration_days?: number;
  price?: number;
  currency?: string;
  gateway_plan_id?: string;
  is_active?: boolean;
}

export interface Reminder {
  reminder_id: string;
  company_id: string;
  subscription_id?: string;
  reminder_type: string;
  scheduled_for: string;
  sent_at?: string | null;
  status: 'pending' | 'sent' | 'failed';
  payload?: any;
}

// ============================================================
// Types – Payments
// ============================================================

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface Payment {
  payment_id: string;
  company_id: string;
  plan_id?: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  gateway_txn_id?: string;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentPayload {
  plan_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  gateway_txn_id?: string;
  status: string;
  notes?: string;
  gateway_response?: any; // 🆕
}

// ============================================================
// Types – Invoices
// ============================================================

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface InvoiceItem {
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
}

export interface Invoice {
  invoice_id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  status: InvoiceStatus;
  notes?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoicePayload {
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  discount_total?: number;
  grand_total: number;
  status: string;
  notes?: string;
  items: InvoiceItem[];
}

export interface UpdateInvoicePayload {
  status?: string;
  notes?: string;
  items?: InvoiceItem[];
}

// ============================================================
// Analytics & Operational Log Types
// ============================================================

export interface OTPLog {
  event_id: string;
  event_type: string;
  timestamp: string;
  user_id: string;
  phone_number: string;
  status: 'success' | 'failed';
  attempt_number: number;
  attempts_left: number;
  error_code?: string;
  error_message?: string;
  ip_address?: string;
  device_id?: string;
  purpose: string;
  otp_provider: string;
  duration_ms: number;
  environment: string;
  version: string;
  message?: string;
  service_name: string;
}

export interface MPINLog {
  event_id: string;
  event_type: string;
  timestamp: string;
  user_id: string;
  status: 'success' | 'failed';
  attempts: number;
  attempts_left: number;
  is_locked: boolean;
  error_code?: string;
  error_message?: string;
  device_id: string;
  device_trust: string;
  duration_ms: number;
  failure_reason?: string;
  environment: string;
  version: string;
  message?: string;
  service_name: string;
}

export interface DeviceLog {
  event_id: string;
  event_type: string;
  timestamp: string;
  user_id: string;
  device_id: string;
  action: string;
  status: 'success' | 'failed';
  bind_token?: string;
  error_code?: string;
  error_message?: string;
  ip_address?: string;
  session_id?: string;
  duration_ms: number;
  environment: string;
  version: string;
  message?: string;
  service_name: string;
}

export interface SecurityLog {
  event_id: string;
  event_type: string;
  timestamp: string;
  user_id: string;
  event_category: string;
  severity: 'low' | 'medium' | 'high';
  ip_address?: string;
  device_id?: string;
  action: string;
  risk_score: number;
  reason?: string;
  environment: string;
  version: string;
  message?: string;
  service_name: string;
}

export interface SecurityRiskLog {
  event_id: string;
  event_type: string;
  timestamp: string;
  phone_number: string;
  ip_address: string;
  device_id: string;
  user_agent: string;
  risk_score: number;
  reasons: string[];
  action_taken: 'block' | 'flag' | 'allow';
  environment: string;
  version: string;
  message?: string;
  service_name: string;
}

export interface AuditLog {
  audit_id: string;
  company_id?: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  actor_type: string;
  actor_id?: string;
  before_state?: any;
  after_state?: any;
  metadata?: any;
  created_at: string;
}

export interface PaginatedResponse<T> {
  logs: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  actor_type?: string;
  actor_id?: string;
  start_date?: string;
  end_date?: string;
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

export const getDeactivatedDepartments = async (companyId: string): Promise<CompanyDepartment[]> => {
  const response = await axiosInstance.get(`/companies/${companyId}/deactivated-departments`);
  return response.data?.data ?? response.data;
};

export const activateDepartment = async (companyId: string, deptId: string): Promise<any> => {
  const result = await idempotentPatch(
    `/companies/${companyId}/departments/${deptId}/activate`,
    {},
    'activateDepartment'
  );
  return result?.data ?? result;
};

export const softDeleteDepartment = async (companyId: string, deptId: string): Promise<any> => {
  const result = await idempotentDelete(
    `/companies/${companyId}/departments/${deptId}/soft`,
    undefined,
    'softDeleteDepartment'
  );
  return result?.data ?? result;
};

export const addCompanyDepartment = async (
  companyId: string,
  payload: AddDepartmentPayload
): Promise<any> => {
  console.log('📤 [addCompanyDepartment] URL:', `/admin/companies/${companyId}`);
  console.log('📤 [addCompanyDepartment] Payload:', payload);
  const result = await idempotentPost(
    `/admin/companies/${companyId}`,
    payload,
    'addCompanyDepartment'
  );
  console.log('✅ [addCompanyDepartment] Response:', result);
  return result?.data ?? result;
};

export const getActiveDepartmentCount = async (
  companyId: string
): Promise<{ active_departments: number }> => {
  const response = await axiosInstance.get(`/companies/${companyId}/active-departments-count`);
  return response.data.data;
};

export const updateMaxDepartments = async (
  companyId: string,
  maxDepartments: number
): Promise<any> => {
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

export const createCompany = async (
  payload: CreateCompanyPayload
): Promise<CreateCompanyResponse> => {
  // Defensive filter: never allow these system-only departments to be
  // sent during company creation, regardless of caller.
  const sanitizedPayload: CreateCompanyPayload = {
    ...payload,
    departments: (payload.departments || []).filter(
      (d) => !EXCLUDED_DEPARTMENTS.includes(d)
    ),
  };

  const result = await idempotentPost(
    '/admin/companies',
    sanitizedPayload,
    'createCompany'
  );
  return result?.data ?? result;
};

export const getRecentCompanies = async (
  limit = 50
): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies', { params: { limit } });
  return response.data?.data ?? response.data;
};

export const searchCompanies = async (
  q: string,
  limit = 20
): Promise<{
  companies: Company[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}> => {
  const response = await axiosInstance.get('/admin/companies/search', {
    params: { q, limit },
  });
  return response.data?.data ?? response.data;
};

export const getCompanySearchAnalytics = async (): Promise<any> => {
  const response = await axiosInstance.get('/admin/companies/analytics/search');
  return response.data?.data ?? response.data;
};

export const benchmarkCompanySearch = async (
  testQueries: string[],
  iterations: number
): Promise<any> => {
  const response = await axiosInstance.post('/admin/companies/search/benchmark', {
    test_queries: testQueries,
    iterations,
  });
  return response.data?.data ?? response.data;
};

export const getCompanyById = async (companyId: string): Promise<CompanyDetail> => {
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

export const updateSubscription = async (
  companyId: string,
  payload: UpdateSubscriptionPayload
): Promise<any> => {
  const result = await idempotentPut(
    `/admin/companies/${companyId}/subscription`,
    payload,
    'updateSubscription'
  );
  return result?.data ?? result;
};

export const extendSubscription = async (
  companyId: string,
  payload: ExtendSubscriptionPayload
): Promise<any> => {
  const result = await idempotentPost(
    `/admin/companies/${companyId}/subscription/extend`,
    payload,
    'extendSubscription'
  );
  return result?.data ?? result;
};

export const updateCompanyDetails = async (
  companyId: string,
  payload: UpdateCompanyDetailsPayload
): Promise<Company> => {
  const result = await idempotentPut(
    `/admin/companies/${companyId}/details`,
    payload,
    'updateCompanyDetails'
  );
  return result?.data ?? result;
};

export const deactivateCompany = async (
  companyId: string,
  reason: string
): Promise<any> => {
  const result = await idempotentPost(
    `/admin/companies/${companyId}/deactivate`,
    { reason },
    'deactivateCompany'
  );
  return result?.data ?? result;
};

export const reactivateCompany = async (companyId: string): Promise<any> => {
  const result = await idempotentPost(
    `/admin/companies/${companyId}/reactivate`,
    {},
    'reactivateCompany'
  );
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

export const getExpiringCompanies = async (
  days = 30,
  limit = 50
): Promise<{ companies: Company[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/companies/expiring', {
    params: { days, limit },
  });
  return response.data?.data ?? response.data;
};

export const searchCompaniesByOwner = async (
  userId: string,
  q: string,
  limit = 20
): Promise<any> => {
  const response = await axiosInstance.get(`/admin/companies/owner/${userId}/search`, {
    params: { q, limit },
  });
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

export const getUserSuggestions = async (
  prefix: string,
  limit = 10
): Promise<User[]> => {
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

export const getRecentlyActiveUsers = async (
  days = 7,
  limit = 100
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/recently-active', {
    params: { days, limit },
  });
  return response.data?.data ?? response.data;
};

export const getBannedUsers = async (
  limit = 100,
  offset = 0
): Promise<{ users: User[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/user-management/banned', {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const updateUser = async (
  userId: string,
  payload: UpdateUserPayload
): Promise<any> => {
  const result = await idempotentPut(
    `/admin/user-management/${userId}`,
    payload,
    'updateUser'
  );
  return result?.data ?? result;
};

export const updateUserKyc = async (
  userId: string,
  payload: UpdateKycPayload
): Promise<any> => {
  const result = await idempotentPatch(
    `/admin/user-management/${userId}/kyc`,
    payload,
    'updateUserKyc'
  );
  return result?.data ?? result;
};

export const banUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(
    `/admin/user-management/${userId}/ban`,
    { reason },
    'banUser'
  );
  return result?.data ?? result;
};

export const unbanUser = async (userId: string, reason: string): Promise<any> => {
  const result = await idempotentPost(
    `/admin/user-management/${userId}/unban`,
    { reason },
    'unbanUser'
  );
  return result?.data ?? result;
};

// ============================================================
// Permissions APIs
// ============================================================

export const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await axiosInstance.get('/admin/system/permissions');
  return response.data?.data ?? response.data;
};

export const getPermissionsByModule = async (
  moduleCode: string
): Promise<Permission[]> => {
  const response = await axiosInstance.get(
    `/admin/system/permissions/module/${moduleCode}`
  );
  return response.data?.data?.permissions ?? response.data;
};

// ============================================================
// 🆕 SUBSCRIPTION PLAN MANAGEMENT (ADMIN)
// ============================================================

export const createSubscriptionPlan = async (
  payload: CreateSubscriptionPlanPayload
): Promise<SubscriptionPlan> => {
  const result = await idempotentPost(
    '/admin/subscription-plans',
    payload,
    'createSubscriptionPlan'
  );
  return result?.data ?? result;
};

export const listSubscriptionPlans = async (
  page = 1,
  limit = 50,
  includeInactive = false
): Promise<{ plans: SubscriptionPlan[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/subscription-plans', {
    params: { page, limit, include_inactive: includeInactive },
  });
  return response.data?.data ?? response.data;
};

export const getSubscriptionPlanById = async (
  planId: string
): Promise<SubscriptionPlan> => {
  const response = await axiosInstance.get(`/admin/subscription-plans/${planId}`);
  return response.data?.data ?? response.data;
};

export const getSubscriptionPlanByCode = async (
  planCode: string
): Promise<SubscriptionPlan> => {
  const response = await axiosInstance.get(
    `/admin/subscription-plans/code/${planCode}`
  );
  return response.data?.data ?? response.data;
};

export const updateSubscriptionPlan = async (
  planId: string,
  payload: UpdateSubscriptionPlanPayload
): Promise<SubscriptionPlan> => {
  const result = await idempotentPut(
    `/admin/subscription-plans/${planId}`,
    payload,
    'updateSubscriptionPlan'
  );
  return result?.data ?? result;
};

export const deleteSubscriptionPlan = async (planId: string): Promise<any> => {
  const result = await idempotentDelete(
    `/admin/subscription-plans/${planId}`,
    undefined,
    'deleteSubscriptionPlan'
  );
  return result?.data ?? result;
};

// ============================================================
// 🆕 REMINDER MANAGEMENT (ADMIN)
// ============================================================

export const processReminders = async (): Promise<any> => {
  const result = await idempotentPost(
    '/admin/reminders/process',
    {},
    'processReminders'
  );
  return result?.data ?? result;
};

export const listPendingReminders = async (
  limit = 100,
  offset = 0
): Promise<{ reminders: Reminder[]; meta: any }> => {
  const response = await axiosInstance.get('/admin/reminders/pending', {
    params: { limit, offset },
  });
  return response.data?.data ?? response.data;
};

// ============================================================
// 🆕 SUBSCRIPTION LIFECYCLE (ADMIN)
// ============================================================

export const expireLapsedSubscriptions = async (): Promise<any> => {
  const result = await idempotentPost(
    '/admin/subscriptions/expire-lapsed',
    {},
    'expireLapsedSubscriptions'
  );
  return result?.data ?? result;
};

export const expireExpiredTrials = async (): Promise<any> => {
  const result = await idempotentPost(
    '/admin/subscriptions/expire-trials',
    {},
    'expireExpiredTrials'
  );
  return result?.data ?? result;
};

// ============================================================
// 🆕 COMPANY PAYMENTS (COMPANY SCOPED)
// ============================================================

export const listCompanyPayments = async (
  companyId: string,
  page = 1,
  limit = 50
): Promise<{ payments: Payment[]; meta: any }> => {
  const response = await axiosInstance.get(`/companies/${companyId}/payments`, {
    params: { page, limit },
    headers: { 'X-Company-ID': companyId },
  });
  return response.data?.data ?? response.data;
};

export const getCompanyPayment = async (
  companyId: string,
  paymentId: string
): Promise<Payment> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/payments/${paymentId}`,
    { headers: { 'X-Company-ID': companyId } }
  );
  return response.data?.data ?? response.data;
};

export const getCompanyPaymentByGatewayTxn = async (
  companyId: string,
  gatewayTxnId: string
): Promise<Payment> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/payments/gateway/${gatewayTxnId}`,
    { headers: { 'X-Company-ID': companyId } }
  );
  return response.data?.data ?? response.data;
};

export const createCompanyPayment = async (
  companyId: string,
  payload: CreatePaymentPayload
): Promise<Payment> => {
  const result = await idempotentPost(
    `/companies/${companyId}/payments`,
    payload,
    'createCompanyPayment'
  );
  return result?.data ?? result;
};

export const updateCompanyPaymentStatus = async (
  companyId: string,
  paymentId: string,
  status: PaymentStatus | string
): Promise<Payment> => {
  const result = await idempotentPatch(
    `/companies/${companyId}/payments/${paymentId}/status`,
    { status },
    'updateCompanyPaymentStatus'
  );
  return result?.data ?? result;
};

// ============================================================
// 🆕 COMPANY INVOICES (COMPANY SCOPED)
// ============================================================

export const listCompanyInvoices = async (
  companyId: string,
  page = 1,
  limit = 50
): Promise<{ invoices: Invoice[]; meta: any }> => {
  const response = await axiosInstance.get(`/companies/${companyId}/invoices`, {
    params: { page, limit },
    headers: { 'X-Company-ID': companyId },
  });
  return response.data?.data ?? response.data;
};

export const getCompanyInvoice = async (
  companyId: string,
  invoiceId: string
): Promise<Invoice> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/invoices/${invoiceId}`,
    { headers: { 'X-Company-ID': companyId } }
  );
  return response.data?.data ?? response.data;
};

export const getCompanyInvoiceByNumber = async (
  companyId: string,
  invoiceNumber: string
): Promise<Invoice> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/invoices/number/${invoiceNumber}`,
    { headers: { 'X-Company-ID': companyId } }
  );
  return response.data?.data ?? response.data;
};

export const getCompanyInvoiceItems = async (
  companyId: string,
  invoiceId: string
): Promise<InvoiceItem[]> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/invoices/${invoiceId}/items`,
    { headers: { 'X-Company-ID': companyId } }
  );
  return response.data?.data ?? response.data;
};

export const createCompanyInvoice = async (
  companyId: string,
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  const result = await idempotentPost(
    `/companies/${companyId}/invoices`,
    payload,
    'createCompanyInvoice'
  );
  return result?.data ?? result;
};

export const updateCompanyInvoice = async (
  companyId: string,
  invoiceId: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> => {
  const result = await idempotentPut(
    `/companies/${companyId}/invoices/${invoiceId}`,
    payload,
    'updateCompanyInvoice'
  );
  return result?.data ?? result;
};

export const updateCompanyInvoiceStatus = async (
  companyId: string,
  invoiceId: string,
  status: InvoiceStatus | string
): Promise<Invoice> => {
  const result = await idempotentPatch(
    `/companies/${companyId}/invoices/${invoiceId}/status`,
    { status },
    'updateCompanyInvoiceStatus'
  );
  return result?.data ?? result;
};

export const deleteCompanyInvoice = async (
  companyId: string,
  invoiceId: string
): Promise<any> => {
  const result = await idempotentDelete(
    `/companies/${companyId}/invoices/${invoiceId}`,
    undefined,
    'deleteCompanyInvoice'
  );
  return result?.data ?? result;
};

// ============================================================
// COMPANY‑SCOPED AUDIT LOGS
// ============================================================

export const getCompanyAuditLogs = async (
  companyId: string,
  filters: AuditFilters = {},
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<AuditLog>> => {
  const response = await axiosInstance.get(`/companies/${companyId}/audit/logs`, {
    params: { ...filters, page, page_size: pageSize },
  });
  return response.data?.data ?? response.data;
};

export const getCompanyAuditStats = async (
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<any> => {
  const response = await axiosInstance.get(`/companies/${companyId}/audit/stats`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data?.data ?? response.data;
};

export const exportCompanyAuditLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: AuditFilters = {}
): Promise<{ data: Blob; contentType: string }> => {
  const response = await axiosInstance.get(`/companies/${companyId}/audit/export`, {
    params: { ...filters, format },
    responseType: 'blob',
  });
  return {
    data: response.data,
    contentType:
      (response.headers['content-type'] as string) || 'application/octet-stream',
  };
};

// ============================================================
// SYSTEM‑WIDE AUDIT LOGS (admin only)
// ============================================================

export const getAuditLogs = async (
  filters: AuditFilters = {},
  limit = 50,
  offset = 0
): Promise<any> => {
  const response = await axiosInstance.get('/admin/audit/logs', {
    params: { ...filters, limit, offset },
  });
  return response.data?.data ?? response.data;
};

export const exportSystemAuditLogs = async (
  format: 'json' | 'csv',
  filters: AuditFilters = {}
): Promise<{ data: Blob; contentType: string }> => {
  const response = await axiosInstance.get('/admin/audit/export', {
    params: { ...filters, format },
    responseType: 'blob',
  });
  return {
    data: response.data,
    contentType:
      (response.headers['content-type'] as string) || 'application/octet-stream',
  };
};

export const getSystemAuditStats = async (
  startDate?: string,
  endDate?: string
): Promise<any> => {
  const response = await axiosInstance.get('/admin/audit/stats', {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data?.data ?? response.data;
};

// ============================================================
// OPERATIONAL ANALYTICS (ClickHouse – time‑series logs)
// ============================================================

// ---- OTP Logs ----
export const getOTPLogs = async (
  companyId: string,
  filters: {
    user_id?: string;
    phone?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<OTPLog>> => {
  const response = await axiosInstance.get(`/companies/${companyId}/analytics/otp`, {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const getOTPStats = async (
  companyId: string,
  user_id?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/otp/stats`,
    { params: { user_id, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

export const exportOTPLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: any = {}
): Promise<Blob> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/otp/export`,
    {
      params: { ...filters, format },
      responseType: 'blob',
    }
  );
  return response.data;
};

// ---- MPIN Logs ----
export const getMPINLogs = async (
  companyId: string,
  filters: {
    user_id?: string;
    status?: string;
    is_locked?: boolean;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<MPINLog>> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/mpin`,
    { params: { ...filters, page, limit } }
  );
  return response.data?.data ?? response.data;
};

export const getMPINStats = async (
  companyId: string,
  user_id?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/mpin/stats`,
    { params: { user_id, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

export const exportMPINLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: any = {}
): Promise<Blob> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/mpin/export`,
    {
      params: { ...filters, format },
      responseType: 'blob',
    }
  );
  return response.data;
};

// ---- Device Logs ----
export const getDeviceLogs = async (
  companyId: string,
  filters: {
    user_id?: string;
    device_id?: string;
    action?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<DeviceLog>> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/device`,
    { params: { ...filters, page, limit } }
  );
  return response.data?.data ?? response.data;
};

export const getDeviceStats = async (
  companyId: string,
  user_id?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/device/stats`,
    { params: { user_id, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

export const exportDeviceLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: any = {}
): Promise<Blob> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/device/export`,
    {
      params: { ...filters, format },
      responseType: 'blob',
    }
  );
  return response.data;
};

// ---- Security Logs (ClickHouse) ----
export const getSecurityLogs = async (
  companyId: string,
  filters: {
    user_id?: string;
    event_category?: string;
    severity?: string;
    ip_address?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<SecurityLog>> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security`,
    { params: { ...filters, page, limit } }
  );
  return response.data?.data ?? response.data;
};

export const getSecurityStats = async (
  companyId: string,
  user_id?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security/stats`,
    { params: { user_id, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

export const exportSecurityLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: any = {}
): Promise<Blob> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security/export`,
    {
      params: { ...filters, format },
      responseType: 'blob',
    }
  );
  return response.data;
};

// ---- Security Risk Logs ----
export const getSecurityRiskLogs = async (
  companyId: string,
  filters: {
    phone?: string;
    ip_address?: string;
    risk_score_min?: number;
    action_taken?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<SecurityRiskLog>> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security-risk`,
    { params: { ...filters, page, limit } }
  );
  return response.data?.data ?? response.data;
};

export const getSecurityRiskStats = async (
  companyId: string,
  phone?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security-risk/stats`,
    { params: { phone, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

export const exportSecurityRiskLogs = async (
  companyId: string,
  format: 'json' | 'csv',
  filters: any = {}
): Promise<Blob> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/security-risk/export`,
    {
      params: { ...filters, format },
      responseType: 'blob',
    }
  );
  return response.data;
};

// ---- Dashboard (unified stats) ----
export const getDashboardStats = async (
  companyId: string,
  user_id?: string,
  start_date?: string,
  end_date?: string
): Promise<any> => {
  const response = await axiosInstance.get(
    `/companies/${companyId}/analytics/dashboard`,
    { params: { user_id, start_date, end_date } }
  );
  return response.data?.data ?? response.data;
};

// ============================================================
// ADMIN ELASTICSEARCH SEARCH (system‑wide, super‑admin only)
// ============================================================

export const searchAdminLogs = async (
  filters: {
    admin_id?: string;
    action?: string;
    status?: string;
    error_code?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  const response = await axiosInstance.get('/admin/analytics/admin/search', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const searchSessionLogs = async (
  filters: {
    user_id?: string;
    session_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  const response = await axiosInstance.get('/admin/analytics/session/search', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const searchUserLogs = async (
  filters: {
    user_id?: string;
    action?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  const response = await axiosInstance.get('/admin/analytics/user/search', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const searchSecurityLogsES = async (
  filters: {
    user_id?: string;
    event_category?: string;
    severity?: string;
    action?: string;
    ip_address?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  const response = await axiosInstance.get('/admin/analytics/security/search', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const globalSearch = async (
  query: string,
  index?: 'admin' | 'session' | 'user' | 'security',
  start_date?: string,
  end_date?: string,
  page = 1,
  limit = 50
): Promise<{ results: any[]; pagination: any }> => {
  const response = await axiosInstance.get('/admin/analytics/search', {
    params: { q: query, index, start_date, end_date, page, limit },
  });
  return response.data?.data ?? response.data;
};

// ============================================================
// SYSTEM‑WIDE LOGS (no company ID – admin only)
// ============================================================

export const getSystemOTPLogs = async (
  filters: {
    user_id?: string;
    phone?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<OTPLog>> => {
  const response = await axiosInstance.get('/admin/analytics/otp', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const getSystemMPINLogs = async (
  filters: {
    user_id?: string;
    status?: string;
    is_locked?: boolean;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<MPINLog>> => {
  const response = await axiosInstance.get('/admin/analytics/mpin', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const getSystemDeviceLogs = async (
  filters: {
    user_id?: string;
    device_id?: string;
    action?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<DeviceLog>> => {
  const response = await axiosInstance.get('/admin/analytics/device', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const getSystemSecurityLogs = async (
  filters: {
    user_id?: string;
    event_category?: string;
    severity?: string;
    ip_address?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<SecurityLog>> => {
  const response = await axiosInstance.get('/admin/analytics/security', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

export const getSystemSecurityRiskLogs = async (
  filters: {
    phone?: string;
    ip_address?: string;
    risk_score_min?: number;
    action_taken?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  page = 1,
  limit = 50
): Promise<PaginatedResponse<SecurityRiskLog>> => {
  const response = await axiosInstance.get('/admin/analytics/security-risk', {
    params: { ...filters, page, limit },
  });
  return response.data?.data ?? response.data;
};

// ============================================================
// Company — list/summary (used by /admin/companies)
// ============================================================

// ============================================================
// 🆕 CompanyDetail — detail view (/admin/companies/:id)
// Same shape as Company but guarantees plan/amount/dates.
// ============================================================
export interface CompanyDetail extends Company {
  /** UUID of the plan the company is subscribed to. */
  subscription_plan_id: string;

  /** Amount paid for the subscription (in the company's currency). */
  subscription_amount?: number;

  /** ISO date string when the current subscription started. */
  subscription_start_date?: string;

  /** ISO date string when the current subscription ends. */
  subscription_end_date?: string;

  /** Financial year start month (1–12). */
  financial_year_start_month?: number;

  /** Grace period (days) after subscription_end_date before expiry. */
  grace_period_days?: number;

  /** Trial window (ISO dates), present when subscription_status is "trial". */
  trial_start_date?: string;
  trial_end_date?: string;

  /** Work center + location blocks (present when configured). */
  work_center?: CompanyWorkCenter;
  location?: CompanyLocation;
}