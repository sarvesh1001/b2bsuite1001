// apps/prayantra-admin/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuthStore } from '../store/authStore';
import { GradientHeader } from '../components/GradientHeader';
import { navigationRef, onNavigationReady } from './navigationService';

// ---------- Auth Screens ----------
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen';

// ---------- Admin — Company Management ----------
import CompanyListScreen from '../screens/admin/CompanyManagement/CompanyListScreen';
import CompanyDetailScreen from '../screens/admin/CompanyManagement/CompanyDetailScreen';
import CompanyCreateScreen from '../screens/admin/CompanyManagement/CompanyCreateScreen';
import CompanyEmployeesScreen from '../screens/admin/CompanyManagement/CompanyEmployeesScreen';
import CompanyDepartmentsScreen from '../screens/admin/CompanyManagement/CompanyDepartmentsScreen';
import CompanyUpdateDetailsScreen from '../screens/admin/CompanyManagement/CompanyUpdateDetailsScreen';

// Payments
import CompanyPaymentsScreen from '../screens/admin/CompanyManagement/Payments/CompanyPaymentsScreen';
import CompanyPaymentDetailScreen from '../screens/admin/CompanyManagement/Payments/CompanyPaymentDetailScreen';
import CompanyPaymentCreateScreen from '../screens/admin/CompanyManagement/Payments/CompanyPaymentCreateScreen';

// Invoices
import CompanyInvoicesScreen from '../screens/admin/CompanyManagement/Invoices/CompanyInvoicesScreen';
import CompanyInvoiceDetailScreen from '../screens/admin/CompanyManagement/Invoices/CompanyInvoiceDetailScreen';
import CompanyInvoiceCreateScreen from '../screens/admin/CompanyManagement/Invoices/CompanyInvoiceCreateScreen';

// ---------- Admin — User / System Settings ----------
import UserSearchScreen from '../screens/admin/UserManagement/UserSearchScreen';
import UserDetailScreen from '../screens/admin/UserManagement/UserDetailScreen';
import DepartmentsScreen from '../screens/admin/SystemSettings/DepartmentsScreen';
import PermissionsScreen from '../screens/admin/SystemSettings/PermissionsScreen';
import AuditLogsScreen from '../screens/admin/AuditLogs/AuditLogsScreen';

// ---------- Admin — Company-scoped Subscription ----------
import SubscriptionManagementScreen from '../screens/admin/Subscription/SubscriptionManagementScreen';
import ExtendSubscriptionScreen from '../screens/admin/Subscription/ExtendSubscriptionScreen';
import UpdateMaxDepartmentsScreen from '../screens/admin/Department/UpdateMaxDepartmentsScreen';

// ---------- Subscription Tab (system-wide) ----------
import SubscriptionHomeScreen from '../screens/admin/Subscription';
import SubscriptionPlansListScreen from '../screens/admin/Subscription/Plans/SubscriptionPlansListScreen';
import SubscriptionPlanCreateScreen from '../screens/admin/Subscription/Plans/SubscriptionPlanCreateScreen';
import SubscriptionPlanEditScreen from '../screens/admin/Subscription/Plans/SubscriptionPlanEditScreen';
import SubscriptionPlanDetailScreen from '../screens/admin/Subscription/Plans/SubscriptionPlanDetailScreen';
import PendingRemindersScreen from '../screens/admin/Subscription/Reminders/PendingRemindersScreen';
import SubscriptionLifecycleScreen from '../screens/admin/Subscription/SubscriptionLifecycleScreen';

// ---------- KYC ----------
import KYCUploadScreen from '../screens/user/KYCUploadScreen';
import DocumentViewScreen from '../screens/document/DocumentViewScreen';
import UserDocumentsScreen from '../screens/document/UserDocumentsScreen';

