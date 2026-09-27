// packages/api-client/src/users.ts
import { AxiosError } from 'axios';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut } from './idempotency';
import type {
  UpdateMyProfileRequest,
  UpdateMyProfileResponse,
  UserDisplayName,                 // 👈 add this

} from '@b2b/shared-types';

// ---------- helper: base headers ----------
const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

// ---------- helper: user-scoped headers (no company) ----------
//
// Self-service routes (/users/me) are not scoped to a company and must NOT
// carry X-Company-ID — the backend would treat them as a company-scoped call
// and re-authorize against the wrong resource.
const getUserScopedHeaders = (deviceId: string, accessToken: string) => ({
  'X-Device-ID': deviceId,
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

// ---------------------------------------------------------------------------
// Typed errors — user phone update
// ---------------------------------------------------------------------------
/**
 * Discriminated error codes for user-phone update failures.
 * The backend maps these to specific HTTP statuses:
 *
 *   400 INVALID     – bad ID / phone format / body.user_id ≠ path.userID
 *   403 FORBIDDEN   – permission denied, or user not an employee of this company
 *   404 NOT_FOUND   – user does not exist
 *   409 DUPLICATE   – phone number already owned by another user
 *   0   NETWORK     – request never reached the server (offline, timeout)
 *   other UNKNOWN   – unhandled
 */
export type UserPhoneUpdateErrorCode =
  | 'INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'NETWORK'
  | 'UNKNOWN';

export class UserPhoneUpdateError extends Error {
  public readonly status: number;
  public readonly code: UserPhoneUpdateErrorCode;

  constructor(
    status: number,
    code: UserPhoneUpdateErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UserPhoneUpdateError';
    this.status = status;
    this.code = code;
  }

  /** Human-friendly message the UI can show without extra branching. */
  get userMessage(): string {
    switch (this.code) {
      case 'DUPLICATE':
        return 'That phone number is already registered to another user.';
      case 'NOT_FOUND':
        return 'User not found.';
      case 'FORBIDDEN':
        return 'You do not have permission to update this user’s phone number.';
      case 'INVALID':
        return 'The phone number is invalid. Please check and try again.';
      case 'NETWORK':
        return 'Network error. Please check your connection and retry.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

/** Maps an Axios error to the appropriate code from the backend contract. */
const classifyUpdatePhoneError = (error: unknown): UserPhoneUpdateError => {
  const axiosErr = error as AxiosError<{ message?: string; error?: string }>;
  const status = axiosErr.response?.status ?? 0;
  const rawMsg =
    axiosErr.response?.data?.message ??
    axiosErr.response?.data?.error ??
    axiosErr.message ??
    'Unknown error';

  // No response at all → network / timeout / aborted
  if (!axiosErr.response) {
    const isTimeout =
      axiosErr.code === 'ECONNABORTED' ||
      axiosErr.code === 'ETIMEDOUT' ||
      /timeout/i.test(axiosErr.message ?? '');
    return new UserPhoneUpdateError(
      status,
      'NETWORK',
      isTimeout ? 'Request timed out.' : 'Network request failed.',
      error,
    );
  }

  const code: UserPhoneUpdateErrorCode =
    status === 409 ? 'DUPLICATE' :
    status === 404 ? 'NOT_FOUND' :
    status === 403 ? 'FORBIDDEN' :
    status === 400 ? 'INVALID'   :
    'UNKNOWN';

  return new UserPhoneUpdateError(status, code, String(rawMsg), error);
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Get the phone number of a specific user within a company.
 * (GET – no idempotency needed)
 */
export const getUserPhone = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
): Promise<string | undefined> => {
  const url = `/companies/${companyId}/users/${userId}/phone`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  try {
    const response = await axiosInstance.get<{
      success: boolean;
      data: { phone: string };
    }>(url, { headers });
    return response.data?.data?.phone;
  } catch (error) {
    console.warn(`Failed to fetch phone for user ${userId}`, error);
    return undefined;
  }
};

/**
 * Update the phone number of a specific user within a company.
 * (PUT – idempotent; sends Idempotency-Key header)
 *
 * Body must contain `user_id` (matching the path param) and `phone_number`
 * per the backend contract. Requires `administration.company.update`
 * permission on the caller's role.
 *
 * @throws {UserPhoneUpdateError} on any non-2xx response or network failure.
 */
export const updateUserPhone = async (
  companyId: string,
  userId: string,
  phoneNumber: string,
  deviceId: string,
  accessToken: string,
): Promise<{ user_id: string; company_id: string }> => {
  const url = `/companies/${companyId}/users/${userId}/phone`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  try {
    const response = await idempotentPut<{
      success: boolean;
      data: { user_id: string; company_id: string };
    }>(
      url,
      {
        user_id: userId,
        phone_number: phoneNumber,
      },
      `updateUserPhone:${companyId}:${userId}`,
      { headers },
    );
    return response.data;
  } catch (error) {
    throw classifyUpdatePhoneError(error);
  }
};

/**
 * Log out the current user from all devices.
 * Calls POST /auth/logout/all with { user_id }.
 * Uses idempotentPost to add an Idempotency-Key header.
 */
export const logoutAllDevices = async (
  companyId: string,
  deviceId: string,
  userId: string,
  accessToken: string,
): Promise<void> => {
  const url = `/auth/logout/all`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  // We don't need the response data, but we still call idempotentPost.
  await idempotentPost<void>(
    url,
    { user_id: userId },
    'logoutAllDevices',
    { headers }
  );
};

// ============================================================
// Self-service profile — PATCH /users/me
//
// Only username + full_name are writable here. Everything else
// (email, DOB, tax_id, etc.) lives on employee_profiles and is
// HR-only — see updateMember() in ./hr.ts.
//
// Response shape mirrors the backend handler:
//   { success: true, data: { user_id, username, full_name, updated_at } }
// ============================================================
export const updateMyProfile = async (
  payload: UpdateMyProfileRequest,
  deviceId: string,
  accessToken: string,
): Promise<UpdateMyProfileResponse> => {
  const url = `/users/me`;
  const headers = getUserScopedHeaders(deviceId, accessToken);

  const response = await axiosInstance.patch<{
    success: boolean;
    data: UpdateMyProfileResponse;
    message?: string;
  }>(url, payload, { headers });

  // The backend returns { success, data, message }. We only want `data`.
  const body = response.data;
  if (!body?.data) {
    throw new Error(
      (body as any)?.message ||
        'Unexpected response shape from /users/me',
    );
  }
  return body.data;
};


// ============================================================
// User display name — GET /companies/{companyID}/users/{userID}/display-name
//
// Minimal, cache-free read of { user_id, username, full_name }.
// No PII, no audit — the backend deliberately does not return
// phone_hash, device_id, KYC flags, etc.
//
// This is a UI-decorating read, so it mirrors getUserPhone():
// on failure we warn and return undefined rather than throw,
// letting call sites fall back to "Unknown user" without a
// try/catch on every render.
//
// Requires `administration.company.view` on the caller's role.
// Not idempotent-keyed — it's a plain GET.
// ============================================================
export const getUserDisplayName = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
): Promise<UserDisplayName | undefined> => {
  const url = `/companies/${companyId}/users/${userId}/display-name`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  try {
    const response = await axiosInstance.get<{
      success: boolean;
      data: {
        user_id: string;
        username: string;
        full_name: string;
      };
      message?: string;
    }>(url, { headers });

    const data = response.data?.data;
    if (!data) {
      console.warn(
        `getUserDisplayName: empty data for user ${userId}`,
      );
      return undefined;
    }

    return {
      user_id: data.user_id,
      username: data.username,
      full_name: data.full_name,
    };
  } catch (error) {
    console.warn(
      `Failed to fetch display name for user ${userId}`,
      error,
    );
    return undefined;
  }
};