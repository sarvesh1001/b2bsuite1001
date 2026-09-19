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
      // setupMPIN now handles idempotency internally – no key needed
      await setupMPIN(adminId, mpinCode, deviceId, fingerprint);

      // MPIN set successfully – navigate to verification
      Alert.alert('Success', 'MPIN has been set. Please log in with your MPIN.');
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
      // No need to regenerate key – service manages it internally
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