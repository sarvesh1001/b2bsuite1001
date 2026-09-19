// apps/prayantra-b2b/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Navigation from './src/navigation';
import {
  axiosInstance,
  setRefreshTokenFunction,
  setUnauthorizedCallback,
} from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useUserAuthStore } from './src/store/userAuthStore';
import { useSubscriptionBlockerStore } from './src/store/subscriptionBlockerStore';
import { getDeviceId } from './src/utils/device';
import { refreshUserAccessToken } from './src/services/auth';
import { resetToAuthScreen } from './src/navigation/navigationService';
import { installSubscriptionErrorHandler } from './src/services/subscriptionErrorHandler';
import { ErrorBoundary } from './src/components/ErrorBoundary';

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

// ----- Proactive refresh cadence -----
// Token lifetime is 15 min (see JWT `exp - iat = 900`). Refresh every
// 15 min as requested. NOTE: this fires *at* the boundary — if the network
// is slow you may get a 401 on in-flight requests. Drop this to
// 14 * 60 * 1000 (or lower) for a safety margin.
const PROACTIVE_REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ----- QueryClient -----
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

// ----- Light theme -----
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
  const [isLocationReady, setIsLocationReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    companyId,
    locationId,
    setDeviceIdInStore,
    validateSession,
    clearSession,
    logout,
    updateTokens,
    bootstrapLocations,
  } = useUserAuthStore();

  const refreshTimerRef = useRef<number | null>(null);
  const isFirstForeground = useRef(true);
  const hasRefreshedOnLaunch = useRef(false);
  const hasBootstrappedLocations = useRef(false);

  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // 1. Configure Axios + fetch device ID
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

  // 2. Refresh fn
  const doRefresh = useCallback(async (): Promise<{
    accessToken: string;
    refreshToken: string;
  }> => {
    console.log('🔄 [App] doRefresh() called');
    const refreshToken = useUserAuthStore.getState().refreshToken;
    if (!refreshToken) {
      console.error('❌ [App] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      const response = await refreshUserAccessToken(refreshToken);
      const { access_token, refresh_token } = response.data;
      console.log('🔄 [App] New tokens received');
      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error(
        '❌ [App] refreshUserAccessToken error:',
        error.message,
        error.response?.status
      );
      throw error;
    }
  }, [updateTokens]);

  // 3. Register refresh fn with axios
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // 4. Unauthorized callback
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('🚫 [App] Unauthorized callback triggered');
      clearSession();
      resetToAuthScreen();
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession]);

  // 4b. 🆕 Subscription error interceptor — watches for HTTP 402
  //     with a `subscription_*` code and pushes it into the blocker store.
  //     The Navigation layer reacts by routing to SubscriptionPayment.
  useEffect(() => {
    const dispose = installSubscriptionErrorHandler(axiosInstance);
    console.log('✅ [App] Subscription error handler installed');
    return () => {
      dispose();
      console.log('🧹 [App] Subscription error handler removed');
    };
  }, []);

  // 4c. 🆕 Clear the subscription blocker on logout or company change so
  //     the next session starts with a clean slate.
  useEffect(() => {
    const unsubscribe = useUserAuthStore.subscribe((state, prev) => {
      const loggedOut = prev.isAuthenticated && !state.isAuthenticated;
      const companyChanged =
        !!prev.companyId &&
        !!state.companyId &&
        prev.companyId !== state.companyId;

      if (loggedOut || companyChanged) {
        useSubscriptionBlockerStore.getState().clearBlocker();
      }
    });
    return () => unsubscribe();
  }, []);

  // 5. Proactive refresh timer — every 15 minutes
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

      refreshTimerRef.current = setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('⏰ [App] 15-min tick — doing proactive refresh');
          doRefresh().catch((err) => {
            console.error('❌ [App] Proactive refresh error:', err);
            if (err.response?.status === 401) {
              const { clearSession } = useUserAuthStore.getState();
              clearSession();
              resetToAuthScreen();
            }
          });
        }
      }, PROACTIVE_REFRESH_INTERVAL_MS);
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

  // 6. Refresh on launch
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

  // 6b. Location bootstrap — runs ONCE auth is ready
  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated || !companyId) {
      setIsLocationReady(true);
      return;
    }

    if (locationId) {
      console.log('📍 [App] location already available:', locationId);
      setIsLocationReady(true);
      return;
    }

    if (hasBootstrappedLocations.current) {
      setIsLocationReady(true);
      return;
    }

    (async () => {
      hasBootstrappedLocations.current = true;
      console.log('🚀 [App] bootstrapping locations for company', companyId);
      try {
        await bootstrapLocations(companyId);
      } catch (e) {
        console.warn('⚠️ [App] bootstrap failed:', e);
      } finally {
        setIsLocationReady(true);
      }
    })();
  }, [
    isAuthReady,
    isAuthenticated,
    companyId,
    locationId,
    bootstrapLocations,
  ]);

  // 7. Validate session on foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        if (isFirstForeground.current) {
          isFirstForeground.current = false;
          return;
        }
        validateSession().catch((err) =>
          console.error('❌ [App] validateSession error:', err)
        );
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [isAuthenticated, validateSession]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for assets + auth + location bootstrap
  if (!isReady || !fontsLoaded || !isAuthReady || !isLocationReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {isSplashVisible ? (
          <AnimatedSplash onFinish={handleSplashFinish} />
        ) : (
          <QueryClientProvider client={queryClient}>
            <PaperProvider theme={lightTheme}>
              <StatusBar style="dark" />
              <Navigation />
            </PaperProvider>
          </QueryClientProvider>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}