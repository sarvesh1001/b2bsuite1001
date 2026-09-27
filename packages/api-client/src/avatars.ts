// packages/api-client/src/avatars.ts
import { axiosInstance } from './axios-instance';
import { Avatar, ApiResponse } from '@b2b/shared-types';
import axios from 'axios';
import {
  idempotentPost,
  idempotentPatch,
  idempotentDelete,
} from './idempotency';

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
 *
 * Route: POST /avatars/me/upload-url
 * Identity comes from the JWT — no {userId} in the URL.
 */
export const generateAvatarUploadUrl = async (
  mimeType: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<{ uploadUrl: string; fileKey: string; expiresIn: number }> => {
  const url = `/avatars/me/upload-url`;
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
 *
 * NOTE: `/avatars/me/upload` is registered OUTSIDE the location-validated
 * group, so it does NOT require an X-Location-ID header. We still accept
 * a `locationId` param for backward compat but do not send it.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _locationId?: string, // kept for signature compat; not sent (route is not location-scoped)
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
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30_000,
  });

  return response.data.data;
};

// ---- Idempotent mutating operations ----

/**
 * Confirm avatar upload and create the avatar record.
 *
 * Route: POST /avatars/me/confirm
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
  const url = `/avatars/me/confirm`;
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
 *
 * Route: GET /avatars/me/primary
 * Identity comes from the JWT — no {userId} in the URL.
 * (Read‑only, no idempotency.)
 */
export const getMyPrimaryAvatar = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/me/primary`;
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
 *
 * Route: GET /avatars/me
 * (Read‑only.)
 */
export const listMyAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/me`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, {
    headers,
  });
  return response.data.data || [];
};

/**
 * List all soft‑deleted (inactive) avatars of the authenticated user.
 *
 * Route: GET /avatars/me/inactive
 * (Read‑only.)
 */
export const listInactiveAvatars = async (
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar[]> => {
  const url = `/avatars/me/inactive`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar[]>>(url, {
    headers,
  });
  return response.data.data || [];
};

/**
 * Get a specific avatar by ID (must belong to the authenticated user).
 *
 * Route: GET /avatars/me/{id}
 * (Read‑only.)
 */
export const getAvatarById = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar> => {
  const url = `/avatars/me/${avatarId}`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  const response = await axiosInstance.get<ApiResponse<Avatar>>(url, {
    headers,
  });
  return response.data.data;
};

/**
 * Set an avatar as primary.
 *
 * Route: PATCH /avatars/me/{id}/primary   (was PUT — changed to PATCH)
 * Uses idempotentPatch.
 */
export const setAvatarPrimary = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility; wrapper generates its own
  companyId: string,
): Promise<void> => {
  const url = `/avatars/me/${avatarId}/primary`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentPatch<void>(url, {}, 'setAvatarPrimary', { headers });
};

/**
 * Delete (soft‑delete) an avatar.
 *
 * Route: DELETE /avatars/me/{id}
 * Uses idempotentDelete.
 */
export const deleteAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility
  companyId: string,
): Promise<void> => {
  const url = `/avatars/me/${avatarId}`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentDelete<void>(url, {}, 'deleteAvatar', { headers });
};

/**
 * Reactivate a soft‑deleted avatar.
 *
 * Route: POST /avatars/me/{id}/reactivate   (was PUT — changed to POST)
 * Uses idempotentPost.
 */
export const reactivateAvatar = async (
  avatarId: string,
  deviceId: string,
  accessToken: string,
  idempotencyKey: string, // kept for compatibility
  companyId: string,
  setPrimary: boolean = false,
): Promise<void> => {
  const url = `/avatars/me/${avatarId}/reactivate`;
  const headers = getBaseHeaders(deviceId, accessToken, companyId);
  await idempotentPost<void>(url, { setPrimary }, 'reactivateAvatar', {
    headers,
  });
};

/**
 * Get the primary avatar of the authenticated user.
 *
 * Route: GET /avatars/me/primary
 *
 * ⚠️ `userId` is retained ONLY for backward compatibility with existing
 *     callers (e.g. `UserAvatar` which passes the target user's id).
 *     The server IGNORES the path and reads identity from the JWT — so
 *     this function ALWAYS returns the caller's own avatar, never
 *     someone else's.
 *
 *     If your app needs to render OTHER users' avatars, add a separate
 *     endpoint (e.g. `/avatars/company/users/{userId}/primary`) gated
 *     behind `hr.employee.view`.
 */
export const getUserPrimaryAvatar = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string, // ← ignored; identity comes from the JWT
  deviceId: string,
  accessToken: string,
  companyId: string,
): Promise<Avatar | null> => {
  const url = `/avatars/me/primary`;
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
    console.warn(`Failed to fetch avatar (self)`, error);
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