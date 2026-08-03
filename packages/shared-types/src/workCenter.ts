// packages/shared-types/src/workCenter.ts

export interface WorkCenter {
    work_center_code: string;
    company_id: string;
    name: string;
    description?: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateWorkCenterPayload {
    work_center_code: string;
    name: string;
    description?: string;
    timezone?: string;      // default: "Asia/Kolkata"
    is_active?: boolean;    // default: true
  }
  
  export interface UpdateWorkCenterPayload {
    name?: string;
    description?: string;
    is_active?: boolean;
  }
  
  export interface ListWorkCentersParams {
    page?: number;
    page_size?: number;
  }
  
  export interface SearchWorkCentersParams extends ListWorkCentersParams {
    name?: string;
    is_active?: boolean;
    // add more filters as needed
  }
  
  // Meta from API responses (pagination, duration, etc.)
  export interface ApiMeta {
    duration: string;
    has_next?: boolean;
    has_previous?: boolean;
    page?: number;
    page_size?: number;
    total_count?: number;
    total_pages?: number;
    // for search
    filters?: Record<string, any>;
    count?: number;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: ApiMeta;
    timestamp?: string;
  }