// hooks/useHydrated.ts
import { useEffect, useState } from 'react';
import { useUserAuthStore } from '../store/userAuthStore';

/**
 * Returns `true` once the Zustand store has finished rehydrating from persistent storage.
 * This prevents race conditions where the store appears empty on page load.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(() => {
    // Check if already hydrated (e.g., after hot reload)
    return useUserAuthStore.persist.hasHydrated();
  });

  useEffect(() => {
    // If already hydrated, no need to subscribe
    if (hydrated) return;

    // Listen for the hydration event
    const unsubFinish = useUserAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Safety net: if hydration never fires, force hydrated after 2 seconds
    const timeout = setTimeout(() => {
      if (!useUserAuthStore.persist.hasHydrated()) {
        console.warn('⏱️ Hydration timeout – forcing ready');
        setHydrated(true);
      }
    }, 2000);

    return () => {
      unsubFinish();
      clearTimeout(timeout);
    };
  }, [hydrated]);

  return hydrated;
}