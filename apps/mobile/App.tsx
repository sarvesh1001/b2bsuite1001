import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, AppState, AppStateStatus } from 'react-native';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useAuthStore } from './src/store/authStore';
import { getDeviceId } from './src/utils/device';
import { refreshAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

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
    logout,               // 👈 added logout
    updateTokens,
  } = useAuthStore();

  const refreshTimerRef = useRef<number | null>(null);
  const isFirstForeground = useRef(true);
  const hasRefreshedOnLaunch = useRef(false);

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

  // 2. Define the refresh function (memoized)
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
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
      // If the server says the refresh token is invalid, clear session (keep saved credentials)
      if (error.response?.status === 401) {
        clearSession();
        resetToAuthScreen();
      }
      throw error;
    }
  }, [updateTokens, clearSession]);

  // 3. Set refresh function for interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

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

  // 5. Proactive refresh timer (every 4.5 minutes)
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
  }, [isAuthenticated, doRefresh]);

  // 6. 🚀 Proactive Refresh on Launch – with differentiated logout
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;

      // If no refresh token exists, we don't even try – just logout completely
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        console.log('🔑 No refresh token – logging out completely');
        logout();               // clears everything, including saved credentials
        resetToAuthScreen();
        hasRefreshedOnLaunch.current = true;
        await SplashScreen.hideAsync();
        return;
      }

      // Refresh token exists – attempt proactive refresh
      try {
        await doRefresh();
        console.log('✅ Proactive refresh succeeded on launch');
      } catch (error) {
        console.warn('❌ Proactive refresh failed on launch:', error);
        // Refresh token existed but refresh failed → clear session but keep saved credentials
        clearSession();         // keeps savedAdminId, savedPhone, savedHasMpin
        resetToAuthScreen();
      } finally {
        hasRefreshedOnLaunch.current = true;
        await SplashScreen.hideAsync();
      }
    }

    if (isReady && fontsLoaded) {
      refreshOnLaunch();
    }
  }, [isReady, fontsLoaded, isAuthenticated, doRefresh, clearSession, logout]);

  // 7. Re-validate when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        if (isFirstForeground.current) {
          isFirstForeground.current = false;
          return;
        }
        validateSession().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, validateSession]);

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