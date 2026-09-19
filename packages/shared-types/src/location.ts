export type LocationAccessScope = 'PRIMARY' | 'SELECTED' | 'ALL';
export type LocationAccessLevel = 'VIEW' | 'MANAGE' | 'ADMIN';

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
  /** Only present when the caller has SELECTED scope */
  access_level?: LocationAccessLevel;
}

export interface MyLocationsResponse {
  locations: AccessibleLocation[];
  primary_location_id: string | null;
  location_scope: LocationAccessScope;
}