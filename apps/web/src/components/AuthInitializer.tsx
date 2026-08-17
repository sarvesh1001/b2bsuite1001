import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  setRefreshTokenFunction,
  setUnauthorizedCallback,
} from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';
import { refreshUserAccessToken } from '../services/auth';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const router = useRouter();
  const {
    isAuthenticated,
    refreshToken,
    updateTokens,
    clearSession,
    validateSession,
    logout,
  } = useUserAuthStore();

  const refreshTimerRef = useRef<number | null>(null);
  const hasRefreshedOnLaunch = useRef(false);

  // ---- 1. Define refresh function ----
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    console.log('[Auth] doRefresh() called');
    const rt = useUserAuthStore.getState().refreshToken;
    if (!rt) {
      console.error('[Auth] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      const response = await refreshUserAccessToken(rt);
      const { access_token, refresh_token } = response.data;
      console.log('[Auth] New tokens received');
      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error('[Auth] refreshUserAccessToken error:', error.message);
      throw error;
    }
  }, [updateTokens]);

  // ---- 2. Set refresh function for axios interceptor ----
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // ---- 3. Set unauthorized callback ----
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('[Auth] Unauthorized callback triggered');
      clearSession();
      router.push('/web/login');
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession, router]);

  // ---- 4. Proactive refresh timer (every 27 seconds) ----
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = window.setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('[Auth] Timer tick - proactive refresh');
          doRefresh().catch((err) => {
            console.error('[Auth] Proactive refresh error:', err);
            if (err.response?.status === 401) {
              clearSession();
              router.push('/web/login');
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
  }, [isAuthenticated, doRefresh, clearSession, router]);

  // ---- 5. Proactive refresh on page load ----
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;
      hasRefreshedOnLaunch.current = true;

      const rt = useUserAuthStore.getState().refreshToken;
      if (!rt) {
        // No refresh token – ensure logged out
        logout();
        router.push('/web/login');
        return;
      }

      try {
        await doRefresh();
        console.log('[Auth] Proactive refresh succeeded on launch');
      } catch (error: any) {
        console.warn('[Auth] Proactive refresh failed on launch:', error);
        if (error.response?.status === 401) {
          clearSession();
          router.push('/web/login');
        }
      }
    }

    refreshOnLaunch();
  }, [doRefresh, clearSession, logout, router]);

  // ---- 6. Re‑validate when tab gains focus ----
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log('[Auth] Tab focused – validating session');
        validateSession().catch((err) =>
          console.error('[Auth] validateSession error:', err)
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, validateSession]);

  return <>{children}</>;
};