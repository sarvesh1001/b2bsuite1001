// packages/api-client/src/idempotency.ts

import { axiosInstance } from './axios-instance';
import { AxiosRequestConfig, Method } from 'axios';

// Use crypto.randomUUID if available (web), fallback to a simple UUID generator
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Simple fallback for React Native (though expo-crypto is recommended)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const keyMap = new Map<string, string>();

const generateKey = (): string => generateUUID();

const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') return true;
  if (error.response?.status === 429) return true;
  return false;
};

/**
 * Generic idempotent request for any method.
 */
export async function idempotentRequest<T = any>(
  method: Method,
  url: string,
  data: any,
  operation: string,
  config?: AxiosRequestConfig
): Promise<T> {
  let key = keyMap.get(operation);
  if (!key) {
    key = generateKey();
    keyMap.set(operation, key);
  }

  try {
    const response = await axiosInstance.request<T>({
      method,
      url,
      data,
      ...config,
      headers: {
        ...config?.headers,
        'Idempotency-Key': key,
      },
    });

    keyMap.delete(operation);
    return response.data;
  } catch (error: any) {
    if (isRetryableError(error)) {
      throw error;
    }
    keyMap.delete(operation);
    throw error;
  }
}

// Convenience wrappers
export const idempotentPost = <T = any>(
  url: string,
  data: any,
  operation: string,
  config?: AxiosRequestConfig
) => idempotentRequest<T>('POST', url, data, operation, config);

export const idempotentPut = <T = any>(
  url: string,
  data: any,
  operation: string,
  config?: AxiosRequestConfig
) => idempotentRequest<T>('PUT', url, data, operation, config);

export const idempotentPatch = <T = any>(
  url: string,
  data: any,
  operation: string,
  config?: AxiosRequestConfig
) => idempotentRequest<T>('PATCH', url, data, operation, config);

export const idempotentDelete = <T = any>(
  url: string,
  data?: any,
  operation: string = 'delete',
  config?: AxiosRequestConfig
) => idempotentRequest<T>('DELETE', url, data, operation, config);

export const resetIdempotencyKey = (operation: string) => keyMap.delete(operation);
export const resetAllIdempotencyKeys = () => keyMap.clear();