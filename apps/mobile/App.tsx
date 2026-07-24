// apps/mobile/App.tsx

import React, { useEffect, useState, useRef } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useAuthStore } from './src/store/authStore';
import { getDeviceId } from './src/utils/device';
import { refreshAccessToken } from './src/services/auth';

SplashScreen.preventAutoHideAsync();

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api/v1';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    setDeviceIdInStore,
    validateSession,
    logout,
    updateTokens,      // 👈 ensure this exists in authStore
  } = useAuthStore();

  const refreshTimerRef = useRef<number | null>(null);

  // ✅ Load MaterialCommunityIcons font (fixes "X" icon on FAB)
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // 1. Configure Axios and fetch device ID
  useEffect(() => {
    async function prepare() {
      try {
        axiosInstance.defaults.baseURL = apiBaseUrl;

        if (!deviceId) {
          const freshDeviceId = await getDeviceId();
          setDeviceIdInStore(freshDeviceId);
        } else {
          setDeviceIdInStore(deviceId);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        // silent
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // 2. Define the refresh function (used by both interceptor and timer)
  const doRefresh = async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    try {
      const data = await refreshAccessToken(refreshToken);
      const { access_token, refresh_token } = data;
      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      // If the refresh token is invalid (401), log the user out
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  };

  // 3. Set the refresh function for the Axios interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, []);

  // 4. Start/stop a proactive refresh timer every 4.5 minutes (270 seconds)
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      // Refresh every 270 seconds (4.5 min) to stay ahead of the 900s expiry
      refreshTimerRef.current = setInterval(() => {
        // Only refresh if still authenticated
        if (useAuthStore.getState().isAuthenticated) {
          doRefresh().catch(() => {
            // doRefresh already handles logout on 401
          });
        }
      }, 270000); // 270,000 ms = 270 seconds
    };

    if (isAuthenticated) {
      startTimer();
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // 5. Validate session if authenticated
  useEffect(() => {
    async function validate() {
      if (isAuthenticated) {
        const isValid = await validateSession();
        if (!isValid) logout();
      }
      await SplashScreen.hideAsync();
    }

    if (isReady && fontsLoaded) {
      validate();
    }
  }, [isReady, fontsLoaded, isAuthenticated, validateSession, logout]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for fonts and basic setup
  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {isSplashVisible ? (
        <AnimatedSplash onFinish={handleSplashFinish} />
      ) : (
        <PaperProvider>
          <StatusBar style="dark" />
          <Navigation />
        </PaperProvider>
      )}
    </SafeAreaProvider>
  );
}