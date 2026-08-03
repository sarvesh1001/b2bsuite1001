import { axiosInstance } from '../axios-instance';
import { ApiResponse, UserTokens, User } from '@b2b/shared-types';

// 1. Initiate login
export const initiateUserLogin = (
  phoneNumber: string,
  deviceId: string,
  deviceFingerprint: string,
  dataRegion = 'us'
) =>
  axiosInstance.post<ApiResponse<{
    user_exists: boolean;
    has_mpin: boolean;
    mpin_locked: boolean;
    device_trusted: boolean;
    flow_state: string;
    user_id?: string;
  }>>('/auth/login/initiate', {
    phone_number: phoneNumber,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint,
    data_region: dataRegion,
  });

// 2. Send OTP
export const sendUserOTP = (
  phoneNumber: string,
  deviceId: string,
  deviceFingerprint: string,
  purpose = 'login',
  userAgent = 'mobile'
) =>
  axiosInstance.post<ApiResponse<{ success: boolean; expires_at: string; retry_after?: number }>>(
    '/auth/otp/send',
    {
      phone_number: phoneNumber,
      purpose,
      device_id: deviceId,
      device_fingerprint: deviceFingerprint,
      user_agent: userAgent,
    }
  );

// 3. Verify OTP
export const verifyUserOTP = (
  phoneNumber: string,
  otp: string,
  deviceId: string,
  deviceFingerprint: string,
  userAgent = 'mobile'
) =>
  axiosInstance.post<ApiResponse<{
    user_id: string;
    device_trusted: boolean;
    has_mpin: boolean;
    mpin_locked: boolean;
    next_step: 'mpin_login' | 'setup_mpin';
  }>>('/auth/login/verify-otp', {
    phone_number: phoneNumber,
    otp,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint,
    user_agent: userAgent,
  });

// 4. Setup MPIN
export const setupUserMPIN = (
  phoneNumber: string,
  mpin: string,
  deviceId: string,
  deviceFingerprint: string,
  userAgent = 'mobile'
) =>
  axiosInstance.post<ApiResponse<{ message: string }>>('/auth/mpin/setup', {
    phone_number: phoneNumber,
    mpin,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint,
    user_agent: userAgent,
  });

// 5. Verify MPIN login
export const verifyUserMPIN = (
  phoneNumber: string,
  mpin: string,
  deviceId: string,
  deviceFingerprint: string,
  userAgent = 'mobile',
  companyId?: string
) =>
  axiosInstance.post<ApiResponse<{ user: User; tokens: UserTokens }>>(
    '/auth/login/verify-mpin',
    {
      phone_number: phoneNumber,
      mpin,
      device_id: deviceId,
      device_fingerprint: deviceFingerprint,
      user_agent: userAgent,
      ...(companyId && { company_id: companyId }),
    }
  );

// 6. Forgot MPIN – Send OTP (optional, if you support it)
export const sendForgotMPINOTP = (
  phoneNumber: string,
  deviceId: string,
  deviceFingerprint: string,
  userAgent = 'mobile'
) =>
  axiosInstance.post<ApiResponse<{ success: boolean }>>('/auth/mpin/forgot/send-otp', {
    phone_number: phoneNumber,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint,
    user_agent: userAgent,
  });

// 7. Forgot MPIN – Verify OTP and reset MPIN
export const verifyForgotMPINOTP = (
  phoneNumber: string,
  newMpin: string,
  otp: string,
  deviceId: string,
  deviceFingerprint: string,
  userAgent = 'mobile'
) =>
  axiosInstance.post<ApiResponse<{ success: boolean }>>('/auth/mpin/forgot/verify-otp', {
    phone_number: phoneNumber,
    new_mpin: newMpin,
    otp_code: otp,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint,
    user_agent: userAgent,
  });