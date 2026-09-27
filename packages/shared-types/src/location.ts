// ============================================================
// Shared enumerations
// ============================================================

export type LocationAccessScope = 'PRIMARY' | 'SELECTED' | 'ALL';

/**
 * Access levels a caller can grant on a location.
 * Only two values exist — the backend rejects anything else.
 */
export type LocationAccessLevel = 'VIEW' | 'MANAGE';

// ============================================================
// Core read models
// ============================================================

export interface AccessibleLocation {
  location_id: string;
  location_code: string;
  location_name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active: boolean;
  /** Present only when the caller has SELECTED scope on this location */
  access_level?: LocationAccessLevel;
}

export interface MyLocationsResponse {
  locations: AccessibleLocation[];
  primary_location_id: string | null;
  location_scope: LocationAccessScope;
}

// ============================================================
// Grant payload — the exact shape sent inside
//   AddMemberRequest.selected_locations
//   UpdateMemberRequest.selected_locations
//
// Matches Postman 26.3 / the "#######" block:
//   {
//     "primary_location_id": "…",
//     "location_access_scope": "SELECTED",
//     "selected_locations": [
//       { "location_id": "…", "access_level": "MANAGE" },
//       { "location_id": "…", "access_level": "VIEW"   }
//     ]
//   }
// ============================================================

export interface EmployeeLocationGrantRequest {
  location_id: string;
  access_level: LocationAccessLevel;
}

// ============================================================
// Location CRUD
//   POST   /companies/{cid}/locations
//   PUT    /companies/{cid}/locations/{locationID}
// ============================================================

export interface CreateLocationRequest {
  location_code: string;
  location_name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface UpdateLocationRequest {
  location_code?: string;
  location_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active?: boolean;
}

export interface LocationResponse {
  location_id: string;
  company_id: string;
  location_code: string;
  location_name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Employee location access
//   GET /companies/{cid}/employees/{uid}/locations   (26.1)
//   PUT /companies/{cid}/employees/{uid}/locations   (26.2–26.4)
// ============================================================

export interface EmployeeLocationAccessEntry {
  location_id: string;
  location_code?: string;
  location_name?: string;
  access_level?: LocationAccessLevel;
}

export interface EmployeeLocationsResponse {
  user_id: string;
  company_id: string;
  primary_location_id: string | null;
  location_access_scope: LocationAccessScope;
  locations: EmployeeLocationAccessEntry[];
}

/**
 * PUT body for /employees/{uid}/locations — supports both grant forms:
 *
 *   Legacy (26.3):
 *     { "primary_location_id": "…",
 *       "location_access_scope": "SELECTED",
 *       "selected_location_ids": ["id1", "id2"] }   // defaults to VIEW
 *
 *   Preferred:
 *     { "primary_location_id": "…",
 *       "location_access_scope": "SELECTED",
 *       "selected_locations": [
 *         { "location_id": "id1", "access_level": "MANAGE" },
 *         { "location_id": "id2", "access_level": "VIEW"   }
 *       ] }
 *
 * If both are supplied, the backend merges with `selected_locations`
 * taking precedence per location_id.
 */
export interface UpdateEmployeeLocationsRequest {
  primary_location_id?: string;
  location_access_scope: LocationAccessScope;
  /** Legacy — bare IDs default to VIEW */
  selected_location_ids?: string[];
  /** Preferred — explicit level per location */
  selected_locations?: EmployeeLocationGrantRequest[];
}

// ============================================================
// Single-grant mutations
//   POST   /companies/{cid}/employees/{uid}/locations/access          (26.6)
//   DELETE /companies/{cid}/employees/{uid}/locations/access/{locId}  (26.7)
// ============================================================

export interface AddEmployeeLocationAccessRequest {
  location_id: string;
  access_level: LocationAccessLevel;
}

// ============================================================
// Location history (26.5)
// ============================================================

export interface EmployeeLocationHistoryEntry {
  id: string;
  user_id: string;
  company_id: string;
  location_id: string;
  start_date: string;   // ISO
  end_date: string | null;
  change_reason?: string | null;
  created_at: string;
}