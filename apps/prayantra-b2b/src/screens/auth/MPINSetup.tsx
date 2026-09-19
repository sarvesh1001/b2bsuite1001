import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
  TouchableOpacity,
  Pressable,
  TextInput as RNTextInput,
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
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  setupUserMPIN,
} from '../../services/auth';

import {
  getDeviceId,
  getDeviceFingerprint,
} from '../../utils/device';

import {
  RootStackParamList,
} from '../../navigation';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type MPINSetupScreenNavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'MPINSetup'
  >;

type MPINSetupScreenRouteProp =
  RouteProp<
    RootStackParamList,
    'MPINSetup'
  >;

// =========================================================
// MPIN VALIDATION
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

  // Ascending
  const asc = digits.every(
    (digit, index) =>
      index === 0 ||
      digit === digits[index - 1] + 1
  );

  // Descending
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
  ];

  if (common.includes(mpin)) {
    return true;
  }

  return false;
};

// =========================================================
// COMPONENT
// =========================================================

export default function MPINSetupScreen() {
  const navigation =
    useNavigation<MPINSetupScreenNavigationProp>();

  const route =
    useRoute<MPINSetupScreenRouteProp>();

  const {
    userId,
    phone,
    companyId,
  } = route.params;

  // -----------------------------------------------------
  // MPIN STATE — single source of truth
  // -----------------------------------------------------

  const [mpinCode, setMpinCode] =
    useState('');

  const [isFocused, setIsFocused] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [deviceId, setDeviceId] =
    useState('');

  const [fingerprint, setFingerprint] =
    useState('');

  const hiddenInputRef =
    useRef<RNTextInput | null>(null);

  // =======================================================
  // DEVICE INFORMATION + AUTO FOCUS
  // =======================================================

  useEffect(() => {
    async function loadDeviceInfo() {
      try {
        const id =
          await getDeviceId();

        const fp =
          await getDeviceFingerprint();

        setDeviceId(id);
        setFingerprint(fp);
      } catch (error) {
        console.error(
          'Failed to load device info:',
          error
        );
      }
    }

    loadDeviceInfo();

    const timer = setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  // =======================================================
  // HANDLERS
  // =======================================================

  const handleChangeText = (
    text: string
  ) => {
    const cleaned = text
      .replace(/[^0-9]/g, '')
      .slice(0, 6);

    setMpinCode(cleaned);

    if (cleaned.length === 6) {
      Keyboard.dismiss();
    }
  };

  const focusHiddenInput = () => {
    hiddenInputRef.current?.focus();
  };

  // =======================================================
  // MPIN STATUS
  // =======================================================

  const isComplete =
    mpinCode.length === 6;

  const isWeak =
    isComplete && isWeakMPIN(mpinCode);

  const activeIndex = Math.min(
    mpinCode.length,
    5
  );

  const getStatus = () => {
    if (!isComplete) {
      return {
        label: 'Enter all 6 digits',
        color: '#94A3B8',
        icon: 'shield-outline',
      };
    }

    if (isWeak) {
      return {
        label: 'Choose a stronger MPIN',
        color: '#EF4444',
        icon: 'shield-alert-outline',
      };
    }

    return {
      label: 'Strong MPIN',
      color: '#10B981',
      icon: 'shield-check-outline',
    };
  };

  const status = getStatus();

  // =======================================================
  // SETUP MPIN
  // =======================================================

  const handleSetupMPIN = async () => {
    if (!isComplete) {
      Alert.alert(
        'Incomplete MPIN',
        'Please enter all 6 digits.'
      );

      return;
    }

    if (isWeak) {
      Alert.alert(
        'Weak MPIN',
        'Your MPIN is too easy to guess. Please choose a different 6-digit code and avoid sequential, repetitive, or common patterns.'
      );

      return;
    }

    if (!deviceId || !fingerprint) {
      Alert.alert(
        'Device Information',
        'Unable to securely identify this device. Please try again.'
      );

      return;
    }

    setLoading(true);

    try {
      await setupUserMPIN(
        phone,
        mpinCode,
        deviceId,
        fingerprint
      );

      Alert.alert(
        'MPIN Created',
        'Your MPIN has been successfully set. You can now use it to securely access your account.',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.reset({
                index: 0,

                routes: [
                  {
                    name:
                      'MPINVerification',

                    params: {
                      phone,
                      userId,
                      companyId,
                    },
                  },
                ],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      const statusCode =
        error.response?.status;

      const msg =
        error.response?.data?.message ||
        error.message ||
        'Setup failed.';

      if (statusCode === 400) {
        if (
          msg
            .toLowerCase()
            .includes('weak')
        ) {
          Alert.alert(
            'Weak MPIN',
            'Your MPIN is too weak. Please choose a different one.'
          );
        } else if (
          msg
            .toLowerCase()
            .includes(
              'user not found'
            )
        ) {
          Alert.alert(
            'User Not Found',
            'The account could not be found. Please restart the login process.'
          );
        } else {
          Alert.alert(
            'Unable to Set MPIN',
            msg
          );
        }
      } else if (
        statusCode === 409
      ) {
        Alert.alert(
          'MPIN Already Exists',
          'An MPIN already exists for this account. Please log in using your existing MPIN.',
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,

                  routes: [
                    {
                      name:
                        'MPINVerification',

                      params: {
                        phone,
                        userId,
                        companyId,
                      },
                    },
                  ],
                });
              },
            },
          ]
        );
      } else if (
        statusCode === 403
      ) {
        Alert.alert(
          'Permission Denied',
          msg ||
            'You do not have permission to set an MPIN.'
        );
      } else {
        Alert.alert(
          'Unable to Set MPIN',
          msg
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // BACK
  // =======================================================

  const handleBack = () => {
    if (loading) {
      return;
    }

    navigation.goBack();
  };

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
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =================================================
              TOP BAR
          ================================================= */}

          <View style={styles.topBar}>

            <TouchableOpacity
              onPress={handleBack}
              disabled={loading}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Icon
                name="arrow-left"
                size={21}
                color={TEXT_PRIMARY}
              />
            </TouchableOpacity>

            <View
              style={
                styles.secureBadge
              }
            >
              <Icon
                name="shield-lock-outline"
                size={16}
                color={PRIMARY_COLOR}
              />

              <Text
                style={
                  styles.secureBadgeText
                }
              >
                SECURE SETUP
              </Text>
            </View>

            <View
              style={styles.topBarSpacer}
            />

          </View>

          {/* =================================================
              HERO
          ================================================= */}

          <View style={styles.hero}>

            <LinearGradient
              colors={[
                '#00B4DB',
                '#7B2FBE',
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={styles.securityIcon}
            >
              <Icon
                name="lock-outline"
                size={34}
                color="#FFFFFF"
              />
            </LinearGradient>

            <Text style={styles.title}>
              Create your MPIN
            </Text>

            <Text
              style={styles.subtitle}
            >
              Set a secure 6-digit MPIN
              for faster and safer access
              to Prayantra.
            </Text>

          </View>

          {/* =================================================
              MPIN CARD
          ================================================= */}

          <View style={styles.mpinCard}>

            <View
              style={styles.cardHeader}
            >
              <View>
                <Text
                  style={styles.cardTitle}
                >
                  Choose your MPIN
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  Enter a unique 6-digit code
                </Text>
              </View>

              <View
                style={styles.lockSmall}
              >
                <Icon
                  name="lock"
                  size={17}
                  color={PRIMARY_COLOR}
                />
              </View>
            </View>

            {/* =================================================
                MPIN VISUAL BOXES (tap target -> hidden input)
            ================================================= */}

            <Pressable
              onPress={focusHiddenInput}
              style={styles.mpinContainer}
            >
              {[0, 1, 2, 3, 4, 5].map(
                (index) => {
                  const digit =
                    mpinCode[index] ?? '';

                  const filled =
                    digit !== '';

                  const active =
                    isFocused &&
                    index === activeIndex &&
                    mpinCode.length < 6;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.inputWrapper,
                        active &&
                          styles.inputWrapperActive,
                        filled &&
                          styles.inputWrapperFilled,
                        isWeak &&
                          styles.inputWrapperWeak,
                      ]}
                    >
                      {filled && (
                        <View
                          style={styles.dot}
                        />
                      )}
                    </View>
                  );
                }
              )}
            </Pressable>

            {/* =================================================
                HIDDEN REAL INPUT (single source of truth)
            ================================================= */}

            <RNTextInput
              ref={hiddenInputRef}
              value={mpinCode}
              onChangeText={handleChangeText}
              onFocus={() =>
                setIsFocused(true)
              }
              onBlur={() =>
                setIsFocused(false)
              }
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              autoCorrect={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              editable={!loading}
              style={styles.hiddenInput}
            />

            {/* =================================================
                STATUS
            ================================================= */}

            <View
              style={[
                styles.statusContainer,
                {
                  backgroundColor:
                    `${status.color}0D`,
                },
              ]}
            >
              <Icon
                name={status.icon}
                size={17}
                color={status.color}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: status.color,
                  },
                ]}
              >
                {status.label}
              </Text>
            </View>

          </View>

          {/* =================================================
              SECURITY INFORMATION
          ================================================= */}

          <View
            style={styles.securityInfo}
          >
            <View
              style={
                styles.securityInfoIcon
              }
            >
              <Icon
                name="shield-check-outline"
                size={20}
                color="#10B981"
              />
            </View>

            <View
              style={
                styles.securityInfoText
              }
            >
              <Text
                style={
                  styles.securityInfoTitle
                }
              >
                Keep your MPIN private
              </Text>

              <Text
                style={
                  styles.securityInfoDescription
                }
              >
                Never share your MPIN with
                anyone. Avoid birthdays,
                repeated digits, or simple
                sequences.
              </Text>
            </View>
          </View>

          {/* =================================================
              CTA
          ================================================= */}

          <TouchableOpacity
            onPress={handleSetupMPIN}
            disabled={
              loading || !isComplete
            }
            activeOpacity={0.85}
            style={[
              styles.buttonWrapper,
              (!isComplete || loading) &&
                styles.buttonDisabledWrapper,
            ]}
          >
            <LinearGradient
              colors={
                !isComplete || loading
                  ? ['#CBD5E1', '#94A3B8']
                  : ['#00B4DB', '#7B2FBE']
              }
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 0,
              }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={styles.buttonText}
                  >
                    Creating MPIN...
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name="shield-check-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.buttonText}
                  >
                    Set MPIN
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
              FOOTER
          ================================================= */}

          <View style={styles.footer}>
            <Icon
              name="lock-outline"
              size={13}
              color="#94A3B8"
            />

            <Text
              style={styles.footerText}
            >
              Your MPIN is securely associated
              with this device.
            </Text>
          </View>

        </ScrollView>
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
      BACKGROUND_COLOR || '#F7F9FC',
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    paddingHorizontal: 20,

    paddingBottom: 35,
  },

  // =======================================================
  // TOP BAR
  // =======================================================

  topBar: {
    height: 54,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E5EAF0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 5,

    elevation: 1,
  },

  secureBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 20,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E5EAF0',
  },

  secureBadgeText: {
    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 0.7,
  },

  topBarSpacer: {
    width: 40,
  },

  // =======================================================
  // HERO
  // =======================================================

  hero: {
    alignItems: 'center',

    paddingTop: 25,

    paddingBottom: 27,
  },

  securityIcon: {
    width: 76,
    height: 76,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 22,

    shadowColor: '#7B2FBE',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.22,

    shadowRadius: 14,

    elevation: 7,
  },

  title: {
    marginTop: 19,

    color: TEXT_PRIMARY,

    fontSize: 28,

    lineHeight: 34,

    fontWeight: '800',

    letterSpacing: -0.5,

    textAlign: 'center',
  },

  subtitle: {
    maxWidth: 315,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 18,

    fontWeight: '500',

    textAlign: 'center',
  },

  // =======================================================
  // MPIN CARD
  // =======================================================

  mpinCard: {
    padding: 19,

    borderRadius: 18,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.045,

    shadowRadius: 12,

    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  cardTitle: {
    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  cardSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  lockSmall: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor: `${PRIMARY_COLOR}10`,
  },

  // =======================================================
  // MPIN INPUT
  // =======================================================

  mpinContainer: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    marginTop: 24,

    position: 'relative',
  },

  inputWrapper: {
    width: 42,
    height: 52,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor: '#F8FAFC',

    borderWidth: 1.5,

    borderColor: '#E2E8F0',
  },

  inputWrapperActive: {
    borderColor: PRIMARY_COLOR,

    backgroundColor: '#FFFFFF',

    shadowColor: PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.12,

    shadowRadius: 5,

    elevation: 2,
  },

  inputWrapperFilled: {
    backgroundColor: `${PRIMARY_COLOR}08`,
  },

  inputWrapperWeak: {
    borderColor: '#FCA5A5',
  },

  // dot shown inside a filled box
  dot: {
    width: 10,
    height: 10,

    borderRadius: 5,

    backgroundColor: TEXT_PRIMARY,
  },

  // the invisible real input
  hiddenInput: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    height: 1,
    width: 1,

    opacity: 0,
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusContainer: {
    minHeight: 36,

    marginTop: 18,

    paddingHorizontal: 11,

    borderRadius: 9,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,
  },

  statusText: {
    fontSize: 10,

    fontWeight: '600',
  },

  // =======================================================
  // SECURITY INFO
  // =======================================================

  securityInfo: {
    marginTop: 15,

    padding: 14,

    flexDirection: 'row',

    alignItems: 'flex-start',

    borderRadius: 14,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#E5EAF0',
  },

  securityInfoIcon: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor: '#ECFDF5',
  },

  securityInfoText: {
    flex: 1,

    marginLeft: 10,
  },

  securityInfoTitle: {
    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  securityInfoDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 14,

    fontWeight: '500',
  },

  // =======================================================
  // BUTTON
  // =======================================================

  buttonWrapper: {
    marginTop: 18,

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor: '#7B2FBE',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.18,

    shadowRadius: 10,

    elevation: 5,
  },

  buttonDisabledWrapper: {
    shadowOpacity: 0,

    elevation: 0,
  },

  buttonGradient: {
    minHeight: 54,

    paddingHorizontal: 18,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

    letterSpacing: 0.2,
  },

  // =======================================================
  // FOOTER
  // =======================================================

  footer: {
    marginTop: 17,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 5,
  },

  footerText: {
    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',

    textAlign: 'center',
  },
});