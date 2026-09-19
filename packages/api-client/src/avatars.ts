// packages/api-client/src/avatars.ts
import { axiosInstance } from './axios-instance';
import { Avatar, ApiResponse } from '@b2b/shared-types';
import axios from 'axios';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

// ---- Helper to build the full avatar URL using the /avatars/file endpoint ----
const buildFileUrl = (key: string): string => {
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  const base =
    process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/avatars/file?key=${encodeURIComponent(key)}`;
};

// ---- Helpers to build standard headers (without idempotency) ----
const getBaseHeaders = (
  deviceId: string,
  accessToken: string,
  companyId: string,
) => ({
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'X-Company-ID': companyId,
});

/**
 * Generate an upload URL for a new avatar.
 * (No idempotency needed – this is a GET-like URL generation.)
 */
export const generateAvatarUploadUrl = async (
  mimeType: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<{ uploadUrl: string; fileKey: string; expiresIn: number }> => {
  const url = `/avatars/upload-url`;
  const headers = {
    ...getBaseHeaders(deviceId, accessToken, companyId),
    'Content-Type': 'application/json',
  };
  const response = await axiosInstance.post<{
    success: boolean;
    data: { uploadUrl: string; fileKey: string; expiresIn: number };
  }>(url, { mimeType }, { headers });
  return response.data.data;
};

/**
 * Upload the actual file to the obtained upload URL.
 *
 * IMPORTANT: this bypasses `axiosInstance` and uses raw `axios`.
 *
 * Reasons:
 *   1. The upload URL is usually absolute (`http://…` or `https://…`).
 *      `axiosInstance` has a `baseURL`, and axios naïvely concatenates
 *      them → `…/api/v1http://localhost:8080/avatars/upload` (broken).
 *   2. The storage endpoint is separate from the JSON API. It should
 *      not receive the request interceptor's auto-refresh logic.
 *
 * Because we bypass interceptors, we MUST attach the tenant/session
 * headers manually:
 *   - Authorization  → identifies the user
 *   - X-Device-ID    → required by SessionValidationMiddleware
 *   - X-Company-ID   → required by tenant-scoped routes
 *   - X-Location-ID  → required by LocationValidationMiddleware on writes
 *                      (must be a SPECIFIC location id, not "ALL")
 *
 * If the backend returns a **relative** path, we resolve it against the
 * API baseURL manually so both shapes work.
 */
export const uploadAvatarFile = async (
  uploadUrl: string,
  fileKey: string,
  uri: string,
  fileName: string,
  mimeType: string,
  accessToken: string,
  deviceId: string,
  companyId: string,
  locationId?: string,
): Promise<{ file_key: string }> => {
  const formData = new FormData();
  formData.append('file_key', fileKey);
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  // Resolve the final URL:
  //   - absolute (http://… or https://…) → use as-is
  //   - relative (/avatars/upload)       → prepend the API baseURL
  const baseURL = (axiosInstance.defaults.baseURL ?? '').replace(/\/$/, '');
  const isAbsolute = /^https?:\/\//i.test(uploadUrl);
  const finalUrl = isAbsolute
    ? uploadUrl
    : `${baseURL}/${uploadUrl.replace(/^\//, '')}`;

  console.log('📤 [avatars] uploadAvatarFile →', finalUrl, {
    isAbsolute,
    originalUploadUrl: uploadUrl,
  });

  // Raw axios. No baseURL, no interceptors, no default headers.
  // We attach every tenant/session header by hand.
  const response = await axios.post<{
    success: boolean;
    data: { file_key: string };
  }>(finalUrl, formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
      'X-Company-ID': companyId,
      ...(locationId ? { 'X-Location-ID': locationId } : {}),
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30_000,
  });

  return response.data.data;
};

// ---- Idempotent mutating operations ----

/**
 * Confirm avatar upload and create the avatar record.
 * Uses idempotentPost.
 */
export const confirmAvatarUpload = async (
  fileKey: string,
  mimeType: string,
  setPrimary: boolean,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for signature compatibility; the wrapper generates its own
  companyId: string,
): Promise<Avatar> => {
  const url = `/avatars/confirm`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await idempotentPost<ApiResponse<Avatar>>(
    url,
    { fileKey, mimeType, setPrimary },
    'confirmAvatarUpload',
    { headers },
  );
  return response.data;
};

/**
 * Get the primary avatar of the authenticated user.
 * (Read‑only, no idempotency.)
 */
export const getMyPrimaryAvatar = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/primary`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  try {
    const response = await axiosInstance.get<ApiResponse<Avatar>>(url, {
      headers,
    });
    return response.data.data || null;
  } catch {
    return null;
  }
};

/**
 * List all active avatars of the authenticated user.
 * (Read‑only.)
 */
export const listMyAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, {
    headers,
  });
  return response.data.data || [];
};

/**
 * List all soft‑deleted (inactive) avatars.
 * (Read‑only.)
 */
export const listInactiveAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/inactive`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, {
    headers,
  });
  return response.data.data || [];
};

/**
 * Get a specific avatar by ID.
 * (Read‑only.)
 */
export const getAvatarById = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar> => {
  const url = `/avatars/${avatarId}`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar>>(url, {
    headers,
  });
  return response.data.data;
};

/**
 * Set an avatar as primary.
 * Uses idempotentPut.
 */
export const setAvatarPrimary = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility; wrapper generates its own
  companyId: string,
): Promise<void> => {
  const url = `/avatars/${avatarId}/primary`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentPut<void>(url, {}, 'setAvatarPrimary', { headers });
};

/**
 * Delete (soft‑delete) an avatar.
 * Uses idempotentDelete.
 */
export const deleteAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility
  companyId: string,
): Promise<void> => {
  const url = `/avatars/${avatarId}`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentDelete<void>(url, {}, 'deleteAvatar', { headers });
};

/**
 * Reactivate a soft‑deleted avatar.
 * Uses idempotentPut.
 */
export const reactivateAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility
  companyId: string,
  setPrimary: boolean = false,
): Promise<void> => {
  const url = `/avatars/${avatarId}/reactivate`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentPut<void>(url, { setPrimary }, 'reactivateAvatar', {
    headers,
  });
};

/**
 * Get the primary avatar of any user (by userId).
 * (Read‑only, no idempotency.)
 */
export const getUserPrimaryAvatar = async (
  userId: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/users/${userId}/primary`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  try {
    const response = await axiosInstance.get<ApiResponse<Avatar>>(url, {
      headers,
    });
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
 * Returns a full URL pointing to the /avatars/file endpoint.
 */
export const getAvatarUrl = (
  avatar: Avatar | null,
  prefer: 'small' | 'medium' | 'large' = 'medium',
): string | null => {
  if (!avatar) return null;
  let key: string | null = null;
  if (avatar.variants) {
    key =
      avatar.variants[prefer] ||
      avatar.variants.small ||
      avatar.variants.medium ||
      avatar.variants.large ||
      null;
  }
  if (!key) key = avatar.objectKey || null;
  if (!key) return null;
  return buildFileUrl(key);
};