// apps/prayantra-b2b/src/screens/auth/PhoneInput.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard, Alert, TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { CountryPicker, CountryItem } from 'react-native-country-codes-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  initiateUserLogin,
  sendUserOTP,
  getCompanyByEmployeePhone,
} from '../../services/auth';
import { getDeviceId, getDeviceFingerprint } from '../../utils/device';
import { useUserAuthStore } from '../../store/userAuthStore';

// =========================================================
// LOG HELPER — tag everything so we can grep the console
// =========================================================
const LOG_TAG = '📞 [PhoneInput]';

const log = (...args: any[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(LOG_TAG, ...args);
  }
};

const warn = (...args: any[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(LOG_TAG, ...args);
  }
};

const error = (...args: any[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(LOG_TAG, ...args);
  }
};

const COLORS = {
  primary: '#7B2FBE',
  secondary: '#00B4DB',
  dark: '#172033',
  text: '#1E293B',
  secondaryText: '#64748B',
  muted: '#94A3B8',
  background: '#F7F9FC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  inputBackground: '#FFFFFF',
  success: '#10B981',
  danger: '#EF4444',
};

export default function PhoneInputScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    clearPendingMpinLogin,
    savedUserId,
    savedPhone,
    setCompanyId,
    setPendingMpinLogin,
    setSavedUserId,
  } = useUserAuthStore();

  // Keyboard listeners
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Device info
  useEffect(() => {
    const load = async () => {
      try {
        const id = await getDeviceId();
        const fp = await getDeviceFingerprint();
        setDeviceId(id);
        setFingerprint(fp);
        log('Device info loaded', {
          deviceId: id ? `${id.slice(0, 8)}…` : '(empty)',
          fingerprint: fp ? `${fp.slice(0, 8)}…` : '(empty)',
        });
      } catch (e) {
        error('Failed to load device information:', e);
      }
    };
    load();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Retry timer
  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRetryAfterSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [retryAfterSeconds]);

  const handleSendOTP = async () => {
    log('════════ handleSendOTP START ════════');

    Keyboard.dismiss();

    const cleaned = phone.replace(/[^0-9]/g, '');
    log('Raw phone:', phone, '→ cleaned:', cleaned);

    if (cleaned.length < 10) {
      warn('Phone too short — aborting');
      Alert.alert('Invalid Number', 'Please enter a valid phone number with at least 10 digits.');
      return;
    }

    const fullNumber = `+${callingCode}${cleaned}`;
    log('Full number:', fullNumber);
    log('Device state at send:', {
      deviceId: deviceId ? `${deviceId.slice(0, 8)}…` : '(EMPTY!)',
      fingerprint: fingerprint ? `${fingerprint.slice(0, 8)}…` : '(EMPTY!)',
    });

    setLoading(true);
    clearPendingMpinLogin();

    try {
      log('→ Calling initiateUserLogin…');
      const initiateResponse = await initiateUserLogin(fullNumber, deviceId, fingerprint);

      log('← initiateUserLogin RAW response:', JSON.stringify(initiateResponse, null, 2));

      const {
        user_exists, has_mpin, mpin_locked, device_trusted,
        flow_state, user_id: responseUserId, message,
      } = initiateResponse.data;

      log('← Decoded initiate data:', {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        flow_state,
        responseUserId,
        message,
      });

      // -------- Branch 1: locked --------
      if (mpin_locked) {
        log('🛑 BRANCH: mpin_locked → stopping');
        Alert.alert('Account Locked', 'Your MPIN is locked. Please contact support.');
        return;
      }

      // -------- Branch 2: trusted device + has MPIN --------
      const goesToMpinBranch = has_mpin && device_trusted;
      log('🔀 BRANCH CHECK: has_mpin && device_trusted =', goesToMpinBranch, {
        has_mpin,
        device_trusted,
      });

      if (goesToMpinBranch) {
        let userId = responseUserId || null;
        log('Branch 2 (trusted+mpin): userId from response =', userId);

        if (!userId && savedPhone === fullNumber && savedUserId) {
          userId = savedUserId;
          log('Branch 2: fell back to savedUserId =', userId);
        }

        log('Branch 2: final userId =', userId);

        if (userId) {
          try {
            log('→ Calling getCompanyByEmployeePhone…');
            const companies = await getCompanyByEmployeePhone(fullNumber);
            log('← Companies response:', JSON.stringify(companies, null, 2));
            log('← Companies count:', companies?.length ?? 0);

            if (!companies || companies.length === 0) {
              log('🛑 Branch 2: no companies → alert + stop');
              Alert.alert(
                'No Company Found',
                'You are not associated with any company. Please contact support.'
              );
              return;
            }

            log('Branch 2: persisting pending MPIN login state');
            setPendingMpinLogin(userId, fullNumber, true);
            setSavedUserId(userId, fullNumber, true);

            // -------- Single company → MPIN --------
            if (companies.length === 1) {
              const singleCompanyId = companies[0].company_id;
              log('➡️ ROUTING → MPINVerification (single company)', {
                userId,
                companyId: singleCompanyId,
              });

              setCompanyId(singleCompanyId);

              (navigation as any).navigate('MPINVerification', {
                phone: fullNumber,
                userId,
                companyId: singleCompanyId,
              });
              return;
            }

            // -------- Multiple companies → CompanySelection --------
            log('➡️ ROUTING → CompanySelection (multi company)', {
              userId,
              companyCount: companies.length,
            });

            (navigation as any).navigate('CompanySelection', {
              userId,
              phone: fullNumber,
              hasMpin: true,
              from: 'verify',
            });
            return;
          } catch (err: any) {
            error('❌ Branch 2: getCompanyByEmployeePhone threw:', err);
            Alert.alert(
              'Unable to Continue',
              err?.message || 'Failed to load your companies.'
            );
            return;
          }
        } else {
          warn('⚠️ Branch 2 entered but userId is null — falling through to OTP check');
        }
      }

      // -------- Branch 3: OTP flow --------
      const goesToOtp =
        user_exists || !has_mpin || !device_trusted;

      log('🔀 BRANCH CHECK: OTP flow condition =', goesToOtp, {
        user_exists,
        has_mpin,
        device_trusted,
        explanation: {
          'user_exists': user_exists,
          '!has_mpin': !has_mpin,
          '!device_trusted': !device_trusted,
        },
      });

      if (goesToOtp) {
        log('➡️ ROUTING → OTPVerification. Calling sendUserOTP…');
        await sendUserOTP(fullNumber, deviceId, fingerprint);
        log('← sendUserOTP resolved');

        Alert.alert('OTP Sent', `A verification code has been sent to ${fullNumber}`);

        (navigation as any).navigate('OTPVerification', {
          phone: fullNumber,
          userId: responseUserId || undefined,
          hasMpin: has_mpin ?? false,
          flowState: flow_state,
        });
        return;
      }

      // -------- Branch 4: fallthrough --------
      warn('🛑 BRANCH: Unexpected flow — no branch matched', {
        user_exists,
        has_mpin,
        device_trusted,
        mpin_locked,
        message,
      });
      Alert.alert('Unexpected Flow', message || 'Please contact support.');
    } catch (err: any) {
      error('❌ handleSendOTP threw:', err);
      error('❌ err.response?.data:', err?.response?.data);
      error('❌ err.message:', err?.message);

      const hasRetryAfter = !!err?.retryAfter;
      if (hasRetryAfter) {
        log('⏳ Rate limited — retry after', err.retryAfter);
        setRetryAfterSeconds(err.retryAfter);
        Alert.alert('Too Many Attempts', `Please wait ${err.retryAfter} seconds before trying again.`);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'An error occurred. Please try again.';
        Alert.alert('Unable to Continue', msg);
      }
    } finally {
      setLoading(false);
      log('════════ handleSendOTP END ════════');
    }
  };

  const clearPhone = () => { setPhone(''); inputRef.current?.focus(); };

  const onSelectCountry = (item: CountryItem) => {
    setCountryCode(item.code);
    setCallingCode(item.dial_code.replace('+', ''));
    setCountryPickerVisible(false);
  };

  const isButtonDisabled = loading || retryAfterSeconds > 0;
  const hasPhone = phone.length > 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: keyboardVisible
                  ? Math.max(insets.top + 20, 32)
                  : Math.max(insets.top, 12),
                paddingBottom: Math.max(insets.bottom + 25, 40),
                justifyContent: keyboardVisible ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.hero, keyboardVisible && styles.heroHidden]}>
              <LinearGradient
                colors={[COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Text style={styles.logoLetter}>P</Text>
              </LinearGradient>
              <Text style={styles.brandName}>Prayantra</Text>
              <Text style={styles.brandTagline}>Business Management</Text>
              <LinearGradient
                colors={[COLORS.secondary, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroLine}
              />
            </View>

            <View style={styles.loginCard}>
              <View style={styles.headingContainer}>
                <Text style={styles.heading}>Welcome back</Text>
                <Text style={styles.description}>
                  Sign in with your registered mobile number to continue.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Mobile Number</Text>

              <View style={[styles.phoneContainer, hasPhone && styles.phoneContainerActive]}>
                <TouchableOpacity
                  style={styles.countryPicker}
                  onPress={() => setCountryPickerVisible(true)}
                  activeOpacity={0.75}
                  disabled={loading}
                >
                  <View style={styles.countryIcon}>
                    <Icon name="earth" size={17} color={COLORS.primary} />
                  </View>
                  <Text style={styles.callingCode}>+{callingCode}</Text>
                  <Icon name="chevron-down" size={17} color={COLORS.muted} />
                </TouchableOpacity>

                <View style={styles.inputDivider} />

                <RNTextInput
                  ref={inputRef}
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#A8B0BC"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!loading}
                  selectionColor={COLORS.primary}
                  maxLength={15}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />

                {hasPhone && !loading && (
                  <TouchableOpacity onPress={clearPhone} style={styles.clearButton} activeOpacity={0.7}>
                    <View style={styles.clearCircle}>
                      <Icon name="close" size={13} color={COLORS.secondaryText} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.securityRow}>
                <View style={styles.securityIcon}>
                  <Icon name="shield-check-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.securityText}>
                  Your number is securely used for account verification.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={isButtonDisabled}
                activeOpacity={0.85}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.buttonGradient, isButtonDisabled && styles.buttonDisabled]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.buttonText}>Checking...</Text>
                    </>
                  ) : retryAfterSeconds > 0 ? (
                    <>
                      <Icon name="timer-outline" size={19} color="#FFFFFF" />
                      <Text style={styles.buttonText}>
                        Try again in {retryAfterSeconds}s
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Continue</Text>
                      <Icon name="arrow-right" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.otpInfo}>
                <Icon name="message-text-outline" size={15} color={COLORS.muted} />
                <Text style={styles.otpInfoText}>
                  We'll send a one-time verification code if required.
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerSecurity}>
                <Icon name="lock-outline" size={13} color={COLORS.muted} />
                <Text style={styles.footerSecurityText}>Secure sign-in</Text>
              </View>

              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text style={styles.footerLink}>Terms</Text> and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>

              <Text style={styles.version}>PRAYANTRA</Text>
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
            maxHeight: '82%',
            margin: 0,
            paddingTop: 8,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: COLORS.white,
            paddingBottom: Math.max(insets.bottom, 12),
          },
          textInput: {
            marginHorizontal: 16, marginTop: 8, marginBottom: 10,
            height: 48, backgroundColor: '#F5F7FA', borderRadius: 12,
            paddingHorizontal: 14, color: COLORS.text, fontSize: 14,
          },
          itemsList: { flex: 1, paddingHorizontal: 8 },
          countryButtonStyles: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
          line: { marginHorizontal: 16, backgroundColor: '#EEF1F5' },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },

  hero: { alignItems: 'center', marginBottom: 27, opacity: 1, maxHeight: 300, overflow: 'hidden' },
  heroHidden: { opacity: 0, maxHeight: 0, marginBottom: 0 },
  logo: {
    width: 66, height: 66, alignItems: 'center', justifyContent: 'center',
    borderRadius: 19, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22,
    shadowRadius: 13, elevation: 7,
  },
  logoLetter: { color: '#FFFFFF', fontSize: 31, fontWeight: '900' },
  brandName: { marginTop: 13, color: COLORS.dark, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  brandTagline: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  heroLine: { width: 44, height: 3, marginTop: 14, borderRadius: 3 },

  loginCard: {
    width: '100%', padding: 21, borderRadius: 20, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: '#E7EBF1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055, shadowRadius: 17, elevation: 3,
  },

  headingContainer: { marginBottom: 23 },
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  description: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11, lineHeight: 17, fontWeight: '500' },
  inputLabel: { marginBottom: 8, color: '#475569', fontSize: 11, fontWeight: '700' },

  phoneContainer: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 13,
    backgroundColor: COLORS.inputBackground, paddingHorizontal: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02, shadowRadius: 3, elevation: 1,
  },
  phoneContainerActive: {
    borderColor: `${COLORS.primary}55`, shadowColor: COLORS.primary,
    shadowOpacity: 0.07, shadowRadius: 6,
  },

  countryPicker: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderRadius: 10 },
  countryIcon: {
    width: 29, height: 29, alignItems: 'center', justifyContent: 'center',
    marginRight: 6, borderRadius: 8, backgroundColor: `${COLORS.primary}10`,
  },
  callingCode: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginRight: 2 },
  inputDivider: { width: 1, height: 28, marginHorizontal: 5, backgroundColor: '#E7EBF1' },

  phoneInput: {
    flex: 1, height: 54, paddingHorizontal: 7, paddingVertical: 0,
    color: COLORS.text, backgroundColor: 'transparent', fontSize: 16, fontWeight: '500',
  },

  clearButton: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  clearCircle: {
    width: 23, height: 23, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#F1F5F9',
  },

  securityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 2 },
  securityIcon: {
    width: 25, height: 25, alignItems: 'center', justifyContent: 'center',
    borderRadius: 7, backgroundColor: '#ECFDF5',
  },
  securityText: {
    flex: 1, marginLeft: 7, color: COLORS.secondaryText,
    fontSize: 9, lineHeight: 13, fontWeight: '500',
  },

  buttonWrapper: {
    marginTop: 21, borderRadius: 13, overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 4,
  },
  buttonGradient: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingHorizontal: 18,
  },
  buttonDisabled: { opacity: 0.58 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },

  otpInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  otpInfoText: { marginLeft: 5, color: COLORS.muted, fontSize: 9, fontWeight: '500', textAlign: 'center' },

  footer: { alignItems: 'center', marginTop: 25, paddingHorizontal: 12 },
  footerSecurity: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  footerSecurityText: { marginLeft: 4, color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  footerText: { color: '#A1AAB7', fontSize: 8.5, lineHeight: 14, textAlign: 'center' },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
  version: { marginTop: 12, color: '#CBD5E1', fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
});