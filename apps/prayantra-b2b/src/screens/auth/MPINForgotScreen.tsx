// apps/prayantra-b2b/src/screens/auth/MPINForgotScreen.tsx

import React, {
  useEffect,
  useMemo,
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
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {
  TextInput,
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  sendForgotMPINOTP,
  verifyForgotMPINOTP,
} from '../../services/auth';

import {
  getDeviceId,
  getDeviceFingerprint,
} from '../../utils/device';

import {
  useUserAuthStore,
} from '../../store/userAuthStore';


// =========================================================
// TYPES
// =========================================================

type PaperTextInput =
  React.ElementRef<typeof TextInput>;

type Step =
  | 'sendOtp'
  | 'verifyOtp';


// =========================================================
// COLORS
// =========================================================

const COLORS = {
  primary: '#7B2FBE',
  secondary: '#00B4DB',

  background: '#F7F8FC',
  card: '#FFFFFF',

  text: '#172033',
  secondaryText: '#64748B',
  muted: '#94A3B8',

  border: '#E4E8EF',

  success: '#16A34A',
  successBg: '#F0FDF4',

  danger: '#EF4444',
  dangerBg: '#FEF2F2',

  warning: '#F59E0B',
  warningBg: '#FFFBEB',
};


// =========================================================
// MPIN STRENGTH
// =========================================================

const isWeakMPIN = (
  mpin: string
): boolean => {
  if (mpin.length !== 6) {
    return true;
  }

  // Same digit
  if (/^(\d)\1{5}$/.test(mpin)) {
    return true;
  }

  const digits = mpin
    .split('')
    .map(Number);

  const asc = digits.every(
    (digit, index) =>
      index === 0 ||
      digit === digits[index - 1] + 1
  );

  const desc = digits.every(
    (digit, index) =>
      index === 0 ||
      digit === digits[index - 1] - 1
  );

  if (asc || desc) {
    return true;
  }

  const common = [
    '123456',
    '654321',
    '111111',
    '000000',
    '121212',
    '112233',
    '222222',
    '333333',
    '444444',
    '555555',
    '666666',
    '777777',
    '888888',
    '999999',
  ];

  return common.includes(mpin);
};


// =========================================================
// COMPONENT
// =========================================================

export default function MPINForgotScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { width } =
    useWindowDimensions();

  // -------------------------------------------------------
  // ROUTE / USER
  // -------------------------------------------------------

  const {
    phone: routePhone,
  } =
    (route.params as {
      phone: string;
    }) || {};

  const {
    pendingPhone,
    savedPhone,
  } =
    useUserAuthStore();

  const phone =
    routePhone ||
    pendingPhone ||
    savedPhone ||
    '';

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [step, setStep] =
    useState<Step>('sendOtp');

  const [otp, setOtp] =
    useState<string[]>(
      ['', '', '', '', '', '']
    );

  const [newMpin, setNewMpin] =
    useState<string[]>(
      ['', '', '', '', '', '']
    );

  const [loading, setLoading] =
    useState(false);

  const [cooldownSeconds, setCooldownSeconds] =
    useState(0);

  const [deviceId, setDeviceId] =
    useState('');

  const [fingerprint, setFingerprint] =
    useState('');

  // New: keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // -------------------------------------------------------
  // REFS
  // -------------------------------------------------------

  const otpInputRefs =
    useRef<
      Array<PaperTextInput | null>
    >([]);

  const mpinInputRefs =
    useRef<
      Array<PaperTextInput | null>
    >([]);

  const timerRef = useRef<number | null>(null);

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
  // RESPONSIVE INPUT SIZE
  // =======================================================

  const inputSize = useMemo(() => {
    const availableWidth =
      width - 48;

    const gap = 8;

    return Math.min(
      52,
      Math.floor(
        (availableWidth -
          gap * 5) /
          6
      )
    );
  }, [width]);


  // =======================================================
  // DEVICE INFO
  // =======================================================

  useEffect(() => {
    const loadDeviceInfo =
      async () => {
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
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }
    };
  }, []);


  // =======================================================
  // COOLDOWN TIMER
  // =======================================================

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }

      return;
    }

    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );
    }

    timerRef.current =
      setInterval(() => {
        setCooldownSeconds(
          previous => {
            if (previous <= 1) {
              if (
                timerRef.current
              ) {
                clearInterval(
                  timerRef.current
                );

                timerRef.current =
                  null;
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
  // PHONE DISPLAY
  // =======================================================

  const formattedPhone =
    phone.length > 4
      ? `•••• •••• ${phone.slice(-4)}`
      : phone;


  // =======================================================
  // MPIN STATE
  // =======================================================

  const mpinCode =
    newMpin.join('');

  const otpCode =
    otp.join('');

  const mpinComplete =
    mpinCode.length === 6;

  const mpinWeak =
    mpinComplete &&
    isWeakMPIN(mpinCode);


  // =======================================================
  // SEND OTP
  // =======================================================

  const handleSendOTP =
    async () => {
      if (!phone) {
        Alert.alert(
          'Phone number missing',
          'Please restart the process and try again.'
        );

        return;
      }

      if (
        !deviceId ||
        !fingerprint
      ) {
        Alert.alert(
          'Please wait',
          'Device information is still being prepared. Try again in a moment.'
        );

        return;
      }

      setLoading(true);

      try {
        await sendForgotMPINOTP(
          phone,
          deviceId,
          fingerprint
        );

        setStep('verifyOtp');

        // Start resend cooldown
        setCooldownSeconds(60);

        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 250);

      } catch (error: any) {
        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          'Failed to send OTP.';

        Alert.alert(
          'Unable to send OTP',
          message
        );
      } finally {
        setLoading(false);
      }
    };


  // =======================================================
  // RESEND OTP
  // =======================================================

  const handleResendOTP =
    async () => {
      if (
        cooldownSeconds > 0 ||
        loading
      ) {
        return;
      }

      if (!phone) {
        Alert.alert(
          'Phone number missing',
          'Please restart the process.'
        );

        return;
      }

      setLoading(true);

      try {
        await sendForgotMPINOTP(
          phone,
          deviceId,
          fingerprint
        );

        setCooldownSeconds(60);

        setOtp([
          '',
          '',
          '',
          '',
          '',
          '',
        ]);

        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);

        Alert.alert(
          'OTP Sent',
          'A new verification code has been sent to your phone.'
        );
      } catch (error: any) {
        const status =
          error?.response?.status;

        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          'Failed to resend OTP.';

        if (status === 429) {
          const retryAfter =
            Number(
              error?.response?.data
                ?.retry_after
            ) || 60;

          setCooldownSeconds(
            retryAfter
          );
        }

        Alert.alert(
          'Unable to resend OTP',
          message
        );
      } finally {
        setLoading(false);
      }
    };


  // =======================================================
  // VERIFY
  // =======================================================

  const handleVerify =
    async () => {
      const currentOtp =
        otp.join('');

      const currentMpin =
        newMpin.join('');

      if (
        currentOtp.length !== 6
      ) {
        Alert.alert(
          'Incomplete OTP',
          'Please enter all 6 digits of the verification code.'
        );

        return;
      }

      if (
        currentMpin.length !== 6
      ) {
        Alert.alert(
          'Incomplete MPIN',
          'Please enter all 6 digits for your new MPIN.'
        );

        return;
      }

      if (
        isWeakMPIN(currentMpin)
      ) {
        Alert.alert(
          'Choose a stronger MPIN',
          'Avoid repeated digits, sequential numbers, or commonly used patterns.'
        );

        return;
      }

      setLoading(true);

      try {
        await verifyForgotMPINOTP(
          phone,
          currentMpin,
          currentOtp,
          deviceId,
          fingerprint
        );

        Alert.alert(
          'MPIN Reset Successful',
          'Your MPIN has been changed successfully.',
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name:
                        'MPINVerification' as never,
                      params: {
                        phone,
                        userId: '',
                      } as never,
                    },
                  ],
                });
              },
            },
          ]
        );

      } catch (error: any) {
        const status =
          error?.response?.status;

        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          'Verification failed.';

        if (status === 429) {
          const retryAfter =
            Number(
              error?.response?.data
                ?.retry_after
            ) || 60;

          setCooldownSeconds(
            retryAfter
          );

          Alert.alert(
            'Too Many Attempts',
            `Please wait ${retryAfter} seconds before trying again.`
          );

          return;
        }

        if (
          message
            .toLowerCase()
            .includes('invalid otp')
        ) {
          Alert.alert(
            'Invalid OTP',
            'The verification code is incorrect or has expired.'
          );

          return;
        }

        if (
          message
            .toLowerCase()
            .includes('weak')
        ) {
          Alert.alert(
            'Weak MPIN',
            'Please choose a stronger MPIN.'
          );

          return;
        }

        Alert.alert(
          'Verification Failed',
          message
        );
      } finally {
        setLoading(false);
      }
    };


  // =======================================================
  // OTP CHANGE
  // =======================================================

  const handleOtpChange =
    (
      text: string,
      index: number
    ) => {
      const digits =
        text.replace(/\D/g, '');

      // Handle paste / autofill
      if (digits.length > 1) {
        const updated = [
          ...otp,
        ];

        const available =
          digits.slice(
            0,
            6 - index
          );

        available
          .split('')
          .forEach(
            (digit, offset) => {
              updated[
                index + offset
              ] = digit;
            }
          );

        setOtp(updated);

        const nextIndex = Math.min(
          index +
            available.length,
          5
        );

        if (
          available.length <
          6 - index
        ) {
          otpInputRefs.current[
            nextIndex
          ]?.focus();
        }

        return;
      }

      const updated = [
        ...otp,
      ];

      updated[index] =
        digits;

      setOtp(updated);

      if (
        digits.length === 1 &&
        index < 5
      ) {
        otpInputRefs.current[
          index + 1
        ]?.focus();
      }
    };


  // =======================================================
  // OTP BACKSPACE
  // =======================================================

  const handleOtpKeyPress =
    (
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
        const updated = [
          ...otp,
        ];

        updated[index] = '';

        setOtp(updated);

        return;
      }

      if (index > 0) {
        otpInputRefs.current[
          index - 1
        ]?.focus();

        const updated = [
          ...otp,
        ];

        updated[index - 1] = '';

        setOtp(updated);
      }
    };


  // =======================================================
  // MPIN CHANGE
  // =======================================================

  const handleMpinChange =
    (
      text: string,
      index: number
    ) => {
      const digits =
        text.replace(/\D/g, '');

      // Handle paste
      if (digits.length > 1) {
        const updated = [
          ...newMpin,
        ];

        const available =
          digits.slice(
            0,
            6 - index
          );

        available
          .split('')
          .forEach(
            (digit, offset) => {
              updated[
                index + offset
              ] = digit;
            }
          );

        setNewMpin(updated);

        const nextIndex = Math.min(
          index +
            available.length,
          5
        );

        if (
          available.length <
          6 - index
        ) {
          mpinInputRefs.current[
            nextIndex
          ]?.focus();
        }

        return;
      }

      const updated = [
        ...newMpin,
      ];

      updated[index] =
        digits;

      setNewMpin(updated);

      if (
        digits.length === 1 &&
        index < 5
      ) {
        mpinInputRefs.current[
          index + 1
        ]?.focus();
      }
    };


  // =======================================================
  // MPIN BACKSPACE
  // =======================================================

  const handleMpinKeyPress =
    (
      event: any,
      index: number
    ) => {
      if (
        event.nativeEvent.key !==
        'Backspace'
      ) {
        return;
      }

      if (newMpin[index]) {
        const updated = [
          ...newMpin,
        ];

        updated[index] = '';

        setNewMpin(updated);

        return;
      }

      if (index > 0) {
        mpinInputRefs.current[
          index - 1
        ]?.focus();

        const updated = [
          ...newMpin,
        ];

        updated[index - 1] = '';

        setNewMpin(updated);
      }
    };


  // =======================================================
  // GO BACK
  // =======================================================

  const goBack =
    () => {
      navigation.goBack();
    };


  // =======================================================
  // STEP
  // =======================================================

  const isOtpStep =
    step === 'verifyOtp';


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
                // Adjust top padding when keyboard is visible
                paddingTop: keyboardVisible ? 5 : 10,
                // Align content to top when keyboard is open
                justifyContent: keyboardVisible ? 'flex-start' : 'flex-start', // we keep flex-start always
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
            bounces={false}
          >

            {/* =================================================
                TOP BAR – always visible
            ================================================= */}

            <View style={styles.topBar}>

              <TouchableOpacity
                onPress={goBack}
                style={
                  styles.backIconButton
                }
                activeOpacity={0.7}
              >
                <Icon
                  name="arrow-left"
                  size={21}
                  color={
                    COLORS.text
                  }
                />
              </TouchableOpacity>

              <View
                style={
                  styles.brandMini
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
                    y: 1,
                  }}
                  style={
                    styles.brandMiniLogo
                  }
                >
                  <Text
                    style={
                      styles.brandMiniText
                    }
                  >
                    P
                  </Text>
                </LinearGradient>

                <Text
                  style={
                    styles.brandMiniName
                  }
                >
                  Prayantra
                </Text>
              </View>

              <View
                style={
                  styles.securityBadge
                }
              >
                <Icon
                  name="shield-check-outline"
                  size={15}
                  color={
                    COLORS.success
                  }
                />
              </View>

            </View>


            {/* =================================================
                HEADER – hides when keyboard appears
            ================================================= */}

            <View
              style={[
                styles.header,
                keyboardVisible && styles.headerHidden,
              ]}
            >

              <View
                style={
                  styles.headerIcon
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
                    y: 1,
                  }}
                  style={
                    styles.headerIconGradient
                  }
                >
                  <Icon
                    name="lock-reset"
                    size={30}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>

              <Text
                style={styles.title}
              >
                Forgot MPIN?
              </Text>

              <Text
                style={styles.subtitle}
              >
                {isOtpStep
                  ? 'Verify your identity and create a new secure MPIN.'
                  : 'We’ll send a verification code to your registered phone number.'}
              </Text>

            </View>


            {/* =================================================
                STEP INDICATOR – hides when keyboard appears
            ================================================= */}

            <View
              style={[
                styles.stepContainer,
                keyboardVisible && styles.stepContainerHidden,
              ]}
            >

              <View
                style={
                  styles.stepItem
                }
              >
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor:
                        COLORS.primary,
                    },
                  ]}
                >
                  {isOtpStep ? (
                    <Icon
                      name="check"
                      size={15}
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.stepNumberActive
                      }
                    >
                      1
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        COLORS.primary,
                    },
                  ]}
                >
                  Verify
                </Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      isOtpStep
                        ? COLORS.primary
                        : COLORS.border,
                  },
                ]}
              />

              <View
                style={
                  styles.stepItem
                }
              >
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor:
                        isOtpStep
                          ? COLORS.primary
                          : '#EEF1F5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color:
                          isOtpStep
                            ? '#FFFFFF'
                            : COLORS.muted,
                      },
                    ]}
                  >
                    2
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        isOtpStep
                          ? COLORS.primary
                          : COLORS.muted,
                    },
                  ]}
                >
                  New MPIN
                </Text>
              </View>

            </View>


            {/* =================================================
                CONTENT CARD – remains visible
            ================================================= */}

            <View
              style={
                styles.contentCard
              }
            >

              {!isOtpStep ? (
                <>
                  {/* SEND OTP */}

                  <View
                    style={
                      styles.sectionIcon
                    }
                  >
                    <Icon
                      name="cellphone-message"
                      size={23}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Verify your phone
                  </Text>

                  <Text
                    style={
                      styles.sectionDescription
                    }
                  >
                    We'll send a 6-digit
                    verification code to
                    your registered phone
                    number.
                  </Text>

                  {/* Phone */}

                  <View
                    style={
                      styles.phoneCard
                    }
                  >
                    <View
                      style={
                        styles.phoneIcon
                      }
                    >
                      <Icon
                        name="phone-outline"
                        size={19}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.phoneContent
                      }
                    >
                      <Text
                        style={
                          styles.phoneLabel
                        }
                      >
                        Registered number
                      </Text>

                      <Text
                        style={
                          styles.phoneNumber
                        }
                      >
                        {formattedPhone ||
                          'Phone number unavailable'}
                      </Text>
                    </View>

                    <Icon
                      name="check-circle"
                      size={19}
                      color={
                        COLORS.success
                      }
                    />
                  </View>

                  {/* Send */}

                  <TouchableOpacity
                    onPress={
                      handleSendOTP
                    }
                    disabled={
                      loading
                    }
                    activeOpacity={0.85}
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
                        styles.primaryButton,
                        loading &&
                          styles.buttonDisabled,
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                          size="small"
                        />
                      ) : (
                        <>
                          <Icon
                            name="send-outline"
                            size={19}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.buttonText
                            }
                          >
                            Send Verification Code
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* VERIFY */}

                  <View
                    style={
                      styles.sectionIcon
                    }
                  >
                    <Icon
                      name="shield-lock-outline"
                      size={23}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Verify & reset
                  </Text>

                  <Text
                    style={
                      styles.sectionDescription
                    }
                  >
                    Enter the verification
                    code and choose a new
                    6-digit MPIN.
                  </Text>

                  {/* OTP */}

                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Verification code
                  </Text>

                  <View
                    style={
                      styles.inputRow
                    }
                  >
                    {otp.map(
                      (
                        digit,
                        index
                      ) => (
                        <TextInput
                          key={index}
                          ref={(
                            ref:
                              PaperTextInput | null
                          ) => {
                            otpInputRefs.current[
                              index
                            ] = ref;
                          }}
                          mode="outlined"
                          value={digit}
                          onChangeText={(
                            text
                          ) =>
                            handleOtpChange(
                              text,
                              index
                            )
                          }
                          onKeyPress={(
                            event
                          ) =>
                            handleOtpKeyPress(
                              event,
                              index
                            )
                          }
                          keyboardType="number-pad"
                          maxLength={6}
                          style={[
                            styles.codeInput,
                            {
                              width:
                                inputSize,
                              height:
                                inputSize +
                                4,
                            },
                          ]}
                          outlineStyle={
                            styles.codeOutline
                          }
                          theme={{
                            roundness: 12,
                            colors: {
                              primary:
                                COLORS.primary,
                              outline:
                                COLORS.border,
                            },
                          }}
                          textAlign="center"
                          editable={
                            !loading
                          }
                          autoComplete={
                            index === 0
                              ? 'one-time-code'
                              : 'off'
                          }
                          selectTextOnFocus
                        />
                      )
                    )}
                  </View>

                  {/* Resend */}

                  <View
                    style={
                      styles.resendRow
                    }
                  >
                    <Text
                      style={
                        styles.resendText
                      }
                    >
                      Didn't receive the code?
                    </Text>

                    <TouchableOpacity
                      onPress={
                        handleResendOTP
                      }
                      disabled={
                        cooldownSeconds >
                          0 ||
                        loading
                      }
                    >
                      <Text
                        style={[
                          styles.resendButton,
                          {
                            color:
                              cooldownSeconds >
                              0
                                ? COLORS.muted
                                : COLORS.primary,
                          },
                        ]}
                      >
                        {cooldownSeconds >
                        0
                          ? `Resend in ${cooldownSeconds}s`
                          : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* MPIN */}

                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        marginTop: 25,
                      },
                    ]}
                  >
                    New MPIN
                  </Text>

                  <View
                    style={
                      styles.inputRow
                    }
                  >
                    {newMpin.map(
                      (
                        digit,
                        index
                      ) => (
                        <TextInput
                          key={index}
                          ref={(
                            ref:
                              PaperTextInput | null
                          ) => {
                            mpinInputRefs.current[
                              index
                            ] = ref;
                          }}
                          mode="outlined"
                          value={digit}
                          onChangeText={(
                            text
                          ) =>
                            handleMpinChange(
                              text,
                              index
                            )
                          }
                          onKeyPress={(
                            event
                          ) =>
                            handleMpinKeyPress(
                              event,
                              index
                            )
                          }
                          keyboardType="number-pad"
                          maxLength={6}
                          secureTextEntry
                          style={[
                            styles.codeInput,
                            {
                              width:
                                inputSize,
                              height:
                                inputSize +
                                4,
                            },
                          ]}
                          outlineStyle={
                            styles.codeOutline
                          }
                          theme={{
                            roundness: 12,
                            colors: {
                              primary:
                                COLORS.primary,
                              outline:
                                COLORS.border,
                            },
                          }}
                          textAlign="center"
                          editable={
                            !loading
                          }
                          selectTextOnFocus
                        />
                      )
                    )}
                  </View>

                  {/* MPIN strength */}

                  <View
                    style={
                      styles.mpinHint
                    }
                  >
                    <Icon
                      name={
                        !mpinComplete
                          ? 'information-outline'
                          : mpinWeak
                          ? 'alert-circle-outline'
                          : 'check-circle-outline'
                      }
                      size={16}
                      color={
                        !mpinComplete
                          ? COLORS.muted
                          : mpinWeak
                          ? COLORS.warning
                          : COLORS.success
                      }
                    />

                    <Text
                      style={[
                        styles.mpinHintText,
                        {
                          color:
                            !mpinComplete
                              ? COLORS.muted
                              : mpinWeak
                              ? COLORS.warning
                              : COLORS.success,
                        },
                      ]}
                    >
                      {!mpinComplete
                        ? 'Use a unique 6-digit MPIN'
                        : mpinWeak
                        ? 'This MPIN is too easy to guess'
                        : 'Strong MPIN'}
                    </Text>
                  </View>

                  {/* Reset */}

                  <TouchableOpacity
                    onPress={
                      handleVerify
                    }
                    disabled={
                      loading
                    }
                    activeOpacity={0.85}
                    style={[
                      styles.buttonWrapper,
                      {
                        marginTop: 22,
                      },
                    ]}
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
                        styles.primaryButton,
                        loading &&
                          styles.buttonDisabled,
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                          size="small"
                        />
                      ) : (
                        <>
                          <Icon
                            name="lock-reset"
                            size={20}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.buttonText
                            }
                          >
                            Reset MPIN
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

            </View>


            {/* =================================================
                SECURITY MESSAGE
            ================================================= */}

            <View
              style={
                styles.securityMessage
              }
            >
              <Icon
                name="shield-check-outline"
                size={17}
                color={
                  COLORS.success
                }
              />

              <Text
                style={
                  styles.securityText
                }
              >
                Your account security is
                protected with device
                verification.
              </Text>
            </View>


            {/* =================================================
                CANCEL / BACK
            ================================================= */}

            <TouchableOpacity
              onPress={
                isOtpStep
                  ? () => {
                      setStep(
                        'sendOtp'
                      );

                      setOtp([
                        '',
                        '',
                        '',
                        '',
                        '',
                        '',
                      ]);
                    }
                  : goBack
              }
              style={
                styles.cancelButton
              }
              activeOpacity={0.7}
            >
              <Icon
                name="arrow-left"
                size={17}
                color={
                  COLORS.secondaryText
                }
              />

              <Text
                style={
                  styles.cancelText
                }
              >
                {isOtpStep
                  ? 'Back to previous step'
                  : 'Cancel'}
              </Text>
            </TouchableOpacity>

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
    backgroundColor:
      COLORS.background,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 24,
    // paddingTop is now dynamic via inline style
    paddingBottom: 35,

    justifyContent: 'flex-start', // always align to top
  },


  // =======================================================
  // TOP BAR
  // =======================================================

  topBar: {
    height: 48,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  backIconButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      COLORS.card,

    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  brandMini: {
    flexDirection: 'row',
    alignItems: 'center',

    position: 'absolute',
    left: 0,
    right: 0,

    justifyContent: 'center',

    pointerEvents: 'none',
  },

  brandMiniLogo: {
    width: 28,
    height: 28,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 8,
  },

  brandMiniText: {
    color: '#FFFFFF',

    fontSize: 14,
    fontWeight: '800',
  },

  brandMiniName: {
    marginLeft: 7,

    color: COLORS.text,

    fontSize: 14,
    fontWeight: '700',
  },

  securityBadge: {
    width: 32,
    height: 32,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      COLORS.successBg,
  },


  // =======================================================
  // HEADER
  // =======================================================

  header: {
    alignItems: 'center',

    paddingTop: 25,
    paddingBottom: 23,

    // Transition for hiding
    opacity: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },

  headerHidden: {
    opacity: 0,
    maxHeight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },

  headerIcon: {
    width: 66,
    height: 66,

    borderRadius: 19,

    overflow: 'hidden',

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 5,
  },

  headerIconGradient: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 17,

    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '800',

    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 330,

    marginTop: 7,

    color:
      COLORS.secondaryText,

    fontSize: 12,

    lineHeight: 18,

    textAlign: 'center',

    fontWeight: '500',
  },


  // =======================================================
  // STEPS
  // =======================================================

  stepContainer: {
    width: '72%',

    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 22,

    // Transition for hiding
    opacity: 1,
    maxHeight: 80,
    overflow: 'hidden',
  },

  stepContainerHidden: {
    opacity: 0,
    maxHeight: 0,
    marginBottom: 0,
  },

  stepItem: {
    alignItems: 'center',

    minWidth: 45,
  },

  stepCircle: {
    width: 28,
    height: 28,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 14,
  },

  stepNumberActive: {
    color: '#FFFFFF',

    fontSize: 11,
    fontWeight: '800',
  },

  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
  },

  stepLabel: {
    marginTop: 5,

    fontSize: 9,

    fontWeight: '700',
  },

  stepLine: {
    flex: 1,

    height: 2,

    marginHorizontal: 7,

    marginBottom: 17,
  },


  // =======================================================
  // CONTENT CARD
  // =======================================================

  contentCard: {
    padding: 20,

    borderRadius: 20,

    backgroundColor:
      COLORS.card,

    borderWidth: 1,
    borderColor:
      COLORS.border,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.045,
    shadowRadius: 14,

    elevation: 2,
  },

  sectionIcon: {
    width: 44,
    height: 44,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      `${COLORS.primary}12`,
  },

  sectionTitle: {
    marginTop: 14,

    color: COLORS.text,

    fontSize: 19,

    fontWeight: '700',

    letterSpacing: -0.2,
  },

  sectionDescription: {
    marginTop: 6,

    color:
      COLORS.secondaryText,

    fontSize: 11,

    lineHeight: 17,

    fontWeight: '500',
  },


  // =======================================================
  // PHONE CARD
  // =======================================================

  phoneCard: {
    marginTop: 20,

    minHeight: 68,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 13,

    backgroundColor:
      '#F8F9FC',

    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  phoneIcon: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      `${COLORS.primary}12`,
  },

  phoneContent: {
    flex: 1,

    marginLeft: 10,
  },

  phoneLabel: {
    color: COLORS.muted,

    fontSize: 9,

    fontWeight: '600',
  },

  phoneNumber: {
    marginTop: 3,

    color: COLORS.text,

    fontSize: 14,

    fontWeight: '700',

    letterSpacing: 0.4,
  },


  // =======================================================
  // FIELD
  // =======================================================

  fieldLabel: {
    marginTop: 22,
    marginBottom: 10,

    color: COLORS.text,

    fontSize: 11,

    fontWeight: '700',
  },


  // =======================================================
  // OTP / MPIN
  // =======================================================

  inputRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    width: '100%',
  },

  codeInput: {
    paddingHorizontal: 0,

    backgroundColor:
      COLORS.card,

    fontSize: 18,

    fontWeight: '700',
  },

  codeOutline: {
    borderRadius: 12,

    borderWidth: 1.3,
  },


  // =======================================================
  // RESEND
  // =======================================================

  resendRow: {
    marginTop: 11,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  resendText: {
    color:
      COLORS.secondaryText,

    fontSize: 10,

    fontWeight: '500',
  },

  resendButton: {
    fontSize: 10,

    fontWeight: '700',
  },


  // =======================================================
  // MPIN HINT
  // =======================================================

  mpinHint: {
    marginTop: 10,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor:
      '#F8F9FC',
  },

  mpinHintText: {
    marginLeft: 6,

    fontSize: 9,

    fontWeight: '600',
  },


  // =======================================================
  // BUTTON
  // =======================================================

  buttonWrapper: {
    marginTop: 25,

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.16,
    shadowRadius: 9,

    elevation: 3,
  },

  primaryButton: {
    minHeight: 54,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 18,

    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.62,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '700',

    letterSpacing: 0.1,
  },


  // =======================================================
  // SECURITY
  // =======================================================

  securityMessage: {
    marginTop: 17,

    paddingHorizontal: 12,
    paddingVertical: 10,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 11,

    backgroundColor:
      COLORS.successBg,

    borderWidth: 1,
    borderColor:
      '#DCFCE7',
  },

  securityText: {
    flex: 1,

    marginLeft: 7,

    color: '#166534',

    fontSize: 9,

    lineHeight: 14,

    fontWeight: '500',
  },


  // =======================================================
  // CANCEL
  // =======================================================

  cancelButton: {
    alignSelf: 'center',

    marginTop: 20,

    paddingVertical: 8,
    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,
  },

  cancelText: {
    color:
      COLORS.secondaryText,

    fontSize: 11,

    fontWeight: '600',
  },


});