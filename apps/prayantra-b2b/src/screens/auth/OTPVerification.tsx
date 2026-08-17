// apps/prayantra-b2b/src/screens/auth/OTPVerification.tsx

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
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  TextInput,
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// =========================================================
// SERVICES
// =========================================================

import {
  verifyUserOTP,
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

import {
  RootStackParamList,
} from '../../navigation';

// =========================================================
// TYPES
// =========================================================

type PaperTextInput =
  React.ElementRef<typeof TextInput>;

type OTPVerificationScreenNavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'OTPVerification'
  >;

type OTPVerificationScreenRouteProp =
  RouteProp<
    RootStackParamList,
    'OTPVerification'
  >;

// =========================================================
// CONSTANTS
// =========================================================

const PRIMARY = '#7B2FBE';
const CYAN = '#00B4DB';

const BACKGROUND = '#F7F9FC';
const CARD = '#FFFFFF';

const TEXT_PRIMARY = '#172033';
const TEXT_SECONDARY = '#64748B';
const TEXT_MUTED = '#94A3B8';

const BORDER = '#E5EAF1';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

// =========================================================
// SCREEN
// =========================================================

export default function OTPVerificationScreen() {

  // =======================================================
  // STATE
  // =======================================================

  const [otp, setOtp] = useState<string[]>(
    Array(OTP_LENGTH).fill('')
  );

  const [loading, setLoading] =
    useState(false);

  const [resendLoading, setResendLoading] =
    useState(false);

  const [cooldownSeconds, setCooldownSeconds] =
    useState(0);

  const [deviceId, setDeviceId] =
    useState('');

  const [fingerprint, setFingerprint] =
    useState('');

  // New state for keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // =======================================================
  // NAVIGATION
  // =======================================================

  const navigation =
    useNavigation<OTPVerificationScreenNavigationProp>();

  const route =
    useRoute<OTPVerificationScreenRouteProp>();

  const {
    phone,
  } = route.params;

  // =======================================================
  // REFS
  // =======================================================

  const inputRefs =
    useRef<Array<PaperTextInput | null>>([]);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  // =======================================================
  // STORE
  // =======================================================

  const {
    setPendingMpinLogin,
    setSavedUserId,
    setCompanyId,
  } = useUserAuthStore.getState();

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

    const focusTimer =
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 350);

    return () => {
      clearTimeout(focusTimer);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

  }, []);

  // =======================================================
  // RESEND COUNTDOWN
  // =======================================================

  useEffect(() => {

    if (cooldownSeconds <= 0) {

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    timerRef.current =
      setInterval(() => {

        setCooldownSeconds(
          previous => {

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

  }, [cooldownSeconds]);

  // =======================================================
  // OTP CHANGE
  // =======================================================

  const handleOTPChange = (
    text: string,
    index: number
  ) => {

    // Remove non-numeric characters
    const cleaned =
      text.replace(/\D/g, '');

    // -----------------------------------------------------
    // Full OTP paste
    // -----------------------------------------------------

    if (cleaned.length >= OTP_LENGTH) {

      const pastedOTP =
        cleaned
          .slice(0, OTP_LENGTH)
          .split('');

      setOtp(pastedOTP);

      inputRefs.current[
        OTP_LENGTH - 1
      ]?.focus();

      return;
    }

    // -----------------------------------------------------
    // Normal single digit
    // -----------------------------------------------------

    const digit =
      cleaned.slice(-1);

    const nextOTP =
      [...otp];

    nextOTP[index] =
      digit;

    setOtp(nextOTP);

    if (
      digit &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  // =======================================================
  // BACKSPACE
  // =======================================================

  const handleKeyPress = (
    event: any,
    index: number
  ) => {

    if (
      event.nativeEvent.key !==
      'Backspace'
    ) {
      return;
    }

    if (otp[index]) {

      const nextOTP =
        [...otp];

      nextOTP[index] =
        '';

      setOtp(nextOTP);

      return;
    }

    if (index > 0) {

      const nextOTP =
        [...otp];

      nextOTP[index - 1] =
        '';

      setOtp(nextOTP);

      inputRefs.current[
        index - 1
      ]?.focus();
    }
  };

  // =======================================================
  // VERIFY OTP
  // =======================================================

  const handleVerifyOTP = async () => {

    if (loading) {
      return;
    }

    const otpCode =
      otp.join('');

    // -----------------------------------------------------
    // Validation
    // -----------------------------------------------------

    if (
      otpCode.length !==
      OTP_LENGTH
    ) {

      Alert.alert(
        'Incomplete OTP',
        'Please enter the complete 6-digit verification code.'
      );

      return;
    }

    if (
      !deviceId ||
      !fingerprint
    ) {

      Alert.alert(
        'Please wait',
        'Preparing secure device verification. Try again in a moment.'
      );

      return;
    }

    // -----------------------------------------------------
    // Start verification
    // -----------------------------------------------------

    Keyboard.dismiss();

    setLoading(true);

    try {

      // ===================================================
      // VERIFY OTP
      // ===================================================

      const verifyData =
        await verifyUserOTP(
          phone,
          otpCode,
          deviceId,
          fingerprint
        );

      const {
        user_id,
        has_mpin,
      } =
        verifyData.data;

      if (!user_id) {

        Alert.alert(
          'Verification Failed',
          'The OTP is invalid or has expired.'
        );

        return;
      }

      // ===================================================
      // FETCH COMPANIES
      // ===================================================

      const companies =
        await getCompanyByEmployeePhone(
          phone
        );

      if (
        !companies ||
        companies.length === 0
      ) {

        Alert.alert(
          'No Company Found',
          'Your account is not currently associated with any company.'
        );

        return;
      }

      // ===================================================
      // SAVE AUTH STATE
      // ===================================================

      setPendingMpinLogin(
        user_id,
        phone,
        has_mpin
      );

      setSavedUserId(
        user_id,
        phone,
        has_mpin
      );

      console.log(
        'OTP verification success:',
        {
          user_id,
          has_mpin,
        }
      );

      console.log(
        'Companies:',
        companies
      );

      // ===================================================
      // SINGLE COMPANY
      // ===================================================

      if (companies.length === 1) {

        const companyId =
          companies[0].company_id;

        setCompanyId(
          companyId
        );

        // Small delay to allow
        // Zustand state to settle.

        setTimeout(() => {

          if (has_mpin === true) {

            navigation.replace(
              'MPINVerification',
              {
                phone,
                userId: user_id,
                companyId,
              }
            );

          } else {

            navigation.replace(
              'MPINSetup',
              {
                userId: user_id,
                phone,
                companyId,
              }
            );

          }

        }, 150);

        return;
      }

      // ===================================================
      // MULTIPLE COMPANIES
      // ===================================================

      setTimeout(() => {

        navigation.replace(
          'CompanySelection',
          {
            userId: user_id,
            phone,
            hasMpin: has_mpin,
            from:
              has_mpin
                ? 'verify'
                : 'setup',
          }
        );

      }, 150);

    } catch (error: any) {

      console.error(
        'OTP verification error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Verification failed. Please try again.';

      Alert.alert(
        'Verification Failed',
        message
      );

    } finally {

      setLoading(false);
    }
  };

  // =======================================================
  // RESEND OTP
  // =======================================================

  const handleResendOTP = async () => {

    if (
      resendLoading ||
      loading ||
      cooldownSeconds > 0
    ) {
      return;
    }

    if (
      !deviceId ||
      !fingerprint
    ) {

      Alert.alert(
        'Please wait',
        'Preparing secure device verification.'
      );

      return;
    }

    setResendLoading(true);

    try {

      await sendUserOTP(
        phone,
        deviceId,
        fingerprint
      );

      // Clear previous OTP

      setOtp(
        Array(OTP_LENGTH).fill('')
      );

      inputRefs.current[0]?.focus();

      // Start cooldown

      setCooldownSeconds(
        RESEND_COOLDOWN
      );

    } catch (error: any) {

      console.error(
        'Resend OTP error:',
        error
      );

      const retryAfter =
        error?.retryAfter;

      if (
        retryAfter &&
        Number(retryAfter) > 0
      ) {

        setCooldownSeconds(
          Number(retryAfter)
        );

        Alert.alert(
          'Too Many Requests',
          `Please wait ${retryAfter} seconds before requesting another OTP.`
        );

      } else {

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to resend OTP. Please try again.';

        Alert.alert(
          'Unable to Resend',
          message
        );
      }

    } finally {

      setResendLoading(false);
    }
  };

  // =======================================================
  // OTP COMPLETE?
  // =======================================================

  const isOTPComplete =
    otp.every(
      digit => digit.length === 1
    );

  // =======================================================
  // MASK PHONE
  // =======================================================

  const maskedPhone =
    phone.length > 6
      ? `${phone.slice(0, 3)}****${phone.slice(-3)}`
      : phone;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <SafeAreaView
      edges={[
        'top',
        'bottom',
      ]}
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
          onPress={Keyboard.dismiss}
        >

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                // Dynamic top padding: increase when keyboard visible
                paddingTop: keyboardVisible ? 20 : 18,
                // Align content: center when no keyboard, flex-start when visible
                justifyContent: keyboardVisible ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >

            {/* =================================================
                BRAND HEADER – hides when keyboard appears
            ================================================= */}

            <LinearGradient
              colors={[
                CYAN,
                PRIMARY,
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={[
                styles.brandHeader,
                keyboardVisible && styles.brandHeaderHidden,
              ]}
            >

              <View style={styles.brandLogo}>
                <Text
                  style={
                    styles.brandLogoText
                  }
                >
                  P
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.brandName
                  }
                >
                  Prayantra
                </Text>

                <Text
                  style={
                    styles.brandSubtitle
                  }
                >
                  Business Management
                </Text>
              </View>

            </LinearGradient>

            {/* =================================================
                MAIN CARD
            ================================================= */}

            <View style={styles.card}>

              {/* =================================================
                  ICON
              ================================================= */}

              <View
                style={
                  styles.verificationIcon
                }
              >
                <LinearGradient
                  colors={[
                    '#E8F9FD',
                    '#F2E9FA',
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={
                    styles.verificationIconGradient
                  }
                >
                  <Icon
                    name="shield-key-outline"
                    size={30}
                    color={PRIMARY}
                  />
                </LinearGradient>
              </View>

              {/* =================================================
                  TITLE
              ================================================= */}

              <Text
                style={styles.title}
              >
                Verify your phone
              </Text>

              <Text
                style={styles.subtitle}
              >
                Enter the 6-digit code we sent to
              </Text>

              <View
                style={
                  styles.phoneContainer
                }
              >
                <Icon
                  name="phone-outline"
                  size={15}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.phoneText
                  }
                >
                  {maskedPhone}
                </Text>
              </View>

              {/* =================================================
                  OTP BOXES
              ================================================= */}

              <View
                style={
                  styles.otpContainer
                }
              >

                {otp.map(
                  (digit, index) => {

                    const isActive =
                      index ===
                      otp.findIndex(
                        value =>
                          !value
                      );

                    const isFilled =
                      digit.length > 0;

                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBoxWrapper,
                          isActive &&
                            !loading &&
                            styles.otpBoxActive,
                          isFilled &&
                            styles.otpBoxFilled,
                        ]}
                      >

                        <TextInput
                          ref={(
                            ref: PaperTextInput | null
                          ) => {
                            inputRefs.current[
                              index
                            ] = ref;
                          }}
                          mode="flat"
                          value={digit}
                          onChangeText={text =>
                            handleOTPChange(
                              text,
                              index
                            )
                          }
                          onKeyPress={event =>
                            handleKeyPress(
                              event,
                              index
                            )
                          }
                          keyboardType={
                            Platform.OS === 'ios'
                              ? 'number-pad'
                              : 'numeric'
                          }
                          maxLength={
                            OTP_LENGTH
                          }
                          style={
                            styles.otpInput
                          }
                          contentStyle={
                            styles.otpContent
                          }
                          underlineColor="transparent"
                          activeUnderlineColor="transparent"
                          cursorColor={PRIMARY}
                          textColor={
                            TEXT_PRIMARY
                          }
                          selectionColor={
                            PRIMARY
                          }
                          editable={
                            !loading
                          }
                          autoComplete="sms-otp"
                          textContentType="oneTimeCode"
                          theme={{
                            colors: {
                              background:
                                'transparent',
                            },
                          }}
                        />

                      </View>
                    );
                  }
                )}

              </View>

              {/* =================================================
                  STATUS
              ================================================= */}

              <View
                style={
                  styles.statusContainer
                }
              >

                {isOTPComplete ? (
                  <>
                    <Icon
                      name="check-circle-outline"
                      size={15}
                      color="#10B981"
                    />

                    <Text
                      style={
                        styles.completeText
                      }
                    >
                      Code entered
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon
                      name="information-outline"
                      size={15}
                      color={TEXT_MUTED}
                    />

                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      Enter all 6 digits
                    </Text>
                  </>
                )}

              </View>

              {/* =================================================
                  VERIFY BUTTON
              ================================================= */}

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={
                  loading ||
                  !isOTPComplete
                }
                onPress={
                  handleVerifyOTP
                }
                style={
                  styles.buttonWrapper
                }
              >

                <LinearGradient
                  colors={[
                    CYAN,
                    PRIMARY,
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
                    styles.verifyButton,
                    (!isOTPComplete ||
                      loading) &&
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
                        Verifying...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.buttonText
                        }
                      >
                        Verify & Continue
                      </Text>

                      <Icon
                        name="arrow-right"
                        size={19}
                        color="#FFFFFF"
                      />
                    </>
                  )}

                </LinearGradient>

              </TouchableOpacity>

              {/* =================================================
                  RESEND
              ================================================= */}

              <View
                style={
                  styles.resendSection
                }
              >

                <Text
                  style={
                    styles.resendQuestion
                  }
                >
                  Didn't receive the code?
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={
                    handleResendOTP
                  }
                  disabled={
                    resendLoading ||
                    loading ||
                    cooldownSeconds > 0
                  }
                  style={
                    styles.resendButton
                  }
                >

                  {resendLoading ? (

                    <View
                      style={
                        styles.resendLoading
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color={PRIMARY}
                      />

                      <Text
                        style={
                          styles.resendLabel
                        }
                      >
                        Sending...
                      </Text>
                    </View>

                  ) : cooldownSeconds > 0 ? (

                    <View
                      style={
                        styles.resendLoading
                      }
                    >

                      <Icon
                        name="timer-outline"
                        size={16}
                        color={TEXT_MUTED}
                      />

                      <Text
                        style={
                          styles.resendDisabled
                        }
                      >
                        Resend in{' '}
                        {cooldownSeconds}s
                      </Text>

                    </View>

                  ) : (

                    <Text
                      style={
                        styles.resendLabel
                      }
                    >
                      Resend code
                    </Text>

                  )}

                </TouchableOpacity>

              </View>

            </View>

            {/* =================================================
                SECURITY NOTE
            ================================================= */}

            <View
              style={
                styles.securityNote
              }
            >

              <Icon
                name="shield-check-outline"
                size={16}
                color="#94A3B8"
              />

              <Text
                style={
                  styles.securityText
                }
              >
                Your verification is securely protected
              </Text>

            </View>

            <Text
              style={
                styles.footerText
              }
            >
              Prayantra • Secure Business Management
            </Text>

          </ScrollView>

        </TouchableWithoutFeedback>

      </KeyboardAvoidingView>

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
    backgroundColor: BACKGROUND,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 20,
    // paddingTop and justifyContent are set dynamically via inline style
    paddingBottom: 35,

    alignItems: 'center',
  },

  // =======================================================
  // BRAND
  // =======================================================

  brandHeader: {
    width: '100%',
    maxWidth: 430,

    minHeight: 67,

    paddingHorizontal: 17,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 17,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 4,

    // Transition for hiding
    opacity: 1,
    maxHeight: 100,
    marginBottom: 18,
  },

  brandHeaderHidden: {
    opacity: 0,
    maxHeight: 0,
    marginBottom: 0,
    minHeight: 0,
    paddingHorizontal: 0,
    shadowOpacity: 0,
    elevation: 0,
  },

  brandLogo: {
    width: 39,
    height: 39,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.17)',

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.25)',
  },

  brandLogoText: {
    color: '#FFFFFF',

    fontSize: 19,
    fontWeight: '800',
  },

  brandName: {
    marginLeft: 10,

    color: '#FFFFFF',

    fontSize: 17,
    fontWeight: '800',
  },

  brandSubtitle: {
    marginLeft: 10,
    marginTop: 2,

    color:
      'rgba(255,255,255,0.68)',

    fontSize: 9,
    fontWeight: '500',
  },

  // =======================================================
  // MAIN CARD
  // =======================================================

  card: {
    width: '100%',
    maxWidth: 430,

    marginTop: 18,

    paddingHorizontal: 20,
    paddingTop: 27,
    paddingBottom: 25,

    alignItems: 'center',

    borderRadius: 21,

    backgroundColor: CARD,

    borderWidth: 1,
    borderColor: BORDER,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.045,
    shadowRadius: 15,

    elevation: 2,
  },

  // =======================================================
  // VERIFICATION ICON
  // =======================================================

  verificationIcon: {
    width: 66,
    height: 66,

    borderRadius: 19,

    overflow: 'hidden',
  },

  verificationIconGradient: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
    borderColor:
      'rgba(123,47,190,0.10)',
  },

  // =======================================================
  // TITLE
  // =======================================================

  title: {
    marginTop: 20,

    color: TEXT_PRIMARY,

    fontSize: 25,
    lineHeight: 31,

    fontWeight: '700',

    letterSpacing: -0.5,

    textAlign: 'center',
  },

  subtitle: {
    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',

    fontWeight: '500',
  },

  // =======================================================
  // PHONE
  // =======================================================

  phoneContainer: {
    marginTop: 8,

    paddingHorizontal: 10,
    paddingVertical: 6,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 8,

    backgroundColor:
      `${PRIMARY}08`,
  },

  phoneText: {
    marginLeft: 5,

    color: PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // OTP
  // =======================================================

  otpContainer: {
    width: '100%',

    marginTop: 28,

    flexDirection: 'row',

    justifyContent:
      'space-between',
  },

  otpBoxWrapper: {
    width: 43,
    height: 54,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',

    borderWidth: 1.5,
    borderColor: '#E2E8F0',

    overflow: 'hidden',
  },

  otpBoxActive: {
    borderColor: PRIMARY,

    backgroundColor:
      `${PRIMARY}05`,

    shadowColor: PRIMARY,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,

    elevation: 1,
  },

  otpBoxFilled: {
    borderColor:
      `${PRIMARY}55`,

    backgroundColor:
      `${PRIMARY}07`,
  },

  otpInput: {
    width: '100%',
    height: '100%',

    paddingHorizontal: 0,
    paddingVertical: 0,

    margin: 0,

    backgroundColor:
      'transparent',
  },

  otpContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 21,
    fontWeight: '700',

    textAlign: 'center',
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusContainer: {
    minHeight: 20,

    marginTop: 10,

    flexDirection: 'row',
    alignItems: 'center',
  },

  statusText: {
    marginLeft: 5,

    color: TEXT_MUTED,

    fontSize: 9,

    fontWeight: '500',
  },

  completeText: {
    marginLeft: 5,

    color: '#10B981',

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // VERIFY BUTTON
  // =======================================================

  buttonWrapper: {
    width: '100%',

    marginTop: 18,

    borderRadius: 12,

    overflow: 'hidden',
  },

  verifyButton: {
    minHeight: 53,

    paddingHorizontal: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.48,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

    letterSpacing: 0.15,
  },

  // =======================================================
  // RESEND
  // =======================================================

  resendSection: {
    marginTop: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    flexWrap: 'wrap',
  },

  resendQuestion: {
    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  resendButton: {
    marginLeft: 5,

    paddingVertical: 4,
  },

  resendLabel: {
    color: PRIMARY,

    fontSize: 10,

    fontWeight: '700',
  },

  resendDisabled: {
    marginLeft: 4,

    color: TEXT_MUTED,

    fontSize: 10,

    fontWeight: '600',
  },

  resendLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // =======================================================
  // SECURITY
  // =======================================================

  securityNote: {
    marginTop: 19,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'center',

    opacity: 0.85,
  },

  securityText: {
    marginLeft: 5,

    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
  },

  footerText: {
    marginTop: 9,

    color: '#B0B8C4',

    fontSize: 8,

    fontWeight: '500',

    textAlign: 'center',
  },

});