// apps/web/src/pages/_app.tsx
import '../styles/globals.css';
import '../styles/css/qr-login.css';
import '../styles/css/dashboard.css';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setRefreshTokenFunction, setUnauthorizedCallback } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';
import { refreshUserAccessToken } from '../services/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, retry: 1 },
  },
});

const PUBLIC_PATHS = ['/web/login'];

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const {
    isAuthenticated,
    refreshToken,
    clearSession,
    logout,
    updateTokens,
    _isHydrated,
  } = useUserAuthStore();

  const [isAuthReady, setIsAuthReady] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRefreshedOnLaunch = useRef(false);

  // ----- 1. Refresh function with comprehensive logging & robust extraction -----
  const doRefresh = useCallback(async () => {
    console.log('🔄 [App] doRefresh() called');

    // 🔍 Log the refresh token we have (truncated for safety)
    const currentRefreshToken = useUserAuthStore.getState().refreshToken;
    if (!currentRefreshToken) {
      console.warn('[App] No refresh token available');
      throw new Error('No refresh token');
    }
    console.log('[App] Using refresh token (first 20 chars):', currentRefreshToken.slice(0, 20) + '…');

    // Make the request
    const response = await refreshUserAccessToken(currentRefreshToken);

    // 📦 Log the full response (stringified for inspection)
    console.log('[App] Full refresh response:', JSON.stringify(response, null, 2));

    // ----- Extract tokens from various possible structures -----
    let access_token: string | undefined;
    let refresh_token: string | undefined;

    const data = response.data;
    if (data) {
      // Try common patterns
      if (data.access_token && data.refresh_token) {
        access_token = data.access_token;
        refresh_token = data.refresh_token;
      } else if (data.data && data.data.access_token && data.data.refresh_token) {
        access_token = data.data.access_token;
        refresh_token = data.data.refresh_token;
      } else {
        // Fallback: search through known nested fields
        const candidates = [data, data?.data, data?.result, data?.payload];
        for (const obj of candidates) {
          if (obj?.access_token && obj?.refresh_token) {
            access_token = obj.access_token;
            refresh_token = obj.refresh_token;
            break;
          }
        }
      }
    }

    if (!access_token || !refresh_token) {
      console.error('[App] Failed to extract tokens from response:', response);
      throw new Error('Invalid refresh response – tokens missing');
    }

    console.log('[App] Tokens extracted successfully. Access token (first 20):', access_token.slice(0, 20) + '…');
    updateTokens(access_token, refresh_token);
    return { accessToken: access_token, refreshToken: refresh_token };
  }, [updateTokens]);

  // ----- 2. Interceptors (unchanged) -----
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    const onUnauthorized = () => {
      console.warn('🚫 [App] Unauthorized callback triggered');
      clearSession();
      router.replace('/web/login');
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => {
      setRefreshTokenFunction(null);
      setUnauthorizedCallback(null);
    };
  }, [doRefresh, clearSession, router]);

  // ----- 3. Auth initialisation after hydration -----
  useEffect(() => {
    if (!_isHydrated) return;

    async function initAuth() {
      if (hasRefreshedOnLaunch.current) return;
      hasRefreshedOnLaunch.current = true;

      const currentRefreshToken = useUserAuthStore.getState().refreshToken;
      if (!currentRefreshToken) {
        if (!PUBLIC_PATHS.includes(router.pathname)) {
          router.replace('/web/login');
        }
        setIsAuthReady(true);
        return;
      }

      try {
        await doRefresh();
        console.log('✅ [App] Token refreshed successfully');
      } catch (error: any) {
        console.warn('❌ [App] Refresh failed on launch', error);
        clearSession();
        if (!PUBLIC_PATHS.includes(router.pathname)) {
          router.replace('/web/login');
        }
      } finally {
        setIsAuthReady(true);
      }
    }

    initAuth();
  }, [_isHydrated, doRefresh, clearSession, router]);

  // ----- 4. Proactive refresh timer (unchanged) -----
  useEffect(() => {
    if (isAuthenticated && refreshToken) {
      refreshTimerRef.current = setInterval(() => {
        console.log('⏰ [App] Proactive refresh tick');
        doRefresh().catch((err) => {
          console.error('❌ [App] Proactive refresh error', err);
          if (err.response?.status === 401) {
            clearSession();
            router.replace('/web/login');
          }
        });
      }, 5 * 60 * 1000);
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [isAuthenticated, refreshToken, doRefresh, clearSession, router]);

  // ----- 5. Route guard (unchanged) -----
  useEffect(() => {
    if (!_isHydrated || !isAuthReady) return;
    const isPublic = PUBLIC_PATHS.includes(router.pathname);
    if (!isAuthenticated && !isPublic) {
      router.replace('/web/login');
    }
    if (isAuthenticated && isPublic) {
      router.replace('/dashboard');
    }
  }, [_isHydrated, isAuthReady, isAuthenticated, router]);

  // Loading screen
  if (!_isHydrated || !isAuthReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.2rem', color: '#555' }}>Loading…</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}

export default MyApp;