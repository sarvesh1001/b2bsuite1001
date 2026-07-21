# Combined Source Code

Total Files: 17

# File: apps/mobile/App.tsx

```tsx
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

# File: apps/mobile/src/api-client/src/axios-instance.js

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

# File: apps/mobile/src/navigation/index.tsx

```tsx
// apps/mobile/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/authStore';

// Auth Screens
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen'; // ✅ Import

// Main Screens
import DashboardScreen from '../screens/main/Dashboard';
import AttendanceScreen from '../screens/main/Attendance';
import ProfileScreen from '../screens/main/Profile';

export type RootStackParamList = {
  PhoneInput: undefined;
  OTPVerification: { phone: string; adminId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { adminId: string; phone: string };
  MPINVerification: { phone: string; adminId: string };
  MPINForgot: { phone: string }; // ✅ Added
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#6200ee',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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

  // Determine initial route
  let initialRoute: keyof RootStackParamList = 'PhoneInput';

  if (isAuthenticated) {
    initialRoute = 'Main';
  } else if (pendingAdminId && pendingPhone) {
    // We have pending MPIN login data
    initialRoute = pendingHasMpin ? 'MPINVerification' : 'MPINSetup';
  } else if (savedAdminId && savedPhone && savedHasMpin === true) {
    // We have saved admin ID and know user has MPIN → skip OTP
    initialRoute = 'MPINVerification';
  }
  // else fallback to PhoneInput

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        {/* Auth Screens */}
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} /> {/* ✅ Added */}

        {/* Main Screen */}
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
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
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
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
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
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
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { verifyMPIN } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';

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

  // Get both pending and saved state from store
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

  // Determine phone and adminId: route params > pending > saved
  const routeParams = route.params as { phone?: string; adminId?: string } | undefined;
  const phone = routeParams?.phone ?? pendingPhone ?? savedPhone ?? '';
  const adminId = routeParams?.adminId ?? pendingAdminId ?? savedAdminId ?? '';

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [verifyIdempotencyKey, setVerifyIdempotencyKey] = useState(generateUUID);

  const timerRef = useRef<number | null>(null);

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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cooldown timer for rate limiting
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

  // Input handlers
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

  // Verify MPIN
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
      const data = await verifyMPIN(
        phone,
        mpinCode,
        deviceId,
        fingerprint,
        verifyIdempotencyKey
      );

      // Successful login: data should contain { admin, tokens, message }
      const { admin, tokens } = data;
      if (tokens?.access_token && admin) {
        // Clear pending state (but keep saved for future logouts)
        clearPendingMpinLogin();
        login(tokens.access_token, tokens.refresh_token, admin);

        // Reset navigation to Main
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }, 100);
      } else {
        Alert.alert('Error', 'Login succeeded but tokens are missing. Please try again.');
      }
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message || 'Verification failed.';

      // Rate limiting (429)
      if (status === 429) {
        const retryAfter = error.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        Alert.alert('Too Many Attempts', `Please wait ${retryAfter} seconds.`);
      }
      // Admin not found (400)
      else if (status === 400 && msg.toLowerCase().includes('admin not found')) {
        Alert.alert('Error', 'Admin account not found. Please restart the process.');
        clearPendingMpinLogin();
        clearSavedAdminId();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'PhoneInput' }],
          })
        );
      }
      // Wrong MPIN – API returns 200 with success: false
      else if (status === 200 && error.response?.data?.success === false) {
        Alert.alert('Invalid MPIN', 'The MPIN you entered is incorrect. Please try again.');
      }
      // MPIN locked
      else if (msg.toLowerCase().includes('locked')) {
        Alert.alert('Account Locked', 'Your MPIN is locked due to multiple failed attempts. Please use Forgot MPIN.');
      } else {
        Alert.alert('Error', msg);
      }

      // Regenerate idempotency key for retry
      setVerifyIdempotencyKey(generateUUID);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Forgot MPIN – navigate to the dedicated screen (no API call here)
  const handleForgotMPIN = () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please restart the process.');
      return;
    }
    // Navigate to MPINForgot screen, passing the phone number
    (navigation as any).navigate('MPINForgot', { phone });
  };

  // Change phone number: clear both pending AND saved, go back to PhoneInput
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

              <TouchableOpacity onPress={handleChangePhone} disabled={loading} style={styles.changePhoneButton}>
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
  TouchableWithoutFeedback, Keyboard, Alert, SafeAreaView, TouchableOpacity
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { verifyOTP, sendOTP } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';

