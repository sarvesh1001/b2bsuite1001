// packages/shared-types/src/index.ts

export interface User {
  // Primary identifier – required (mapped from admin.admin_id)
  user_id: string;

  // Optional alias for backward compatibility
  id?: string;

  // Name fields – required from admin
  username: string;
  full_name: string;
  name?: string; // alias

  // Contact – optional
  email?: string;
  phone?: string;

  // Role & permissions
  role?: string;            // e.g. "admin", "super_admin"
  role_string?: string;     // from admin API
  is_super_admin?: boolean;

  // Status
  is_active?: boolean;
  is_verified?: boolean;

  // KYC
  kyc_status?: string;
  kyc_level?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_login?: string;

  // Region
  data_region?: string;
}// packages/shared-types/src/index.ts

export interface User {
  // Primary identifier – required (mapped from admin.admin_id)
  user_id: string;

  // Optional alias for backward compatibility
  id?: string;

  // Name fields – required from admin
  username: string;
  full_name: string;
  name?: string; // alias

  // Contact – optional
  email?: string;
  phone?: string;

  // Role & permissions
  role?: string;            // e.g. "admin", "super_admin"
  role_string?: string;     // from admin API
  is_super_admin?: boolean;

  // Status
  is_active?: boolean;
  is_verified?: boolean;

  // KYC
  kyc_status?: string;
  kyc_level?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_login?: string;

  // Region
  data_region?: string;
}