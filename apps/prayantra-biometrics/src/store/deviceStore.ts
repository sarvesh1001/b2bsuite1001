import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

// SecureStore adapter – same as your other store
const secureStorage: StateStorage = {
  getItem: async (key: string) => await SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => await SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => await SecureStore.deleteItemAsync(key),
};

interface DeviceState {
  deviceToken: string | null;
  companyId: string | null;
  deviceId: string | null;
  serverUrl: string;
  isConfigured: boolean;

  // Actions
  setCredentials: (deviceToken: string, companyId: string, serverUrl?: string) => void;
  setDeviceId: (deviceId: string) => void;
  clearCredentials: () => void;
  generateDeviceId: () => string;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      deviceToken: null,
      companyId: null,
      deviceId: null,
      serverUrl: 'http://localhost:8080', // default for dev
      isConfigured: false,

      setCredentials: (deviceToken, companyId, serverUrl) => {
        const deviceId = get().deviceId || get().generateDeviceId();
        set({
          deviceToken,
          companyId,
          serverUrl: serverUrl || get().serverUrl,
          deviceId,
          isConfigured: true,
        });
      },

      setDeviceId: (deviceId) => set({ deviceId }),

      clearCredentials: () => {
        set({
          deviceToken: null,
          companyId: null,
          isConfigured: false,
        });
      },

      generateDeviceId: () => {
        // Use Expo Device or fallback to a random ID
        const id = Device.modelName || 'unknown-device';
        const unique = `${id}-${Date.now()}`;
        return unique;
      },
    }),
    {
      name: 'device-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        deviceToken: state.deviceToken,
        companyId: state.companyId,
        deviceId: state.deviceId,
        serverUrl: state.serverUrl,
        isConfigured: state.isConfigured,
      }),
      onRehydrateStorage: () => (state) => {
        // Optional: auto-generate deviceId if missing
        if (state && !state.deviceId) {
          const newId = state.generateDeviceId();
          state.setDeviceId(newId);
        }
      },
    }
  )
);