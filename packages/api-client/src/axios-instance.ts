import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const AXIOS_INSTANCE: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized – trigger refresh");
    }
    return Promise.reject(error);
  }
);

// This is what Orval is looking for
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  return AXIOS_INSTANCE.request<T>(config).then(
    (response: AxiosResponse<T>) => response.data
  );
};

export default AXIOS_INSTANCE;