// packages/api-client/src/users.ts
import { AxiosError } from 'axios';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut } from './idempotency';

// ---------- helper: base headers ----------
const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
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