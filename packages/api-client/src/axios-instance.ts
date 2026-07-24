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

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        error.retryAfter = parseInt(retryAfter, 10);
      }
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      if (!refreshTokenFn) {
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
        refreshSubscribers = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const axiosInstance = AXIOS_INSTANCE;

export const customAxiosInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  AXIOS_INSTANCE.request<T>(config).then((response: AxiosResponse<T>) => response.data);

export default AXIOS_INSTANCE;