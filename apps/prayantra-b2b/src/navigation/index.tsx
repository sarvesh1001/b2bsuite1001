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
import CreateWorkCenterScreen from '../screens/module/administration/CreateWorkCenterScreen';
import EditWorkCenterScreen from '../screens/module/administration/EditWorkCenterScreen';

import DepartmentsListScreen from '../screens/module/administration/DepartmentsListScreen';
import CreateDepartmentScreen from '../screens/module/administration/CreateDepartmentScreen';
import EditDepartmentScreen from '../screens/module/administration/EditDepartmentScreen';

import RolesListScreen from '../screens/module/administration/RolesListScreen';
import CreateRoleScreen from '../screens/module/administration/CreateRoleScreen';
import EditRoleScreen from '../screens/module/administration/EditRoleScreen';

import PositionsListScreen from '../screens/module/administration/PositionsListScreen';
import CreatePositionScreen from '../screens/module/administration/CreatePositionScreen';
import EditPositionScreen from '../screens/module/administration/EditPositionScreen';

import EmployeesListScreen from '../screens/module/administration/EmployeesListScreen';
import AddEmployeeScreen from '../screens/module/administration/AddEmployeeScreen';
import EditEmployeeScreen from '../screens/module/administration/EditEmployeeScreen';

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

  DepartmentsList: undefined;
  CreateDepartment: undefined;
  EditDepartment: { departmentId: string };

  RolesList: undefined;
  CreateRole: undefined;
  EditRole: { roleId: string };

  PositionsList: undefined;
  CreatePosition: undefined;
  EditPosition: { positionId: string };

  EmployeesList: undefined;
  AddEmployee: undefined;
  EditEmployee: { userId: string };
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

        {/* ===== Administration Module Screens ===== */}
        {/* Work Centers */}
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

        {/* Departments */}
        <Stack.Screen
          name="DepartmentsList"
          component={DepartmentsListScreen}
          options={{ headerShown: true, title: 'Departments' }}
        />
        <Stack.Screen
          name="CreateDepartment"
          component={CreateDepartmentScreen}
          options={{ headerShown: true, title: 'New Department' }}
        />
        <Stack.Screen
          name="EditDepartment"
          component={EditDepartmentScreen}
          options={{ headerShown: true, title: 'Edit Department' }}
        />

        {/* Roles */}
        <Stack.Screen
          name="RolesList"
          component={RolesListScreen}
          options={{ headerShown: true, title: 'Roles' }}
        />
        <Stack.Screen
          name="CreateRole"
          component={CreateRoleScreen}
          options={{ headerShown: true, title: 'New Role' }}
        />
        <Stack.Screen
          name="EditRole"
          component={EditRoleScreen}
          options={{ headerShown: true, title: 'Edit Role' }}
        />

        {/* Positions */}
        <Stack.Screen
          name="PositionsList"
          component={PositionsListScreen}
          options={{ headerShown: true, title: 'Positions' }}
        />
        <Stack.Screen
          name="CreatePosition"
          component={CreatePositionScreen}
          options={{ headerShown: true, title: 'New Position' }}
        />
        <Stack.Screen
          name="EditPosition"
          component={EditPositionScreen}
          options={{ headerShown: true, title: 'Edit Position' }}
        />

        {/* Employees */}
        <Stack.Screen
          name="EmployeesList"
          component={EmployeesListScreen}
          options={{ headerShown: true, title: 'Employees' }}
        />
        <Stack.Screen
          name="AddEmployee"
          component={AddEmployeeScreen}
          options={{ headerShown: true, title: 'Add Employee' }}
        />
        <Stack.Screen
          name="EditEmployee"
          component={EditEmployeeScreen}
          options={{ headerShown: true, title: 'Edit Employee' }}
        />

        {/* Add other module screens here as you build them */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}