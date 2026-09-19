import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ---- Navigation ----
import { AppNavigator } from './src/navigation';
import { navigationRef, onNavigationReady } from './src/navigation/navigationService';

// ---- Services ----
import { initDatabase } from './src/services/DatabaseService';

// ---- Hooks ----
import { useDevice } from './src/hooks/useDevice';
import { useSync } from './src/hooks/useSync';
import { useFaceEngine } from './src/hooks/useFaceEngine';

export default function App() {
  const { isConfigured } = useDevice();
  const { isReady: faceReady } = useFaceEngine();
  const { performSync } = useSync();

  // Initialize local database on app start
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  // Auto-sync when device is configured and face engine is ready
  useEffect(() => {
    if (isConfigured && faceReady) {
      performSync();
      const interval = setInterval(() => {
        performSync();
      }, 5 * 60 * 1000); // sync every 5 minutes
      return () => clearInterval(interval);
    }
  }, [isConfigured, faceReady]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}