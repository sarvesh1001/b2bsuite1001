// apps/mobile/src/store/authStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { User } from '../shared-types';
import { setAuthToken } from '../api-client';

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
  // Regular auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Pending MPIN login state (cleared on logout)
  pendingAdminId: string | null;
  pendingPhone: string | null;
  pendingHasMpin: boolean | null;

  // Saved MPIN login state (survives logout)
  savedAdminId: string | null;
  savedPhone: string | null;
  savedHasMpin: boolean | null;

  // Actions
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  setPendingMpinLogin: (adminId: string, phone: string, hasMpin: boolean) => void;
  clearPendingMpinLogin: () => void;
  setSavedAdminId: (adminId: string, phone: string, hasMpin: boolean) => void;
  clearSavedAdminId: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Regular auth
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Pending MPIN login
      pendingAdminId: null,
      pendingPhone: null,
      pendingHasMpin: null,

      // Saved MPIN login (survives logout)
      savedAdminId: null,
      savedPhone: null,
      savedHasMpin: null,

      login: (accessToken, refreshToken, user) => {
        setAuthToken(accessToken);
        // Clear pending, but keep saved fields
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          pendingAdminId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });
      },

      logout: () => {
        setAuthToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          // Clear pending, but DO NOT clear saved fields
          pendingAdminId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });
      },

      updateTokens: (accessToken, refreshToken) => {
        setAuthToken(accessToken);
        set({ accessToken, refreshToken });
      },

      setPendingMpinLogin: (adminId, phone, hasMpin) => {
        set({
          pendingAdminId: adminId,
          pendingPhone: phone,
          pendingHasMpin: hasMpin,
        });
      },

      clearPendingMpinLogin: () => {
        set({
          pendingAdminId: null,
          pendingPhone: null,
          pendingHasMpin: null,
        });
      },

      setSavedAdminId: (adminId, phone, hasMpin) => {
        set({
          savedAdminId: adminId,
          savedPhone: phone,
          savedHasMpin: hasMpin,
        });
      },

      clearSavedAdminId: () => {
        set({
          savedAdminId: null,
          savedPhone: null,
          savedHasMpin: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      // Persist all fields
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        pendingAdminId: state.pendingAdminId,
        pendingPhone: state.pendingPhone,
        pendingHasMpin: state.pendingHasMpin,
        savedAdminId: state.savedAdminId,
        savedPhone: state.savedPhone,
        savedHasMpin: state.savedHasMpin,
      }),
    }
  )
);