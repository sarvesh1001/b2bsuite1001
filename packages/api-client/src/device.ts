import { axiosInstance } from './axios-instance';
import {
  Device,
  DeviceToken,
  DeviceEnrollment,
  AttendanceEvent,
  BatchIngestPayload,
  BatchStatus,
  BiometricSyncPayload,
  BiometricSyncResponse,
  CreateDevicePayload,
  UpdateDevicePayload,
  EnrollStudentPayload,
  RevokeEnrollmentPayload,
  IssueTokenPayload,
  HeartbeatPayload,
  TokenRevocationPayload,
  ApiResponse,
} from '@b2b/shared-types';

// ------------------------------------------------------------
// Header builders
// ------------------------------------------------------------

const adminHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

const deviceHeaders = (companyId: string, deviceId: string, deviceToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  'X-Device-Token': deviceToken,
  'Content-Type': 'application/json',
});

// ------------------------------------------------------------
// 1. DEVICE MANAGEMENT (Admin JWT)
// ------------------------------------------------------------

/** 1.1 Create a new attendance device */
export const createDevice = async (
  companyId: string,
  deviceId: string,
  payload: CreateDevicePayload,
  accessToken: string
): Promise<ApiResponse<Device>> => {
  const url = `/companies/${companyId}/attendance/devices`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 1.2 List all devices */
export const listDevices = async (
  companyId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<Device[]>> => {
  const url = `/companies/${companyId}/attendance/devices`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/** 1.3 Get device by ID */
export const getDevice = async (
  companyId: string,
  targetDeviceId: string, // the device ID to fetch
  deviceId: string,       // the requesting device ID (for header)
  accessToken: string
): Promise<ApiResponse<Device>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/** 1.4 Update device */
export const updateDevice = async (
  companyId: string,
  targetDeviceId: string,
  payload: UpdateDevicePayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<Device>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.put(url, payload, { headers });
  return response.data;
};

/** 1.5 Activate device */
export const activateDevice = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/activate`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

/** 1.6 Deactivate device */
export const deactivateDevice = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/deactivate`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

/** 1.7 Mark device as trusted */
export const trustDevice = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/trust`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

/** 1.8 Revoke device trust */
export const revokeDeviceTrust = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/revoke-trust`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

/** 1.9 Delete device (soft delete) */
export const deleteDevice = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.delete(url, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 2. DEVICE TOKEN MANAGEMENT (Admin JWT)
// ------------------------------------------------------------

/** 2.1 Issue a new device token (returns raw token) */
export const issueDeviceToken = async (
  companyId: string,
  targetDeviceId: string,
  payload: IssueTokenPayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ token: string; token_id: string; expires_at?: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/tokens`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 2.2 Get current active token for device */
export const getCurrentDeviceToken = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<DeviceToken>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/tokens/current`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/** 2.3 Revoke a specific token (by token ID) */
export const revokeToken = async (
  companyId: string,
  targetDeviceId: string,
  tokenId: string,
  payload: TokenRevocationPayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/tokens/${tokenId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.delete(url, { data: payload, headers });
  return response.data;
};

/** 2.4 Revoke all tokens for device */
export const revokeAllTokens = async (
  companyId: string,
  targetDeviceId: string,
  payload: TokenRevocationPayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/tokens`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.delete(url, { data: payload, headers });
  return response.data;
};

// ------------------------------------------------------------
// 3. DEVICE HEARTBEAT (Device Token Auth)
// ------------------------------------------------------------

export const sendHeartbeat = async (
  companyId: string,
  deviceId: string,
  payload: HeartbeatPayload,
  deviceToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance-device/device/heartbeat`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 4. DEVICE ENROLLMENT (Admin JWT)
// ------------------------------------------------------------

/** 4.1 Enroll student to device */
export const enrollStudent = async (
  companyId: string,
  targetDeviceId: string,
  payload: EnrollStudentPayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<DeviceEnrollment>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/enrollments`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 4.2 List enrollments for a device */
export const listEnrollments = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<DeviceEnrollment[]>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/enrollments`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/** 4.3 Revoke an enrollment (soft deactivate) */
export const revokeEnrollment = async (
  companyId: string,
  targetDeviceId: string,
  payload: RevokeEnrollmentPayload,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/enrollments`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.delete(url, { data: payload, headers });
  return response.data;
};

/** 4.4 Unrevoke a previously revoked enrollment */
export const unrevokeEnrollment = async (
  companyId: string,
  targetDeviceId: string,
  payload: RevokeEnrollmentPayload & { reason?: string },
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/enrollments/unrevoke`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 4.5 List revoked enrollments for a device */
export const listRevokedEnrollments = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<DeviceEnrollment[]>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/enrollments/revoked`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 5. ATTENDANCE PUNCH & BATCH INGEST (Device Token Auth)
// ------------------------------------------------------------

/** 5.1 Single punch event from device */
export const punchEvent = async (
  companyId: string,
  deviceId: string,
  event: AttendanceEvent,
  deviceToken: string
): Promise<ApiResponse<{ id: string }>> => {
  const url = `/companies/${companyId}/attendance-device/events/punch`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, event, { headers });
  return response.data;
};

/** 5.2 Batch ingest multiple punch events */
export const ingestBatch = async (
  companyId: string,
  deviceId: string,
  payload: BatchIngestPayload,
  deviceToken: string
): Promise<ApiResponse<{ batch_ref: string; message: string }>> => {
  const url = `/companies/${companyId}/attendance-device/batch/ingest`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 5.3 Get batch processing status */
export const getBatchStatus = async (
  companyId: string,
  deviceId: string,
  batchRef: string,
  deviceToken: string
): Promise<ApiResponse<BatchStatus>> => {
  const url = `/companies/${companyId}/attendance-device/batch/${batchRef}/status`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

/** 5.4 Get batch failures */
export const getBatchFailures = async (
  companyId: string,
  deviceId: string,
  batchRef: string,
  deviceToken: string
): Promise<ApiResponse<Array<{ event: AttendanceEvent; error: string }>>> => {
  const url = `/companies/${companyId}/attendance-device/batch/${batchRef}/failures`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 6. STUDENT BIOMETRIC SYNC (Device Token Auth)
// ------------------------------------------------------------

/** 6.1 Smart sync (full or incremental based on device state) */
export const syncBiometricData = async (
  companyId: string,
  deviceId: string,
  payload: BiometricSyncPayload,
  deviceToken: string
): Promise<ApiResponse<BiometricSyncResponse>> => {
  const url = `/companies/${companyId}/academics/biometric-device/sync`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

/** 6.2 Force full sync (ignores last_synced_at) */
export const forceFullSync = async (
  companyId: string,
  deviceId: string,
  modelVersion: string,
  deviceToken: string
): Promise<ApiResponse<BiometricSyncResponse>> => {
  const url = `/companies/${companyId}/academics/biometric-device/full/${deviceId}?model_version=${encodeURIComponent(modelVersion)}`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

/** 6.3 Reset device sync state (next sync will be full) */
export const resetSyncState = async (
  companyId: string,
  deviceId: string,
  deviceToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/academics/biometric-device/reset/${deviceId}`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 7. STUDENT BIOMETRIC MAPPING (Admin JWT)
// ------------------------------------------------------------

// These match the '/academics/attendance/biometric/mappings' endpoints.

export interface BiometricMapping {
  id: string;
  student_id: string;
  device_id: string;
  device_user_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const createBiometricMapping = async (
  companyId: string,
  deviceId: string,
  payload: { student_id: string; device_id: string; device_user_code: string },
  accessToken: string
): Promise<ApiResponse<BiometricMapping>> => {
  const url = `/companies/${companyId}/academics/attendance/biometric/mappings`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, payload, { headers });
  return response.data;
};

export const listBiometricMappings = async (
  companyId: string,
  deviceId: string,
  params: { student_id?: string; is_active?: boolean },
  accessToken: string
): Promise<ApiResponse<BiometricMapping[]>> => {
  const url = `/companies/${companyId}/academics/attendance/biometric/mappings`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers, params });
  return response.data;
};

export const updateBiometricMapping = async (
  companyId: string,
  mappingId: string,
  deviceId: string,
  payload: { device_user_code?: string; is_active?: boolean },
  accessToken: string
): Promise<ApiResponse<BiometricMapping>> => {
  const url = `/companies/${companyId}/academics/attendance/biometric/mappings/${mappingId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.put(url, payload, { headers });
  return response.data;
};

export const deleteBiometricMapping = async (
  companyId: string,
  mappingId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/academics/attendance/biometric/mappings/${mappingId}`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.delete(url, { headers });
  return response.data;
};

export const deactivateAllMappingsForStudent = async (
  companyId: string,
  studentId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ message: string }>> => {
  const url = `/companies/${companyId}/academics/attendance/biometric/students/${studentId}/deactivate`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.post(url, {}, { headers });
  return response.data;
};

// ------------------------------------------------------------
// 8. DEVICE HEALTH & UTILITY
// ------------------------------------------------------------

export const getDeviceHealth = async (
  companyId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<{ status: string; message?: string }>> => {
  const url = `/companies/${companyId}/attendance/devices/health`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

export const getHeartbeatHistory = async (
  companyId: string,
  targetDeviceId: string,
  deviceId: string,
  accessToken: string
): Promise<ApiResponse<Array<{ timestamp: string; data: any }>>> => {
  const url = `/companies/${companyId}/attendance/devices/${targetDeviceId}/heartbeats`;
  const headers = adminHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};

export const getBiometricHealth = async (
  companyId: string,
  deviceId: string,
  deviceToken: string
): Promise<ApiResponse<{ status: string; message?: string }>> => {
  const url = `/companies/${companyId}/biometric-device/health`;
  const headers = deviceHeaders(companyId, deviceId, deviceToken);
  const response = await axiosInstance.get(url, { headers });
  return response.data;
};