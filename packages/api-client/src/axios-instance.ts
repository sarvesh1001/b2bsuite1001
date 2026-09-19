// packages/api-client/src/axios-instance.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:8080/api/v1';

console.log('🌐 [api-client] baseURL initialized to:', baseURL);

const AXIOS_INSTANCE: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ------------------------------------------------------------------
// Logging — registered FIRST (axios runs LIFO → prints final headers)
// ------------------------------------------------------------------
AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  console.log(
    `🚀 [api-client] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
  );
  console.log('   Headers:', config.headers);
  if (config.data) console.log('   Body:', config.data);
  return config;
});

// ------------------------------------------------------------------
// Token & device setters
// ------------------------------------------------------------------
export const setAuthToken = (token: string | null) => {
  if (token) {
    AXIOS_INSTANCE.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete AXIOS_INSTANCE.defaults.headers.common['Authorization'];
  }
};

export const setDeviceId = (id: string | null) => {
  if (id) {
    AXIOS_INSTANCE.defaults.headers.common['X-Device-ID'] = id;
  } else {
    delete AXIOS_INSTANCE.defaults.headers.common['X-Device-ID'];
  }
};

// ------------------------------------------------------------------
// Company ID — per-request interceptor
// Exempt paths: auth LOGIN/OTP/MPIN/REFRESH flows, admin super-admin
// scope, webhooks.
//
// NOTE: /auth/validate is INTENTIONALLY NOT exempt — the backend
// compares X-Company-ID against the JWT's company_id and returns
// 400 "Company ID mismatch" if the header is missing.
// ------------------------------------------------------------------
let currentCompanyId: string | null = null;

export const setCompanyId = (id: string | null): void => {
  currentCompanyId = id;
  console.log('🏢 [api-client] X-Company-ID set to:', id);
};

export const getCompanyId = (): string | null => currentCompanyId;

const COMPANY_EXEMPT_PATTERNS: RegExp[] = [
  /\/auth\/(login|otp|mpin|refresh|logout|companies|verify|setup)/,
  /\/admin-auth\//,
  /\/webhooks\//,
  /\/admin\//,        // super-admin scope — owner token, no tenant header
];

const isCompanyExempt = (url?: string): boolean => {
  if (!url) return false;
  return COMPANY_EXEMPT_PATTERNS.some((re) => re.test(url));
};

AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!currentCompanyId) return config;
  if (isCompanyExempt(config.url)) return config;

  const existing =
    (config.headers as any)?.['X-Company-ID'] ??
    (config.headers as any)?.['x-company-id'];
  if (existing) return config;

  config.headers = config.headers ?? ({} as any);
  (config.headers as any)['X-Company-ID'] = currentCompanyId;
  return config;
});

// ------------------------------------------------------------------
// Location ID — per-request interceptor
// Exempt paths: auth LOGIN/OTP/MPIN/REFRESH flows, bootstrap
// (/me/locations), admin.
//
// NOTE: /auth/validate is INTENTIONALLY NOT exempt — the backend
// requires X-Location-ID there too (400 otherwise).
//
// Special value: 'ALL' — consolidated view across all locations.
// Backend accepts X-Location-ID: ALL for GET endpoints and rejects
// it with 400 for POST/PUT/PATCH/DELETE.
// ------------------------------------------------------------------
export const ALL_LOCATIONS_ID = 'ALL' as const;
export type AllLocationsId = typeof ALL_LOCATIONS_ID;

let currentLocationId: string | null = null;

export const setLocationId = (id: string | null): void => {
  currentLocationId = id;
  console.log('📍 [api-client] X-Location-ID set to:', id);
};

export const getLocationId = (): string | null => currentLocationId;

/** True when the app is in consolidated "All Locations" mode. */
export const isAllLocations = (): boolean =>
  currentLocationId === ALL_LOCATIONS_ID;

const LOCATION_EXEMPT_PATTERNS: RegExp[] = [
  /\/auth\/(login|otp|mpin|refresh|logout|companies|verify|setup)/,
  /\/admin-auth\//,
  /\/admin\//,
  /\/me\/locations(\?|$|\/)/,   // bootstrap — no X-Location-ID allowed
];

const isLocationExempt = (url?: string): boolean => {
  if (!url) return false;
  return LOCATION_EXEMPT_PATTERNS.some((re) => re.test(url));
};

AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!currentLocationId) return config;
  if (isLocationExempt(config.url)) return config;

  const existing =
    (config.headers as any)?.['X-Location-ID'] ??
    (config.headers as any)?.['x-location-id'];
  if (existing) return config;

  config.headers = config.headers ?? ({} as any);
  (config.headers as any)['X-Location-ID'] = currentLocationId;
  return config;
});

// ------------------------------------------------------------------
// JWT seeding — COMPANY ONLY. Never set location from JWT.
// Location must come from GET /companies/{id}/me/locations so that
// the server is the single source of truth for the user's access.
// ------------------------------------------------------------------
export const applyContextFromJwt = (token: string | null): void => {
  if (!token) return;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    if (payload.company_id) setCompanyId(payload.company_id);
    // ❌ intentionally NOT reading primary_location_id from JWT
  } catch (e) {
    console.warn('⚠️ [api-client] applyContextFromJwt failed:', e);
  }
};

// ------------------------------------------------------------------
// Refresh-token plumbing
// ------------------------------------------------------------------
type RefreshFn = () => Promise<{ accessToken: string; refreshToken: string }>;
let refreshTokenFn: RefreshFn | null = null;
export const setRefreshTokenFunction = (fn: RefreshFn | null): void => {
  refreshTokenFn = fn;
};

let unauthorizedCallback: (() => void) | null = null;
export const setUnauthorizedCallback = (cb: (() => void) | null): void => {
  unauthorizedCallback = cb;
};

// ------------------------------------------------------------------
// Response interceptor
// ------------------------------------------------------------------
let isRefreshing = false;
let refreshSubscribers: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const onRefreshFailed = (error: any) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

const isRefreshRequest = (url?: string): boolean =>
  !!url &&
  (url.includes('/auth/refresh') || url.includes('/admin-auth/refresh'));

AXIOS_INSTANCE.interceptors.response.use(
  (response) => {
    console.log(
      `✅ [api-client] Response success: ${response.config.url}`,
      response.status
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    console.error(`❌ [api-client] Request failed: ${originalRequest?.url}`);
    console.error(`   Status: ${status}`);
    console.error(`   Message: ${error.message}`);
    if (error.response?.data)
      console.error(`   Response data:`, error.response.data);

    // Friendly warning: write blocked in ALL-locations mode
    const method = (originalRequest?.method || '').toLowerCase();
    const isWrite =
      method === 'post' || method === 'put' || method === 'patch' || method === 'delete';
    const msg = error.response?.data?.message;
    if (status === 400 && isWrite && typeof msg === 'string' && /location/i.test(msg)) {
      console.warn(
        '⚠️ [api-client] write blocked in ALL-locations mode – pick a specific location'
      );
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) error.retryAfter = parseInt(retryAfter, 10);
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest(originalRequest.url)
    ) {
      if (!originalRequest.headers?.Authorization) {
        console.warn(
          '🚫 [api-client] 401 on unauthenticated request – skip refresh'
        );
        return Promise.reject(error);
      }
      if (!refreshTokenFn) {
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (token) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(AXIOS_INSTANCE.request(originalRequest));
            },
            reject,
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { accessToken } = await refreshTokenFn();
        setAuthToken(accessToken);
        applyContextFromJwt(accessToken); // re-seeds company only
        onRefreshed(accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return AXIOS_INSTANCE.request(originalRequest);
      } catch (refreshError) {
        onRefreshFailed(refreshError);
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && isRefreshRequest(originalRequest.url)) {
      console.warn(
        '🚫 [api-client] 401 on refresh endpoint – propagating to caller'
      );
    }
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------
export const axiosInstance = AXIOS_INSTANCE;

export const customAxiosInstance = <T>(
  config: AxiosRequestConfig
): Promise<T> =>
  AXIOS_INSTANCE.request<T>(config).then(
    (response: AxiosResponse<T>) => response.data
  );

export default AXIOS_INSTANCE;