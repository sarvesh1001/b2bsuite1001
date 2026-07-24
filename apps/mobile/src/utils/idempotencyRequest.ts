// apps/mobile/src/utils/idempotencyRequest.ts
import * as Crypto from 'expo-crypto';
import { axiosInstance } from '@b2b/api-client';
import { AxiosRequestConfig, Method } from 'axios';

const keyMap = new Map<string, string>();

const generateKey = (): string => Crypto.randomUUID();

const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') return true;
  if (error.response?.status === 429) return true;
  return false;
};

/**
 * Generic idempotent request for any method (POST, PUT, PATCH, etc.)
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

// Convenience wrappers for common methods
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

export const resetIdempotencyKey = (operation: string) => keyMap.delete(operation);
export const resetAllIdempotencyKeys = () => keyMap.clear();