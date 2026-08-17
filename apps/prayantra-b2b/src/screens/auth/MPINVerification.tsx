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
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
  CommonActions,
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

import {
  verifyUserMPIN,
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

import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  BACKGROUND_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type PaperTextInput =
  React.ElementRef<typeof TextInput>;

type MPINVerificationScreenNavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'MPINVerification'
  >;

type MPINVerificationScreenRouteProp =
  RouteProp<
    RootStackParamList,
    'MPINVerification'
  >;

// =========================================================
// CONSTANTS
// =========================================================

const MPIN_LENGTH = 6;

// =========================================================
// SCREEN
// =========================================================

export default function MPINVerificationScreen() {
  const navigation =
    useNavigation<MPINVerificationScreenNavigationProp>();

  const route =
    useRoute<MPINVerificationScreenRouteProp>();

  const { width } = useWindowDimensions();

  // =======================================================
  // STATE
  // =======================================================

  const [mpin, setMpin] = useState<string[]>(
    Array(MPIN_LENGTH).fill('')
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

  // =======================================================
  // AUTH STORE
  // =======================================================

  const {
    pendingUserId,
    pendingPhone,
    savedUserId,
    savedPhone,
    clearPendingMpinLogin,
    clearSavedUserId,
    login,
    companyId: storeCompanyId,
  } = useUserAuthStore();

  // =======================================================
  // ROUTE DATA
  // =======================================================

  const routeParams = route.params;

  const phone =
    routeParams?.phone ??
    pendingPhone ??
    savedPhone ??
    '';

  const userId =
    routeParams?.userId ??
    pendingUserId ??
    savedUserId ??
    '';

  const companyId =
    routeParams?.companyId ??
    storeCompanyId ??
    undefined;

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
  // RESPONSIVE MPIN SIZE
  // =======================================================

  const horizontalPadding = 24;

  const boxGap = width < 360 ? 7 : 9;

  const mpinBoxWidth = Math.min(
    54,
    Math.max(
      42,
      (
        width -
        horizontalPadding * 2 -
        boxGap * (MPIN_LENGTH - 1)
      ) / MPIN_LENGTH
    )
  );

  // =======================================================
  // DEVICE INFORMATION
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const loadDeviceInfo = async () => {
      try {
        const [
          id,
          fp,
        ] = await Promise.all([
          getDeviceId(),
          getDeviceFingerprint(),
        ]);

        if (!mounted) {
          return;
        }

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

    const focusTimer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 350);

    return () => {
      mounted = false;

      clearTimeout(focusTimer);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // =======================================================
  // COOLDOWN TIMER
  // =======================================================

  useEffect(() => {
    if (cooldownSeconds <= 0) {
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
        setCooldownSeconds((previous) => {
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
        });
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldownSeconds]);

  // =======================================================
  // MPIN CHANGE — FIXED
  // =======================================================

  const handleMpinChange = (value: string, index: number) => {
    if (loading || cooldownSeconds > 0) return;

    const numericValue = value.replace(/[^0-9]/g, '');
    const oldDigit = mpin[index] || '';

    // ----- CASE: multi‑character input -----
    if (numericValue.length > 1) {
      // If the new value is exactly the old digit + one extra digit,
      // then the user is typing, not pasting.
      if (
        oldDigit &&
        numericValue.startsWith(oldDigit) &&
        numericValue.length === oldDigit.length + 1
      ) {
        // Typing – take only the newly added digit
        const newDigit = numericValue.slice(-1);
        const nextMpin = [...mpin];
        nextMpin[index] = newDigit;
        setMpin(nextMpin);

        if (newDigit && index < MPIN_LENGTH - 1) {
          inputRefs.current[index + 1]?.focus();
        }
        return;
      }

      // Otherwise it's a genuine paste – distribute the digits
      const pastedDigits = numericValue.slice(0, MPIN_LENGTH).split('');
      const nextMpin = Array(MPIN_LENGTH).fill('');
      pastedDigits.forEach((digit, offset) => {
        if (index + offset < MPIN_LENGTH) {
          nextMpin[index + offset] = digit;
        }
      });
      setMpin(nextMpin);

      const nextIndex = Math.min(index + pastedDigits.length, MPIN_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // ----- CASE: single digit or empty -----
    const nextMpin = [...mpin];
    nextMpin[index] = numericValue.slice(0, 1);
    setMpin(nextMpin);

    if (numericValue && index < MPIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // =======================================================
  // KEYBOARD HANDLING
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

    if (mpin[index]) {
      const nextMpin = [...mpin];

      nextMpin[index] = '';

      setMpin(nextMpin);

      return;
    }

    if (index > 0) {
      const nextMpin = [...mpin];

      nextMpin[index - 1] = '';

      setMpin(nextMpin);

      inputRefs.current[
        index - 1
      ]?.focus();
    }
  };

  // =======================================================
  // VERIFY
  // =======================================================

  const handleVerifyMPIN = async () => {
    if (loading) {
      return;
    }

    // --- Guard: company is required ---
    if (!companyId) {
      Alert.alert(
        'Company Required',
        'Please select a company before verifying your MPIN.',
        [
          { text: 'Select Company', onPress: handleSwitchCompany },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const mpinCode =
      mpin.join('');

    if (
      mpinCode.length !==
      MPIN_LENGTH
    ) {
      Alert.alert(
        'Incomplete MPIN',
        'Please enter all 6 digits of your MPIN.'
      );

      return;
    }

    if (cooldownSeconds > 0) {
      Alert.alert(
        'Please Wait',
        `Try again in ${cooldownSeconds} seconds.`
      );

      return;
    }

    if (!phone) {
      Alert.alert(
        'Phone Number Missing',
        'Your phone number could not be found. Please restart the login process.'
      );

      return;
    }

    if (!deviceId || !fingerprint) {
      Alert.alert(
        'Device Information',
        'We are still preparing your device information. Please try again in a moment.'
      );

      return;
    }

    Keyboard.dismiss();

    setLoading(true);

    try {
      console.log(
        '🔐 [MPINVerification] Verifying MPIN for phone:',
        phone
      );

      // ✅ FIXED: remove 'mobile' argument – pass 5 args
      const responseData =
        await verifyUserMPIN(
          phone,
          mpinCode,
          deviceId,
          fingerprint,
          companyId
        );

      const {
        user_id,
        company_id,
        company_name,
        tokens,
        phone: userPhone,
        company_context,
      } = responseData.data;

      const permissions =
        company_context?.permissions ||
        [];

      if (
        tokens?.access_token &&
        user_id
      ) {
        const user = {
          user_id,
          phone:
            userPhone || phone,
          company_id,
          company_name,
        };

        console.log(
          '🧑‍💼 [MPINVerification] User object built:',
          user
        );

        console.log(
          '🔑 [MPINVerification] Permissions count:',
          permissions.length
        );

        clearPendingMpinLogin();

        login(
          tokens.access_token,
          tokens.refresh_token,
          user,
          deviceId,
          company_id,
          permissions
        );

        navigation.dispatch(
          CommonActions.reset({
            index: 0,

            routes: [
              {
                name: 'Main',
              },
            ],
          })
        );

        return;
      }

      console.warn(
        '⚠️ [MPINVerification] Missing tokens or user_id'
      );

      Alert.alert(
        'Login Error',
        'Login succeeded but the required session information is missing. Please try again.'
      );
    } catch (error: any) {
      console.error(
        '❌ [MPINVerification] Verification error:',
        error
      );

      const status =
        error?.response?.status;

      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Verification failed.';

      const normalizedMessage =
        String(msg).toLowerCase();

      // -----------------------------------------------
      // Rate limited
      // -----------------------------------------------

      if (status === 429) {
        const retryAfter =
          Number(
            error?.response?.data
              ?.retry_after
          ) || 60;

        setCooldownSeconds(
          retryAfter
        );

        setMpin(
          Array(MPIN_LENGTH).fill('')
        );

        inputRefs.current[0]?.focus();

        Alert.alert(
          'Too Many Attempts',
          `For your security, please wait ${retryAfter} seconds before trying again.`
        );

        return;
      }

      // -----------------------------------------------
      // Invalid MPIN
      // -----------------------------------------------

      if (status === 401) {
        setMpin(
          Array(MPIN_LENGTH).fill('')
        );

        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);

        Alert.alert(
          'Incorrect MPIN',
          'The MPIN you entered is incorrect. Please try again.'
        );

        return;
      }

      // -----------------------------------------------
      // User not found
      // -----------------------------------------------

      if (
        status === 400 &&
        normalizedMessage.includes(
          'user not found'
        )
      ) {
        Alert.alert(
          'Account Not Found',
          'We could not find your account. Please restart the login process.'
        );

        clearPendingMpinLogin();
        clearSavedUserId();

        navigation.dispatch(
          CommonActions.reset({
            index: 0,

            routes: [
              {
                name: 'PhoneInput',
              },
            ],
          })
        );

        return;
      }

      // -----------------------------------------------
      // Locked
      // -----------------------------------------------

      if (
        normalizedMessage.includes(
          'locked'
        )
      ) {
        Alert.alert(
          'Account Locked',
          'Your MPIN has been temporarily locked because of multiple failed attempts. Please use Forgot MPIN to regain access.'
        );

        return;
      }

      // -----------------------------------------------
      // Generic error
      // -----------------------------------------------

      Alert.alert(
        'Unable to Verify',
        msg
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // FORGOT MPIN
  // =======================================================

  const handleForgotMPIN = () => {
    if (!phone) {
      Alert.alert(
        'Phone Number Missing',
        'Your phone number could not be found. Please restart the login process.'
      );

      return;
    }

    navigation.navigate(
      'MPINForgot',
      {
        phone,
      }
    );
  };

  // =======================================================
  // SWITCH COMPANY
  // =======================================================

  const handleSwitchCompany = () => {
    if (!userId || !phone) {
      Alert.alert(
        'Missing Information',
        'User or phone not available. Please restart the login process.'
      );
      return;
    }

    navigation.navigate('CompanySelection', {
      userId,
      phone,
      hasMpin: true,
      from: 'verify',
    });
  };

  // =======================================================
  // CHANGE PHONE
  // =======================================================

  const handleChangePhone = () => {
    if (loading) {
      return;
    }

    clearPendingMpinLogin();
    clearSavedUserId();

    navigation.dispatch(
      CommonActions.reset({
        index: 0,

        routes: [
          {
            name: 'PhoneInput',
          },
        ],
      })
    );
  };

  // =======================================================
  // FORMAT PHONE
  // =======================================================

  const maskedPhone = (() => {
    if (!phone) {
      return '';
    }

    if (phone.length <= 6) {
      return phone;
    }

    return `${phone.slice(
      0,
      3
    )} •••• ${phone.slice(-3)}`;
  })();

  // =======================================================
  // UI
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
          onPress={Keyboard.dismiss}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal:
                  horizontalPadding,
                // Dynamic padding top and alignment based on keyboard visibility
                paddingTop: keyboardVisible
                  ? 40
                  : 30,
                justifyContent: keyboardVisible ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            {/* =================================================
                BRAND HEADER – hidden when keyboard appears
            ================================================= */}

            <View
              style={[
                styles.brandSection,
                keyboardVisible && styles.brandHidden,
              ]}
            >
              <LinearGradient
                colors={
                  GRADIENT_COLORS
                }
                start={
                  GRADIENT_START
                }
                end={
                  GRADIENT_END
                }
                style={styles.brandLogo}
              >
                <Text
                  style={
                    styles.brandLogoText
                  }
                >
                  P
                </Text>
              </LinearGradient>

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
            </View>

            {/* =================================================
                TITLE
            ================================================= */}

            <View style={styles.header}>

              <View
                style={
                  styles.lockIconContainer
                }
              >
                <Icon
                  name="shield-lock-outline"
                  size={29}
                  color={
                    PRIMARY_COLOR
                  }
                />
              </View>

              <Text
                style={styles.title}
              >
                Welcome back
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Enter your 6-digit MPIN
                to securely continue
              </Text>

              {/* Phone */}

              {maskedPhone ? (
                <View
                  style={
                    styles.phoneBadge
                  }
                >
                  <Icon
                    name="phone-outline"
                    size={14}
                    color={
                      TEXT_SECONDARY
                    }
                  />

                  <Text
                    style={
                      styles.phoneText
                    }
                  >
                    {maskedPhone}
                  </Text>
                </View>
              ) : null}

            </View>

            {/* =================================================
                MPIN INPUT
            ================================================= */}

            <View
              style={[
                styles.mpinContainer,
                {
                  gap: boxGap,
                },
              ]}
            >
              {mpin.map(
                (
                  digit,
                  index
                ) => (
                  <TextInput
                    key={index}
                    ref={(
                      ref: PaperTextInput | null
                    ) => {
                      inputRefs.current[
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
                      handleKeyPress(
                        event,
                        index
                      )
                    }
                    keyboardType="number-pad"
                    maxLength={MPIN_LENGTH}
                    style={[
                      styles.mpinInput,
                      {
                        width:
                          mpinBoxWidth,
                        height:
                          mpinBoxWidth +
                          10,
                      },
                    ]}
                    outlineStyle={
                      styles.mpinOutline
                    }
                    activeOutlineColor={
                      PRIMARY_COLOR
                    }
                    outlineColor={
                      '#D9DEE7'
                    }
                    textColor={
                      TEXT_PRIMARY
                    }
                    cursorColor={
                      PRIMARY_COLOR
                    }
                    theme={{
                      roundness: 14,
                    }}
                    textAlign="center"
                    secureTextEntry
                    editable={
                      !loading &&
                      cooldownSeconds ===
                        0
                    }
                    selectTextOnFocus
                  />
                )
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
                size={16}
                color={
                  PRIMARY_COLOR
                }
              />

              <Text
                style={
                  styles.securityText
                }
              >
                Your MPIN is encrypted and
                securely verified.
              </Text>
            </View>

            {/* =================================================
                VERIFY BUTTON
            ================================================= */}

            <TouchableOpacity
              onPress={
                handleVerifyMPIN
              }
              disabled={
                loading ||
                cooldownSeconds >
                  0
              }
              activeOpacity={0.88}
              style={
                styles.buttonWrapper
              }
            >
              <LinearGradient
                colors={
                  GRADIENT_COLORS
                }
                start={
                  GRADIENT_START
                }
                end={
                  GRADIENT_END
                }
                style={[
                  styles.buttonGradient,
                  (loading ||
                    cooldownSeconds >
                      0) &&
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
                ) : cooldownSeconds >
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
                        cooldownSeconds
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
                      Verify MPIN
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
                LINKS
            ================================================= */}

            <View
              style={
                styles.linksContainer
              }
            >
              <TouchableOpacity
                onPress={
                  handleForgotMPIN
                }
                disabled={loading}
                activeOpacity={0.7}
                style={
                  styles.forgotButton
                }
              >
                <Icon
                  name="lock-reset"
                  size={17}
                  color={
                    PRIMARY_COLOR
                  }
                />

                <Text
                  style={
                    styles.linkText
                  }
                >
                  Forgot MPIN?
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles.linkDivider
                }
              />

              {/* --- NEW: Switch Company --- */}
              <TouchableOpacity
                onPress={handleSwitchCompany}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.switchCompanyText}>
                  Switch company
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles.linkDivider
                }
              />

              <TouchableOpacity
                onPress={
                  handleChangePhone
                }
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.changePhoneText
                  }
                >
                  Change phone number
                </Text>
              </TouchableOpacity>
            </View>

            {/* =================================================
                FOOTER
            ================================================= */}

            <View
              style={
                styles.footer
              }
            >
              <Icon
                name="shield-check"
                size={14}
                color="#94A3B8"
              />

              <Text
                style={
                  styles.footerText
                }
              >
                Secure login powered by
                Prayantra
              </Text>
            </View>

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
      BACKGROUND_COLOR,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    paddingVertical: 30,

    // justifyContent and paddingTop are now dynamic via inline style
  },

  // =======================================================
  // BRAND
  // =======================================================

  brandSection: {
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 32,

    opacity: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },

  brandHidden: {
    opacity: 0,
    maxHeight: 0,
    marginBottom: 0,
  },

  brandLogo: {
    width: 42,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.18,

    shadowRadius: 8,

    elevation: 4,
  },

  brandLogoText: {
    color: '#FFFFFF',

    fontSize: 21,

    fontWeight: '800',
  },

  brandName: {
    marginLeft: 10,

    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '800',

    letterSpacing: -0.2,
  },

  brandSubtitle: {
    marginLeft: 10,

    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    alignItems: 'center',

    marginBottom: 31,
  },

  lockIconContainer: {
    width: 62,
    height: 62,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 18,

    backgroundColor:
      `${PRIMARY_COLOR}12`,

    borderWidth: 1,

    borderColor:
      `${PRIMARY_COLOR}20`,

    marginBottom: 17,
  },

  title: {
    color: TEXT_PRIMARY,

    fontSize: 29,

    lineHeight: 35,

    fontWeight: '800',

    textAlign: 'center',

    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 310,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 18,

    fontWeight: '500',

    textAlign: 'center',
  },

  // =======================================================
  // PHONE BADGE
  // =======================================================

  phoneBadge: {
    marginTop: 13,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 20,

    backgroundColor:
      '#FFFFFF',

    borderWidth: 1,

    borderColor:
      '#E5EAF0',
  },

  phoneText: {
    marginLeft: 6,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '600',

    letterSpacing: 0.2,
  },

  // =======================================================
  // MPIN
  // =======================================================

  mpinContainer: {
    width: '100%',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',

    marginBottom: 16,
  },

  mpinInput: {
    paddingHorizontal: 0,

    paddingVertical: 0,

    backgroundColor:
      '#FFFFFF',

    fontSize: 21,

    fontWeight: '700',

    textAlign: 'center',
  },

  mpinOutline: {
    borderRadius: 14,

    borderWidth: 1.2,
  },

  // =======================================================
  // SECURITY
  // =======================================================

  securityMessage: {
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}08`,

    marginBottom: 22,
  },

  securityText: {
    marginLeft: 6,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // BUTTON
  // =======================================================

  buttonWrapper: {
    width: '100%',

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.18,

    shadowRadius: 12,

    elevation: 5,
  },

  buttonGradient: {
    minHeight: 54,

    paddingHorizontal: 20,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',

    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.62,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

    letterSpacing: 0.1,
  },

  // =======================================================
  // LINKS
  // =======================================================

  linksContainer: {
    marginTop: 22,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',

    flexWrap: 'wrap', // allow wrapping on small screens
  },

  forgotButton: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  linkText: {
    marginLeft: 5,

    color: PRIMARY_COLOR,

    fontSize: 12,

    fontWeight: '700',
  },

  // NEW style for "Switch company"
  switchCompanyText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },

  linkDivider: {
    width: 1,

    height: 15,

    marginHorizontal: 13,

    backgroundColor:
      '#DCE2EA',
  },

  changePhoneText: {
    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '600',
  },

  // =======================================================
  // FOOTER
  // =======================================================

  footer: {
    marginTop: 35,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',
  },

  footerText: {
    marginLeft: 5,

    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
  },
});