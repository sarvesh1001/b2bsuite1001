// apps/prayantra-b2b/src/screens/auth/PhoneInput.tsx

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  CountryPicker,
  CountryItem,
} from 'react-native-country-codes-picker';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// =========================================================
// SERVICES
// =========================================================

import {
  initiateUserLogin,
  sendUserOTP,
  getCompanyByEmployeePhone,
} from '../../services/auth';

import {
  getDeviceId,
  getDeviceFingerprint,
} from '../../utils/device';

import {
  useUserAuthStore,
} from '../../store/userAuthStore';

// =========================================================
// COLORS
// =========================================================

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

// =========================================================
// SCREEN
// =========================================================

export default function PhoneInputScreen() {
  // -------------------------------------------------------
  // State
  // -------------------------------------------------------

  const [phone, setPhone] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [countryCode, setCountryCode] =
    useState<string>('IN');

  const [callingCode, setCallingCode] =
    useState('91');

  const [countryPickerVisible, setCountryPickerVisible] =
    useState(false);

  const [retryAfterSeconds, setRetryAfterSeconds] =
    useState(0);

  const [deviceId, setDeviceId] =
    useState('');

  const [fingerprint, setFingerprint] =
    useState('');

  // New state to track keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // -------------------------------------------------------
  // Navigation / Insets
  // -------------------------------------------------------

  const navigation = useNavigation();

  const insets = useSafeAreaInsets();

  const inputRef =
    useRef<RNTextInput>(null);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  // -------------------------------------------------------
  // Store
  // -------------------------------------------------------

  const {
    clearPendingMpinLogin,

    savedUserId,

    savedPhone,

    setCompanyId,

    setPendingMpinLogin,

    setSavedUserId,
  } = useUserAuthStore();

  // =======================================================
  // KEYBOARD LISTENERS
  // =======================================================

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // =======================================================
  // DEVICE INFORMATION
  // =======================================================

  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const id =
          await getDeviceId();

        const fp =
          await getDeviceFingerprint();

        setDeviceId(id);
        setFingerprint(fp);
      } catch (error) {
        console.error(
          'Failed to load device information:',
          error
        );
      }
    };

    loadDeviceInfo();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // =======================================================
  // RETRY TIMER
  // =======================================================

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current =
      setInterval(() => {
        setRetryAfterSeconds(
          (previous) => {
            if (previous <= 1) {
              if (timerRef.current) {
                clearInterval(
                  timerRef.current
                );

                timerRef.current = null;
              }

              return 0;
            }

            return previous - 1;
          }
        );
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }
    };
  }, [retryAfterSeconds]);

  // =======================================================
  // SEND OTP / LOGIN
  // =======================================================

  const handleSendOTP = async () => {
    Keyboard.dismiss();

    const cleaned =
      phone.replace(
        /[^0-9]/g,
        ''
      );

    if (cleaned.length < 10) {
      Alert.alert(
        'Invalid Number',
        'Please enter a valid phone number with at least 10 digits.'
      );

      return;
    }

    const fullNumber =
      `+${callingCode}${cleaned}`;

    setLoading(true);

    clearPendingMpinLogin();

    try {
      // ---------------------------------------------------
      // INITIATE LOGIN
      // ---------------------------------------------------

      const initiateResponse =
        await initiateUserLogin(
          fullNumber,
          deviceId,
          fingerprint
        );

      const {
        user_exists,
        has_mpin,
        mpin_locked,
        device_trusted,
        flow_state,
        user_id: responseUserId,
        message,
      } =
        initiateResponse.data;

      // ---------------------------------------------------
      // MPIN LOCKED
      // ---------------------------------------------------

      if (mpin_locked) {
        Alert.alert(
          'Account Locked',
          'Your MPIN is locked. Please contact support.'
        );

        return;
      }

      // ---------------------------------------------------
      // TRUSTED DEVICE + MPIN
      // ---------------------------------------------------

      if (
        has_mpin &&
        device_trusted
      ) {
        let userId =
          responseUserId || null;

        if (
          !userId &&
          savedPhone === fullNumber &&
          savedUserId
        ) {
          userId =
            savedUserId;
        }

        if (userId) {
          try {
            const companies =
              await getCompanyByEmployeePhone(
                fullNumber
              );

            // No company
            if (
              !companies ||
              companies.length === 0
            ) {
              Alert.alert(
                'No Company Found',
                'You are not associated with any company. Please contact support.'
              );

              return;
            }

            // ------------------------------------------------
            // SINGLE COMPANY
            // ------------------------------------------------

            if (
              companies.length === 1
            ) {
              const companyId =
                companies[0].company_id;

              setCompanyId(
                companyId
              );

              setPendingMpinLogin(
                userId,
                fullNumber,
                true
              );

              setSavedUserId(
                userId,
                fullNumber,
                true
              );

              (
                navigation as any
              ).navigate(
                'MPINVerification',
                {
                  phone: fullNumber,
                  userId,
                  companyId,
                }
              );
            }

            // ------------------------------------------------
            // MULTIPLE COMPANIES
            // ------------------------------------------------

            else {
              setPendingMpinLogin(
                userId,
                fullNumber,
                true
              );

              setSavedUserId(
                userId,
                fullNumber,
                true
              );

              (
                navigation as any
              ).navigate(
                'CompanySelection',
                {
                  userId,
                  phone: fullNumber,
                  hasMpin: true,
                  from: 'verify',
                }
              );
            }

            return;
          } catch (error: any) {
            Alert.alert(
              'Unable to Continue',
              error?.message ||
                'Failed to load your companies.'
            );

            return;
          }
        }
      }

      // ---------------------------------------------------
      // OTP FLOW
      // ---------------------------------------------------

      if (
        user_exists ||
        !has_mpin ||
        !device_trusted
      ) {
        await sendUserOTP(
          fullNumber,
          deviceId,
          fingerprint
        );

        Alert.alert(
          'OTP Sent',
          `A verification code has been sent to ${fullNumber}`
        );

        (
          navigation as any
        ).navigate(
          'OTPVerification',
          {
            phone: fullNumber,
            userId:
              responseUserId ||
              undefined,
            hasMpin:
              has_mpin ?? false,
            flowState:
              flow_state,
          }
        );
      } else {
        Alert.alert(
          'Unexpected Flow',
          message ||
            'Please contact support.'
        );
      }
    } catch (error: any) {
      // ---------------------------------------------------
      // RATE LIMIT
      // ---------------------------------------------------

      const hasRetryAfter =
        !!error?.retryAfter;

      if (hasRetryAfter) {
        setRetryAfterSeconds(
          error.retryAfter
        );

        Alert.alert(
          'Too Many Attempts',
          `Please wait ${error.retryAfter} seconds before trying again.`
        );
      } else {
        const msg =
          error?.response?.data
            ?.message ||
          error?.message ||
          'An error occurred. Please try again.';

        Alert.alert(
          'Unable to Continue',
          msg
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // CLEAR PHONE
  // =======================================================

  const clearPhone = () => {
    setPhone('');

    inputRef.current?.focus();
  };

  // =======================================================
  // COUNTRY
  // =======================================================

  const onSelectCountry = (
    item: CountryItem
  ) => {
    setCountryCode(
      item.code
    );

    setCallingCode(
      item.dial_code.replace(
        '+',
        ''
      )
    );

    setCountryPickerVisible(
      false
    );
  };

  // =======================================================
  // BUTTON STATE
  // =======================================================

  const isButtonDisabled =
    loading ||
    retryAfterSeconds > 0;

  // =======================================================
  // FORMATTED PHONE DISPLAY
  // =======================================================

  const hasPhone =
    phone.length > 0;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 10
            : 0
        }
      >
        <TouchableWithoutFeedback
          onPress={
            Keyboard.dismiss
          }
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                // Only one paddingTop – computed conditionally
                paddingTop: keyboardVisible
                  ? Math.max(insets.top + 20, 32)
                  : Math.max(insets.top, 12),
                paddingBottom:
                  Math.max(
                    insets.bottom + 25,
                    40
                  ),
                // Align content: center when no keyboard, flex-start when visible
                justifyContent: keyboardVisible ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
            bounces={false}
          >

            {/* =================================================
                BRAND / HERO – hides when keyboard appears
            ================================================= */}

            <View
              style={[
                styles.hero,
                keyboardVisible && styles.heroHidden,
              ]}
            >

              {/* Logo */}

              <LinearGradient
                colors={[
                  COLORS.secondary,
                  COLORS.primary,
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={styles.logo}
              >
                <Text
                  style={
                    styles.logoLetter
                  }
                >
                  P
                </Text>
              </LinearGradient>

              {/* Brand */}

              <Text
                style={styles.brandName}
              >
                Prayantra
              </Text>

              <Text
                style={styles.brandTagline}
              >
                Business Management
              </Text>

              {/* Decorative line */}

              <LinearGradient
                colors={[
                  COLORS.secondary,
                  COLORS.primary,
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 0,
                }}
                style={
                  styles.heroLine
                }
              />

            </View>

            {/* =================================================
                LOGIN CARD
            ================================================= */}

            <View
              style={styles.loginCard}
            >

              {/* Heading */}

              <View
                style={
                  styles.headingContainer
                }
              >
                <Text
                  style={
                    styles.heading
                  }
                >
                  Welcome back
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Sign in with your registered
                  mobile number to continue.
                </Text>
              </View>

              {/* =================================================
                  PHONE LABEL
              ================================================= */}

              <Text
                style={styles.inputLabel}
              >
                Mobile Number
              </Text>

              {/* =================================================
                  PHONE INPUT
              ================================================= */}

              <View
                style={[
                  styles.phoneContainer,
                  hasPhone &&
                    styles.phoneContainerActive,
                ]}
              >

                {/* Country */}

                <TouchableOpacity
                  style={
                    styles.countryPicker
                  }
                  onPress={() =>
                    setCountryPickerVisible(
                      true
                    )
                  }
                  activeOpacity={0.75}
                  disabled={loading}
                >

                  <View
                    style={
                      styles.countryIcon
                    }
                  >
                    <Icon
                      name="earth"
                      size={17}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.callingCode
                    }
                  >
                    +{callingCode}
                  </Text>

                  <Icon
                    name="chevron-down"
                    size={17}
                    color={
                      COLORS.muted
                    }
                  />

                </TouchableOpacity>

                {/* Divider */}

                <View
                  style={
                    styles.inputDivider
                  }
                />

                {/* Input */}

                <RNTextInput
                  ref={inputRef}
                  style={
                    styles.phoneInput
                  }
                  placeholder="Enter mobile number"
                  placeholderTextColor={
                    '#A8B0BC'
                  }
                  value={phone}
                  onChangeText={
                    setPhone
                  }
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!loading}
                  selectionColor={
                    COLORS.primary
                  }
                  maxLength={15}
                  returnKeyType="done"
                  onSubmitEditing={
                    handleSendOTP
                  }
                />

                {/* Clear */}

                {hasPhone &&
                  !loading && (
                    <TouchableOpacity
                      onPress={
                        clearPhone
                      }
                      style={
                        styles.clearButton
                      }
                      activeOpacity={
                        0.7
                      }
                    >
                      <View
                        style={
                          styles.clearCircle
                        }
                      >
                        <Icon
                          name="close"
                          size={13}
                          color={
                            COLORS.secondaryText
                          }
                        />
                      </View>
                    </TouchableOpacity>
                  )}

              </View>

              {/* =================================================
                  SECURITY MESSAGE
              ================================================= */}

              <View
                style={
                  styles.securityRow
                }
              >

                <View
                  style={
                    styles.securityIcon
                  }
                >
                  <Icon
                    name="shield-check-outline"
                    size={16}
                    color={
                      COLORS.success
                    }
                  />
                </View>

                <Text
                  style={
                    styles.securityText
                  }
                >
                  Your number is securely used for
                  account verification.
                </Text>

              </View>

              {/* =================================================
                  SEND OTP
              ================================================= */}

              <TouchableOpacity
                onPress={
                  handleSendOTP
                }
                disabled={
                  isButtonDisabled
                }
                activeOpacity={
                  0.85
                }
                style={
                  styles.buttonWrapper
                }
              >

                <LinearGradient
                  colors={[
                    COLORS.secondary,
                    COLORS.primary,
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 0,
                  }}
                  style={[
                    styles.buttonGradient,
                    isButtonDisabled &&
                      styles.buttonDisabled,
                  ]}
                >

                  {loading ? (
                    <>
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />

                      <Text
                        style={
                          styles.buttonText
                        }
                      >
                        Checking...
                      </Text>
                    </>
                  ) : retryAfterSeconds >
                    0 ? (
                    <>

                      <Icon
                        name="timer-outline"
                        size={19}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.buttonText
                        }
                      >
                        Try again in{' '}
                        {
                          retryAfterSeconds
                        }
                        s
                      </Text>

                    </>
                  ) : (
                    <>

                      <Text
                        style={
                          styles.buttonText
                        }
                      >
                        Continue
                      </Text>

                      <Icon
                        name="arrow-right"
                        size={20}
                        color="#FFFFFF"
                      />

                    </>
                  )}

                </LinearGradient>

              </TouchableOpacity>

              {/* =================================================
                  OTP INFO
              ================================================= */}

              <View
                style={
                  styles.otpInfo
                }
              >

                <Icon
                  name="message-text-outline"
                  size={15}
                  color={
                    COLORS.muted
                  }
                />

                <Text
                  style={
                    styles.otpInfoText
                  }
                >
                  We'll send a one-time verification
                  code if required.
                </Text>

              </View>

            </View>

            {/* =================================================
                FOOTER
            ================================================= */}

            <View
              style={styles.footer}
            >

              <View
                style={
                  styles.footerSecurity
                }
              >
                <Icon
                  name="lock-outline"
                  size={13}
                  color={
                    COLORS.muted
                  }
                />

                <Text
                  style={
                    styles.footerSecurityText
                  }
                >
                  Secure sign-in
                </Text>
              </View>

              <Text
                style={
                  styles.footerText
                }
              >
                By continuing, you agree to our
                {' '}
                <Text
                  style={
                    styles.footerLink
                  }
                >
                  Terms
                </Text>
                {' '}and{' '}
                <Text
                  style={
                    styles.footerLink
                  }
                >
                  Privacy Policy
                </Text>
              </Text>

              <Text
                style={
                  styles.version
                }
              >
                PRAYANTRA
              </Text>

            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* =====================================================
          COUNTRY PICKER
      ===================================================== */}

      <CountryPicker
        show={
          countryPickerVisible
        }
        pickerButtonOnPress={
          onSelectCountry
        }
        onBackdropPress={() =>
          setCountryPickerVisible(
            false
          )
        }
        onRequestClose={() =>
          setCountryPickerVisible(
            false
          )
        }
        lang="en"

        style={{
          modal: {
            flex: 1,

            maxHeight: '82%',

            margin: 0,

            paddingTop: 8,

            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,

            backgroundColor:
              COLORS.white,

            paddingBottom:
              Math.max(
                insets.bottom,
                12
              ),
          },

          textInput: {
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 10,

            height: 48,

            backgroundColor:
              '#F5F7FA',

            borderRadius: 12,

            paddingHorizontal: 14,

            color:
              COLORS.text,

            fontSize: 14,
          },

          itemsList: {
            flex: 1,

            paddingHorizontal: 8,
          },

          countryButtonStyles: {
            paddingVertical: 12,
            paddingHorizontal: 12,

            borderRadius: 10,
          },

          line: {
            marginHorizontal: 16,

            backgroundColor:
              '#EEF1F5',
          },
        }}
      />

    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // PAGE
  // =======================================================

  safeArea: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 20,

    // justifyContent is now dynamic via inline style
  },

  // =======================================================
  // HERO
  // =======================================================

  hero: {
    alignItems: 'center',

    marginBottom: 27,

    // Transition for hiding
    opacity: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },

  heroHidden: {
    opacity: 0,
    maxHeight: 0,
    marginBottom: 0,
  },

  logo: {
    width: 66,
    height: 66,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.22,

    shadowRadius: 13,

    elevation: 7,
  },

  logoLetter: {
    color: '#FFFFFF',

    fontSize: 31,

    fontWeight: '900',
  },

  brandName: {
    marginTop: 13,

    color: COLORS.dark,

    fontSize: 25,

    fontWeight: '800',

    letterSpacing: -0.5,
  },

  brandTagline: {
    marginTop: 3,

    color:
      COLORS.secondaryText,

    fontSize: 10,

    fontWeight: '600',

    letterSpacing: 0.2,
  },

  heroLine: {
    width: 44,
    height: 3,

    marginTop: 14,

    borderRadius: 3,
  },

  // =======================================================
  // LOGIN CARD
  // =======================================================

  loginCard: {
    width: '100%',

    padding: 21,

    borderRadius: 20,

    backgroundColor:
      COLORS.white,

    borderWidth: 1,

    borderColor:
      '#E7EBF1',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.055,

    shadowRadius: 17,

    elevation: 3,
  },

  // =======================================================
  // HEADING
  // =======================================================

  headingContainer: {
    marginBottom: 23,
  },

  heading: {
    color: COLORS.text,

    fontSize: 22,

    fontWeight: '700',

    letterSpacing: -0.3,
  },

  description: {
    marginTop: 6,

    color:
      COLORS.secondaryText,

    fontSize: 11,

    lineHeight: 17,

    fontWeight: '500',
  },

  // =======================================================
  // LABEL
  // =======================================================

  inputLabel: {
    marginBottom: 8,

    color: '#475569',

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // PHONE INPUT
  // =======================================================

  phoneContainer: {
    height: 58,

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,

    borderColor:
      COLORS.border,

    borderRadius: 13,

    backgroundColor:
      COLORS.inputBackground,

    paddingHorizontal: 5,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.02,

    shadowRadius: 3,

    elevation: 1,
  },

  phoneContainerActive: {
    borderColor:
      `${COLORS.primary}55`,

    shadowColor:
      COLORS.primary,

    shadowOpacity: 0.07,

    shadowRadius: 6,
  },

  // =======================================================
  // COUNTRY
  // =======================================================

  countryPicker: {
    height: 48,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 8,

    borderRadius: 10,
  },

  countryIcon: {
    width: 29,
    height: 29,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 6,

    borderRadius: 8,

    backgroundColor:
      `${COLORS.primary}10`,
  },

  callingCode: {
    color: COLORS.text,

    fontSize: 14,

    fontWeight: '700',

    marginRight: 2,
  },

  inputDivider: {
    width: 1,

    height: 28,

    marginHorizontal: 5,

    backgroundColor:
      '#E7EBF1',
  },

  // =======================================================
  // INPUT
  // =======================================================

  phoneInput: {
    flex: 1,

    height: 54,

    paddingHorizontal: 7,

    paddingVertical: 0,

    color: COLORS.text,

    backgroundColor:
      'transparent',

    fontSize: 16,

    fontWeight: '500',
  },

  // =======================================================
  // CLEAR
  // =======================================================

  clearButton: {
    width: 40,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',
  },

  clearCircle: {
    width: 23,
    height: 23,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      '#F1F5F9',
  },

  // =======================================================
  // SECURITY
  // =======================================================

  securityRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 12,

    paddingHorizontal: 2,
  },

  securityIcon: {
    width: 25,
    height: 25,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 7,

    backgroundColor:
      '#ECFDF5',
  },

  securityText: {
    flex: 1,

    marginLeft: 7,

    color:
      COLORS.secondaryText,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  // =======================================================
  // BUTTON
  // =======================================================

  buttonWrapper: {
    marginTop: 21,

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.18,

    shadowRadius: 10,

    elevation: 4,
  },

  buttonGradient: {
    minHeight: 54,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,

    paddingHorizontal: 18,
  },

  buttonDisabled: {
    opacity: 0.58,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

    letterSpacing: 0.1,
  },

  // =======================================================
  // OTP INFO
  // =======================================================

  otpInfo: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 15,
  },

  otpInfoText: {
    marginLeft: 5,

    color: COLORS.muted,

    fontSize: 9,

    fontWeight: '500',

    textAlign: 'center',
  },

  // =======================================================
  // FOOTER
  // =======================================================

  footer: {
    alignItems: 'center',

    marginTop: 25,

    paddingHorizontal: 12,
  },

  footerSecurity: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 8,
  },

  footerSecurityText: {
    marginLeft: 4,

    color: COLORS.muted,

    fontSize: 9,

    fontWeight: '600',
  },

  footerText: {
    color: '#A1AAB7',

    fontSize: 8.5,

    lineHeight: 14,

    textAlign: 'center',
  },

  footerLink: {
    color:
      COLORS.primary,

    fontWeight: '600',
  },

  version: {
    marginTop: 12,

    color: '#CBD5E1',

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 1.3,
  },
});