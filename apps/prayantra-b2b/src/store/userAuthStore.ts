import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken, setDeviceId, axiosInstance } from '@b2b/api-client';
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

interface UserAuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  companyId: string | null;
  isAuthenticated: boolean;

  pendingUserId: string | null;
  pendingPhone: string | null;
  pendingHasMpin: boolean | null;

  savedUserId: string | null;
  savedPhone: string | null;
  savedHasMpin: boolean | null;

  login: (accessToken: string, refreshToken: string, user: User, deviceId?: string, companyId?: string) => void;
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

// ---------- SecureStore adapter ----------
const secureStorage: StateStorage = {
  getItem: async (key: string) => await SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => await SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => await SecureStore.deleteItemAsync(key),
};

// ---------- Store ----------
export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      companyId: null,
      isAuthenticated: false,

      pendingUserId: null,
      pendingPhone: null,
      pendingHasMpin: null,

      savedUserId: null,
      savedPhone: null,
      savedHasMpin: null,

      login: (accessToken, refreshToken, user, deviceId, companyId) => {
        console.log('🔐 [UserAuth] login() – user_id:', user.user_id);
        setAuthToken(accessToken);
        if (deviceId) setDeviceId(deviceId);

        set({
          accessToken,
          refreshToken,
          user,
          deviceId: deviceId || null,
          companyId: companyId || user.company_id || null,
          isAuthenticated: true,
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });
        console.log('✅ [UserAuth] Login complete, isAuthenticated = true');
      },

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
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceId: null,
          companyId: null,
          isAuthenticated: false,
          pendingUserId: null,
          pendingPhone: null,
          pendingHasMpin: null,
          savedUserId: null,
          savedPhone: null,
          savedHasMpin: null,
        });
      },

      clearSession: () => {
        console.log('🧹 [UserAuth] clearSession() – tokens cleared, saved credentials kept');
        setAuthToken(null);
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateTokens: (accessToken, refreshToken) => {
        console.log('🔄 [UserAuth] updateTokens()');
        setAuthToken(accessToken);
        set({ accessToken, refreshToken });
      },

      setCompanyId: (companyId) => {
        console.log('🏢 [UserAuth] setCompanyId()', companyId);
        set({ companyId });
        const user = get().user;
        if (user) {
          set({ user: { ...user, company_id: companyId } });
        }
      },

      setPendingMpinLogin: (userId, phone, hasMpin) => {
        console.log('⏳ [UserAuth] setPendingMpinLogin()', { userId, phone, hasMpin });
        set({ pendingUserId: userId, pendingPhone: phone, pendingHasMpin: hasMpin });
      },
      clearPendingMpinLogin: () => {
        console.log('🧹 [UserAuth] clearPendingMpinLogin()');
        set({ pendingUserId: null, pendingPhone: null, pendingHasMpin: null });
      },

      setSavedUserId: (userId, phone, hasMpin) => {
        console.log('💾 [UserAuth] setSavedUserId()', { userId, phone, hasMpin });
        set({ savedUserId: userId, savedPhone: phone, savedHasMpin: hasMpin });
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

      validateSession: async (): Promise<boolean> => {
        const { accessToken, deviceId, companyId } = get();
        console.log('🔍 [UserAuth] validateSession()', { hasToken: !!accessToken, hasDevice: !!deviceId });

        const handleInvalid = () => {
          get().clearSession();
          try {
            const { resetToAuthScreen } = require('../navigation/navigationService');
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
          const headers: any = {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
          };
          if (companyId) {
            headers['X-Company-ID'] = companyId;
          }

          const response = await axiosInstance.get('/auth/validate', { headers });
          const isValid = response.status === 200 && response.data?.data?.valid === true;
          if (!isValid) handleInvalid();
          return isValid;
        } catch (error: any) {
          const status = error.response?.status;
          if (status === 404) {
            console.warn('⚠️ /auth/validate not found – treating as valid');
            return true;
          }
          handleInvalid();
          return false;
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
        pendingUserId: state.pendingUserId,
        pendingPhone: state.pendingPhone,
        pendingHasMpin: state.pendingHasMpin,
        savedUserId: state.savedUserId,
        savedPhone: state.savedPhone,
        savedHasMpin: state.savedHasMpin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAuthToken(state.accessToken);
        if (state?.deviceId) setDeviceId(state.deviceId);
      },
    }
  )
);