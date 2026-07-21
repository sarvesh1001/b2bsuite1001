// apps/mobile/src/services/auth.ts
import { axiosInstance } from '../api-client';
import { Platform } from 'react-native';

// ---------- Helper: Logging ----------
const logApi = (endpoint: string, payload: any, response: any) => {
  console.log(`🔹 ${endpoint} REQUEST:`, payload);
  console.log(`🔸 ${endpoint} RESPONSE (full):`, response);
  if (response?.data) {
    console.log(`🔸 ${endpoint} DATA:`, response.data);
  }
};

// ---------- Initiate Login ----------
export const initiateLogin = async (
  phone: string,
  deviceId: string,
  fingerprint: string
) => {
  const payload = {
    phone_number: phone,
    device_id: deviceId,
    device_fingerprint: fingerprint,
  };

  try {
    const response = await axiosInstance.post('/admin-auth/login/initiate', payload);
    logApi('/admin-auth/login/initiate', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ Initiate login error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Send OTP (with idempotency key) ----------
export const sendOTP = async (
  phone: string,
  purpose: string,
  deviceId: string,
  fingerprint: string,
  idempotencyKey?: string
) => {
  const payload = {
    phone_number: phone,
    purpose,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  };

  try {
    const response = await axiosInstance.post('/otp/send', payload);
    logApi('/otp/send', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ Send OTP error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Verify OTP (with idempotency key) ----------
export const verifyOTP = async (
  phone: string,
  otp: string,
  purpose: string,
  deviceId: string,
  fingerprint: string,
  idempotencyKey?: string
) => {
  const payload = {
    phone_number: phone,
    otp,
    purpose,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  };

  try {
    const response = await axiosInstance.post('/admin-auth/login/verify-otp', payload);
    logApi('/admin-auth/login/verify-otp', payload, response.data);
    const unwrapped = response.data?.data ?? response.data;
    console.log('✅ Verified OTP – unwrapped:', unwrapped);
    return unwrapped;
  } catch (error: any) {
    console.error('❌ Verify OTP error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Setup MPIN (with idempotency key) ----------
export const setupMPIN = async (
  adminId: string,
  mpin: string,
  deviceId: string,
  fingerprint: string,
  idempotencyKey?: string
) => {
  const payload = {
    admin_id: adminId,
    mpin,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  };

  try {
    const response = await axiosInstance.post('/admin-auth/mpin/setup', payload);
    logApi('/admin-auth/mpin/setup', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ MPIN setup error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Verify MPIN (with idempotency key) ----------
export const verifyMPIN = async (
  phone: string,
  mpin: string,
  deviceId: string,
  fingerprint: string,
  idempotencyKey?: string
) => {
  const payload = {
    phone_number: phone,
    mpin,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  };

  try {
    const response = await axiosInstance.post('/admin-auth/login/verify-mpin', payload);
    logApi('/admin-auth/login/verify-mpin', payload, response.data);
    const unwrapped = response.data?.data ?? response.data;
    console.log('✅ MPIN verified – unwrapped:', unwrapped);
    return unwrapped;
  } catch (error: any) {
    console.error('❌ MPIN verify error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Forgot MPIN (initiate) ----------
export const forgotMPIN = async (
  phone: string,
  deviceId: string,
  fingerprint: string
) => {
  const payload = {
    phone_number: phone,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
  };

  try {
    const response = await axiosInstance.post('/admin-auth/mpin/forgot', payload);
    logApi('/admin-auth/mpin/forgot', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ Forgot MPIN error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Verify Forgot MPIN (reset with OTP + idempotency) ----------
export const verifyForgotMPIN = async (
  phone: string,
  newMpin: string,
  otpCode: string,
  deviceId: string,
  fingerprint: string,
  idempotencyKey?: string
) => {
  const payload = {
    phone_number: phone,
    new_mpin: newMpin,
    otp_code: otpCode,
    device_id: deviceId,
    device_fingerprint: fingerprint,
    user_agent: Platform.OS === 'ios' ? 'iOS App' : 'Android App',
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  };

  try {
    const response = await axiosInstance.post('/admin-auth/mpin/forgot/verify', payload);
    logApi('/admin-auth/mpin/forgot/verify', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ Verify forgot MPIN error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Refresh Access Token ----------
export const refreshAccessToken = async (refreshToken: string) => {
  const payload = { refresh_token: refreshToken };
  try {
    const response = await axiosInstance.post('/admin-auth/refresh', payload);
    logApi('/admin-auth/refresh', payload, response.data);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    console.error('❌ Refresh token error:', error.response?.data || error.message);
    throw error;
  }
};

// ---------- Logout ----------
export const logoutUser = async (refreshToken: string) => {
  const payload = { refresh_token: refreshToken };
  try {
    const response = await axiosInstance.post('/admin-auth/logout', payload);
    logApi('/admin-auth/logout', payload, response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Logout error:', error.response?.data || error.message);
    throw error;
  }
};