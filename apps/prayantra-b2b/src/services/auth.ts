import { axiosInstance } from '@b2b/api-client';
import { Platform } from 'react-native';
import { idempotentPost } from '../utils/idempotencyRequest';
import { ApiResponse, UserTokens } from '@b2b/shared-types';
import { useUserAuthStore } from '../store/userAuthStore'; // 👈 added

// ---------- User Agent ----------
const USER_AGENT = Platform.OS === 'ios' ? 'iOS App' : 'Android App';

// ============================================================
// 1. Initiate Login
// ============================================================
export const initiateUserLogin = async (
  phone: string,
  deviceId: string,
  fingerprint: string,
  dataRegion = 'us'
) => {
  const result = await idempotentPost(
    '/auth/login/initiate',
    {
      phone_number: phone,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      data_region: dataRegion,
    },
    'initiateUserLogin'
  );
  return result;
};

// ============================================================
// 2. Send OTP
// ============================================================
export const sendUserOTP = async (
  phone: string,
  deviceId: string,
  fingerprint: string,
  purpose = 'login'
) => {
  const result = await idempotentPost(
    '/auth/otp/send',
    {
      phone_number: phone,
      purpose,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: USER_AGENT,
    },
    'sendUserOTP'
  );
  return result;
};

// ============================================================
// 3. Verify OTP
// ============================================================
export const verifyUserOTP = async (
  phone: string,
  otp: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/auth/login/verify-otp',
    {
      phone_number: phone,
      otp,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: USER_AGENT,
    },
    'verifyUserOTP'
  );
  return result;
};

// ============================================================
// 4. Setup MPIN
// ============================================================
export const setupUserMPIN = async (
  phone: string,
  mpin: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/auth/mpin/setup',
    {
      phone_number: phone,
      mpin,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: USER_AGENT,
    },
    'setupUserMPIN'
  );
  return result;
};

// ============================================================
// 5. Verify MPIN Login
// ============================================================
export const verifyUserMPIN = async (
  phone: string,
  mpin: string,
  deviceId: string,
  fingerprint: string,
  companyId?: string
) => {
  const payload: any = {
    phone_number: phone,
    mpin,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: USER_AGENT,
  };
  if (companyId) {
    payload.company_id = companyId;
  }
  const result = await idempotentPost(
    '/auth/login/verify-mpin',
    payload,
    'verifyUserMPIN'
  );
  return result;
};

// ============================================================
// 6. Forgot MPIN – Send OTP
// ============================================================
export const sendForgotMPINOTP = async (
  phone: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/auth/mpin/forgot/send-otp',
    {
      phone_number: phone,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: USER_AGENT,
    },
    'sendForgotMPINOTP'
  );
  return result;
};

// ============================================================
// 7. Forgot MPIN – Verify OTP and reset
// ============================================================
export const verifyForgotMPINOTP = async (
  phone: string,
  newMpin: string,
  otpCode: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/auth/mpin/forgot/verify-otp',
    {
      phone_number: phone,
      new_mpin: newMpin,
      otp_code: otpCode,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: USER_AGENT,
    },
    'verifyForgotMPINOTP'
  );
  return result;
};

// ============================================================
// 8. Get Company by Employee Phone (public – no idempotency needed)
// ============================================================
export const getCompanyByEmployeePhone = async (phone: string) => {
  const response = await axiosInstance.get(
    `/auth/companies/by-employee-phone?phone=${encodeURIComponent(phone)}`
  );
  return response.data?.data ?? response.data;
};

// ============================================================
// 9. Refresh Access Token
// ============================================================
export const refreshUserAccessToken = async (refreshToken: string) => {
  const result = await idempotentPost(
    '/auth/refresh',
    { refresh_token: refreshToken },
    'refreshUserAccessToken'
  );
  return result;
};

// ============================================================
// 10. Logout
// ============================================================
export const logoutUser = async (
  refreshToken: string,
  accessToken: string,
  deviceId: string,
  companyId?: string
) => {
  const headers: any = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
  };
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }
  const result = await idempotentPost(
    '/auth/logout',
    { refresh_token: refreshToken },
    'logoutUser',
    { headers }
  );
  return result;
};

// ============================================================
// 11. Logout All Devices
// ============================================================
export const logoutAllDevices = async (
  userId: string,
  accessToken: string,
  deviceId: string,
  companyId?: string
) => {
  const headers: any = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
  };
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }
  const result = await idempotentPost(
    '/auth/logout/all',
    { user_id: userId },
    'logoutAllDevices',
    { headers }
  );
  return result;
};

// ============================================================
// 12. Get Auth Status (optional – uses GET)
// ============================================================
export const getUserAuthStatus = async (
  accessToken: string,
  deviceId: string,
  companyId?: string
) => {
  const headers: any = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
  };
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }
  const response = await axiosInstance.get('/auth/status', { headers });
  return response.data?.data ?? response.data;
};

// ============================================================
// 13. Pair Web Session (QR login) – FIXED
// ============================================================
export const pairWebSession = async (
  sessionId: string,
  signature: string,
  accessToken: string
) => {
  // Get the current company ID from the auth store
  const { companyId } = useUserAuthStore.getState();

  const headers: any = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }

  const response = await axiosInstance.post(
    '/web/login/pair',
    {
      session_id: sessionId,
      signature: signature,
    },
    { headers }
  );
  return response.data;
};