import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken, setDeviceId, axiosInstance } from '@b2b/api-client';

// Extend User type to include role_string and is_super_admin
export interface User {
  user_id: string;
  username: string;
  full_name: string;
  email?: string;
  role?: string;
  role_string?: string;
  is_super_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  kyc_status?: string;
  kyc_level?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  data_region?: string;
}

// SecureStore adapter for Zustand persistence
const secureStorage = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;

  pendingAdminId: string | null;
  pendingPhone: string | null;
  pendingHasMpin: boolean | null;

  savedAdminId: string | null;
  savedPhone: string | null;
  savedHasMpin: boolean | null;

  login: (accessToken: string, refreshToken: string, user: User, deviceId?: string) => void;
  logout: () => void;
  clearSession: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  setPendingMpinLogin: (adminId: string, phone: string, hasMpin: boolean) => void;
  clearPendingMpinLogin: () => void;
  setSavedAdminId: (adminId: string, phone: string, hasMpin: boolean) => void;
  clearSavedAdminId: () => void;

  setDeviceIdInStore: (deviceId: string) => void;
  validateSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isAuthenticated: false,

      pendingAdminId: null,
      pendingPhone: null,
      pendingHasMpin: null,

      savedAdminId: null,
      savedPhone: null,
      savedHasMpin: null,

      login: (accessToken, refreshToken, user, deviceId) => {
        console.log('🔐 [authStore.login] received user:', user);
        console.log('🔐 [authStore.login] user.role:', user.role);
        console.log('🔐 [authStore.login] user.role_string:', user.role_string);
        console.log('🔐 [authStore.login] user.is_super_admin:', user.is_super_admin);

        setAuthToken(accessToken);
        if (deviceId) {
          setDeviceId(deviceId);
        }
        set({
          accessToken,
          refreshToken,
          user,
          deviceId: deviceId || null,
          isAuthenticated: true,
          pendingAdminId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });

        const state = get();
        console.log('✅ [authStore.login] state updated – isAuthenticated:', state.isAuthenticated);
        console.log('✅ [authStore.login] state.user:', state.user);
      },

      logout: () => {
        console.log('🚪 [authStore.logout] logging out...');
        setAuthToken(null);
        setDeviceId(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceId: null,
          isAuthenticated: false,
          pendingAdminId: null,
          pendingPhone: null,
          pendingHasMpin: null,
          savedAdminId: null,
          savedPhone: null,
          savedHasMpin: null,
        });
        console.log('✅ [authStore.logout] state cleared');
      },

      clearSession: () => {
        console.log('🧹 [authStore.clearSession] clearing tokens only (keeping saved credentials)');
        setAuthToken(null);
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          // Preserve savedAdminId, savedPhone, savedHasMpin
        });
        console.log('✅ [authStore.clearSession] session cleared, saved credentials intact');
      },

      updateTokens: (accessToken, refreshToken) => {
        console.log('🔄 [authStore.updateTokens] updating tokens');
        setAuthToken(accessToken);
        set({ accessToken, refreshToken });
      },

      setPendingMpinLogin: (adminId, phone, hasMpin) => {
        console.log('⏳ [authStore.setPendingMpinLogin]', { adminId, phone, hasMpin });
        set({ pendingAdminId: adminId, pendingPhone: phone, pendingHasMpin: hasMpin });
      },

      clearPendingMpinLogin: () => {
        console.log('🧹 [authStore.clearPendingMpinLogin] clearing pending');
        set({ pendingAdminId: null, pendingPhone: null, pendingHasMpin: null });
      },

      setSavedAdminId: (adminId, phone, hasMpin) => {
        console.log('💾 [authStore.setSavedAdminId]', { adminId, phone, hasMpin });
        set({ savedAdminId: adminId, savedPhone: phone, savedHasMpin: hasMpin });
      },

      clearSavedAdminId: () => {
        console.log('🧹 [authStore.clearSavedAdminId] clearing saved');
        set({ savedAdminId: null, savedPhone: null, savedHasMpin: null });
      },

      setDeviceIdInStore: (deviceId: string) => {
        console.log('📱 [authStore.setDeviceIdInStore]', deviceId);
        setDeviceId(deviceId);
        set({ deviceId });
      },

      validateSession: async (): Promise<boolean> => {
        const token = get().accessToken;
        const deviceId = get().deviceId;
        console.log('🔍 [authStore.validateSession]', { hasToken: !!token, hasDeviceId: !!deviceId });

        // Helper to clear session and reset navigation (dynamic import to avoid circular dependency)
        const handleInvalidSession = () => {
          get().clearSession();
          try {
            // Dynamic import to break circular dependency
            const { resetToAuthScreen } = require('../../navigation/navigationService');
            resetToAuthScreen();
          } catch (e) {
            console.warn('⚠️ Could not reset navigation – navigator not ready');
          }
        };

        if (!token || !deviceId) {
          console.log('❌ [authStore.validateSession] Missing token or deviceId');
          handleInvalidSession();
          return false;
        }

        try {
          const response = await axiosInstance.get('/auth/validate');
          const isValid = response.status === 200;
          console.log('✅ [authStore.validateSession] valid:', isValid);
          if (!isValid) {
            handleInvalidSession();
          }
          return isValid;
        } catch (error: any) {
          const status = error.response?.status;
          console.log('❌ [authStore.validateSession] error:', error.message, 'status:', status);

          if (status === 404) {
            console.warn('⚠️ [authStore.validateSession] Validation endpoint not found (404) – treating session as valid');
            return true;
          }

          handleInvalidSession();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        deviceId: state.deviceId,
        isAuthenticated: state.isAuthenticated,
        pendingAdminId: state.pendingAdminId,
        pendingPhone: state.pendingPhone,
        pendingHasMpin: state.pendingHasMpin,
        savedAdminId: state.savedAdminId,
        savedPhone: state.savedPhone,
        savedHasMpin: state.savedHasMpin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAuthToken(state.accessToken);
        }
        if (state?.deviceId) {
          setDeviceId(state.deviceId);
        }
      },
    }
  )
);

// Admin selector with logs
export const isAdminSelector = (state: AuthState): boolean => {
  const user = state.user;
  console.log('🔍 [isAdminSelector] state.user:', user);

  if (!user) {
    console.log('❌ [isAdminSelector] No user – return false');
    return false;
  }

  const isAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.role_string === 'admin' ||
    user.role_string === 'super_admin' ||
    user.is_super_admin === true;

  console.log('🔍 [isAdminSelector] isAdmin:', isAdmin);
  console.log('🔍 [isAdminSelector] user.role:', user.role);
  console.log('🔍 [isAdminSelector] user.role_string:', user.role_string);
  console.log('🔍 [isAdminSelector] user.is_super_admin:', user.is_super_admin);

  return isAdmin;
};

export const useIsAdmin = () => useAuthStore(isAdminSelector);