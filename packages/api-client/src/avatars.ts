import { axiosInstance } from './axios-instance';
import { Avatar, ApiResponse } from '@b2b/shared-types';
import axios from 'axios';

// ---- Helper to build the full avatar URL using the /avatars/file endpoint ----
const buildFileUrl = (key: string): string => {
  // If it's already an absolute URL, return as-is
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  // Get the base API URL from environment, fallback to localhost
  const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  // Construct the download URL
  return `${normalizedBase}/avatars/file?key=${encodeURIComponent(key)}`;
};

/**
 * Generate an upload URL for a new avatar.
 */
export const generateAvatarUploadUrl = async (
  mimeType: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<{ uploadUrl: string; fileKey: string; expiresIn: number }> => {
  const url = `/avatars/upload-url`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.post<{
    success: boolean;
    data: { uploadUrl: string; fileKey: string; expiresIn: number };
  }>(url, { mimeType }, { headers });
  return response.data.data;
};

/**
 * Upload the actual file to the obtained upload URL.
 * React Native compatible: uses object with uri, name, type.
 */
export const uploadAvatarFile = async (
  uploadUrl: string,
  fileKey: string,
  uri: string,
  fileName: string,
  mimeType: string,
  accessToken: string,
  companyId: string,
): Promise<{ file_key: string }> => {
  const formData = new FormData();
  formData.append('file_key', fileKey);
  formData.append('file', {
    uri: uri,
    name: fileName,
    type: mimeType,
  } as any);

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'multipart/form-data',
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.post<{
    success: boolean;
    data: { file_key: string };
  }>(uploadUrl, formData, { headers });
  return response.data.data;
};

/**
 * Confirm avatar upload and create the avatar record.
 */
export const confirmAvatarUpload = async (
  fileKey: string,
  mimeType: string,
  setPrimary: boolean,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string,
  companyId: string,
): Promise<Avatar> => {
  const url = `/avatars/confirm`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.post<ApiResponse<Avatar>>(
    url,
    { fileKey, mimeType, setPrimary },
    { headers }
  );
  return response.data.data;
};

/**
 * Get the primary avatar of the authenticated user.
 */
export const getMyPrimaryAvatar = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/primary`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
  };
  try {
    const response = await axiosInstance.get<ApiResponse<Avatar>>(url, { headers });
    return response.data.data || null;
  } catch {
    return null;
  }
};

/**
 * List all active avatars of the authenticated user.
 */
export const listMyAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, { headers });
  return response.data.data || [];
};

/**
 * List all soft‑deleted (inactive) avatars of the authenticated user.
 */
export const listInactiveAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/inactive`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, { headers });
  return response.data.data || [];
};

/**
 * Get a specific avatar by ID.
 */
export const getAvatarById = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar> => {
  const url = `/avatars/${avatarId}`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
  };
  const response = await axiosInstance.get<ApiResponse<Avatar>>(url, { headers });
  return response.data.data;
};

/**
 * Set an avatar as primary.
 */
export const setAvatarPrimary = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string,
  companyId: string,
): Promise<void> => {
  const url = `/avatars/${avatarId}/primary`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
    'X-Company-ID': companyId,
  };
  await axiosInstance.put(url, {}, { headers });
};

/**
 * Delete (soft‑delete) an avatar.
 */
export const deleteAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string,
  companyId: string,
): Promise<void> => {
  const url = `/avatars/${avatarId}`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Idempotency-Key': idempotencyKey,
    'X-Company-ID': companyId,
  };
  await axiosInstance.delete(url, { headers });
};

/**
 * Reactivate a soft‑deleted avatar.
 * @param setPrimary - if true and no other primary exists, this avatar becomes primary.
 */
export const reactivateAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string,
  companyId: string,
  setPrimary: boolean = false,
): Promise<void> => {
  const url = `/avatars/${avatarId}/reactivate`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
    'X-Company-ID': companyId,
  };
  await axiosInstance.put(url, { setPrimary }, { headers });
};

/**
 * Get the primary avatar of any user (by userId).
 * Requires hr.employee.view permission.
 */
export const getUserPrimaryAvatar = async (
  userId: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/users/${userId}/primary`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
  };
  try {
    const response = await axiosInstance.get<ApiResponse<Avatar>>(url, { headers });
    return response.data.data || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.warn(`Failed to fetch avatar for user ${userId}`, error);
    return null;
  }
};

/**
 * Convenience: extract the best available image URL from an Avatar object.
 * Now returns a full URL pointing to the /avatars/file endpoint.
 */
export const getAvatarUrl = (
  avatar: Avatar | null,
  prefer: 'small' | 'medium' | 'large' = 'medium',
): string | null => {
  if (!avatar) return null;
  let key: string | null = null;
  if (avatar.variants) {
    key = avatar.variants[prefer] || avatar.variants.small || avatar.variants.medium || avatar.variants.large || null;
  }
  if (!key) key = avatar.objectKey || null;
  if (!key) return null;

  // Build the full URL
  return buildFileUrl(key);
};