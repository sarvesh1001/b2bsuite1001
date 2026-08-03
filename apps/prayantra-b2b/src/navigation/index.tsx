import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserAuthStore } from '../store/userAuthStore';
import { navigationRef, onNavigationReady } from './navigationService';

// Auth Screens
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen';
import CompanySelectionScreen from '../screens/auth/CompanySelectionScreen';

// Main (Dashboard)
import UserDashboard from '../screens/main/UserDashboard';

// QR Scanner (Web Login Pairing)
import WebLoginQRScanner from '../screens/auth/WebLoginQRScanner';

// Define param list including QRScanner
export type RootStackParamList = {
  PhoneInput: undefined;
  OTPVerification: { phone: string; userId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { userId: string; phone: string; companyId: string };
  MPINVerification: { phone: string; userId: string; companyId?: string };
  MPINForgot: { phone: string };
  CompanySelection: {
    userId: string;
    phone: string;
    hasMpin: boolean;
    from: 'setup' | 'verify';
  };
  QRScanner: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const {
    isAuthenticated,
    pendingUserId,
    pendingPhone,
    pendingHasMpin,
    savedUserId,
    savedPhone,
    savedHasMpin,
  } = useUserAuthStore();

  let initialRoute: keyof RootStackParamList = 'PhoneInput';

  if (isAuthenticated) {
    initialRoute = 'Main';
  } else if (pendingUserId && pendingPhone) {
    initialRoute = pendingHasMpin ? 'MPINVerification' : 'MPINSetup';
  } else if (savedUserId && savedPhone && savedHasMpin === true) {
    initialRoute = 'MPINVerification';
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} />
        <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} />
        <Stack.Screen name="QRScanner" component={WebLoginQRScanner} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={UserDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}