// ============================================================
// RootStackParamList
// ============================================================
export type RootStackParamList = {
  // Auth
  PhoneInput: undefined;
  OTPVerification: { phone: string; adminId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { adminId: string; phone: string };
  MPINVerification: { phone: string; adminId: string };
  MPINForgot: { phone: string };
  Main: undefined;

  // Company Management
  CompanyList: undefined;
  CompanyDetail: { companyId: string };
  CompanyCreate: undefined;
  CompanyEmployees: { companyId: string };
  CompanyDepartments: { companyId: string };
  CompanyUpdateDetails: { companyId: string };

  // Payments (company scoped)
  CompanyPayments: { companyId: string };
  CompanyPaymentDetail: { companyId: string; paymentId: string };
  CompanyPaymentCreate: { companyId: string };

  // Invoices (company scoped)
  CompanyInvoices: { companyId: string };
  CompanyInvoiceDetail: { companyId: string; invoiceId: string };
  CompanyInvoiceCreate: { companyId: string };

  // User / System Settings
  UserSearch: undefined;
  UserDetail: { userId: string };
  Departments: undefined;
  Permissions: { moduleCode?: string };
  AuditLogs: { companyId: string };

  // Subscription (company scoped)
  SubscriptionManagement: { companyId: string; company: any };
  ExtendSubscription: { companyId: string };
  UpdateMaxDepartments: { companyId: string; currentMax: number };

  // Subscription (system wide)
  SubscriptionHome: undefined;
  SubscriptionPlansList: undefined;
  SubscriptionPlanCreate: undefined;
  SubscriptionPlanEdit: { planId: string };
  SubscriptionPlanDetail: { planId: string };
  PendingReminders: undefined;
  SubscriptionLifecycle: undefined;

  // KYC
  KYCUpload: undefined;
  DocumentView: { docId: string };
  UserDocuments: { userId: string };

  // Company-scoped analytics
  AnalyticsDashboard: { companyId: string };
  OTPLogs: { companyId: string };
  MPINLogs: { companyId: string };
  DeviceLogs: { companyId: string };
  SecurityLogs: { companyId: string };
  SecurityRiskLogs: { companyId: string };

  // NOTE: System-wide analytics removed — analytics handled by Grafana/Kibana.
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ============================================================
// Admin Stack  — companies, users, KYC, company-scoped subscription
// ============================================================
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <GradientHeader {...props} />,
      }}
    >
      {/* Company Management */}
      <Stack.Screen name="CompanyList" component={CompanyListScreen} options={{ title: 'Companies' }} />
      <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} options={{ title: 'Company Details' }} />
      <Stack.Screen name="CompanyCreate" component={CompanyCreateScreen} options={{ title: 'Create Company' }} />
      <Stack.Screen name="CompanyEmployees" component={CompanyEmployeesScreen} options={{ title: 'Employees' }} />
      <Stack.Screen name="CompanyDepartments" component={CompanyDepartmentsScreen} options={{ title: 'Departments' }} />
      <Stack.Screen
        name="CompanyUpdateDetails"
        component={CompanyUpdateDetailsScreen}
        options={{ title: 'Update Company' }}
      />

      {/* Payments (company scoped) */}
      <Stack.Screen name="CompanyPayments" component={CompanyPaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="CompanyPaymentDetail" component={CompanyPaymentDetailScreen} options={{ title: 'Payment Details' }} />
      <Stack.Screen name="CompanyPaymentCreate" component={CompanyPaymentCreateScreen} options={{ title: 'Record Payment' }} />

      {/* Invoices (company scoped) */}
      <Stack.Screen name="CompanyInvoices" component={CompanyInvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="CompanyInvoiceDetail" component={CompanyInvoiceDetailScreen} options={{ title: 'Invoice Details' }} />
      <Stack.Screen name="CompanyInvoiceCreate" component={CompanyInvoiceCreateScreen} options={{ title: 'Create Invoice' }} />

      {/* Users & System Settings */}
      <Stack.Screen name="UserSearch" component={UserSearchScreen} options={{ title: 'User Search' }} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: 'User Details' }} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} options={{ title: 'System Departments' }} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} options={{ title: 'Permissions' }} />
      <Stack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />

      {/* Company-scoped subscription */}
      <Stack.Screen
        name="SubscriptionManagement"
        component={SubscriptionManagementScreen}
        options={{ title: 'Manage Subscription' }}
      />
      <Stack.Screen
        name="ExtendSubscription"
        component={ExtendSubscriptionScreen}
        options={{ title: 'Extend Subscription' }}
      />
      <Stack.Screen
        name="UpdateMaxDepartments"
        component={UpdateMaxDepartmentsScreen}
        options={{ title: 'Update Departments Limit' }}
      />

      {/* KYC & Documents */}
      <Stack.Screen name="KYCUpload" component={KYCUploadScreen} options={{ title: 'Upload KYC Document' }} />
      <Stack.Screen name="DocumentView" component={DocumentViewScreen} options={{ title: 'Document Preview' }} />
      <Stack.Screen name="UserDocuments" component={UserDocumentsScreen} options={{ title: 'User Documents' }} />
    </Stack.Navigator>
  );
}

// ============================================================
// Subscription Stack  — system-wide plan management
// ============================================================
function SubscriptionStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <GradientHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="SubscriptionHome"
        component={SubscriptionHomeScreen}
        options={{ title: 'Subscription' }}
      />
      <Stack.Screen
        name="SubscriptionPlansList"
        component={SubscriptionPlansListScreen}
        options={{ title: 'Subscription Plans' }}
      />
      <Stack.Screen
        name="SubscriptionPlanCreate"
        component={SubscriptionPlanCreateScreen}
        options={{ title: 'Create Plan' }}
      />
      <Stack.Screen
        name="SubscriptionPlanEdit"
        component={SubscriptionPlanEditScreen}
        options={{ title: 'Edit Plan' }}
      />
      <Stack.Screen
        name="SubscriptionPlanDetail"
        component={SubscriptionPlanDetailScreen}
        options={{ title: 'Plan Details' }}
      />
      <Stack.Screen
        name="PendingReminders"
        component={PendingRemindersScreen}
        options={{ title: 'Pending Reminders' }}
      />
      <Stack.Screen
        name="SubscriptionLifecycle"
        component={SubscriptionLifecycleScreen}
        options={{ title: 'Lifecycle Jobs' }}
      />
    </Stack.Navigator>
  );
}

// ============================================================
// Main Tabs
// ============================================================
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00B4DB',
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tab.Screen
        name="Admin"
        component={AdminStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
          tabBarLabel: 'Admin',
        }}
      />
      <Tab.Screen
        name="Plans"
        component={SubscriptionStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="credit-card-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Plans',
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// Root Navigation
// ============================================================
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

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
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