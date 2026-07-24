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
      // 🔥 No idempotencyKey passed – service handles it
      const data = await verifyMPIN(phone, mpinCode, deviceId, fingerprint);

      console.log('📥 [MPINVerification] Response data:', data);

      const { admin, tokens } = data;

      console.log('👤 [MPINVerification] admin object:', admin);
      console.log('👤 [MPINVerification] admin.role:', admin.role);
      console.log('👤 [MPINVerification] admin.role_string:', admin.role_string);
      console.log('👤 [MPINVerification] admin.is_super_admin:', admin.is_super_admin);

      if (tokens?.access_token && admin) {
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
      // ❌ No manual key regeneration – service handles it
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