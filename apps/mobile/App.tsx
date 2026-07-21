import React, { useEffect, useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import Navigation from './src/navigation';
import { axiosInstance } from './src/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';

// Prevent Expo from automatically hiding the native splash
SplashScreen.preventAutoHideAsync();

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api/v1';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Configure Axios
        axiosInstance.defaults.baseURL = apiBaseUrl;

        console.log('🌐 API Base URL:', apiBaseUrl);

        // Simulate startup work (fonts, auth, assets, etc.)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        // Hide the native splash once React is ready
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

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