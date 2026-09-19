// packages/shared-types/src/index.ts
//
// Shared business-entity types used by more than one package
// (admin dashboard, mobile app, api-client, etc.).
//
// ⚠️  Admin-only DTOs (CreateCompanyPayload, AuditLog, analytics logs,
//     reminder types, etc.) live in `apps/prayantra-admin/src/services/admin.ts`.

// ============================================================
// USER
// ============================================================

export interface User {
  user_id: string;
  id?: string;                 // alias for backward compat

  username: string;
  full_name: string;
  name?: string;               // alias

  email?: string;
  phone?: string;

  role?: string;               // "admin" | "super_admin" | ...
  role_string?: string;
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
// COMPANY (with work center + location)
// ============================================================

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
  max_departments?: number;
  max_locations?: number;

  data_region: string;
  is_active: boolean;

  financial_year_start_month?: number;
  FinancialYearStartMonth?: number;   // legacy alias

  grace_period_days?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_start_date?: string;
  trial_end_date?: string;

  work_center?: CompanyWorkCenter;
  location?: CompanyLocation;

  created_at: string;
  updated_at: string;
}

// ============================================================
// SUBSCRIPTION PLAN
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

// ============================================================
// PAYMENT
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

// ============================================================
// INVOICE
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