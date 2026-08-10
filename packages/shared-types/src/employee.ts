// packages/shared-types/src/employee.ts

// If you want to use the full Avatar type, uncomment the import below:
// import { Avatar } from './avatar';

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
    // Fields from joined data (returned by search endpoints)
    role_name?: string;
    department_name?: string;
    department_id?: string;
    reports_to?: string;
    reports_to_name?: string;
    // 👇 New: avatar URL (primary avatar, usually a small or medium variant)
    avatar_url?: string | null;
    // Alternatively, if your backend returns the full avatar object:
    // avatar?: Avatar | null;
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
    query: string;           // The search text (required)
    search_type?: string;    // 'fulltext' or 'autocomplete' (default: 'fulltext')
    limit?: number;
    offset?: number;
}

export interface AdvancedSearchEmployeesParams {
    role_id?: string;
    department_id?: string;
    limit?: number;
    offset?: number;
    // Some backends might also accept a query param for advanced search
    query?: string;
    search_type?: string;
}