// apps/prayantra-b2b/src/store/userAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import {
  setAuthToken,
  setDeviceId,
  setCompanyId as setApiCompanyId,
  setLocationId as setApiLocationId,
  applyContextFromJwt,
  getMyLocations,
  axiosInstance,
  ALL_LOCATIONS_ID,
} from '@b2b/api-client';
import type {
  AccessibleLocation,
  LocationAccessScope,
} from '@b2b/shared-types';
import { logoutAllDevices } from '../services/auth';

// ---------- Types ----------
export interface User {
  user_id: string;
  phone: string;
  username?: string;
  full_name?: string;
  email?: string;
  role?: string;
  company_id?: string;
  company_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
  kyc_status?: string;
  kyc_level?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  data_region?: string;
}

const extractModulesFromPermissions = (permissions: string[]): string[] => {
  const modules = new Set<string>();
  permissions.forEach((p) => {
    const parts = p.split('.');
    if (parts.length >= 2) {
      modules.add(parts[0]);
    }
  });
  return Array.from(modules);
};

interface UserAuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  companyId: string | null;
  isAuthenticated: boolean;

  permissions: string[];
  accessibleModules: string[];

  locationId: string | null;
  primaryLocationId: string | null;
  locationScope: LocationAccessScope | null;
  accessibleLocations: AccessibleLocation[];

  locationsBootstrapped: boolean;
  locationsBootstrapping: boolean;

  // 🆕 Refresh in-flight flag (separate from bootstrapping so UI can
  //    show a spinner on pull-to-refresh without affecting bootstrap logic)
  locationsRefreshing: boolean;
  lastLocationsRefreshedAt: number | null;

  pendingUserId: string | null;
  pendingPhone: string | null;
  pendingHasMpin: boolean | null;

  savedUserId: string | null;
  savedPhone: string | null;
  savedHasMpin: boolean | null;

  login: (
    accessToken: string,
    refreshToken: string,
    user: User,
    deviceId?: string,
    companyId?: string,
    permissions?: string[]
  ) => void;
  logout: () => Promise<void>;
  clearSession: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  setCompanyId: (companyId: string) => void;
  setPendingMpinLogin: (userId: string, phone: string, hasMpin: boolean) => void;
  clearPendingMpinLogin: () => void;
  setSavedUserId: (userId: string, phone: string, hasMpin: boolean) => void;
  clearSavedUserId: () => void;
  setDeviceIdInStore: (deviceId: string) => void;
  validateSession: () => Promise<boolean>;

  setLocations: (
    locations: AccessibleLocation[],
    primaryLocationId: string | null,
    scope: LocationAccessScope
  ) => void;
  setLocationId: (locationId: string) => void;
  clearLocations: () => void;
  bootstrapLocations: (
    companyId: string
  ) => Promise<{ needsSelection: boolean }>;

  // 🆕 Re-fetch accessible locations without a full logout/login cycle
  refreshLocations: () => Promise<{
    ok: boolean;
    count: number;
    error?: string;
  }>;

  markLocationsBootstrapped: (v: boolean) => void;

  isConsolidated: () => boolean;
}

const secureStorage: StateStorage = {
  getItem: async (key: string) => await SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) =>
    await SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => await SecureStore.deleteItemAsync(key),
};

