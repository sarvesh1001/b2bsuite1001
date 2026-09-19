// apps/mobile/src/services/auth.ts
import { axiosInstance } from '@b2b/api-client';
import { Platform } from 'react-native';
import { idempotentPost } from '../utils/idempotencyRequest';

// ---------- Initiate Login ----------
export const initiateLogin = async (
  phone: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/login/initiate',
    {
      phone_number: phone,
      device_id: deviceId,
      device_fingerprint: fingerprint,
    },
    'initiateLogin'
  );
  return result?.data ?? result;
};

// ---------- Send OTP ----------
export const sendOTP = async (
  phone: string,
  purpose: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/otp/send',
    {
      phone_number: phone,
      purpose,
      device_id: deviceId,
      device_fingerprint: fingerprint,
    },
    'sendOTP'
  );
  return result?.data ?? result;
};

// ---------- Verify OTP ----------
export const verifyOTP = async (
  phone: string,
  otp: string,
  purpose: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/login/verify-otp',
    {
      phone_number: phone,
      otp,
      purpose,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    },
    'verifyOTP'
  );
  return result?.data ?? result;
};

// ---------- Setup MPIN ----------
export const setupMPIN = async (
  adminId: string,
  mpin: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/mpin/setup',
    {
      admin_id: adminId,
      mpin,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    },
    'setupMPIN'
  );
  return result?.data ?? result;
};

// ---------- Verify MPIN ----------
export const verifyMPIN = async (
  phone: string,
  mpin: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/login/verify-mpin',
    {
      phone_number: phone,
      mpin,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    },
    'verifyMPIN'
  );
  return result?.data ?? result;
};

// ---------- Forgot MPIN (initiate) ----------
export const forgotMPIN = async (
  phone: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/mpin/forgot',
    {
      phone_number: phone,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    },
    'forgotMPIN'
  );
  return result?.data ?? result;
};

// ---------- Verify Forgot MPIN (reset) ----------
export const verifyForgotMPIN = async (
  phone: string,
  newMpin: string,
  otpCode: string,
  deviceId: string,
  fingerprint: string
) => {
  const result = await idempotentPost(
    '/admin-auth/mpin/forgot/verify',
    {
      phone_number: phone,
      new_mpin: newMpin,
      otp_code: otpCode,
      device_id: deviceId,
      device_fingerprint: fingerprint,
      user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    },
    'verifyForgotMPIN'
  );
  return result?.data ?? result;
};

// ---------- Refresh Access Token ----------
export const refreshAccessToken = async (refreshToken: string) => {
  const result = await idempotentPost(
    '/admin-auth/refresh',
    { refresh_token: refreshToken },
    'refreshAccessToken'
  );
  return result?.data ?? result;
};

// ---------- Logout ----------
export const logoutUser = async (refreshToken: string) => {
  const result = await idempotentPost(
    '/admin-auth/logout',
    { refresh_token: refreshToken },
    'logoutUser'
  );
  return result?.data ?? result;
};