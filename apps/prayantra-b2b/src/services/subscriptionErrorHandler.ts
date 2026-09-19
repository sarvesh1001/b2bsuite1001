// apps/prayantra-b2b/src/services/subscriptionErrorHandler.ts
import type { AxiosError, AxiosInstance } from 'axios';
import {
  useSubscriptionBlockerStore,
  SubscriptionBlockCode,
} from '../store/subscriptionBlockerStore';

const SUBSCRIPTION_CODES: SubscriptionBlockCode[] = [
  'subscription_required',
  'subscription_expired',
  'subscription_cancelled',
  'subscription_past_due',
];

function isSubscriptionError(err: AxiosError<any>): boolean {
  const status = err.response?.status;
  const code = err.response?.data?.code;
  return status === 402 && typeof code === 'string' && SUBSCRIPTION_CODES.includes(code as SubscriptionBlockCode);
}

/**
 * Install a response interceptor that captures subscription blocks.
 * Returns a disposer that ejects the interceptor.
 *
 * Safe to call multiple times — the previous interceptor is ejected on the
 * second install so only one is ever active.
 */
export function installSubscriptionErrorHandler(
  client: AxiosInstance
): () => void {
  let interceptorId: number | null = null;

  interceptorId = client.interceptors.response.use(
    (r) => r,
    (error: AxiosError<any>) => {
      if (isSubscriptionError(error)) {
        const data = error.response?.data ?? {};
        const companyId =
          (error.config?.headers?.['X-Company-ID'] as string | undefined) ??
          useSubscriptionBlockerStore.getState().blocker?.companyId ??
          null;

        useSubscriptionBlockerStore.getState().setBlocker({
          code: data.code as SubscriptionBlockCode,
          message:
            data.message ||
            'A subscription is required to access this resource.',
          companyId,
          path: error.config?.url,
        });
      }
      return Promise.reject(error);
    }
  );

  return () => {
    if (interceptorId !== null) {
      client.interceptors.response.eject(interceptorId);
      interceptorId = null;
    }
  };
}