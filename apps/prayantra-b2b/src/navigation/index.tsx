// apps/prayantra-b2b/src/navigation/index.tsx

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
import WebLoginQRScanner from '../screens/auth/WebLoginQRScanner';

// Main Screens
import ModuleGridScreen from '../screens/main/ModuleGridScreen';
import ModuleDetailScreen from '../screens/module/ModuleDetailScreen';

// Administration Module Screens
import WorkCentersListScreen from '../screens/module/administration/WorkCentersListScreen';
// Placeholder screens for Create/Edit (we’ll implement later)
import CreateWorkCenterScreen from '../screens/module/administration/CreateWorkCenterScreen';
import EditWorkCenterScreen from '../screens/module/administration/EditWorkCenterScreen';

// (Optional) Old dashboard – you can keep or remove
// import UserDashboard from '../screens/main/UserDashboard';

export type RootStackParamList = {
  // Auth
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

  // Main (after login)
  Main: undefined;

  // Module navigation
  ModuleDetail: { moduleName: string };

  // Administration
  WorkCentersList: undefined;
  CreateWorkCenter: undefined;
  EditWorkCenter: { code: string };

  // Add more module screens here...
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
        {/* Auth Screens */}
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} />
        <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} />
        <Stack.Screen name="QRScanner" component={WebLoginQRScanner} options={{ headerShown: false }} />

        {/* Main (Module Grid) */}
        <Stack.Screen name="Main" component={ModuleGridScreen} />

        {/* Module Detail */}
        <Stack.Screen
          name="ModuleDetail"
          component={ModuleDetailScreen}
          options={{ headerShown: true, title: 'Module' }}
        />

        {/* Administration Module Screens */}
        <Stack.Screen
          name="WorkCentersList"
          component={WorkCentersListScreen}
          options={{ headerShown: true, title: 'Work Centers' }}
        />
        <Stack.Screen
          name="CreateWorkCenter"
          component={CreateWorkCenterScreen}
          options={{ headerShown: true, title: 'New Work Center' }}
        />
        <Stack.Screen
          name="EditWorkCenter"
          component={EditWorkCenterScreen}
          options={{ headerShown: true, title: 'Edit Work Center' }}
        />

        {/* Add other module screens here as you build them */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}