// apps/prayantra-b2b/src/hooks/useWorkCenters.ts
//
// Shared read-mostly cache for work centers.
//
// Fetches /companies/{c}/attendance/work-centers once per (companyId,
// locationId) session and reuses the result across every screen that
// needs a picker. Call `refresh()` to force a refetch.
//
// The endpoint returns a bare array; we accept both shapes for safety.

import { useCallback, useEffect, useState } from 'react';
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';

export interface WorkCenterOption {
  work_center_code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  location_id?: string | null;
  location_code?: string | null;
  location_name?: string | null;
  timezone?: string | null;
}

interface CacheKey {
  companyId: string;
  locationId: string | null;
}

let cache: WorkCenterOption[] | null = null;
let cacheKey: CacheKey | null = null;

function sameKey(a: CacheKey | null, b: CacheKey): boolean {
  if (!a) return false;
  return a.companyId === b.companyId && a.locationId === b.locationId;
}

function unwrapWorkCenters(raw: unknown): WorkCenterOption[] {
  if (Array.isArray(raw)) return raw as WorkCenterOption[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as WorkCenterOption[];
    if (Array.isArray(r.work_centers)) return r.work_centers as WorkCenterOption[];
    if (Array.isArray(r.items)) return r.items as WorkCenterOption[];
    if (r.data && typeof r.data === 'object') {
      const d = r.data as Record<string, unknown>;
      if (Array.isArray(d.work_centers)) return d.work_centers as WorkCenterOption[];
      if (Array.isArray(d.items)) return d.items as WorkCenterOption[];
    }
  }
  return [];
}

export function useWorkCenters() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const key: CacheKey = {
    companyId: companyId ?? '',
    locationId: locationId ?? null,
  };

  // Seed from cache if it matches this caller.
  const [workCenters, setWorkCenters] = useState<WorkCenterOption[]>(
    sameKey(cacheKey, key) && cache ? cache : [],
  );
  const [loading, setLoading] = useState(
    !(sameKey(cacheKey, key) && cache),
  );
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (force: boolean = false) => {
      if (!companyId || !deviceId || !accessToken) {
        setLoading(false);
        return;
      }

      if (!force && sameKey(cacheKey, key) && cache) {
        if (__DEV__) {
          console.log('[wc-hook] serving from cache, count =', cache.length);
        }
        setWorkCenters(cache);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (__DEV__) {
          console.log('[wc-hook] fetching', key);
        }

        const res = await axiosInstance.get(
          `/companies/${companyId}/attendance/work-centers`,
          {
            headers: {
              'X-Company-ID': companyId,
              'X-Device-ID': deviceId,
              ...(locationId && locationId !== 'ALL'
                ? { 'X-Location-ID': locationId }
                : {}),
              Authorization: `Bearer ${accessToken}`,
            },
            params: { page: 1, page_size: 200 },
          },
        );

        const list = unwrapWorkCenters(res.data);

        if (__DEV__) {
          console.log('[wc-hook] fetched, count =', list.length);
          if (list.length > 0) {
            console.log(
              '[wc-hook] sample codes:',
              list.slice(0, 5).map((wc) => wc.work_center_code),
            );
          }
        }

        cache = list;
        cacheKey = key;
        setWorkCenters(list);
      } catch (e: any) {
        if (__DEV__) {
          console.warn(
            '[wc-hook] fetch failed:',
            e?.response?.status,
            e?.message,
          );
        }
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Failed to load work centers',
        );
      } finally {
        setLoading(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, key.companyId, key.locationId],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const refresh = useCallback(() => fetchAll(true), [fetchAll]);

  const clear = useCallback(() => {
    cache = null;
    cacheKey = null;
    setWorkCenters([]);
  }, []);

  return { workCenters, loading, error, refresh, clear };
}

/** Call on logout so the next user doesn't see stale data. */
export function clearWorkCentersCache() {
  cache = null;
  cacheKey = null;
}