type PaperTextInput = React.ElementRef<typeof TextInput>;

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ Extended route params: now includes hasMpin from PhoneInput
  const { phone, adminId: initialAdminId, hasMpin: initialHasMpin } = route.params as {
    phone: string;
    adminId?: string;
    hasMpin?: boolean;
  };

  const insets = useSafeAreaInsets();
  const inputRefs = useRef<Array<PaperTextInput | null>>([]);

  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  // IDEMPOTENCY KEYS
  const resendKeyRef = useRef<string | null>(null);
  const [verifyIdempotencyKey, setVerifyIdempotencyKey] = useState(generateUUID);

  const timerRef = useRef<number | null>(null);

  // Access the auth store actions
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

      console.log('📦 verifyData after unwrap:', verifyData);

      const { admin_id, has_mpin } = verifyData;

      console.log(`🔍 admin_id: ${admin_id}, has_mpin: ${has_mpin}`);

      if (admin_id) {
        // 🔥 Store pending MPIN login data (for current session)
        setPendingMpinLogin(admin_id, phone, has_mpin);
        // 🔥 Store saved admin ID (survives logout)
        setSavedAdminId(admin_id, phone, has_mpin);

        if (has_mpin === true) {
          console.log('➡️ User has MPIN → navigate to MPINVerification');
          (navigation as any).navigate('MPINVerification', { phone, adminId: admin_id });
        } else {
          console.log('➡️ User does NOT have MPIN → navigate to MPINSetup');
          (navigation as any).navigate('MPINSetup', { adminId: admin_id, phone });
        }
      } else {
        console.warn('⚠️ No admin_id in response');
        Alert.alert('Verification Failed', 'Invalid OTP or expired.');
      }
    } catch (error: any) {
      console.error('❌ Verification error:', error);

      const errorMsg = error.response?.data?.message || error.message || '';
      const isDuplicate = errorMsg.includes('already used') ||
                          errorMsg.includes('idempotency') ||
                          error.response?.status === 409;

      if (isDuplicate && initialAdminId) {
        console.log('🔄 OTP already used – using stored admin_id and has_mpin');
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
      setVerifyIdempotencyKey(generateUUID);
    }
  };

  const getOrCreateResendKey = () => {
    if (!resendKeyRef.current) resendKeyRef.current = generateUUID();
    return resendKeyRef.current;
  };
  const resetResendKey = () => { resendKeyRef.current = null; };

  const handleResendOTP = async () => {
    if (cooldownSeconds > 0) return;
    try {
      const idempotencyKey = getOrCreateResendKey();
      await sendOTP(phone, 'admin_login', deviceId, fingerprint, idempotencyKey);
      resetResendKey();
      Alert.alert('Success', 'OTP resent successfully.');
    } catch (error: any) {
      const hasRetryAfter = !!error.retryAfter;
      if (hasRetryAfter) {
        setCooldownSeconds(error.retryAfter);
        Alert.alert('Rate Limited', `Please wait ${error.retryAfter} seconds.`);
      } else {
        const msg = error.response?.data?.message || error.message || 'Failed to resend OTP.';
        Alert.alert('Error', msg);
      }
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
              <TouchableOpacity onPress={handleResendOTP} disabled={loading || cooldownSeconds > 0} style={styles.resendButton}>
                <Text style={[styles.resendButtonLabel, (loading || cooldownSeconds > 0) && styles.resendDisabled]}>
                  {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Resend'}
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
  SafeAreaView,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CountryPicker, CountryItem } from 'react-native-country-codes-picker';

import { initiateLogin, sendOTP } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useAuthStore } from '../../store/authStore';

// Simple UUID generator (v4)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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

  // --- IDEMPOTENCY KEY MANAGEMENT ---
  const idempotencyKeyRef = useRef<string | null>(null);

  const getOrCreateIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateUUID();
    }
    return idempotencyKeyRef.current;
  };

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = null;
  };
  // ----------------------------------

  // Countdown timer ref – fixed type to number
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
  // handleSendOTP with savedAdminId fallback
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
        resetIdempotencyKey();
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
          resetIdempotencyKey();
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
        const idempotencyKey = getOrCreateIdempotencyKey();
        await sendOTP(
          fullNumber,
          'admin_login',
          deviceId,
          fingerprint,
          idempotencyKey
        );
        // Success – reset key
        resetIdempotencyKey();
        Alert.alert('OTP Sent', `A verification code has been sent to ${fullNumber}`);
        // Pass along any admin_id we have (if any) to OTP screen; if not, it will be obtained from OTP verification
        (navigation as any).navigate('OTPVerification', {
          phone: fullNumber,
          adminId: responseAdminId || undefined,
          hasMpin: has_mpin ?? false,
          flowState: flow_state,
        });
      } else {
        // Fallback – should not happen
        Alert.alert('Unexpected Flow', message || 'Please contact support.');
        resetIdempotencyKey();
      }
    } catch (error: any) {
      // --- IDEMPOTENCY KEY DECISION ---
      const isNetworkError =
        error.message === 'Network Error' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK';

      const hasRetryAfter = !!error.retryAfter;

      if (isNetworkError || hasRetryAfter) {
        // Keep the key for retry
      } else {
        // Other errors (validation, 404, 500, etc.) – reset key
        resetIdempotencyKey();
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
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text>Name: {user?.name}</Text>
      <Text>Email: {user?.email}</Text>
      <Button title="Logout" onPress={logout} />
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

