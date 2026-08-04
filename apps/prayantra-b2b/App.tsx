import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper'; // <-- import DefaultTheme
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, AppState, AppStateStatus } from 'react-native';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useUserAuthStore } from './src/store/userAuthStore';
import { getDeviceId } from './src/utils/device';
import { refreshUserAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// 👇 Import shared colors
import { PRIMARY_COLOR } from './src/constants/colors';

// --- Global error handler (dev only) ---
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

// ----- Define a light theme to prevent dark mode issues -----
const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: PRIMARY_COLOR,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    placeholder: '#999',
    disabled: '#ccc',
    accent: PRIMARY_COLOR,
  },
};

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    setDeviceIdInStore,
    validateSession,
    clearSession,
    logout,
    updateTokens,
  } = useUserAuthStore();

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
        console.error('❌ [App] prepare() error:', error);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // 2. Define the refresh function (memoized)
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    console.log('🔄 [App] doRefresh() called');
    const refreshToken = useUserAuthStore.getState().refreshToken;
    if (!refreshToken) {
      console.error('❌ [App] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      const response = await refreshUserAccessToken(refreshToken);
      const { access_token, refresh_token } = response.data;
      console.log('🔄 [App] New tokens received:', { access_token, refresh_token });

      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error('❌ [App] refreshUserAccessToken error:', error.message, error.response?.status);
      throw error;
    }
  }, [updateTokens]);

  // 3. Set refresh function for interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // 4. Set unauthorized callback (called by interceptor when refresh fails)
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('🚫 [App] Unauthorized callback triggered');
      clearSession(); // preserves savedUserId, savedPhone, savedHasMpin
      resetToAuthScreen();
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession]);

  // 5. Proactive refresh timer – every 27 seconds
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('⏰ [App] Timer tick - doing proactive refresh');
          doRefresh().catch((err) => {
            console.error('❌ [App] Proactive refresh error:', err);
            if (err.response?.status === 401) {
              const { clearSession } = useUserAuthStore.getState();
              clearSession();
              resetToAuthScreen();
            }
          });
        }
      }, 27000);
    };

    if (isAuthenticated) {
      startTimer();
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, doRefresh]);

  // 6. Proactive Refresh on Launch
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;

      console.log('🚀 [App] refreshOnLaunch - starting');

      const refreshToken = useUserAuthStore.getState().refreshToken;

      if (!refreshToken) {
        logout();
        resetToAuthScreen();
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
        return;
      }

      try {
        await doRefresh();
        console.log('✅ [App] Proactive refresh succeeded on launch');
      } catch (error: any) {
        console.warn('❌ [App] Proactive refresh failed on launch:', error);
        if (error.response?.status === 401) {
          const { clearSession } = useUserAuthStore.getState();
          clearSession();
          resetToAuthScreen();
        }
      } finally {
        hasRefreshedOnLaunch.current = true;
        setIsAuthReady(true);
        await SplashScreen.hideAsync();
      }
    }

    if (isReady && fontsLoaded) {
      refreshOnLaunch();
    }
  }, [isReady, fontsLoaded, doRefresh, logout]);

  // 7. Re-validate when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        if (isFirstForeground.current) {
          isFirstForeground.current = false;
          return;
        }
        validateSession().catch((err) => console.error('❌ [App] validateSession error:', err));
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, validateSession]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for assets AND auth validation before rendering navigation
  if (!isReady || !fontsLoaded || !isAuthReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {isSplashVisible ? (
          <AnimatedSplash onFinish={handleSplashFinish} />
        ) : (
          // 👇 Apply the light theme here
          <PaperProvider theme={lightTheme}>
            <StatusBar style="dark" />
            <Navigation />
          </PaperProvider>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}