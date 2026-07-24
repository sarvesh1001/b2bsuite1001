# Combined Source Code

Total Files: 27

# File: apps/mobile/App.tsx

```tsx
// apps/mobile/App.tsx

import React, { useEffect, useState, useRef } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Navigation from './src/navigation';
import { axiosInstance, setRefreshTokenFunction } from '@b2b/api-client';
import { AnimatedSplash } from './src/splash/AnimatedSplashScreen';
import { useAuthStore } from './src/store/authStore';
import { getDeviceId } from './src/utils/device';
import { refreshAccessToken } from './src/services/auth';

SplashScreen.preventAutoHideAsync();

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api/v1';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const {
    isAuthenticated,
    deviceId,
    setDeviceIdInStore,
    validateSession,
    logout,
    updateTokens,      // 👈 ensure this exists in authStore
  } = useAuthStore();

  const refreshTimerRef = useRef<number | null>(null);

  // ✅ Load MaterialCommunityIcons font (fixes "X" icon on FAB)
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  // 1. Configure Axios and fetch device ID
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
        // silent
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // 2. Define the refresh function (used by both interceptor and timer)
  const doRefresh = async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    try {
      const data = await refreshAccessToken(refreshToken);
      const { access_token, refresh_token } = data;
      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      // If the refresh token is invalid (401), log the user out
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  };

  // 3. Set the refresh function for the Axios interceptor
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, []);

  // 4. Start/stop a proactive refresh timer every 4.5 minutes (270 seconds)
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      // Refresh every 270 seconds (4.5 min) to stay ahead of the 900s expiry
      refreshTimerRef.current = setInterval(() => {
        // Only refresh if still authenticated
        if (useAuthStore.getState().isAuthenticated) {
          doRefresh().catch(() => {
            // doRefresh already handles logout on 401
          });
        }
      }, 270000); // 270,000 ms = 270 seconds
    };

    if (isAuthenticated) {
      startTimer();
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // 5. Validate session if authenticated
  useEffect(() => {
    async function validate() {
      if (isAuthenticated) {
        const isValid = await validateSession();
        if (!isValid) logout();
      }
      await SplashScreen.hideAsync();
    }

    if (isReady && fontsLoaded) {
      validate();
    }
  }, [isReady, fontsLoaded, isAuthenticated, validateSession, logout]);

  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Wait for fonts and basic setup
  if (!isReady || !fontsLoaded) {
    return null;
  }

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
```

# File: apps/mobile/babel.config.js

```javascript
module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Required for react-native-reanimated v4
        'react-native-reanimated/plugin',
      ],
    };
  };
```

# File: apps/mobile/metro.config.js

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Monorepo support
config.watchFolders = [
  path.resolve(__dirname, "../../packages"),
];

// Resolve shared packages
config.resolver.extraNodeModules = {
  "@b2b/shared-types": path.resolve(
    __dirname,
    "../../packages/shared-types/src"
  ),
  "@b2b/api-client": path.resolve(
    __dirname,
    "../../packages/api-client/src"
  ),
};

// Ensure Metro searches both workspace and local node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "../../node_modules"),
  path.resolve(__dirname, "node_modules"),
];

// SVG support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "svg",
];

module.exports = config;
```

# File: apps/mobile/src/components/GradientHeader.tsx

```tsx
// apps/mobile/src/components/GradientHeader.tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// The props that React Navigation passes to a custom header
interface HeaderProps {
  back?: {
    title?: string;
    href?: string;
  };
  navigation: any; // We only use goBack, so any is fine
  route: any;
  options: {
    title?: string;
    headerTitle?: string | ((props: any) => React.ReactNode); // can be a string or function
    headerShown?: boolean;
  };
}

