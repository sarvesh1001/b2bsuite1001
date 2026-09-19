// Device related types for biometric attendance
// Updated to match backend Go structs (JSON tags)

export interface Device {
    device_id: string;                // UUID (was 'id')
    company_id: string;
    device_code: string;
    device_name?: string;             // backend returns pointer, can be null
    source_type: 'biometric' | 'kiosk' | 'classroom' | 'card' | 'manual'; // added kiosk, classroom
    manufacturer?: string;            // new
    model?: string;                   // new
    work_center_code?: string;
    location_id?: string;             // new, UUID
    ip_address?: string;
    mac_address?: string;
    is_active: boolean;
    is_trusted: boolean;
    last_seen_at?: string;            // ISO timestamp
    installed_at?: string;            // new
    metadata?: Record<string, any>;   // new
    created_at: string;               // ISO timestamp
    // updated_at is not in DeviceResponse, but might be added; backend has no updated_at in Device model? Actually AttendanceDevice has CreatedAt, but no UpdatedAt. So we can omit.
  }
  
  export interface DeviceToken {
    token_id: string;                 // UUID (was 'id')
    company_id: string;               // new
    device_id: string;
    source_type: string;              // new
    token?: string;                   // raw token, only on creation (kept optional)
    is_active: boolean;               // renamed from is_revoked (true = active)
    issued_at: string;                // new
    expires_at?: string;
    last_used_at?: string;            // new
    revoked_at?: string;
    revoked_reason?: string;          // new
    metadata?: Record<string, any>;   // new
    created_at: string;
    // updated_at exists but may be omitted
  }
  
  export interface DeviceEnrollment {
    mapping_id: string;               // UUID (was 'id')
    company_id: string;               // new
    subject_type: string;             // new, e.g., 'employee', 'student'
    subject_id: string;               // UUID (was 'user_id')
    device_id: string;
    source_type: string;              // 'biometric' | 'kiosk' | ...
    device_user_code: string;
    is_active: boolean;
    enrollment_version: number;       // new
    enrolled_at: string;              // ISO (was created_at for enrollment)
    last_used_at?: string;            // new
    revoked_at?: string;
    revoked_reason?: string;          // new
    created_by?: string;              // UUID
    updated_by?: string;              // UUID
    created_at: string;
    updated_at: string;
  }
  
  // Attendance event – unchanged, but confirm external_ref matches device_user_code
  export interface AttendanceEvent {
    event_type: 'check_in' | 'check_out';
    event_time: string;               // ISO timestamp
    external_ref: string;             // device_user_code
    context?: {
      work_center_code?: string;
      [key: string]: any;
    };
  }
  
  export interface BatchIngestPayload {
    batch_ref: string;
    events: AttendanceEvent[];
  }
  
  export interface BatchStatus {
    batch_ref: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total_events: number;
    processed_events: number;
    failed_events: number;
    created_at: string;
    updated_at: string;
  }
  
  // Biometric sync – completely revised to match backend SyncEmbeddingsResponse
  export interface BiometricSyncPayload {
    device_id: string;
    model_version: string;            // e.g., 'mobilefacenet_v1'
  }
  
  export interface BiometricSyncResponse {
    sync_type: 'full' | 'incremental'; // new
    company_id: string;                // new
    device_id: string;
    model_version: string;
    server_time: string;               // ISO
    embeddings: Array<{
      device_user_code: string;
      embedding_vector: number[];
      embedding_dim: number;
      updated_at: string;
      is_active: boolean;
    }>;
    // removed employees array – use embeddings list
  }
  
  // Admin operation payloads – updated with all optional fields
  
  export interface CreateDevicePayload {
    source_type: 'biometric' | 'kiosk' | 'classroom' | 'card' | 'manual';
    device_code: string;
    device_name?: string;
    manufacturer?: string;             // new
    model?: string;                    // new
    work_center_code?: string;
    location_id?: string;              // new (UUID)
    ip_address?: string;
    mac_address?: string;
    installed_at?: string;             // new (ISO)
    metadata?: Record<string, any>;    // new
  }
  
  export interface UpdateDevicePayload {
    device_name?: string;
    manufacturer?: string;             // new
    model?: string;                    // new
    work_center_code?: string;
    location_id?: string;              // new
    ip_address?: string;
    mac_address?: string;
    is_active?: boolean;
    installed_at?: string;             // new
    metadata?: Record<string, any>;    // new
  }
  
  export interface EnrollStudentPayload {
    user_id: string;                   // subject_id
    device_user_code: string;
    source_type: 'biometric' | 'kiosk' | 'classroom' | 'card' | 'manual';
    subject_type?: 'employee' | 'student' | 'teacher'; // new, defaults to 'employee'
  }
  
  export interface RevokeEnrollmentPayload {
    device_user_code: string;
    source_type: 'biometric' | 'kiosk' | 'classroom' | 'card' | 'manual';
    reason?: string;
  }
  
  export interface IssueTokenPayload {
    source_type: 'biometric' | 'kiosk' | 'classroom' | 'card' | 'manual';
    expires_in?: number;               // new, seconds from now
  }
  
  export interface HeartbeatPayload {
    device_time: string;               // ISO
    firmware_version?: string;         // optional in backend
    ip_address?: string;
  }
  
  export interface TokenRevocationPayload {
    reason?: string;
  }
  
  // Additional – DeviceStatistics from backend endpoint
  export interface DeviceStatistics {
    total: number;
    active: number;
    inactive: number;
    trusted: number;
    by_source_type: Record<string, number>;
    last_heartbeat?: string;           // ISO
  }