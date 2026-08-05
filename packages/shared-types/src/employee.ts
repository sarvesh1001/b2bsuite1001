// packages/shared-types/src/employee.ts

export interface CompanyEmployee {
    user_id: string;
    company_id: string;
    employee_id: string;
    role_id: string;
    hire_date?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // additional fields from user (optional, but may be returned)
    phone?: string;
    username?: string;
    full_name?: string;
    email?: string;
  }
  
  export interface AddEmployeePayload {
    phone: string;
    username?: string;
    full_name?: string;
    employee_id?: string;
    role_id: string;
    reports_to?: string;
    position_id?: string;
  }
  
  export interface AddManagerPayload {
    phone: string;
    username?: string;
    full_name?: string;
    role_id: string;
    employee_id?: string;
    reports_to?: string;
    position_id?: string;
  }
  
  export interface SearchEmployeesPayload {
    search_term?: string;
    limit?: number;
    offset?: number;
  }
  
  export interface AdvancedSearchEmployeesParams {
    role_id?: string;
    department_id?: string;
    limit?: number;
    offset?: number;
  }