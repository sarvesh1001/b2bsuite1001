// src/store/userAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken, setDeviceId, axiosInstance } from '@b2b/api-client';
import { logoutAllDevices } from '../services/auth';

// ---------- JWT parser ----------
function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('[JWT] Failed to parse token:', e);
    return null;
  }
}

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
  permissions.forEach(p => {
    const parts = p.split('.');
    if (parts.length >= 2) modules.add(parts[0]);
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
  pendingUserId: string | null;
  pendingPhone: string | null;
  pendingHasMpin: boolean | null;
  savedUserId: string | null;
  savedPhone: string | null;
  savedHasMpin: boolean | null;
  _isHydrated: boolean;

  login: (...args: any[]) => void;
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
}

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
      pendingUserId: null,
      pendingPhone: null,
      pendingHasMpin: null,
      savedUserId: null,
      savedPhone: null,
      savedHasMpin: null,
      _isHydrated: false,

      login: (accessToken, refreshToken, user, deviceId, companyId, permissions = []) => {
        console.log('[UserAuth] login() – user_id:', user.user_id);
        setAuthToken(accessToken);
        if (deviceId) setDeviceId(deviceId);
        const modules = extractModulesFromPermissions(permissions);
        set({
          accessToken,
          refreshToken,
          user,
          deviceId: deviceId || null,
          companyId: companyId || user.company_id || null,
          isAuthenticated: true,
          permissions,
          accessibleModules: modules,
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });
      },

      logout: async () => {
        console.log('[UserAuth] logout()');
        const state = get();
        const { accessToken, refreshToken, deviceId, companyId, user } = state;
        if (accessToken && refreshToken && deviceId && user?.user_id) {
          try {
            await logoutAllDevices(user.user_id, accessToken, deviceId, companyId || undefined);
          } catch (error) {
            console.warn('Logout API failed:', error);
          }
        }
        setAuthToken(null);
        setDeviceId(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceId: null,
          companyId: null,
          isAuthenticated: false,
          permissions: [],
          accessibleModules: [],
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
          savedUserId: null,
          savedPhone: null,
          savedHasMpin: null,
        });
      },

      clearSession: () => {
        console.log('[UserAuth] clearSession()');
        setAuthToken(null);
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: [],
          accessibleModules: [],
        });
      },

      // ----- IMPROVED updateTokens with logs -----
      updateTokens: (accessToken, refreshToken) => {
        console.log('[UserAuth] updateTokens() called');
        setAuthToken(accessToken);
        const current = get();

        const updates: Partial<UserAuthState> = {
          accessToken,
          refreshToken,
          isAuthenticated: true,
        };

        const needsUser = !current.user;
        const needsCompany = !current.companyId;
        const needsDevice = !current.deviceId;

        console.log('[UserAuth] Current state before update:', {
          user: current.user,
          companyId: current.companyId,
          deviceId: current.deviceId,
          needsUser,
          needsCompany,
          needsDevice,
        });

        if (needsUser || needsCompany || needsDevice) {
          try {
            const decoded = parseJWT(accessToken);
            console.log('[UserAuth] Decoded JWT:', decoded);

            if (decoded) {
              const userId = decoded.user_id || decoded.sub || decoded.userId;
              const companyId = decoded.company_id || decoded.companyId;
              const deviceId = decoded.device_id || decoded.deviceId;

              console.log('[UserAuth] Extracted from token:', { userId, companyId, deviceId });

              if (needsUser && userId) {
                updates.user = {
                  user_id: userId,
                  phone: decoded.phone || decoded.phone_number || '',
                  full_name: decoded.full_name || decoded.name || '',
                  email: decoded.email || '',
                  company_id: companyId || current.companyId || undefined,
                };
                console.log('[UserAuth] User object built:', updates.user);
              }

              if (needsCompany && companyId) {
                updates.companyId = companyId;
                console.log('[UserAuth] Set companyId:', companyId);
              }

              if (needsDevice && deviceId) {
                updates.deviceId = deviceId;
                setDeviceId(deviceId);
                console.log('[UserAuth] Set deviceId:', deviceId);
              }
            } else {
              console.warn('[UserAuth] JWT decode returned null/undefined');
            }
          } catch (e) {
            console.warn('[UserAuth] Failed to decode token for missing fields', e);
          }
        } else {
          console.log('[UserAuth] No missing fields – store already complete.');
        }

        console.log('[UserAuth] Final updates being applied:', updates);
        set(updates);
      },

      setCompanyId: (companyId) => {
        console.log('[UserAuth] setCompanyId()', companyId);
        set({ companyId });
        const user = get().user;
        if (user) set({ user: { ...user, company_id: companyId } });
      },

      setPendingMpinLogin: (userId, phone, hasMpin) => {
        set({ pendingUserId: userId, pendingPhone: phone, pendingHasMpin: hasMpin });
      },
      clearPendingMpinLogin: () => {
        set({ pendingUserId: null, pendingPhone: null, pendingHasMpin: null });
      },

      setSavedUserId: (userId, phone, hasMpin) => {
        set({ savedUserId: userId, savedPhone: phone, savedHasMpin: hasMpin });
      },
      clearSavedUserId: () => {
        set({ savedUserId: null, savedPhone: null, savedHasMpin: null });
      },

      setDeviceIdInStore: (deviceId) => {
        console.log('[UserAuth] setDeviceIdInStore()', deviceId);
        setDeviceId(deviceId);
        set({ deviceId });
      },

      validateSession: async (): Promise<boolean> => {
        const { accessToken, deviceId, companyId } = get();
        console.log('[UserAuth] validateSession()', { hasToken: !!accessToken, hasDevice: !!deviceId });
        if (!accessToken || !deviceId) {
          get().clearSession();
          return false;
        }
        try {
          const headers: any = {
            Authorization: `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
          };
          if (companyId) headers['X-Company-ID'] = companyId;
          const response = await axiosInstance.get('/auth/validate', { headers });
          const isValid = response.status === 200 && response.data?.data?.valid === true;
          if (!isValid) get().clearSession();
          return isValid;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.warn('/auth/validate not found – treating as valid');
            return true;
          }
          get().clearSession();
          return false;
        }
      },
    }),

    {
      name: 'user-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        deviceId: state.deviceId,
        companyId: state.companyId,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        accessibleModules: state.accessibleModules,
        pendingUserId: state.pendingUserId,
        pendingPhone: state.pendingPhone,
        pendingHasMpin: state.pendingHasMpin,
        savedUserId: state.savedUserId,
        savedPhone: state.savedPhone,
        savedHasMpin: state.savedHasMpin,
      }),
      onRehydrateStorage: () => (state, error) => {
        console.log('[UserAuth] onRehydrateStorage – state:', state);
        if (state?.accessToken) setAuthToken(state.accessToken);
        if (state?.deviceId) setDeviceId(state.deviceId);
        setTimeout(() => {
          useUserAuthStore.setState({ _isHydrated: true });
          console.log('[UserAuth] _isHydrated set to true');
        }, 0);
        if (error) {
          console.warn('[UserAuth] Hydration error:', error);
          setTimeout(() => {
            useUserAuthStore.setState({ _isHydrated: true });
          }, 0);
        }
      },
    }
  )
);