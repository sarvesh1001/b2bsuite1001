// packages/shared-types/src/department.ts

export interface Department {
    department_id: string;
    company_id: string;
    department_name: string;
    system_department_id?: string;
    system_department_name?: string;
    module_code?: string;
    parent_department_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateDepartmentPayload {
    department_name: string;
    parent_department_id?: string | null;
    is_active?: boolean;
    module_code?: string;
  }
  
  export interface UpdateDepartmentPayload {
    department_name?: string;
    parent_department_id?: string | null;
    is_active?: boolean;
    module_code?: string;
  }
  
  export interface ListDepartmentsParams {
    page?: number;
    limit?: number;
    is_active?: boolean;
  }