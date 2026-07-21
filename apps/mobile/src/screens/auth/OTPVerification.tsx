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