// apps/prayantra-b2b/src/screens/auth/PhoneInput.tsx
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

// ✅ Import user services and store
import { initiateUserLogin, sendUserOTP, getCompanyByEmployeePhone } from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';

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

  const [deviceId, setDeviceId] = useState<string>('');
  const [fingerprint, setFingerprint] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Destructure store actions
  const { 
    clearPendingMpinLogin, 
    savedUserId, 
    savedPhone,
    setCompanyId,
    setPendingMpinLogin,
    setSavedUserId,
  } = useUserAuthStore();

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

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number (at least 10 digits).');
      return;
    }
    const fullNumber = `+${callingCode}${cleaned}`;
    setLoading(true);
    clearPendingMpinLogin();

    try {
      const initiateResponse = await initiateUserLogin(fullNumber, deviceId, fingerprint);
      const {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        flow_state,
        user_id: responseUserId,
        message,
      } = initiateResponse.data;

      if (mpin_locked) {
        Alert.alert(
          'Account Locked',
          'Your MPIN is locked. Please contact support.'
        );
        setLoading(false);
        return;
      }

      // ✅ TRUSTED DEVICE FLOW – fetch companies and handle selection
      if (has_mpin && device_trusted) {
        let userId = responseUserId || null;
        if (!userId && savedPhone === fullNumber && savedUserId) {
          userId = savedUserId;
        }
        if (userId) {
          try {
            // Fetch companies for this user
            const companies = await getCompanyByEmployeePhone(fullNumber);
            if (!companies || companies.length === 0) {
              Alert.alert('No Company', 'You are not associated with any company. Please contact support.');
              setLoading(false);
              return;
            }

            // If only one company, auto-select and go directly to MPIN verification
            if (companies.length === 1) {
              const companyId = companies[0].company_id;
              setCompanyId(companyId);
              // Save pending and saved user info for later
              setPendingMpinLogin(userId, fullNumber, true);
              setSavedUserId(userId, fullNumber, true);
              (navigation as any).navigate('MPINVerification', {
                phone: fullNumber,
                userId,
                companyId,
              });
            } else {
              // Multiple companies – show selection screen
              setPendingMpinLogin(userId, fullNumber, true);
              setSavedUserId(userId, fullNumber, true);
              (navigation as any).navigate('CompanySelection', {
                userId,
                phone: fullNumber,
                hasMpin: true,
                from: 'verify',
              });
            }
            setLoading(false);
            return;
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load companies');
            setLoading(false);
            return;
          }
        } else {
          console.warn('No userId, falling back to OTP');
        }
      }

      // ✅ OTP FLOW – user exists but no MPIN, device not trusted, or no userId
      if (user_exists || !has_mpin || !device_trusted) {
        await sendUserOTP(fullNumber, deviceId, fingerprint);
        Alert.alert('OTP Sent', `A verification code has been sent to ${fullNumber}`);
        (navigation as any).navigate('OTPVerification', {
          phone: fullNumber,
          userId: responseUserId || undefined,
          hasMpin: has_mpin ?? false,
          flowState: flow_state,
        });
      } else {
        Alert.alert('Unexpected Flow', message || 'Please contact support.');
      }
    } catch (error: any) {
      const hasRetryAfter = !!error.retryAfter;
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
                User Login
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

// Styles unchanged
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