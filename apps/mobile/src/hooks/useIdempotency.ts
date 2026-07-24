// hooks/useIdempotency.ts
import { useRef } from 'react';
import * as Crypto from 'expo-crypto';

/**
 * Hook to manage idempotency keys for API mutations.
 * Uses expo-crypto.randomUUID() for secure UUID generation.
 */
export function useIdempotency() {
  const keysMap = useRef<Map<string, string>>(new Map());

  /**
   * Get the idempotency key for a given operation.
   * If no key exists, generate a new one and store it.
   */
  const getKey = (operation: string): string => {
    if (!keysMap.current.has(operation)) {
      // Use expo-crypto's randomUUID (v4)
      keysMap.current.set(operation, Crypto.randomUUID());
    }
    return keysMap.current.get(operation)!;
  };

  /**
   * Reset (invalidate) the idempotency key for a given operation.
   * Should be called on successful mutation or on non‑retryable errors.
   */
  const resetKey = (operation: string): void => {
    keysMap.current.delete(operation);
  };

  /**
   * Reset all keys (useful on logout or global error).
   */
  const resetAllKeys = (): void => {
    keysMap.current.clear();
  };

  return { getKey, resetKey, resetAllKeys };
}