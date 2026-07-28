import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

// ------------------------------------------------------------------
// 1. Determine base URL
// ------------------------------------------------------------------
const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:8080/api/v1';

console.log('🌐 [api-client] baseURL initialized to:', baseURL);

// ------------------------------------------------------------------
// 2. Create Axios instance
// ------------------------------------------------------------------
const AXIOS_INSTANCE: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ------------------------------------------------------------------
// 3. Request logging (debug)
// ------------------------------------------------------------------
AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  console.log(`🚀 [api-client] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  console.log('   Headers:', config.headers);
  if (config.data) console.log('   Body:', config.data);
  return config;
});

// ------------------------------------------------------------------
// 4. Auth token & device ID setters
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
// 5. Response interceptor with proper queue handling
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

// ✅ FIX: match both /auth/refresh and /admin-auth/refresh
const isRefreshRequest = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.includes('/auth/refresh') || url.includes('/admin-auth/refresh');
};

AXIOS_INSTANCE.interceptors.response.use(
  (response) => {
    console.log(`✅ [api-client] Response success: ${response.config.url}`, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = originalRequest.url;

    // --- Log the error ---
    console.error(`❌ [api-client] Request failed: ${url}`);
    console.error(`   Status: ${status}`);
    console.error(`   Message: ${error.message}`);
    if (error.response?.data) console.error(`   Response data:`, error.response.data);

    // --- Rate limiting ---
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) error.retryAfter = parseInt(retryAfter, 10);
      return Promise.reject(error);
    }

    // --- 401 Unauthorized (only for non‑refresh requests) ---
    if (status === 401 && !originalRequest._retry && !isRefreshRequest(originalRequest.url)) {
      if (!refreshTokenFn) {
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request
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
        onRefreshed(accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return AXIOS_INSTANCE.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed – reject all queued requests and call unauthorized callback
        onRefreshFailed(refreshError);
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // --- 401 on refresh endpoint itself: just propagate (handled by caller) ---
    if (status === 401 && isRefreshRequest(originalRequest.url)) {
      console.warn('🚫 [api-client] 401 on refresh endpoint – propagating to caller');
      // Do NOT call unauthorizedCallback here – doRefresh already handles it
    }

    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------
// 6. Exports
// ------------------------------------------------------------------
export const axiosInstance = AXIOS_INSTANCE;

export const customAxiosInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  AXIOS_INSTANCE.request<T>(config).then((response: AxiosResponse<T>) => response.data);

export default AXIOS_INSTANCE;