export function GradientHeader({ back, navigation, route, options }: HeaderProps) {
  const insets = useSafeAreaInsets();
  // Resolve title: prefer options.title, then headerTitle if it's a string, else route.name
  const title =
    options?.title ||
    (typeof options?.headerTitle === 'string' ? options.headerTitle : '') ||
    route?.name ||
    '';

  return (
    <LinearGradient
      colors={['#00B4DB', '#7B2FBE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      <View style={styles.container}>
        {back && (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

# File: apps/mobile/src/navigation/index.tsx

```tsx
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
```

# File: apps/mobile/src/screens/admin/AuditLogs/AuditLogsScreen.tsx

```tsx
// screens/admin/AuditLogs/AuditLogsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getAuditLogs, AuditFilters } from '../../../services/admin';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      const filters: AuditFilters = {};
      if (searchQuery) {
        // Simple filtering: we'll search across action and resource_type
        // In real app, you might use a proper search parameter
      }
      const result = await getAuditLogs(filters, 100);
      setLogs(result || []);
      setTotal(result?.length || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.action}>
            {item.action}
          </Text>
          <Chip style={styles.resourceChip}>{item.resource_type}</Chip>
        </View>
        <Text variant="bodySmall" style={styles.userId}>
          User: {item.user_id}
        </Text>
        {item.resource_id && (
          <Text variant="bodySmall" style={styles.resourceId}>
            Resource: {item.resource_id}
          </Text>
        )}
        {item.details && (
          <Text variant="bodySmall" style={styles.details}>
            Details: {JSON.stringify(item.details).substring(0, 100)}
          </Text>
        )}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.ip}>
            IP: {item.ip_address || 'N/A'}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Audit Logs
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} events
        </Text>
      </View>

      <Searchbar
        placeholder="Search logs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
        onSubmitEditing={fetchLogs}
      />

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No audit logs found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  resourceChip: { backgroundColor: '#E8E0F0', marginLeft: 8 },
  userId: { color: '#666', marginTop: 4 },
  resourceId: { color: '#666', marginTop: 2 },
  details: { color: '#888', marginTop: 4, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ip: { color: '#999', fontSize: 12 },
  timestamp: { color: '#999', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/admin/CompanyManagement/CompanyCreateScreen.tsx

```tsx
// screens/admin/CompanyManagement/CompanyCreateScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator, Chip, Button, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { createCompany, getSystemDepartments, SystemDepartment } from '../../../services/admin';
import { useIdempotency } from '../../../hooks/useIdempotency';

const TIERS = [
  { label: 'Basic', value: 'basic' },
  { label: 'Premium', value: 'premium' },
  { label: 'Enterprise', value: 'enterprise' },
];

const REGIONS = [
  { label: 'US East (N. Virginia)', value: 'us-east-1' },
  { label: 'EU West (Ireland)', value: 'eu-west-1' },
  { label: 'Asia Pacific (Mumbai)', value: 'ap-south-1' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

export default function CompanyCreateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getKey, resetKey } = useIdempotency();

  const [form, setForm] = useState({
    company_name: '',
    owner_phone: '',
    owner_username: '',
    owner_full_name: '',
    owner_position_title: 'CEO',
    subscription_tier: 'premium',
    max_employees: 100,
    max_departments: 20,
    data_region: 'us-east-1',
    subscription_months: 12,
    subscription_days: 0,
    financial_year_start_month: 4,
    work_center_code: 'MAIN-HQ',
    work_center_name: 'Main Headquarters',
    work_center_description: 'Primary work location',
    work_center_timezone: 'Asia/Kolkata',
    work_center_is_active: true,
  });

  const [allDepartments, setAllDepartments] = useState<SystemDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  // Dropdown modals
  const [tierModalVisible, setTierModalVisible] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await getSystemDepartments();
        setAllDepartments(data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load departments');
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepts();
  }, []);

  const toggleDepartment = (deptName: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName]
    );
  };

  const handleCreate = async () => {
    // Validation
    if (!form.company_name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    if (!form.owner_phone.trim() || form.owner_phone.length < 10) {
      Alert.alert('Error', 'Valid owner phone is required');
      return;
    }
    if (!form.owner_username.trim() || form.owner_username.length < 3) {
      Alert.alert('Error', 'Owner username must be at least 3 characters');
      return;
    }
    if (!form.owner_full_name.trim()) {
      Alert.alert('Error', 'Owner full name is required');
      return;
    }
    if (!form.owner_position_title.trim()) {
      Alert.alert('Error', 'Owner position title is required');
      return;
    }
    if (!form.data_region.trim()) {
      Alert.alert('Error', 'Data region is required');
      return;
    }
    if (form.subscription_months < 1 || form.subscription_months > 36) {
      Alert.alert('Error', 'Subscription months must be between 1 and 36');
      return;
    }
    if (selectedDepts.length === 0) {
      Alert.alert('Error', 'Select at least one department');
      return;
    }
    if (selectedDepts.length + 1 > form.max_departments) {
      Alert.alert(
        'Error',
        `You selected ${selectedDepts.length + 1} departments (including default), exceeding max ${form.max_departments}`
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        departments: selectedDepts,
      };
      // ✅ FIX: await the key generation
      const key = await getKey('createCompany');
      const result = await createCompany(payload, key);
      resetKey('createCompany');
      Alert.alert(
        'Success',
        `Company "${result.company_name}" created with ID: ${result.company_id}`,
        [
          {
            text: 'View Company',
            onPress: () => {
              (navigation as any).replace('CompanyDetail', { companyId: result.company_id });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to create company';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render dropdown picker modal
  const renderPickerModal = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    options: { label: string; value: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item.value === selectedValue && styles.modalItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item.value === selectedValue && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setVisible(false)} style={styles.modalCancel}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );

  // Helper for timezone picker (string array)
  const renderTimezonePicker = () => (
    <Modal
      transparent
      animationType="slide"
      visible={timezoneModalVisible}
      onRequestClose={() => setTimezoneModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Timezone</Text>
          <FlatList
            data={TIMEZONES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item === form.work_center_timezone && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setForm({ ...form, work_center_timezone: item });
                  setTimezoneModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item === form.work_center_timezone && styles.modalItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setTimezoneModalVisible(false)} style={styles.modalCancel}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderDepartmentChip = (dept: SystemDepartment) => {
    const selected = selectedDepts.includes(dept.name);
    return (
      <Chip
        key={dept.system_department_id}
        selected={selected}
        onPress={() => toggleDepartment(dept.name)}
        style={[styles.deptChip, selected && styles.deptChipSelected]}
        textStyle={selected ? styles.deptChipTextSelected : {}}
      >
        {dept.name}
      </Chip>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Create Company</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Fill in the details below</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Company Name *"
              value={form.company_name}
              onChangeText={(text) => setForm({ ...form, company_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Phone *"
              value={form.owner_phone}
              onChangeText={(text) => setForm({ ...form, owner_phone: text })}
              keyboardType="phone-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Username *"
              value={form.owner_username}
              onChangeText={(text) => setForm({ ...form, owner_username: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Full Name *"
              value={form.owner_full_name}
              onChangeText={(text) => setForm({ ...form, owner_full_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Position Title *"
              value={form.owner_position_title}
              onChangeText={(text) => setForm({ ...form, owner_position_title: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Employees"
                  value={String(form.max_employees)}
                  onChangeText={(text) => setForm({ ...form, max_employees: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Departments"
                  value={String(form.max_departments)}
                  onChangeText={(text) => setForm({ ...form, max_departments: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            {/* Subscription Tier Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTierModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Subscription Tier *</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {TIERS.find(t => t.value === form.subscription_tier)?.label || form.subscription_tier}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            {/* Data Region Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setRegionModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Data Region *</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {REGIONS.find(r => r.value === form.data_region)?.label || form.data_region}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Months"
                  value={String(form.subscription_months)}
                  onChangeText={(text) => setForm({ ...form, subscription_months: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Days"
                  value={String(form.subscription_days)}
                  onChangeText={(text) => setForm({ ...form, subscription_days: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Financial Year Start Month (1-12)"
              value={String(form.financial_year_start_month)}
              onChangeText={(text) => setForm({ ...form, financial_year_start_month: parseInt(text) || 1 })}
              keyboardType="number-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <Text variant="titleSmall" style={styles.sectionTitle}>Work Center</Text>

            <TextInput
              mode="outlined"
              label="Work Center Code"
              value={form.work_center_code}
              onChangeText={(text) => setForm({ ...form, work_center_code: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Work Center Name"
              value={form.work_center_name}
              onChangeText={(text) => setForm({ ...form, work_center_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Work Center Description"
              value={form.work_center_description}
              onChangeText={(text) => setForm({ ...form, work_center_description: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTimezoneModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Timezone</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{form.work_center_timezone}</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.work_center_is_active}
                onValueChange={(value) => setForm({ ...form, work_center_is_active: value })}
                color="#7B2FBE"
              />
            </View>

            <Text variant="titleSmall" style={styles.sectionTitle}>Departments *</Text>
            {loadingDepts ? (
              <ActivityIndicator size="small" color="#7B2FBE" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.deptContainer}>
                {allDepartments.map(renderDepartmentChip)}
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Company</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderPickerModal(tierModalVisible, setTierModalVisible, TIERS, form.subscription_tier, (val) => setForm({ ...form, subscription_tier: val }), 'Select Tier')}
      {renderPickerModal(regionModalVisible, setRegionModalVisible, REGIONS, form.data_region, (val) => setForm({ ...form, data_region: val }), 'Select Region')}
      {renderTimezonePicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginVertical: 16 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  form: { width: '100%' },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  dropdown: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dropdownLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  dropdownValueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownValue: { fontSize: 16, color: '#1A1A1A' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginTop: 12, marginBottom: 4 },
  deptContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  deptChip: { margin: 4, backgroundColor: '#f0f0f0' },
  deptChipSelected: { backgroundColor: '#00B4DB' }, // blue to match gradient
  deptChipTextSelected: { color: 'white' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 16, color: '#1A1A1A' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '80%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemSelected: { backgroundColor: '#E8E0F0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A' },
  modalItemTextSelected: { color: '#7B2FBE', fontWeight: '600' },
  modalCancel: { marginTop: 8 },
});
```

# File: apps/mobile/src/screens/admin/CompanyManagement/CompanyDepartmentsScreen.tsx

```tsx
// screens/admin/CompanyManagement/CompanyDepartmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { getCompanyDepartments, CompanyDepartment } from '../../../services/admin';

export default function CompanyDepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };

  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchDepartments = async () => {
    try {
      const result = await getCompanyDepartments(companyId, 100);
      setDepartments(result.departments || []);
      setTotal(result.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [companyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const renderItem = ({ item }: { item: CompanyDepartment }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.deptName}>
            {item.department_name}
          </Text>
          <Chip
            style={[
              styles.statusChip,
              { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
            ]}
            textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </Chip>
        </View>
        {item.system_department_name ? (
          <Text variant="bodySmall" style={styles.systemDept}>
            System: {item.system_department_name} ({item.module_code || 'N/A'})
          </Text>
        ) : null}
        {item.parent_department_id && (
          <Text variant="bodySmall" style={styles.parent}>
            Parent: {item.parent_department_id}
          </Text>
        )}
        <Text variant="bodySmall" style={styles.createdAt}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Departments
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} departments
        </Text>
      </View>

      <FlatList
        data={departments}
        renderItem={renderItem}
        keyExtractor={(item) => item.department_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No departments found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptName: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusChip: { marginLeft: 8 },
  systemDept: { color: '#666', marginTop: 4 },
  parent: { color: '#666', marginTop: 2 },
  createdAt: { color: '#888', marginTop: 2, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/admin/CompanyManagement/CompanyDetailScreen.tsx

```tsx
// screens/admin/CompanyManagement/CompanyDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Button, Chip, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  getCompanyById,
  getCompanyStats,
  deactivateCompany,
  reactivateCompany,
  getCompanyEmployees,
  getCompanyDepartments,
  getCompanyRoles,
  Company,
} from '../../../services/admin';
import { useIdempotency } from '../../../hooks/useIdempotency';

export default function CompanyDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };
  const { getKey, resetKey } = useIdempotency();

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);

  const loadData = async () => {
    try {
      const [companyData, statsData, employeesData, departmentsData, rolesData] = await Promise.all([
        getCompanyById(companyId),
        getCompanyStats(companyId),
        getCompanyEmployees(companyId, 1),
        getCompanyDepartments(companyId, 1),
        getCompanyRoles(companyId, 1),
      ]);
      setCompany(companyData);
      setStats(statsData);
      setEmployeeCount(employeesData.meta?.total || 0);
      setDepartmentCount(departmentsData.meta?.total || 0);
      setRoleCount(rolesData.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleToggleActive = async () => {
    if (!company) return;
    try {
      setActionLoading(true);
      const key = await getKey(`company-toggle-${companyId}`); // 👈 await
      if (company.is_active) {
        await deactivateCompany(companyId, 'Admin action', key);
      } else {
        await reactivateCompany(companyId, key);
      }
      resetKey(`company-toggle-${companyId}`);
      Alert.alert('Success', company.is_active ? 'Company deactivated' : 'Company reactivated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!company) return;
    try {
      await Share.share({
        message: `Company: ${company.company_name}\nID: ${company.company_id}\nStatus: ${company.is_active ? 'Active' : 'Inactive'}\nTier: ${company.subscription_tier}`,
        title: company.company_name,
      });
    } catch (error) {}
  };

  if (loading || !company) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.companyName}>
            {company.company_name}
          </Text>
          <View style={styles.statusRow}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: company.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{ color: company.is_active ? '#2E7D32' : '#C62828' }}
            >
              {company.is_active ? 'Active' : 'Inactive'}
            </Chip>
            <Chip style={styles.tierChip}>{company.subscription_tier}</Chip>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Owner ID:</Text>
              <Text style={styles.value}>{company.owner_user_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Subscription:</Text>
              <Text style={styles.value}>{company.subscription_status}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Max Employees:</Text>
              <Text style={styles.value}>{company.max_employees}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data Region:</Text>
              <Text style={styles.value}>{company.data_region}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>{new Date(company.created_at).toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>

        {stats && (
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Statistics
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.total_employees || 0}</Text>
                  <Text style={styles.statLabel}>Total Employees</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.active_employees || 0}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.department_count || 0}</Text>
                  <Text style={styles.statLabel}>Departments</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round((stats.employee_utilization || 0) * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Utilization</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('CompanyEmployees', { companyId })}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Employees ({employeeCount})</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('CompanyDepartments', { companyId })}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Departments ({departmentCount})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.halfButton]}
            onPress={handleToggleActive}
            disabled={actionLoading}
          >
            <LinearGradient
              colors={company.is_active ? ['#FF6B6B', '#EE5A24'] : ['#00B894', '#00A86B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>
                {actionLoading ? 'Processing...' : company.is_active ? 'Deactivate' : 'Reactivate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.halfButton]} onPress={handleShare}>
            <LinearGradient
              colors={['#6C5CE7', '#A29BFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.quickLinks}>
          <Text variant="titleMedium" style={styles.quickLinksTitle}>
            Quick Links
          </Text>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => (navigation as any).navigate('UserSearch')}
          >
            <Text style={styles.linkText}>View All Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
          >
            <Text style={styles.linkText}>Manage Roles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
          >
            <Text style={styles.linkText}>Audit Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12 },
  companyName: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  statusRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  statusChip: { marginRight: 8 },
  tierChip: { backgroundColor: '#E8E0F0' },
  infoCard: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
  statsCard: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  statsTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#7B2FBE' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 12, overflow: 'hidden' },
  halfButton: { flex: 0.48 },
  gradientButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  divider: { marginVertical: 16 },
  quickLinks: { marginTop: 8 },
  quickLinksTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  linkItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linkText: { fontSize: 16, color: '#7B2FBE' },
});
```

# File: apps/mobile/src/screens/admin/CompanyManagement/CompanyEmployeesScreen.tsx

```tsx
// screens/admin/CompanyManagement/CompanyEmployeesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { getCompanyEmployees, CompanyEmployee } from '../../../services/admin';

export default function CompanyEmployeesScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };

  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchEmployees = async () => {
    try {
      const result = await getCompanyEmployees(companyId, 100);
      setEmployees(result.employees || []);
      setTotal(result.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [companyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const renderItem = ({ item }: { item: CompanyEmployee }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.userId}>
            {item.user_id}
          </Text>
          <Chip
            style={[
              styles.statusChip,
              { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
            ]}
            textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.employeeId}>
          Employee ID: {item.employee_id}
        </Text>
        <Text variant="bodySmall" style={styles.roleId}>
          Role: {item.role_id}
        </Text>
        <Text variant="bodySmall" style={styles.hireDate}>
          Hire Date: {new Date(item.hire_date).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Employees
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} employees
        </Text>
      </View>

      <FlatList
        data={employees}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No employees found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userId: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusChip: { marginLeft: 8 },
  employeeId: { color: '#666', marginTop: 4 },
  roleId: { color: '#666', marginTop: 2 },
  hireDate: { color: '#888', marginTop: 2, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/admin/CompanyManagement/CompanyListScreen.tsx

```tsx
// screens/admin/CompanyManagement/CompanyListScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Searchbar, Chip, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getRecentCompanies,
  searchCompanies,
  getCompaniesByStatus,
  getCompaniesByTier,
  Company,
} from '../../../services/admin';

type FilterType = 'all' | 'active' | 'inactive';
type TierFilter = 'all' | 'basic' | 'premium' | 'enterprise';

export default function CompanyListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const fetchCompanies = async () => {
    try {
      let result;
      if (searchQuery.trim()) {
        result = await searchCompanies(searchQuery);
        setCompanies(result.companies || []);
        return;
      }

      if (statusFilter !== 'all') {
        result = await getCompaniesByStatus(statusFilter);
        setCompanies(result.companies || []);
        return;
      }

      if (tierFilter !== 'all') {
        result = await getCompaniesByTier(tierFilter);
        setCompanies(result.companies || []);
        return;
      }

      result = await getRecentCompanies(50);
      setCompanies(result.companies || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
    }, [searchQuery, statusFilter, tierFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleCompanyPress = (companyId: string) => {
    (navigation as any).navigate('CompanyDetail', { companyId });
  };

  const renderItem = ({ item }: { item: Company }) => (
    <TouchableOpacity onPress={() => handleCompanyPress(item.company_id)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.companyName}>
              {item.company_name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_active ? '#2E7D32' : '#C62828' },
                ]}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" style={styles.ownerText}>
            Owner: {item.owner_user_id}
          </Text>
          <View style={styles.metaRow}>
            <Chip style={styles.tierChip} textStyle={{ fontSize: 11 }}>
              {item.subscription_tier}
            </Chip>
            <Text variant="bodySmall" style={styles.metaText}>
              Employees: {item.max_employees}
            </Text>
            <Text variant="bodySmall" style={styles.metaText}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00B4DB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <Searchbar
        placeholder="Search companies..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        // 🎨 Change search icon to blue
        iconColor="#00B4DB"
        theme={{ colors: { primary: '#00B4DB' } }}
      />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Chip
            selected={statusFilter === 'all' && tierFilter === 'all'}
            onPress={() => { setStatusFilter('all'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'all' && tierFilter === 'all' && styles.activeChip]}
            textStyle={statusFilter === 'all' && tierFilter === 'all' ? styles.activeChipText : {}}
          >
            All
          </Chip>
          <Chip
            selected={statusFilter === 'active'}
            onPress={() => { setStatusFilter('active'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'active' && styles.activeChip]}
            textStyle={statusFilter === 'active' ? styles.activeChipText : {}}
          >
            Active
          </Chip>
          <Chip
            selected={statusFilter === 'inactive'}
            onPress={() => { setStatusFilter('inactive'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'inactive' && styles.activeChip]}
            textStyle={statusFilter === 'inactive' ? styles.activeChipText : {}}
          >
            Inactive
          </Chip>
          <Chip
            selected={tierFilter === 'basic'}
            onPress={() => { setStatusFilter('all'); setTierFilter('basic'); }}
            style={[styles.filterChip, tierFilter === 'basic' && styles.activeChip]}
            textStyle={tierFilter === 'basic' ? styles.activeChipText : {}}
          >
            Basic
          </Chip>
          <Chip
            selected={tierFilter === 'premium'}
            onPress={() => { setStatusFilter('all'); setTierFilter('premium'); }}
            style={[styles.filterChip, tierFilter === 'premium' && styles.activeChip]}
            textStyle={tierFilter === 'premium' ? styles.activeChipText : {}}
          >
            Premium
          </Chip>
          <Chip
            selected={tierFilter === 'enterprise'}
            onPress={() => { setStatusFilter('all'); setTierFilter('enterprise'); }}
            style={[styles.filterChip, tierFilter === 'enterprise' && styles.activeChip]}
            textStyle={tierFilter === 'enterprise' ? styles.activeChipText : {}}
          >
            Enterprise
          </Chip>
        </ScrollView>
      </View>

      <FlatList
        data={companies}
        renderItem={renderItem}
        keyExtractor={(item) => item.company_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00B4DB']} // 🎨 blue
            tintColor="#00B4DB"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No companies found
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fabWrapper}
        onPress={() => (navigation as any).navigate('CompanyCreate')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#00B4DB', '#7B2FBE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon name="plus" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  filterRow: { paddingHorizontal: 24, marginVertical: 4 },
  filterScroll: { flexDirection: 'row' },
  filterChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  // 🎨 Active chip background – blue
  activeChip: { backgroundColor: '#00B4DB' },
  activeChipText: { color: 'white' },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyName: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  ownerText: { color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  tierChip: { height: 24, backgroundColor: '#E8E0F0', marginRight: 8 },
  metaText: { color: '#888', fontSize: 12, marginRight: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
  // Custom FAB
  fabWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

# File: apps/mobile/src/screens/admin/SystemSettings/DepartmentsScreen.tsx

```tsx
// screens/admin/SystemSettings/DepartmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getSystemDepartments, SystemDepartment } from '../../../services/admin';

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const [departments, setDepartments] = useState<SystemDepartment[]>([]);
  const [filtered, setFiltered] = useState<SystemDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDepartments = async () => {
    try {
      const data = await getSystemDepartments();
      setDepartments(data);
      setFiltered(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFiltered(departments);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(
        departments.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.module_code.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, departments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const renderItem = (item: SystemDepartment) => (
    <Card key={item.system_department_id} style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.cardSubtitle}>
          Module: {item.module_code}
        </Text>
        <Text variant="bodySmall" style={styles.cardDesc}>
          {item.description}
        </Text>
        <Text variant="bodySmall" style={styles.cardBitmask}>
          Bitmask: {item.bitmask}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          System Departments
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {departments.length} departments available
        </Text>
      </View>

      <Searchbar
        placeholder="Search departments..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No departments found
            </Text>
          </View>
        ) : (
          filtered.map(renderItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  searchBar: { marginHorizontal: 24, marginVertical: 12, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  cardTitle: { fontWeight: '600', color: '#1A1A1A' },
  cardSubtitle: { color: '#7B2FBE', marginTop: 2 },
  cardDesc: { color: '#555', marginTop: 4 },
  cardBitmask: { color: '#999', marginTop: 2, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/admin/SystemSettings/PermissionsScreen.tsx

```tsx
// screens/admin/SystemSettings/PermissionsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Searchbar, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';

import { getAllPermissions, getPermissionsByModule, Permission } from '../../../services/admin';

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { moduleCode } = (route.params as { moduleCode?: string }) || {};

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filtered, setFiltered] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>(moduleCode || '');
  const [modules, setModules] = useState<string[]>([]);

  const fetchPermissions = async () => {
    try {
      let data: Permission[];
      if (selectedModule) {
        data = await getPermissionsByModule(selectedModule);
      } else {
        data = await getAllPermissions();
      }
      setPermissions(data);
      setFiltered(data);
      // Extract unique modules
      const uniqueModules = Array.from(new Set(data.map((p) => p.module))).sort();
      setModules(uniqueModules);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [selectedModule]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFiltered(permissions);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(
        permissions.filter(
          (p) =>
            p.permission_name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, permissions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPermissions();
  };

  const renderItem = (item: Permission) => (
    <Card key={item.permission_id} style={styles.card}>
      <Card.Content>
        <View style={styles.permissionRow}>
          <Text variant="titleSmall" style={styles.permissionName}>
            {item.permission_name}
          </Text>
          <Chip style={styles.categoryChip} textStyle={{ fontSize: 11 }}>
            {item.category}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.permissionDesc}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={styles.metaText}>
            Module: {item.module}
          </Text>
          <Text variant="bodySmall" style={styles.metaText}>
            Bit: {item.bit_index}
          </Text>
          <Text variant="bodySmall" style={styles.metaText}>
            Tier: {item.requires_tier}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Permissions
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {permissions.length} permissions
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Chip
            selected={!selectedModule}
            onPress={() => setSelectedModule('')}
            style={[styles.filterChip, !selectedModule && styles.activeChip]}
            textStyle={!selectedModule ? styles.activeChipText : {}}
          >
            All
          </Chip>
          {modules.map((mod) => (
            <Chip
              key={mod}
              selected={selectedModule === mod}
              onPress={() => setSelectedModule(mod)}
              style={[styles.filterChip, selectedModule === mod && styles.activeChip]}
              textStyle={selectedModule === mod ? styles.activeChipText : {}}
            >
              {mod}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <Searchbar
        placeholder="Search permissions..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No permissions found
            </Text>
          </View>
        ) : (
          filtered.map(renderItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  filterContainer: { paddingHorizontal: 24, marginVertical: 8 },
  chipScroll: { flexDirection: 'row' },
  filterChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  activeChip: { backgroundColor: '#7B2FBE' },
  activeChipText: { color: 'white' },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  permissionName: { fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 8 },
  categoryChip: { height: 24, backgroundColor: '#E8E0F0' },
  permissionDesc: { color: '#555', marginTop: 4 },
  metaRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  metaText: { color: '#888', fontSize: 12, marginRight: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/admin/UserManagement/UserDetailScreen.tsx

```tsx
// screens/admin/UserManagement/UserDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, TextInput, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  updateUser,
  updateUserKyc,
  banUser,
  unbanUser,
  advancedUserSearch,
  User,
} from '../../../services/admin';
import { useIdempotency } from '../../../hooks/useIdempotency';

export default function UserDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as { userId: string };
  const { getKey, resetKey } = useIdempotency();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    data_region: '',
  });
  const [kycStatus, setKycStatus] = useState('');
  const [kycLevel, setKycLevel] = useState('');

  const loadUser = async () => {
    setLoading(true);
    try {
      // Use advanced search with user_id filter to get the user
      const result = await advancedUserSearch({ user_id: userId });
      const users = result.users || [];
      if (users.length === 0) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }
      const foundUser = users[0];
      setUser(foundUser);
      setForm({
        username: foundUser.username || '',
        full_name: foundUser.full_name || '',
        email: foundUser.email || '',
        data_region: foundUser.data_region || '',
      });
      setKycStatus(foundUser.kyc_status || 'pending');
      setKycLevel(foundUser.kyc_level || 'basic');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const handleUpdateUser = async () => {
    setUpdating(true);
    try {
      const key = await getKey(`update-user-${userId}`);  // 👈 await
      await updateUser(userId, form, key);
      resetKey(`update-user-${userId}`);
      Alert.alert('Success', 'User updated');
      setEditMode(false);
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateKyc = async () => {
    setUpdating(true);
    try {
      const key = await getKey(`update-kyc-${userId}`);  // 👈 await
      await updateUserKyc(userId, { status: kycStatus, level: kycLevel }, key);
      resetKey(`update-kyc-${userId}`);
      Alert.alert('Success', 'KYC updated');
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'KYC update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const key = await getKey(`ban-${userId}`);  // 👈 await
      if (user.is_active) {
        await banUser(userId, 'Admin action', key);
      } else {
        await unbanUser(userId, 'Admin action', key);
      }
      resetKey(`ban-${userId}`);
      Alert.alert('Success', user.is_active ? 'User banned' : 'User unbanned');
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            User Details
          </Text>
          <View style={styles.statusRow}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: user.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{ color: user.is_active ? '#2E7D32' : '#C62828' }}
            >
              {user.is_active ? 'Active' : 'Banned'}
            </Chip>
            {user.role && <Chip style={styles.roleChip}>{user.role}</Chip>}
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{user.user_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username:</Text>
              <Text style={styles.value}>{user.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{user.full_name}</Text>
            </View>
            {user.email && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>KYC:</Text>
              <Text style={styles.value}>{user.kyc_status} ({user.kyc_level})</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data Region:</Text>
              <Text style={styles.value}>{user.data_region}</Text>
            </View>
            {user.created_at && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Joined:</Text>
                <Text style={styles.value}>{new Date(user.created_at).toLocaleString()}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {editMode ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Edit User
              </Text>
              <TextInput
                mode="outlined"
                label="Username"
                value={form.username}
                onChangeText={(text) => setForm({ ...form, username: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Full Name"
                value={form.full_name}
                onChangeText={(text) => setForm({ ...form, full_name: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Email"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Data Region"
                value={form.data_region}
                onChangeText={(text) => setForm({ ...form, data_region: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={() => setEditMode(false)}
                  style={styles.cancelButton}
                  labelStyle={{ color: '#666' }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpdateUser}
                  loading={updating}
                  disabled={updating}
                  style={styles.saveButton}
                  theme={{ colors: { primary: '#7B2FBE' } }}
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <TouchableOpacity
            onPress={() => setEditMode(true)}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Edit User</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Update KYC
            </Text>
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={kycStatus}
              onChangeText={setKycStatus}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="KYC Level"
              value={kycLevel}
              onChangeText={setKycLevel}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TouchableOpacity
              onPress={handleUpdateKyc}
              disabled={updating}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#6C5CE7', '#A29BFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, updating && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {updating ? 'Updating...' : 'Update KYC'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <TouchableOpacity
          onPress={handleBanToggle}
          disabled={updating}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={user.is_active ? ['#FF6B6B', '#EE5A24'] : ['#00B894', '#00A86B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradientButton, updating && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {updating ? 'Processing...' : user.is_active ? 'Ban User' : 'Unban User'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  statusRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  statusChip: { marginRight: 8 },
  roleChip: { backgroundColor: '#E8E0F0' },
  card: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelButton: { marginRight: 8, borderColor: '#ccc' },
  saveButton: { backgroundColor: '#7B2FBE' },
  actionButton: { borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  gradientButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
```

# File: apps/mobile/src/screens/admin/UserManagement/UserSearchScreen.tsx

```tsx
// screens/admin/UserManagement/UserSearchScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator, Card, Chip, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import {
  advancedUserSearch,
  searchUsersByUsername,
  searchUsersByFullName,
  getUsersByKycStatus,
  getBannedUsers,
  User,
} from '../../../services/admin';
import { useIdempotency } from '../../../hooks/useIdempotency';

type SearchType = 'advanced' | 'username' | 'fullname' | 'kyc' | 'banned';

export default function UserSearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('advanced');
  const [filters, setFilters] = useState({
    username: '',
    full_name: '',
    kyc_status: '',
    is_active: true,
  });
  const [usernameSearch, setUsernameSearch] = useState('');
  const [fullNameSearch, setFullNameSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  const [total, setTotal] = useState(0);

  const performSearch = async () => {
    setLoading(true);
    try {
      let result;
      switch (searchType) {
        case 'advanced':
          result = await advancedUserSearch(filters);
          break;
        case 'username':
          result = await searchUsersByUsername(usernameSearch);
          break;
        case 'fullname':
          result = await searchUsersByFullName(fullNameSearch);
          break;
        case 'kyc':
          result = await getUsersByKycStatus(kycStatus);
          break;
        case 'banned':
          result = await getBannedUsers();
          break;
      }
      setUsers(result.users || []);
      setTotal(result.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Search failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    performSearch();
  };

  const renderUserCard = (item: User) => (
    <TouchableOpacity
      key={item.user_id}
      onPress={() => (navigation as any).navigate('UserDetail', { userId: item.user_id })} // ✅ cast to any
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text variant="titleSmall" style={styles.username}>
              {item.username}
            </Text>
            {item.is_active !== undefined && (
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
                ]}
                textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={styles.fullName}>
            {item.full_name}
          </Text>
          {item.role && <Text variant="bodySmall" style={styles.role}>Role: {item.role}</Text>}
          {item.kyc_status && (
            <Chip style={styles.kycChip} textStyle={{ fontSize: 11 }}>
              KYC: {item.kyc_status}
            </Chip>
          )}
          {item.created_at && (
            <Text variant="bodySmall" style={styles.createdAt}>
              Joined: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderSearchControls = () => {
    switch (searchType) {
      case 'advanced':
        return (
          <View style={styles.filterGroup}>
            <TextInput
              mode="outlined"
              label="Username"
              value={filters.username}
              onChangeText={(text) => setFilters({ ...filters, username: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="Full Name"
              value={filters.full_name}
              onChangeText={(text) => setFilters({ ...filters, full_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={filters.kyc_status}
              onChangeText={(text) => setFilters({ ...filters, kyc_status: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
          </View>
        );
      case 'username':
        return (
          <TextInput
            mode="outlined"
            label="Username"
            value={usernameSearch}
            onChangeText={setUsernameSearch}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        );
      case 'fullname':
        return (
          <TextInput
            mode="outlined"
            label="Full Name"
            value={fullNameSearch}
            onChangeText={setFullNameSearch}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        );
      case 'kyc':
        return (
          <View style={styles.filterGroup}>
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={kycStatus}
              onChangeText={setKycStatus}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
          </View>
        );
      case 'banned':
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          User Search
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} users found
        </Text>
      </View>

      <View style={styles.typeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['advanced', 'username', 'fullname', 'kyc', 'banned'] as SearchType[]).map((type) => (
            <Chip
              key={type}
              selected={searchType === type}
              onPress={() => setSearchType(type)}
              style={[styles.typeChip, searchType === type && styles.activeChip]}
              textStyle={searchType === type ? styles.activeChipText : {}}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {renderSearchControls()}

        <TouchableOpacity
          onPress={performSearch}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGradient, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {users.map(renderUserCard)}
        {users.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No users found
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  typeSelector: { paddingHorizontal: 24, marginVertical: 8 },
  typeChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  activeChip: { backgroundColor: '#7B2FBE' },
  activeChipText: { color: 'white' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  filterGroup: { marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  buttonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusChip: { marginLeft: 8 },
  fullName: { color: '#666', marginTop: 2 },
  role: { color: '#7B2FBE', marginTop: 2, fontSize: 12 },
  kycChip: { backgroundColor: '#E8E0F0', alignSelf: 'flex-start', marginTop: 4 },
  createdAt: { color: '#888', marginTop: 4, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});
```

# File: apps/mobile/src/screens/auth/MPINForgotScreen.tsx

```tsx
// apps/mobile/src/screens/auth/MPINForgotScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { forgotMPIN, verifyForgotMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';

type PaperTextInput = React.ElementRef<typeof TextInput>;

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// MPIN strength checker (same as in MPINSetup)
const isWeakMPIN = (mpin: string): boolean => {
  if (mpin.length !== 6) return true;
  if (/^(\d)\1{5}$/.test(mpin)) return true;
  const digits = mpin.split('').map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return true;
  const common = ['123456', '654321', '111111', '000000', '121212', '112233'];
  if (common.includes(mpin)) return true;
  return false;
};

export default function MPINForgotScreen() {
  const [step, setStep] = useState<'sendOtp' | 'verifyOtp'>('sendOtp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newMpin, setNewMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  const { phone: routePhone } = (route.params as { phone: string }) || {};
  const { pendingPhone, savedPhone } = useAuthStore();
  const phone = routePhone || pendingPhone || savedPhone || '';

  const insets = useSafeAreaInsets();
  const otpInputRefs = useRef<Array<PaperTextInput | null>>([]);
  const mpinInputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateUUID);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  const handleSendOTP = async () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }
    setLoading(true);
    try {
      await forgotMPIN(phone, deviceId, fingerprint);
      Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
      setStep('verifyOtp');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to send OTP.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }
    const mpinCode = newMpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits for your new MPIN.');
      return;
    }
    if (isWeakMPIN(mpinCode)) {
      Alert.alert(
        'Weak MPIN',
        'Please choose a stronger MPIN (avoid repetitive, sequential, or common patterns).'
      );
      return;
    }

    setLoading(true);
    try {
      await verifyForgotMPIN(phone, mpinCode, otpCode, deviceId, fingerprint, idempotencyKey);
      Alert.alert('Success', 'Your MPIN has been reset successfully.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MPINVerification', params: { phone, adminId: '' } }] as any,
      });
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Verification failed.';

      if (status === 429) {
        const retryAfter = error.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        Alert.alert('Rate Limited', `Please wait ${retryAfter} seconds.`);
      } else if (msg.includes('invalid OTP')) {
        Alert.alert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.');
      } else if (msg.includes('weak')) {
        Alert.alert('Weak MPIN', 'The MPIN you entered is too weak. Please choose a stronger one.');
      } else {
        Alert.alert('Error', msg);
      }
      setIdempotencyKey(generateUUID);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text.length === 1 && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] !== '') {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        if (index > 0) otpInputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  // ✅ Fixed: renamed variable to avoid conflict with state variable
  const handleMpinChange = (text: string, index: number) => {
    const newMpinArr = [...newMpin];
    newMpinArr[index] = text;
    setNewMpin(newMpinArr);
    if (text.length === 1 && index < 5) {
      mpinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (newMpin[index] !== '') {
        const newMpinArr = [...newMpin];
        newMpinArr[index] = '';
        setNewMpin(newMpinArr);
        if (index > 0) mpinInputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) mpinInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Forgot MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {step === 'sendOtp'
                  ? `We'll send a verification code to ${phone}`
                  : 'Enter the OTP and your new MPIN'}
              </Text>
            </View>

            {step === 'sendOtp' ? (
              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#00B4DB', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.buttonGradient, loading && styles.buttonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: PaperTextInput | null) => {
                        otpInputRefs.current[index] = ref;
                      }}
                      mode="outlined"
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      style={styles.otpInput}
                      outlineStyle={styles.otpOutline}
                      theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                      textAlign="center"
                      editable={!loading}
                    />
                  ))}
                </View>

                <View style={styles.mpinContainer}>
                  {newMpin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref: PaperTextInput | null) => {
                        mpinInputRefs.current[index] = ref;
                      }}
                      mode="outlined"
                      value={digit}
                      onChangeText={(text) => handleMpinChange(text, index)}
                      onKeyPress={(e) => handleMpinKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      style={styles.mpinInput}
                      outlineStyle={styles.mpinOutline}
                      theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                      textAlign="center"
                      secureTextEntry
                      editable={!loading}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={loading || cooldownSeconds > 0}
                  activeOpacity={0.8}
                  style={styles.buttonWrapper}
                >
                  <LinearGradient
                    colors={['#00B4DB', '#7B2FBE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.buttonGradient,
                      (loading || cooldownSeconds > 0) && styles.buttonDisabled,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : cooldownSeconds > 0 ? (
                      <Text style={styles.buttonText}>Wait {cooldownSeconds}s</Text>
                    ) : (
                      <Text style={styles.buttonText}>Reset MPIN</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('sendOtp')} style={styles.backButton}>
                  <Text style={styles.backText}>← Back to send OTP</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>← Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontWeight: 'bold', textAlign: 'center', fontSize: 34, color: '#1A1A1A' },
  subtitle: { textAlign: 'center', marginTop: 8, color: '#666' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  otpOutline: { borderRadius: 12 },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  mpinOutline: { borderRadius: 12 },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  backButton: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#7B2FBE', fontSize: 16, fontWeight: '500' },
});
```

# File: apps/mobile/src/screens/auth/MPINSetup.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { setupMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';

type PaperTextInput = React.ElementRef<typeof TextInput>;

// --- UUID generator ---
const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// --- Weak MPIN checker ---
const isWeakMPIN = (mpin: string): boolean => {
  if (mpin.length !== 6) return true;
  // All same digits
  if (/^(\d)\1{5}$/.test(mpin)) return true;
  // Sequential ascending/descending
  const digits = mpin.split('').map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return true;
  // Common patterns
  const common = ['123456', '654321', '111111', '000000', '121212', '112233'];
  if (common.includes(mpin)) return true;
  return false;
};

export default function MPINSetupScreen() {
  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  // Expect phone and adminId from navigation params
  const { adminId, phone } = route.params as { adminId: string; phone?: string };

  const { login } = useAuthStore();
  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [setupIdempotencyKey, setSetupIdempotencyKey] = useState(generateUUID);

  // Load device info
  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();
  }, []);

  // --- Input handlers ---
  const handleMpinChange = (text: string, index: number) => {
    const newMpin = [...mpin];
    newMpin[index] = text;
    setMpin(newMpin);
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (mpin[index] !== '') {
        const newMpin = [...mpin];
        newMpin[index] = '';
        setMpin(newMpin);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // --- Main action ---
  const handleSetupMPIN = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits.');
      return;
    }

    if (isWeakMPIN(mpinCode)) {
      Alert.alert(
        'Weak MPIN',
        'Your MPIN is too weak. Please choose a different 6‑digit code (avoid sequential, repetitive, or common patterns).'
      );
      return;
    }

    setLoading(true);
    try {
      await setupMPIN(
        adminId,
        mpinCode,
        deviceId,
        fingerprint,
        setupIdempotencyKey
      );

      // MPIN set successfully – now navigate to verification (replace current screen)
      Alert.alert('Success', 'MPIN has been set. Please log in with your MPIN.');
      // Use reset with 'as any' to bypass type checking (consistent with other files)
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MPINVerification', params: { phone: phone || '', adminId } }],
      });
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Setup failed.';

      if (status === 400) {
        if (msg.toLowerCase().includes('weak')) {
          Alert.alert('Weak MPIN', 'Your MPIN is too weak. Please try a different one.');
        } else if (msg.toLowerCase().includes('admin not found')) {
          Alert.alert('Error', 'Admin not found. Please restart the process.');
        } else {
          Alert.alert('Error', msg);
        }
      } else if (status === 409) {
        // MPIN already exists – navigate to verification
        Alert.alert('MPIN Exists', 'An MPIN already exists for this account. Please log in.');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'MPINVerification', params: { phone: phone || '', adminId } }],
        });
      } else {
        Alert.alert('Error', msg);
      }
      // Regenerate key for retry
      setSetupIdempotencyKey(generateUUID);
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Set MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Create a 6‑digit secure MPIN for quick access
              </Text>
            </View>

            <View style={styles.mpinContainer}>
              {mpin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => {
                    inputRefs.current[index] = ref;
                  }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleMpinChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.mpinInput}
                  outlineStyle={styles.mpinOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  secureTextEntry
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSetupMPIN}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Set MPIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Use a unique 6‑digit code. Avoid 123456, 111111, etc.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 34,
    color: '#1A1A1A',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: {
    width: 48,
    height: 56,
    backgroundColor: 'white',
    fontSize: 20,
  },
  mpinOutline: {
    borderRadius: 12,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hintContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
```

# File: apps/mobile/src/screens/auth/MPINVerification.tsx

```tsx
// apps/mobile/src/screens/auth/MPINVerification.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { verifyMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../shared-types';

type PaperTextInput = React.ElementRef<typeof TextInput>;

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export default function MPINVerificationScreen() {
  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  const {
    pendingAdminId,
    pendingPhone,
    pendingHasMpin,
    savedAdminId,
    savedPhone,
    clearPendingMpinLogin,
    clearSavedAdminId,
    login,
  } = useAuthStore();

  const routeParams = route.params as { phone?: string; adminId?: string } | undefined;
  const phone = routeParams?.phone ?? pendingPhone ?? savedPhone ?? '';
  const adminId = routeParams?.adminId ?? pendingAdminId ?? savedAdminId ?? '';

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [verifyIdempotencyKey, setVerifyIdempotencyKey] = useState(generateUUID);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  const handleMpinChange = (text: string, index: number) => {
    const newMpin = [...mpin];
    newMpin[index] = text;
    setMpin(newMpin);
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (mpin[index] !== '') {
        const newMpin = [...mpin];
        newMpin[index] = '';
        setMpin(newMpin);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyMPIN = async () => {
    const mpinCode = mpin.join('');
    if (mpinCode.length < 6) {
      Alert.alert('Invalid MPIN', 'Please enter all 6 digits.');
      return;
    }

    if (cooldownSeconds > 0) {
      Alert.alert('Rate Limited', `Please wait ${cooldownSeconds} seconds.`);
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 [MPINVerification] Verifying MPIN for phone:', phone);
      const data = await verifyMPIN(
        phone,
        mpinCode,
        deviceId,
        fingerprint,
        verifyIdempotencyKey
      );

      console.log('📥 [MPINVerification] Response data:', data);

      const { admin, tokens } = data;

      console.log('👤 [MPINVerification] admin object:', admin);
      console.log('👤 [MPINVerification] admin.role:', admin.role);
      console.log('👤 [MPINVerification] admin.role_string:', admin.role_string);
      console.log('👤 [MPINVerification] admin.is_super_admin:', admin.is_super_admin);

      if (tokens?.access_token && admin) {
        // Build user object preserving ALL fields, especially role_string
        const user: User = {
          user_id: admin.admin_id || admin.user_id || '',
          username: admin.username || '',
          full_name: admin.full_name || '',
          email: admin.email,
          phone: admin.phone,
          role: admin.role || admin.role_string || '',
          role_string: admin.role_string || '',
          is_super_admin:
            admin.role === 'super_admin' ||
            admin.role_string === 'super_admin' ||
            admin.is_super_admin === true,
          is_active: admin.is_active,
        };

        console.log('🧑‍💼 [MPINVerification] User object built:', user);
        console.log('🔑 [MPINVerification] user.role:', user.role);
        console.log('🔑 [MPINVerification] user.role_string:', user.role_string);
        console.log('🔑 [MPINVerification] user.is_super_admin:', user.is_super_admin);

        clearPendingMpinLogin();

        // Pass deviceId as 4th argument
        console.log('🔐 [MPINVerification] Calling login with user:', user);
        login(tokens.access_token, tokens.refresh_token, user, deviceId);

        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }, 100);
      } else {
        console.warn('⚠️ [MPINVerification] Missing tokens or admin in response');
        Alert.alert('Error', 'Login succeeded but tokens are missing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ [MPINVerification] Verification error:', error);
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Verification failed.';

      if (status === 429) {
        const retryAfter = error.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        Alert.alert('Too Many Attempts', `Please wait ${retryAfter} seconds.`);
      } else if (status === 400 && msg.toLowerCase().includes('admin not found')) {
        Alert.alert('Error', 'Admin account not found. Please restart the process.');
        clearPendingMpinLogin();
        clearSavedAdminId();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'PhoneInput' }],
          })
        );
      } else if (status === 200 && error.response?.data?.success === false) {
        Alert.alert('Invalid MPIN', 'The MPIN you entered is incorrect. Please try again.');
      } else if (msg.toLowerCase().includes('locked')) {
        Alert.alert('Account Locked', 'Your MPIN is locked due to multiple failed attempts. Please use Forgot MPIN.');
      } else {
        Alert.alert('Error', msg);
      }

      setVerifyIdempotencyKey(generateUUID);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMPIN = () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }
    (navigation as any).navigate('MPINForgot', { phone });
  };

  const handleChangePhone = () => {
    clearPendingMpinLogin();
    clearSavedAdminId();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'PhoneInput' }],
      })
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>
                Enter MPIN
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Enter your 6‑digit MPIN to continue
              </Text>
            </View>

            <View style={styles.mpinContainer}>
              {mpin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => {
                    inputRefs.current[index] = ref;
                  }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleMpinChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.mpinInput}
                  outlineStyle={styles.mpinOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  secureTextEntry
                  editable={!loading && cooldownSeconds === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerifyMPIN}
              disabled={loading || cooldownSeconds > 0}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.buttonGradient,
                  (loading || cooldownSeconds > 0) && styles.buttonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : cooldownSeconds > 0 ? (
                  <Text style={styles.buttonText}>Wait {cooldownSeconds}s</Text>
                ) : (
                  <Text style={styles.buttonText}>Verify MPIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={handleForgotMPIN} disabled={loading}>
                <Text style={styles.linkText}>Forgot MPIN?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChangePhone}
                disabled={loading}
                style={styles.changePhoneButton}
              >
                <Text style={styles.linkText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 34,
    color: '#1A1A1A',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mpinInput: {
    width: 48,
    height: 56,
    backgroundColor: 'white',
    fontSize: 20,
  },
  mpinOutline: {
    borderRadius: 12,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    color: '#7B2FBE',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 6,
  },
  changePhoneButton: {
    marginTop: 4,
  },
});
```

# File: apps/mobile/src/screens/auth/OTPVerification.tsx

```tsx
// apps/mobile/src/screens/auth/OTPVerification.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard, Alert, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { verifyOTP, sendOTP } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';
import { useIdempotency } from '../../hooks/useIdempotency'; // 👈 import the hook

type PaperTextInput = React.ElementRef<typeof TextInput>;

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  const { phone, adminId: initialAdminId, hasMpin: initialHasMpin } = route.params as {
    phone: string;
    adminId?: string;
    hasMpin?: boolean;
  };

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  // 👇 Use the hook for resend (a dedicated operation)
  const { getKey: getResendKey, resetKey: resetResendKey } = useIdempotency();

  // For verification, we keep a local state (we still want to retry the same key on failure)
  const [verifyIdempotencyKey, setVerifyIdempotencyKey] = useState(() => 
    // Generate a UUID for verification (we'll regenerate on each new attempt)
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  );

  const timerRef = useRef<number | null>(null);

  const { setPendingMpinLogin, setSavedAdminId } = useAuthStore.getState();

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    inputRefs.current[0]?.focus();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldownSeconds]);

  const handleOTPChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text.length === 1 && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] !== '') {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      } else {
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6‑digit code.');
      return;
    }
    setLoading(true);
    try {
      const verifyData = await verifyOTP(
        phone,
        otpCode,
        'admin_login',
        deviceId,
        fingerprint,
        verifyIdempotencyKey
      );

      const { admin_id, has_mpin } = verifyData;

      if (admin_id) {
        setPendingMpinLogin(admin_id, phone, has_mpin);
        setSavedAdminId(admin_id, phone, has_mpin);

        if (has_mpin === true) {
          (navigation as any).navigate('MPINVerification', { phone, adminId: admin_id });
        } else {
          (navigation as any).navigate('MPINSetup', { adminId: admin_id, phone });
        }
      } else {
        Alert.alert('Verification Failed', 'Invalid OTP or expired.');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || '';
      const isDuplicate = errorMsg.includes('already used') ||
                          errorMsg.includes('idempotency') ||
                          error.response?.status === 409;

      if (isDuplicate && initialAdminId) {
        setPendingMpinLogin(initialAdminId, phone, initialHasMpin ?? false);
        setSavedAdminId(initialAdminId, phone, initialHasMpin ?? false);
        if (initialHasMpin) {
          (navigation as any).navigate('MPINVerification', { phone, adminId: initialAdminId });
        } else {
          (navigation as any).navigate('MPINSetup', { adminId: initialAdminId, phone });
        }
        return;
      }

      const msg = error.response?.data?.message || error.message || 'Verification failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
      // Generate a new key for the next verification attempt
      setVerifyIdempotencyKey(
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        })
      );
    }
  };

  // 👇 Use the hook for resend – we get a key, send, then reset to force a new key next time
  const handleResendOTP = async () => {
    if (cooldownSeconds > 0) return;
    setResendLoading(true);
    try {
      const idempotencyKey = getResendKey('resendOTP'); // 👈 get a key (first call generates, subsequent calls reuse until reset)
      await sendOTP(phone, 'admin_login', deviceId, fingerprint, idempotencyKey);
      // Success – reset the key so that a future resend generates a new one
      resetResendKey('resendOTP');
      Alert.alert('Success', 'OTP resent successfully.');
    } catch (error: any) {
      const hasRetryAfter = !!error.retryAfter;
      if (hasRetryAfter) {
        setCooldownSeconds(error.retryAfter);
        Alert.alert('Rate Limited', `Please wait ${error.retryAfter} seconds.`);
      } else {
        const msg = error.response?.data?.message || error.message || 'Failed to resend OTP.';
        Alert.alert('Error', msg);
        // For non‑retryable errors (like validation), also reset the key
        if (error.response?.status !== 429) {
          resetResendKey('resendOTP');
        }
        // For 429, we keep the key so that the user can retry after cooldown
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text variant="displaySmall" style={styles.title}>Enter OTP</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>We sent a code to {phone}</Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: PaperTextInput | null) => { inputRefs.current[index] = ref; }}
                  mode="outlined"
                  value={digit}
                  onChangeText={(text) => handleOTPChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={styles.otpInput}
                  outlineStyle={styles.otpOutline}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  textAlign="center"
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.8} style={styles.buttonWrapper}>
              <LinearGradient colors={['#00B4DB', '#7B2FBE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}>
                {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text variant="bodyMedium" style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resendLoading || loading || cooldownSeconds > 0}
                style={styles.resendButton}
              >
                <Text style={[styles.resendButtonLabel, (resendLoading || loading || cooldownSeconds > 0) && styles.resendDisabled]}>
                  {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : resendLoading ? 'Sending...' : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { marginBottom: 48, alignItems: 'center' },
  title: { fontWeight: 'bold', textAlign: 'center', fontSize: 34, color: '#1A1A1A' },
  subtitle: { textAlign: 'center', marginTop: 8, color: '#666' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  otpInput: { width: 48, height: 56, backgroundColor: 'white', fontSize: 20 },
  otpOutline: { borderRadius: 12 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { color: '#666' },
  resendButton: { marginLeft: 4, paddingVertical: 4 },
  resendButtonLabel: { fontSize: 16, fontWeight: '600', color: '#7B2FBE' },
  resendDisabled: { color: '#ccc' },
});
```

# File: apps/mobile/src/screens/auth/PhoneInput.tsx

```tsx
// apps/mobile/src/screens/auth/PhoneInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CountryPicker, CountryItem } from 'react-native-country-codes-picker';

import { initiateLogin, sendOTP } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';
import { useIdempotency } from '../../hooks/useIdempotency'; // 👈 import the hook

export default function PhoneInputScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  // Device identifiers – loaded once
  const [deviceId, setDeviceId] = useState<string>('');
  const [fingerprint, setFingerprint] = useState<string>('');

  // 👇 Use the hook for the OTP send
  const { getKey, resetKey } = useIdempotency();

  // Countdown timer ref
  const timerRef = useRef<number | null>(null);

  // Auth store actions and state
  const { 
    clearPendingMpinLogin, 
    savedAdminId, 
    savedPhone 
  } = useAuthStore();

  useEffect(() => {
    async function loadDeviceInfo() {
      const id = await getDeviceId();
      const fp = await getDeviceFingerprint();
      setDeviceId(id);
      setFingerprint(fp);
    }
    loadDeviceInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle retry-after countdown
  useEffect(() => {
    if (retryAfterSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfterSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [retryAfterSeconds]);

  // ============================================================
  // handleSendOTP with savedAdminId fallback – using useIdempotency
  // ============================================================
  const handleSendOTP = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number (at least 10 digits).');
      return;
    }
    const fullNumber = `+${callingCode}${cleaned}`;
    setLoading(true);

    // Clear pending state but keep savedAdminId/savedPhone
    clearPendingMpinLogin();

    try {
      // 1. Initiate login to determine flow
      const initiateData = await initiateLogin(fullNumber, deviceId, fingerprint);
      const {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        flow_state,
        admin_id: responseAdminId,
        message,
      } = initiateData;

      // Handle locked account
      if (mpin_locked) {
        Alert.alert(
          'Account Locked',
          'Your MPIN is locked. Please contact your administrator to unlock it.'
        );
        setLoading(false);
        resetKey('sendOTP'); // clear the key
        return;
      }

      // If user has MPIN and device is trusted
      if (has_mpin && device_trusted) {
        // Try to get admin_id from response, or from saved data if phone matches
        let adminId = responseAdminId || null;
        if (!adminId && savedPhone === fullNumber && savedAdminId) {
          adminId = savedAdminId;
        }
        if (adminId) {
          (navigation as any).navigate('MPINVerification', {
            phone: fullNumber,
            adminId: adminId,
          });
          setLoading(false);
          resetKey('sendOTP'); // clear the key
          return;
        } else {
          // No admin_id – we need OTP to get it.
          console.warn('No admin_id, falling back to OTP');
        }
      }

      // Otherwise: send OTP for either:
      // - New user (no MPIN, device not trusted)
      // - Existing user without MPIN
      // - Existing user with MPIN but device not trusted
      // - Or we need to get admin_id via OTP
      if (user_exists || !has_mpin || !device_trusted) {
        // 👇 Get a key (first call generates, subsequent calls reuse until reset)
        const idempotencyKey = getKey('sendOTP');
        await sendOTP(
          fullNumber,
          'admin_login',
          deviceId,
          fingerprint,
          idempotencyKey
        );
        // Success – reset the key so a new one is generated next time
        resetKey('sendOTP');
        Alert.alert('OTP Sent', `A verification code has been sent to ${fullNumber}`);
        // Pass along any admin_id we have (if any) to OTP screen
        (navigation as any).navigate('OTPVerification', {
          phone: fullNumber,
          adminId: responseAdminId || undefined,
          hasMpin: has_mpin ?? false,
          flowState: flow_state,
        });
      } else {
        // Fallback – should not happen
        Alert.alert('Unexpected Flow', message || 'Please contact support.');
        resetKey('sendOTP');
      }
    } catch (error: any) {
      // --- IDEMPOTENCY KEY DECISION ---
      const isNetworkError =
        error.message === 'Network Error' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK';

      const hasRetryAfter = !!error.retryAfter;

      if (isNetworkError || hasRetryAfter) {
        // Keep the key for retry – do not reset
      } else {
        // Other errors (validation, 404, 500, etc.) – reset key
        resetKey('sendOTP');
      }

      if (hasRetryAfter) {
        setRetryAfterSeconds(error.retryAfter);
        Alert.alert(
          'Rate Limited',
          `Please wait ${error.retryAfter} seconds before trying again.`
        );
      } else {
        const msg = error.response?.data?.message || error.message || 'An error occurred.';
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearPhone = () => {
    setPhone('');
    inputRef.current?.focus();
  };

  const onSelectCountry = (item: CountryItem) => {
    setCountryCode(item.code);
    setCallingCode(item.dial_code.replace('+', ''));
    setCountryPickerVisible(false);
  };

  const isButtonDisabled = loading || retryAfterSeconds > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.brandGradient}
              >
                <Text style={styles.brandText}>PRAYANTRA</Text>
              </LinearGradient>
              <Text variant="headlineMedium" style={styles.subtitle}>
                Admin Login
              </Text>
              <Text variant="bodyMedium" style={styles.description}>
                Enter your registered phone number
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.phoneContainer}>
                <TouchableOpacity
                  style={styles.countryPicker}
                  onPress={() => setCountryPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.callingCode}>+{callingCode}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                  <RNTextInput
                    ref={inputRef}
                    style={styles.phoneInput}
                    placeholder="Phone Number"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                    editable={!loading}
                    selectionColor="#7B2FBE"
                  />
                </View>

                {phone.length > 0 && (
                  <TouchableOpacity onPress={clearPhone} style={styles.clearButton}>
                    <Text style={styles.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={isButtonDisabled}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={['#00B4DB', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.buttonGradient, isButtonDisabled && styles.buttonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : retryAfterSeconds > 0 ? (
                    <Text style={styles.buttonText}>Wait {retryAfterSeconds}s</Text>
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text variant="bodySmall" style={styles.footerText}>
                By continuing you agree to our Terms & Privacy Policy
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CountryPicker
        show={countryPickerVisible}
        pickerButtonOnPress={onSelectCountry}
        onBackdropPress={() => setCountryPickerVisible(false)}
        onRequestClose={() => setCountryPickerVisible(false)}
        lang="en"
        style={{
          modal: {
            flex: 1,
            maxHeight: '80%',
            margin: 0,
            padding: 0,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: 'white',
            paddingBottom: insets.bottom || 10,
          },
          itemsList: {
            flex: 1,
            paddingHorizontal: 10,
          },
          textInput: {
            marginHorizontal: 16,
            marginBottom: 8,
            height: 44,
            backgroundColor: '#f5f5f5',
            borderRadius: 10,
            paddingHorizontal: 12,
          },
          countryButtonStyles: {
            paddingVertical: 12,
          },
          line: {
            marginHorizontal: 16,
          },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brandGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  description: {
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 4,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  callingCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  inputWrapper: {
    flex: 1,
    marginLeft: 4,
  },
  phoneInput: {
    height: 50,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'white',
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    textAlign: 'center',
  },
});
```

# File: apps/mobile/src/screens/main/Attendance.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <Text>Mark attendance here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
```

# File: apps/mobile/src/screens/main/Dashboard.tsx

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text>Welcome to the admin dashboard!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
```

# File: apps/mobile/src/screens/main/Profile.tsx

```tsx
// apps/mobile/src/screens/main/Profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    // Reset the navigation stack to PhoneInput
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'PhoneInput' }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text>Name: {user?.full_name || 'Admin'}</Text>
      <Text>Email: {user?.email || 'N/A'}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
```

# File: apps/mobile/src/splash/AnimatedSplashScreen.tsx

```tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
  const { width } = useWindowDimensions();

  const titleSize = Math.min(width * 0.12, 56);
  const taglineSize = Math.max(14, width * 0.038);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    scale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    taglineOpacity.value = withDelay(
      350,
      withTiming(1, {
        duration: 500,
      })
    );

    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <MaskedView
            maskElement={
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            }
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text
                style={[
                  styles.title,
                  {
                    opacity: 0,
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            subtitleStyle,
            {
              fontSize: taglineSize,
            },
          ]}
        >
          Integrate. Automate. Accelerate.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  center: {
    width: '90%',
    maxWidth: 700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gradient: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  title: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  tagline: {
    marginTop: 20,
    color: '#7B7B8D',
    fontWeight: '500',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
```

# File: combine_code.py

```python
#!/usr/bin/env python3

from pathlib import Path
import mimetypes

ROOT = Path(".")
OUTPUT_FILE = "combined_code.md"

# Directories to ignore
IGNORE_DIRS = {
    ".git",
    ".github",
    ".next",
    ".turbo",
    ".expo",
    ".expo-shared",
    ".idea",
    ".vscode",
    ".cache",
    ".gradle",
    "__pycache__",
    ".pytest_cache",

    "node_modules",
    "dist",
    "build",
    "coverage",
    "vendor",
    "Pods",

    # Native
    "android",
    "ios",

    # Generated
    "generated",
}

# Exact filenames to always ignore
IGNORE_FILENAMES = {
    ".DS_Store",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".prettierignore",
    ".eslintignore",
    ".npmrc",

    ".env",
    ".env.local",
    ".env.production",
    ".env.development",

    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lockb",
    "Cargo.lock",
    "composer.lock",
}

# Ignore documentation
IGNORE_PREFIXES = (
    "README",
    "LICENSE",
    "CHANGELOG",
    "CONTRIBUTING",
    "CODE_OF_CONDUCT",
)

# Source code extensions
CODE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",

    ".go",
    ".py",
    ".java",
    ".kt",
    ".swift",

    ".css",
    ".scss",
    ".html",

    ".sql",
    ".graphql",
    ".proto",

    ".xml",
    ".sh",
}

# Important config files
ALLOWED_FILES = {
    "package.json",
    "tsconfig.json",
    "turbo.json",
    "pnpm-workspace.yaml",
    "pnpm-workspace.yml",

    "app.json",
    "eas.json",

    "metro.config.js",
    "metro.config.cjs",

    "babel.config.js",
    "babel.config.cjs",

    "vite.config.ts",
    "vite.config.js",

    "next.config.ts",
    "next.config.js",

    "jest.config.ts",
    "jest.config.js",

    "eslint.config.js",
    "eslint.config.mjs",

    "tailwind.config.ts",
    "tailwind.config.js",

    "orval.config.ts",
}

LANGUAGE_MAP = {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".go": "go",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
    ".sql": "sql",
    ".graphql": "graphql",
    ".proto": "proto",
    ".xml": "xml",
    ".sh": "bash",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
}


def is_binary(path: Path):
    mime, _ = mimetypes.guess_type(path)

    if mime and not mime.startswith("text"):
        return True

    try:
        with open(path, "rb") as f:
            return b"\0" in f.read(2048)
    except Exception:
        return True


def should_skip(path: Path):

    # Ignore directories
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True

    # Ignore exact filenames
    if path.name in IGNORE_FILENAMES:
        return True

    # Ignore docs
    if path.name.startswith(IGNORE_PREFIXES):
        return True

    # Allow important config files
    if path.name in ALLOWED_FILES:
        return False

    # Otherwise only allow source code extensions
    return path.suffix.lower() not in CODE_EXTENSIONS


files = []

for file in ROOT.rglob("*"):

    if not file.is_file():
        continue

    if should_skip(file):
        continue

    if is_binary(file):
        continue

    files.append(file)

files.sort()

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:

    out.write("# Combined Source Code\n\n")
    out.write(f"Total Files: {len(files)}\n\n")

    for file in files:

        rel = file.relative_to(ROOT)
        lang = LANGUAGE_MAP.get(file.suffix.lower(), "")

        out.write(f"# File: {rel}\n\n")
        out.write(f"```{lang}\n")

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file.read_text(encoding="latin-1")

        out.write(text)

        if not text.endswith("\n"):
            out.write("\n")

        out.write("```\n\n")

print(f"✅ Combined {len(files)} files into {OUTPUT_FILE}")
```

# File: packages/api-client/src/axios-instance.js

```javascript
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customAxiosInstance = exports.setAuthToken = void 0;
var axios_1 = require("axios");
var authToken = null;
var setAuthToken = function (token) {
    authToken = token;
};
exports.setAuthToken = setAuthToken;
var AXIOS_INSTANCE = axios_1.default.create({
    baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});
AXIOS_INSTANCE.interceptors.request.use(function (config) {
    if (authToken) {
        config.headers.Authorization = "Bearer ".concat(authToken);
    }
    return config;
});
AXIOS_INSTANCE.interceptors.response.use(function (response) { return response; }, function (error) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
            console.warn("Unauthorized – trigger refresh");
        }
        return [2 /*return*/, Promise.reject(error)];
    });
}); });
// This is what Orval is looking for
var customAxiosInstance = function (config) {
    return AXIOS_INSTANCE.request(config).then(function (response) { return response.data; });
};
exports.customAxiosInstance = customAxiosInstance;
exports.default = AXIOS_INSTANCE;
```

# File: pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

