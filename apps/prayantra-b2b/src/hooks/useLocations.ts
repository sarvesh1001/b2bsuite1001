import { useEffect, useState, useCallback } from 'react';
import { useUserAuthStore } from '../store/userAuthStore';
import { listLocations } from '@b2b/api-client';
import type { LocationOption } from '../constants/orgUnit';

let CACHE: LocationOption[] | null = null;
let CACHE_COMPANY: string | null = null;

export const useLocations = () => {
  const { companyId } = useUserAuthStore();
  const [locations, setLocations] = useState<LocationOption[]>(CACHE ?? []);
  const [loading, setLoading] = useState(!CACHE);

  const fetchLocations = useCallback(
    async (force = false) => {
      if (!companyId) return;
      if (!force && CACHE && CACHE_COMPANY === companyId) {
        setLocations(CACHE);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const raw = await listLocations(companyId, 1, 500);
        // Handle both envelope styles
        const arr: any[] =
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.locations) ? raw.locations :
          Array.isArray(raw?.data) ? raw.data :
          [];
        const mapped: LocationOption[] = arr.map((l: any) => ({
          location_id: l.location_id,
          location_code: l.location_code,
          location_name: l.location_name,
          city: l.city ?? null,
        }));
        CACHE = mapped;
        CACHE_COMPANY = companyId;
        setLocations(mapped);
      } catch (e) {
        console.warn('[useLocations] failed to load', e);
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const findLocation = useCallback(
    (id?: string | null): LocationOption | null => {
      if (!id) return null;
      return locations.find((l) => l.location_id === id) ?? null;
    },
    [locations],
  );

  return { locations, loading, reload: () => fetchLocations(true), findLocation };
};