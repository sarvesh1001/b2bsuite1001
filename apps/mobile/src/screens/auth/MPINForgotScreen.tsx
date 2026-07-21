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