import React, { useEffect, useState, useRef } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert } from 'react-native'; // 👈 Added for global error handler

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useAuthStore } from './src/store/authStore';
import { getDeviceId } from './src/utils/device';
import { refreshAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// 🌍 Global error handler – catches unhandled JS errors and promise rejections
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔥 GLOBAL ERROR:', error);
    Alert.alert(
      'Unhandled Error',
      error?.message || 'Unknown error',
      [
        { text: 'OK' },
        { text: 'Details', onPress: () => console.log(error?.stack) },
      ],
      { cancelable: false }
    );
    // Forward to the original handler (e.g., Hermes or React Native's default)
    if (originalHandler) originalHandler(error, isFatal);
  });
}

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
    clearSession,
    updateTokens,
  } = useAuthStore();

  const refreshTimerRef = useRef<number | null>(null);

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

  // 2. Define the refresh function
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
      if (error.response?.status === 401) {
        clearSession();
        resetToAuthScreen();
      }
      throw error;
    }
  };

  // 3. Set refresh function for interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, []);

  // 4. Set unauthorized callback
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      resetToAuthScreen();
    };

    setUnauthorizedCallback(onUnauthorized);

    return () => {
      setUnauthorizedCallback(null);
    };
  }, [clearSession]);

  // 5. Proactive refresh timer
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      refreshTimerRef.current = setInterval(() => {
        if (useAuthStore.getState().isAuthenticated) {
          doRefresh().catch(() => {});
        }
      }, 270000);
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

  // 6. Validate session
  useEffect(() => {
    async function validate() {
      if (isAuthenticated) {
        await validateSession();
      }
      await SplashScreen.hideAsync();
    }

    if (isReady && fontsLoaded) {
      validate();
    }
  }, [isReady, fontsLoaded, isAuthenticated, validateSession]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}