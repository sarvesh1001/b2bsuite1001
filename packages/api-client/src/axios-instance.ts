import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

const AXIOS_INSTANCE: AxiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// ---- New: Unauthorized callback ----
let unauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedCallback = (cb: (() => void) | null): void => {
  unauthorizedCallback = cb;
};
// -----------------------------------

AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Helper to check if the request is the refresh endpoint
const isRefreshRequest = (url: string | undefined): boolean => {
  return url?.includes('/auth/refresh') ?? false;
};

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // Handle rate limiting (already present)
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        error.retryAfter = parseInt(retryAfter, 10);
      }
      return Promise.reject(error);
    }

    // If 401 and not already retrying and not the refresh endpoint itself
    if (status === 401 && !originalRequest._retry && !isRefreshRequest(originalRequest.url)) {
      if (!refreshTokenFn) {
        // No refresh capability – trigger unauthorized callback
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addSubscriber((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(AXIOS_INSTANCE.request(originalRequest));
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const { accessToken } = await refreshTokenFn();
        setAuthToken(accessToken);
        onRefreshed(accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return AXIOS_INSTANCE.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed – clear session and notify
        refreshSubscribers = [];
        if (unauthorizedCallback) unauthorizedCallback();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If we get a 401 on the refresh endpoint itself, or after retry, trigger callback
    if (status === 401 && (originalRequest._retry || isRefreshRequest(originalRequest.url))) {
      if (unauthorizedCallback) unauthorizedCallback();
    }

    return Promise.reject(error);
  }
);

export const axiosInstance = AXIOS_INSTANCE;

export const customAxiosInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  AXIOS_INSTANCE.request<T>(config).then((response: AxiosResponse<T>) => response.data);

export default AXIOS_INSTANCE;