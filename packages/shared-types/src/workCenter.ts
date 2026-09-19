// packages/shared-types/src/workCenter.ts

export interface WorkCenter {
  work_center_code: string;
  company_id: string;
  location_id: string;          // ✅ NEW — every work center belongs to a location
  name: string;
  description?: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Optional denormalized fields — returned by API if it joins location
  location_code?: string;       // ✅ NEW
  location_name?: string;       // ✅ NEW
  city?: string;                // ✅ NEW (helpful on list cards)
}

export interface CreateWorkCenterPayload {
  work_center_code: string;
  location_id: string;          // ✅ NEW — required
  name: string;
  description?: string;
  timezone?: string;            // default: "Asia/Kolkata"
  is_active?: boolean;          // default: true
}

export interface UpdateWorkCenterPayload {
  // NOTE: location_id is intentionally NOT updatable.
  // A work center cannot be moved between locations after creation.
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ListWorkCentersParams {
  page?: number;
  page_size?: number;
  location_id?: string;         // ✅ NEW — optional explicit filter
                                //    (interceptor still sends X-Location-ID)
}

export interface SearchWorkCentersParams extends ListWorkCentersParams {
  name?: string;
  is_active?: boolean;
  location_id?: string;         // ✅ NEW
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