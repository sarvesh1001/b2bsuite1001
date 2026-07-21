import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Create instance WITHOUT baseURL – set it in App.tsx via defaults
const AXIOS_INSTANCE: AxiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach JWT
AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor – capture Retry-After and handle 401
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    // Capture Retry-After header on 429 (rate limiting)
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        error.retryAfter = parseInt(retryAfter, 10);
      }
    }

    // Handle 401 – refresh token logic (stub)
    if (status === 401) {
      console.warn('Unauthorized – trigger refresh');
    }

    return Promise.reject(error);
  }
);

// Export the instance for your services (e.g., import { axiosInstance } from '../api-client')
export const axiosInstance = AXIOS_INSTANCE;

// This is what Orval expects for the generated client
export const customAxiosInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  AXIOS_INSTANCE.request<T>(config).then((response: AxiosResponse<T>) => response.data);

// Also export default for backwards compatibility
export default AXIOS_INSTANCE;