export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      companyId: null,
      isAuthenticated: false,
      permissions: [],
      accessibleModules: [],

      locationId: null,
      primaryLocationId: null,
      locationScope: null,
      accessibleLocations: [],

      locationsBootstrapped: false,
      locationsBootstrapping: false,

      // 🆕
      locationsRefreshing: false,
      lastLocationsRefreshedAt: null,

      pendingUserId: null,
      pendingPhone: null,
      pendingHasMpin: null,

      savedUserId: null,
      savedPhone: null,
      savedHasMpin: null,

      // =========================================================
      // LOGIN
      // =========================================================
      login: (
        accessToken,
        refreshToken,
        user,
        deviceId,
        companyId,
        permissions = []
      ) => {
        console.log('🔐 [UserAuth] login() – user_id:', user.user_id);
        setAuthToken(accessToken);
        if (deviceId) setDeviceId(deviceId);

        applyContextFromJwt(accessToken);

        const nextCompanyId = companyId || user.company_id || null;
        if (nextCompanyId) setApiCompanyId(nextCompanyId);

        const modules = extractModulesFromPermissions(permissions);

        const prevCompanyId = get().companyId;
        const companyChanged =
          !!prevCompanyId &&
          !!nextCompanyId &&
          prevCompanyId !== nextCompanyId;

        if (companyChanged) {
          console.log(
            '🏢 [UserAuth] Company changed – clearing location context'
          );
          setApiLocationId(null);
        }

        set({
          accessToken,
          refreshToken,
          user,
          deviceId: deviceId || null,
          companyId: nextCompanyId,
          isAuthenticated: true,
          permissions,
          accessibleModules: modules,
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
          locationsBootstrapped: false,
          locationsBootstrapping: false,
          locationsRefreshing: false,
          lastLocationsRefreshedAt: null,
          ...(companyChanged
            ? {
                locationId: null,
                primaryLocationId: null,
                locationScope: null,
                accessibleLocations: [],
              }
            : {}),
        });
        console.log('✅ [UserAuth] Login complete, isAuthenticated = true');
      },

      // =========================================================
      // LOGOUT
      // =========================================================
      logout: async () => {
        console.log('🚪 [UserAuth] logout()');
        const state = get();
        const { accessToken, refreshToken, deviceId, companyId, user } = state;

        if (accessToken && refreshToken && deviceId && user?.user_id) {
          try {
            await logoutAllDevices(
              user.user_id,
              accessToken,
              deviceId,
              companyId || undefined
            );
          } catch (error) {
            console.warn('Logout API failed:', error);
          }
        }

        setAuthToken(null);
        setDeviceId(null);
        setApiLocationId(null);
        setApiCompanyId(null);

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceId: null,
          companyId: null,
          isAuthenticated: false,
          permissions: [],
          accessibleModules: [],
          locationId: null,
          primaryLocationId: null,
          locationScope: null,
          accessibleLocations: [],
          locationsBootstrapped: false,
          locationsBootstrapping: false,
          locationsRefreshing: false,
          lastLocationsRefreshedAt: null,
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
          savedUserId: null,
          savedPhone: null,
          savedHasMpin: null,
        });
      },

      // =========================================================
      // CLEAR SESSION (tokens only, keep saved creds)
      // =========================================================
      clearSession: () => {
        console.log(
          '🧹 [UserAuth] clearSession() – tokens cleared, saved credentials kept'
        );
        setAuthToken(null);
        setApiLocationId(null);
        setApiCompanyId(null);
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: [],
          accessibleModules: [],
          locationId: null,
          primaryLocationId: null,
          locationScope: null,
          accessibleLocations: [],
          locationsBootstrapped: false,
          locationsBootstrapping: false,
          locationsRefreshing: false,
          lastLocationsRefreshedAt: null,
        });
      },

      updateTokens: (accessToken, refreshToken) => {
        console.log('🔄 [UserAuth] updateTokens()');
        setAuthToken(accessToken);
        applyContextFromJwt(accessToken);
        set({ accessToken, refreshToken });
      },

      // =========================================================
      // SET COMPANY
      // =========================================================
      setCompanyId: (companyId) => {
        console.log('🏢 [UserAuth] setCompanyId()', companyId);
        const prev = get().companyId;

        setApiCompanyId(companyId);

        if (prev && prev !== companyId) {
          setApiLocationId(null);
          set({
            companyId,
            locationId: null,
            primaryLocationId: null,
            locationScope: null,
            accessibleLocations: [],
            locationsBootstrapped: false,
            locationsBootstrapping: false,
            locationsRefreshing: false,
            lastLocationsRefreshedAt: null,
          });
        } else {
          set({ companyId });
        }

        const user = get().user;
        if (user) {
          set({ user: { ...user, company_id: companyId } });
        }
      },

      // =========================================================
      // PENDING / SAVED LOGIN HELPERS
      // =========================================================
      setPendingMpinLogin: (userId, phone, hasMpin) => {
        console.log('⏳ [UserAuth] setPendingMpinLogin()', {
          userId,
          phone,
          hasMpin,
        });
        set({
          pendingUserId: userId,
          pendingPhone: phone,
          pendingHasMpin: hasMpin,
        });
      },
      clearPendingMpinLogin: () => {
        console.log('🧹 [UserAuth] clearPendingMpinLogin()');
        set({ pendingUserId: null, pendingPhone: null, pendingHasMpin: null });
      },

      setSavedUserId: (userId, phone, hasMpin) => {
        console.log('💾 [UserAuth] setSavedUserId()', {
          userId,
          phone,
          hasMpin,
        });
        set({
          savedUserId: userId,
          savedPhone: phone,
          savedHasMpin: hasMpin,
        });
      },
      clearSavedUserId: () => {
        console.log('🧹 [UserAuth] clearSavedUserId()');
        set({ savedUserId: null, savedPhone: null, savedHasMpin: null });
      },

      setDeviceIdInStore: (deviceId) => {
        console.log('📱 [UserAuth] setDeviceIdInStore()', deviceId);
        setDeviceId(deviceId);
        set({ deviceId });
      },

      // =========================================================
      // LOCATION ACTIONS
      // =========================================================
      setLocations: (locations, primaryLocationId, scope) => {
        console.log('📍 [UserAuth] setLocations()', {
          count: locations.length,
          primaryLocationId,
          scope,
        });
        set({
          accessibleLocations: locations,
          primaryLocationId,
          locationScope: scope,
        });
      },

      setLocationId: (locationId) => {
        console.log('📍 [UserAuth] setLocationId()', locationId);
        setApiLocationId(locationId);
        set({ locationId });
      },

      clearLocations: () => {
        console.log('🧹 [UserAuth] clearLocations()');
        setApiLocationId(null);
        set({
          locationId: null,
          primaryLocationId: null,
          locationScope: null,
          accessibleLocations: [],
        });
      },

      markLocationsBootstrapped: (v) => set({ locationsBootstrapped: v }),

      isConsolidated: () => {
        const { locationId, locationScope } = get();
        return locationId === ALL_LOCATIONS_ID && locationScope === 'ALL';
      },

      bootstrapLocations: async (companyId) => {
        set({ locationsBootstrapping: true });
        try {
          console.log('📍 [UserAuth] bootstrapLocations start', { companyId });
          const data = await getMyLocations(companyId);
          const locations: AccessibleLocation[] = data?.locations ?? [];
          const primaryLocationId = data?.primary_location_id ?? null;
          const scope: LocationAccessScope =
            (data?.location_scope as LocationAccessScope) ?? 'PRIMARY';

          console.log('📍 [UserAuth] bootstrapLocations response', {
            count: locations.length,
            primaryLocationId,
            scope,
          });

          get().setLocations(locations, primaryLocationId, scope);

          if (locations.length === 0) {
            set({
              locationsBootstrapped: true,
              locationsBootstrapping: false,
              lastLocationsRefreshedAt: Date.now(),
            });
            return { needsSelection: false };
          }

          if (locations.length === 1) {
            get().setLocationId(locations[0].location_id);
            set({
              locationsBootstrapped: true,
              locationsBootstrapping: false,
              lastLocationsRefreshedAt: Date.now(),
            });
            return { needsSelection: false };
          }

          set({
            locationsBootstrapped: true,
            locationsBootstrapping: false,
            lastLocationsRefreshedAt: Date.now(),
          });
          return { needsSelection: true };
        } catch (err: any) {
          console.warn('⚠️ [UserAuth] bootstrapLocations failed:', err);
          set({ locationsBootstrapping: false });
          return { needsSelection: false };
        }
      },

      // =========================================================
      // REFRESH LOCATIONS  🆕
      // ---------------------------------------------------------
      // Re-fetches /me/locations and reconciles state without
      // requiring a logout/login round-trip.
      //
      // Safe to call from any screen — the /me/locations endpoint
      // is exempt from the X-Location-ID interceptor, so it always
      // returns the full authoritative list.
      //
      // Reconciles:
      //   • locations list (adds/removes)
      //   • primary_location_id (if server changed it)
      //   • location_scope      (if admin changed it)
      //   • locationId          (falls back if current is gone)
      // =========================================================
      refreshLocations: async () => {
        const {
          companyId,
          accessToken,
          isAuthenticated,
          locationId,
        } = get();

        if (!isAuthenticated || !companyId || !accessToken) {
          console.warn(
            '⚠️ [UserAuth] refreshLocations skipped – no session/company'
          );
          return { ok: false, count: 0, error: 'no-session' };
        }

        if (get().locationsRefreshing) {
          console.log(
            '⏭️ [UserAuth] refreshLocations already in-flight – skipping'
          );
          return { ok: false, count: get().accessibleLocations.length };
        }

        set({ locationsRefreshing: true });

        try {
          console.log('🔄 [UserAuth] refreshLocations start', { companyId });
          const data = await getMyLocations(companyId);

          const locations: AccessibleLocation[] = data?.locations ?? [];
          const primaryLocationId = data?.primary_location_id ?? null;
          const scope: LocationAccessScope =
            (data?.location_scope as LocationAccessScope) ?? 'PRIMARY';

          console.log('🔄 [UserAuth] refreshLocations response', {
            count: locations.length,
            primaryLocationId,
            scope,
            codes: locations.map((l) => l.location_code),
          });

          // Update list + primary + scope
          set({
            accessibleLocations: locations,
            primaryLocationId,
            locationScope: scope,
            locationsRefreshing: false,
            lastLocationsRefreshedAt: Date.now(),
            locationsBootstrapped: true,
          });

          // Reconcile current locationId
          const current = locationId;
          const isAll = current === ALL_LOCATIONS_ID;
          const exists = locations.some((l) => l.location_id === current);

          if (current && !exists && !isAll) {
            const fallback =
              primaryLocationId ?? locations[0]?.location_id ?? null;

            console.log(
              '⚠️ [UserAuth] current location no longer accessible – falling back',
              { current, fallback }
            );

            setApiLocationId(fallback);
            set({ locationId: fallback });
          }

          // If scope is PRIMARY and there's no explicit locationId set,
          // adopt the primary
          if (!current && primaryLocationId) {
            setApiLocationId(primaryLocationId);
            set({ locationId: primaryLocationId });
          }

          return { ok: true, count: locations.length };
        } catch (err: any) {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            'Unable to refresh locations';

          console.warn('⚠️ [UserAuth] refreshLocations failed:', err);

          set({ locationsRefreshing: false });

          return { ok: false, count: 0, error: message };
        }
      },

      // =========================================================
      // SESSION VALIDATION
      // ---------------------------------------------------------
      // Session is cleared ONLY when the backend responds with:
      //   HTTP 401
      //   message === "invalid, expired, or revoked token"
      // Every other outcome (404, 400, 5xx, network) keeps the
      // session alive so a transient issue doesn't log the user out.
      // =========================================================
      validateSession: async (): Promise<boolean> => {
        const { accessToken, deviceId, companyId } = get();
        console.log('🔍 [UserAuth] validateSession()', {
          hasToken: !!accessToken,
          hasDevice: !!deviceId,
          companyId,
        });

        const handleInvalid = () => {
          get().clearSession();
          try {
            const {
              resetToAuthScreen,
            } = require('../navigation/navigationService');
            resetToAuthScreen();
          } catch (e) {
            console.warn('⚠️ Could not reset navigation – navigator not ready');
          }
        };

        if (!accessToken || !deviceId) {
          handleInvalid();
          return false;
        }

        try {
          const response = await axiosInstance.get('/auth/validate');
          const isValid =
            response.status === 200 && response.data?.data?.valid === true;
          if (!isValid) handleInvalid();
          return isValid;
        } catch (error: any) {
          const status = error.response?.status;
          const message = error.response?.data?.message;

          // 🆕 Only this exact 401 clears the session
          if (
            status === 401 &&
            typeof message === 'string' &&
            message.toLowerCase().includes('invalid, expired, or revoked token')
          ) {
            console.warn(
              '🚫 [UserAuth] validate → token invalid/expired/revoked – clearing session'
            );
            handleInvalid();
            return false;
          }

          // 404 → endpoint not exposed; trust the local session
          if (status === 404) {
            console.warn('⚠️ /auth/validate not found – treating as valid');
            return true;
          }

          // Everything else (400, 500, network, other 401 variants) → keep session
          console.warn(
            `⚠️ [UserAuth] validateSession non-fatal (status=${status}, message="${message}") – keeping session`
          );
          return true;
        }
      },
    }),
    {
      name: 'user-auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        deviceId: state.deviceId,
        companyId: state.companyId,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        accessibleModules: state.accessibleModules,
        locationId: state.locationId,
        primaryLocationId: state.primaryLocationId,
        locationScope: state.locationScope,
        accessibleLocations: state.accessibleLocations,
        locationsBootstrapped: state.locationsBootstrapped,
        lastLocationsRefreshedAt: state.lastLocationsRefreshedAt,
        pendingUserId: state.pendingUserId,
        pendingPhone: state.pendingPhone,
        pendingHasMpin: state.pendingHasMpin,
        savedUserId: state.savedUserId,
        savedPhone: state.savedPhone,
        savedHasMpin: state.savedHasMpin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAuthToken(state.accessToken);
          applyContextFromJwt(state.accessToken);
        }
        if (state?.deviceId) setDeviceId(state.deviceId);
        if (state?.companyId) setApiCompanyId(state.companyId);
        if (state?.locationId) setApiLocationId(state.locationId);
      },
    }
  )
);