// apps/mobile/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuthStore, isAdminSelector } from '../store/authStore';
import { GradientHeader } from '../components/GradientHeader';

// Auth Screens
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen';

// Main Screens
import DashboardScreen from '../screens/main/Dashboard';
import AttendanceScreen from '../screens/main/Attendance';
import ProfileScreen from '../screens/main/Profile';

// Admin Screens
import CompanyListScreen from '../screens/admin/CompanyManagement/CompanyListScreen';
import CompanyDetailScreen from '../screens/admin/CompanyManagement/CompanyDetailScreen';
import CompanyCreateScreen from '../screens/admin/CompanyManagement/CompanyCreateScreen';
import CompanyEmployeesScreen from '../screens/admin/CompanyManagement/CompanyEmployeesScreen';
import CompanyDepartmentsScreen from '../screens/admin/CompanyManagement/CompanyDepartmentsScreen';
import UserSearchScreen from '../screens/admin/UserManagement/UserSearchScreen';
import UserDetailScreen from '../screens/admin/UserManagement/UserDetailScreen';
import DepartmentsScreen from '../screens/admin/SystemSettings/DepartmentsScreen';
import PermissionsScreen from '../screens/admin/SystemSettings/PermissionsScreen';
import AuditLogsScreen from '../screens/admin/AuditLogs/AuditLogsScreen';

export type RootStackParamList = {
  PhoneInput: undefined;
  OTPVerification: { phone: string; adminId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { adminId: string; phone: string };
  MPINVerification: { phone: string; adminId: string };
  MPINForgot: { phone: string };
  Main: undefined;
  CompanyList: undefined;
  CompanyDetail: { companyId: string };
  CompanyCreate: undefined;
  CompanyEmployees: { companyId: string };
  CompanyDepartments: { companyId: string };
  UserSearch: undefined;
  UserDetail: { userId: string };
  Departments: undefined;
  Permissions: { moduleCode?: string };
  AuditLogs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <GradientHeader {...props} />,
      }}
    >
      <Stack.Screen name="CompanyList" component={CompanyListScreen} options={{ title: 'Companies' }} />
      <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} options={{ title: 'Company Details' }} />
      <Stack.Screen name="CompanyCreate" component={CompanyCreateScreen} options={{ title: 'Create Company' }} />
      <Stack.Screen name="CompanyEmployees" component={CompanyEmployeesScreen} options={{ title: 'Employees' }} />
      <Stack.Screen name="CompanyDepartments" component={CompanyDepartmentsScreen} options={{ title: 'Departments' }} />
      <Stack.Screen name="UserSearch" component={UserSearchScreen} options={{ title: 'User Search' }} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: 'User Details' }} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} options={{ title: 'System Departments' }} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} options={{ title: 'Permissions' }} />
      <Stack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore(isAdminSelector);

  // LOG: check user and isAdmin
  console.log('🔍 [MainTabs] user:', user);
  console.log('🔍 [MainTabs] isAdmin:', isAdmin);

  return (
    <Tab.Navigator
      initialRouteName={isAdmin ? 'Admin' : 'Dashboard'}
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: '#00B4DB',
        tabBarInactiveTintColor: '#999999',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          if (route.name === 'Admin') iconName = 'view-dashboard';
          else if (route.name === 'Dashboard') iconName = 'home';
          else if (route.name === 'Attendance') iconName = 'clock-check';
          else if (route.name === 'Profile') iconName = 'account';
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isAdmin ? (
        <>
          <Tab.Screen name="Admin" component={AdminStack} options={{ headerShown: false }} />
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Attendance" component={AttendanceScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Attendance" component={AttendanceScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const {
    isAuthenticated,
    pendingAdminId,
    pendingPhone,
    pendingHasMpin,
    savedAdminId,
    savedPhone,
    savedHasMpin,
  } = useAuthStore();

  let initialRoute: keyof RootStackParamList = 'PhoneInput';

  if (isAuthenticated) {
    initialRoute = 'Main';
  } else if (pendingAdminId && pendingPhone) {
    initialRoute = pendingHasMpin ? 'MPINVerification' : 'MPINSetup';
  } else if (savedAdminId && savedPhone && savedHasMpin === true) {
    initialRoute = 'MPINVerification';
  }

  console.log('🚦 [Navigation] initialRoute:', initialRoute);
  console.log('🚦 [Navigation] isAuthenticated:', isAuthenticated);
  console.log('🚦 [Navigation] pending:', { pendingAdminId, pendingPhone, pendingHasMpin });
  console.log('🚦 [Navigation] saved:', { savedAdminId, savedPhone, savedHasMpin });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}