// apps/prayantra-b2b/src/screens/module/administration/UserPhoneScreen.tsx

import React, { useEffect, useState } from 'react';

import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput as RNTextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
} from 'react-native-paper';

import {
  useRoute,
  RouteProp,
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  getUserPhone,
  updateUserPhone,
  findEmployeeByUsername,
  UserPhoneUpdateError,
} from '@b2b/api-client';

import {
  RootStackParamList,
} from '../../../navigation';

import {
  UserAvatar,
} from '../../../components/UserAvatar';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type UserPhoneRouteProp = RouteProp<
  RootStackParamList,
  'UserPhone'
>;

type NavigationProp =
  StackNavigationProp<RootStackParamList>;

// =========================================================
// HELPERS
// =========================================================

/**
 * Strip everything except digits and a single leading '+'.
 * Keeps the value the user typed reasonably clean before validation.
 */
const sanitizePhoneInput = (input: string): string => {
  const hasLeadingPlus = input.startsWith('+');
  const digitsOnly = input.replace(/[^0-9]/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * Client-side phone validation. Mirrors the backend contract:
 *   - 10 to 15 digits
 *   - optional leading '+'
 * Returns an error message, or null if valid.
 */
const validatePhoneNumber = (
  value: string,
): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Phone number is required.';
  }

  const digits = trimmed.replace(/[^0-9]/g, '');

  if (digits.length < 10) {
    return 'Phone number must have at least 10 digits.';
  }

  if (digits.length > 15) {
    return 'Phone number must have at most 15 digits.';
  }

  if (!/^\+?[0-9]+$/.test(trimmed)) {
    return 'Only digits and an optional leading “+” are allowed.';
  }

  return null;
};

// =========================================================
// COMPONENT
// =========================================================

export default function UserPhoneScreen() {
  const route =
    useRoute<UserPhoneRouteProp>();

  const navigation =
    useNavigation<NavigationProp>();

  // -------------------------------------------------------
  // Route params
  // -------------------------------------------------------

  const {
    userId: initialUserId,
    userName: initialUserName,
  } = route.params || {};

  // -------------------------------------------------------
  // Auth
  // -------------------------------------------------------

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // -------------------------------------------------------
  // Search state
  // -------------------------------------------------------

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  // -------------------------------------------------------
  // Selected employee
  // -------------------------------------------------------

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState<string | undefined>(
    initialUserId
  );

  const [
    selectedUserName,
    setSelectedUserName,
  ] = useState<string | undefined>(
    initialUserName
  );

  // -------------------------------------------------------
  // Phone state
  // -------------------------------------------------------

  const [
    phone,
    setPhone,
  ] = useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(initialUserId)
  );

  // -------------------------------------------------------
  // Edit / update state
  // -------------------------------------------------------

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    editedPhone,
    setEditedPhone,
  ] = useState('');

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    editError,
    setEditError,
  ] = useState<string | null>(null);

  // =======================================================
  // FETCH PHONE
  // =======================================================

  useEffect(() => {
    const fetchPhone = async () => {
      if (
        !selectedUserId ||
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        setPhone(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setPhone(null);

      try {
        const phoneNumber =
          await getUserPhone(
            companyId,
            selectedUserId,
            deviceId,
            accessToken
          );

        setPhone(
          phoneNumber ||
            'No phone number found'
        );
      } catch (error) {
        console.error(
          'Failed to fetch phone:',
          error
        );

        setPhone('Error');
      } finally {
        setLoading(false);
      }
    };

    fetchPhone();
  }, [
    selectedUserId,
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // SEARCH EMPLOYEE
  // =======================================================

  const handleSearch = async () => {
    const username =
      searchTerm.trim();

    if (
      !username ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      return;
    }

    setIsSearching(true);

    try {
      const response =
        await findEmployeeByUsername(
          companyId,
          deviceId,
          username,
          accessToken
        );

      const employee =
        (response.data as any)
          ?.employee || null;

      if (!employee) {
        Alert.alert(
          'Employee Not Found',
          'No employee was found with that username.'
        );

        return;
      }

      setSelectedUserId(
        employee.user_id
      );

      setSelectedUserName(
        employee.full_name ||
          employee.username ||
          'Employee'
      );

      setSearchTerm('');
    } catch (error) {
      console.error(
        'Employee search failed:',
        error
      );

      Alert.alert(
        'Search Failed',
        'Could not search for the employee. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // =======================================================
  // CLEAR USER
  // =======================================================

  const handleClearSelection = () => {
    setSelectedUserId(undefined);
    setSelectedUserName(undefined);
    setPhone(null);
    setSearchTerm('');
    setIsEditing(false);
    setEditedPhone('');
    setEditError(null);
  };

  // =======================================================
  // PHONE VALIDATION
  // =======================================================

  const hasPhone =
    Boolean(
      phone &&
        phone !==
          'No phone number found' &&
        phone !== 'Error'
    );

  // =======================================================
  // EDIT MODE HANDLERS
  // =======================================================

  const handleStartEdit = () => {
    setEditedPhone(
      hasPhone && phone ? phone : ''
    );
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPhone('');
    setEditError(null);
  };

  const handleChangeEditedPhone = (
    value: string,
  ) => {
    const sanitized =
      sanitizePhoneInput(value);

    setEditedPhone(sanitized);

    // Clear any previous error as soon as the user starts fixing it.
    if (editError) {
      setEditError(null);
    }
  };

  const handleSavePhone = async () => {
    if (
      !selectedUserId ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      return;
    }

    // 1. Client-side validation
    const validationError =
      validatePhoneNumber(editedPhone);

    if (validationError) {
      setEditError(validationError);
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const result = await updateUserPhone(
        companyId,
        selectedUserId,
        editedPhone.trim(),
        deviceId,
        accessToken,
      );

      // 2. Update local state with the authoritative value the
      //    server confirmed back (result.user_id is a sanity echo).
      setPhone(editedPhone.trim());
      setIsEditing(false);
      setEditedPhone('');

      Alert.alert(
        'Phone Updated',
        `The phone number for ${
          selectedUserName || 'the employee'
        } has been updated.`,
      );
    } catch (error) {
      // 3. Typed error handling — the API client throws
      //    UserPhoneUpdateError, so we can branch on `.code`.
      if (error instanceof UserPhoneUpdateError) {
        switch (error.code) {
          case 'DUPLICATE':
            setEditError(
              'This phone number is already registered to another employee.'
            );
            break;

          case 'NOT_FOUND':
            setEditError(
              'This employee no longer exists. Please search again.'
            );
            break;

          case 'FORBIDDEN':
            setEditError(
              'You do not have permission to update this employee’s phone number.'
            );
            break;

          case 'INVALID':
            setEditError(
              error.userMessage ||
                'The phone number is invalid.'
            );
            break;

          case 'NETWORK':
            // Keep edit mode open — the idempotency key is still
            // valid, so a retry is safe.
            setEditError(
              'Network error. Please check your connection and tap Save again.'
            );
            break;

          default:
            setEditError(
              'Something went wrong. Please try again.'
            );
        }
      } else {
        console.error(
          'Unexpected error updating phone:',
          error
        );
        setEditError(
          'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // =======================================================
  // CALL
  // =======================================================

  const handleCall = async () => {
    if (!hasPhone || !phone) {
      return;
    }

    try {
      await Linking.openURL(
        `tel:${phone}`
      );
    } catch (error) {
      Alert.alert(
        'Unable to Call',
        'Your device could not open the phone application.'
      );
    }
  };

  // =======================================================
  // MESSAGE
  // =======================================================

  const handleMessage = async () => {
    if (!hasPhone || !phone) {
      return;
    }

    try {
      await Linking.openURL(
        `sms:${phone}`
      );
    } catch (error) {
      Alert.alert(
        'Unable to Message',
        'Your device could not open the messaging application.'
      );
    }
  };

  // =======================================================
  // SEARCH SCREEN
  // =======================================================

  if (!selectedUserId) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <LinearGradient
            colors={GRADIENT_COLORS}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.header}
          >
            <View style={styles.headerRow}>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() =>
                  navigation.goBack()
                }
                activeOpacity={0.8}
              >
                <Icon
                  name="arrow-left"
                  size={21}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>

                <Text style={styles.headerEyebrow}>
                  ADMINISTRATION
                </Text>

                <Text style={styles.headerTitle}>
                  User Phone
                </Text>

              </View>

              <View
                style={styles.headerIcon}
              >
                <Icon
                  name="phone-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

            </View>
          </LinearGradient>

          {/* =================================================
              CONTENT
          ================================================= */}

          <View style={styles.content}>

            {/* Breadcrumb */}

            <View style={styles.breadcrumb}>

              <Text style={styles.breadcrumbText}>
                Administration
              </Text>

              <Icon
                name="chevron-right"
                size={14}
                color="#A1AAB7"
              />

              <Text
                style={[
                  styles.breadcrumbText,
                  styles.breadcrumbActive,
                ]}
              >
                User Phone
              </Text>

            </View>

            {/* Hero */}

            <View style={styles.searchHero}>

              <View
                style={styles.searchHeroIcon}
              >
                <Icon
                  name="account-search-outline"
                  size={30}
                  color={PRIMARY_COLOR}
                />
              </View>

              <Text style={styles.heroTitle}>
                Find an Employee
              </Text>

              <Text style={styles.heroDescription}>
                Search for an employee by their
                username to view their contact
                information.
              </Text>

            </View>

            {/* Search Card */}

            <View style={styles.searchCard}>

              <Text style={styles.inputLabel}>
                Employee Username
              </Text>

              <View
                style={[
                  styles.searchContainer,
                  searchTerm.length > 0 &&
                    styles.searchContainerFocused,
                ]}
              >

                <Icon
                  name="account-outline"
                  size={21}
                  color="#94A3B8"
                />

                <RNTextInput
                  style={styles.searchInput}
                  placeholder="Enter username"
                  placeholderTextColor="#A1AAB7"
                  value={searchTerm}
                  onChangeText={
                    setSearchTerm
                  }
                  returnKeyType="search"
                  onSubmitEditing={
                    handleSearch
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSearching}
                />

                {searchTerm.length >
                  0 && (
                  <TouchableOpacity
                    onPress={() =>
                      setSearchTerm('')
                    }
                    style={
                      styles.clearButton
                    }
                  >
                    <Icon
                      name="close-circle"
                      size={18}
                      color="#A1AAB7"
                    />
                  </TouchableOpacity>
                )}

              </View>

              <TouchableOpacity
                style={[
                  styles.searchButton,
                  (!searchTerm.trim() ||
                    isSearching) &&
                    styles.searchButtonDisabled,
                ]}
                onPress={handleSearch}
                disabled={
                  !searchTerm.trim() ||
                  isSearching
                }
                activeOpacity={0.85}
              >

                {isSearching ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Icon
                      name="magnify"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.searchButtonText
                      }
                    >
                      Search Employee
                    </Text>
                  </>
                )}

              </TouchableOpacity>

              <View
                style={styles.searchHint}
              >
                <Icon
                  name="information-outline"
                  size={14}
                  color="#94A3B8"
                />

                <Text
                  style={styles.searchHintText}
                >
                  Enter the exact employee
                  username.
                </Text>
              </View>

            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // =======================================================
  // LOADING USER PHONE
  // =======================================================

  if (loading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>

          <View
            style={styles.loadingIcon}
          >
            <Icon
              name="phone-outline"
              size={28}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>
            Loading contact details
          </Text>

          <Text
            style={styles.loadingSubtitle}
          >
            Fetching employee information...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // USER PHONE SCREEN
  // =======================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.header}
        >
          <View style={styles.headerRow}>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.8}
            >
              <Icon
                name="arrow-left"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View
              style={styles.headerTitleContainer}
            >
              <Text style={styles.headerEyebrow}>
                ADMINISTRATION
              </Text>

              <Text style={styles.headerTitle}>
                User Phone
              </Text>
            </View>

            <View
              style={styles.headerIcon}
            >
              <Icon
                name="phone-outline"
                size={21}
                color="#FFFFFF"
              />
            </View>

          </View>
        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <View style={styles.detailsContent}>

          {/* Breadcrumb */}

          <View style={styles.breadcrumb}>

            <Text style={styles.breadcrumbText}>
              Administration
            </Text>

            <Icon
              name="chevron-right"
              size={14}
              color="#A1AAB7"
            />

            <Text
              style={[
                styles.breadcrumbText,
                styles.breadcrumbActive,
              ]}
            >
              User Phone
            </Text>

          </View>

          {/* =================================================
              EMPLOYEE CARD
          ================================================= */}

          <View style={styles.employeeCard}>

            <View
              style={[
                styles.employeeAccent,
                {
                  backgroundColor:
                    PRIMARY_COLOR,
                },
              ]}
            />

            <UserAvatar
              userId={selectedUserId}
              username={selectedUserName}
              fullName={selectedUserName}
              size={82}
              style={styles.employeeAvatar}
            />

            <Text
              numberOfLines={2}
              style={styles.employeeName}
            >
              {selectedUserName ||
                'Employee'}
            </Text>

            <View
              style={styles.employeeBadge}
            >
              <View
                style={styles.activeDot}
              />

              <Text
                style={styles.employeeBadgeText}
              >
                Employee
              </Text>
            </View>

            <TouchableOpacity
              style={styles.changeUserButton}
              onPress={
                handleClearSelection
              }
              activeOpacity={0.75}
            >
              <Icon
                name="account-switch-outline"
                size={17}
                color={PRIMARY_COLOR}
              />

              <Text
                style={styles.changeUserText}
              >
                Change Employee
              </Text>
            </TouchableOpacity>

          </View>

          {/* =================================================
              CONTACT SECTION
          ================================================= */}

          <View style={styles.contactSection}>

            <Text style={styles.sectionTitle}>
              Contact Information
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              {isEditing
                ? 'Enter the new phone number'
                : 'Employee phone number'}
            </Text>

            {/* =================================================
                PHONE CARD — view mode + edit mode
            ================================================= */}

            <View
              style={[
                styles.phoneCard,
                isEditing &&
                  styles.phoneCardEditing,
              ]}
            >
              <View
                style={styles.phoneIconContainer}
              >
                <Icon
                  name={
                    isEditing
                      ? 'pencil-outline'
                      : 'phone'
                  }
                  size={25}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View style={styles.phoneInfo}>

                <Text
                  style={styles.phoneLabel}
                >
                  Phone Number
                </Text>

                {isEditing ? (
                  <RNTextInput
                    style={styles.phoneEditInput}
                    value={editedPhone}
                    onChangeText={
                      handleChangeEditedPhone
                    }
                    placeholder="+91XXXXXXXXXX"
                    placeholderTextColor="#A1AAB7"
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    autoCapitalize="none"
                    editable={!isSaving}
                    maxLength={16}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={
                      handleSavePhone
                    }
                  />
                ) : phone ===
                  'No phone number found' ? (
                  <Text
                    style={styles.noPhoneText}
                  >
                    No phone number available
                  </Text>
                ) : phone === 'Error' ? (
                  <Text
                    style={styles.errorPhoneText}
                  >
                    Unable to load phone number
                  </Text>
                ) : (
                  <Text
                    style={styles.phoneNumber}
                    selectable
                  >
                    {phone}
                  </Text>
                )}

                {isEditing && editError ? (
                  <View
                    style={styles.editErrorRow}
                  >
                    <Icon
                      name="alert-circle-outline"
                      size={13}
                      color="#EF4444"
                    />

                    <Text
                      style={styles.editErrorText}
                    >
                      {editError}
                    </Text>
                  </View>
                ) : null}

              </View>

              {/* Right-side icon button in VIEW mode */}
              {!isEditing && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleStartEdit}
                  activeOpacity={0.75}
                  accessibilityLabel="Edit phone number"
                >
                  <Icon
                    name="pencil-outline"
                    size={19}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* =================================================
                EDIT MODE ACTIONS (save / cancel)
            ================================================= */}

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[
                    styles.cancelEditButton,
                    isSaving &&
                      styles.editButtonDisabled,
                  ]}
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="close"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                  <Text
                    style={styles.cancelEditText}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveEditButton,
                    {
                      backgroundColor:
                        PRIMARY_COLOR,
                    },
                    (isSaving ||
                      !editedPhone.trim()) &&
                      styles.editButtonDisabled,
                  ]}
                  onPress={handleSavePhone}
                  disabled={
                    isSaving ||
                    !editedPhone.trim()
                  }
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Icon
                        name="check"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text
                        style={styles.saveEditText}
                      >
                        Save
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* =================================================
                ACTIONS (call / message) — hidden while editing
            ================================================= */}

            {!isEditing && hasPhone && (
              <View style={styles.actions}>

                <TouchableOpacity
                  style={[
                    styles.callButton,
                    {
                      backgroundColor:
                        PRIMARY_COLOR,
                    },
                  ]}
                  onPress={handleCall}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="phone"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.callButtonText}
                  >
                    Call
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.messageButton
                  }
                  onPress={handleMessage}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="message-text-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />

                  <Text
                    style={
                      styles.messageButtonText
                    }
                  >
                    Message
                  </Text>
                </TouchableOpacity>

              </View>
            )}

            {/* No phone — only shown when not editing */}
            {!isEditing && !hasPhone && (
              <View
                style={styles.noPhoneContainer}
              >
                <Icon
                  name="phone-off-outline"
                  size={20}
                  color="#94A3B8"
                />

                <Text
                  style={styles.noPhoneContainerText}
                >
                  Contact actions are
                  unavailable. Tap the pencil
                  to add a number.
                </Text>
              </View>
            )}

          </View>

        </View>
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

  container: {
    flex: 1,
    backgroundColor:
      BACKGROUND_COLOR,
  },

  flex: {
    flex: 1,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 17,

    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.11,
    shadowRadius: 10,

    elevation: 5,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.18)',
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerEyebrow: {
    color:
      'rgba(255,255,255,0.62)',

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,

    color: '#FFFFFF',

    fontSize: 17,

    fontWeight: '700',
  },

  headerIcon: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.18)',
  },

  // =======================================================
  // CONTENT
  // =======================================================

  content: {
    flex: 1,

    paddingHorizontal: 20,
  },

  detailsContent: {
    flex: 1,

    paddingHorizontal: 20,
  },

  // =======================================================
  // BREADCRUMB
  // =======================================================

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 3,

    marginTop: 18,
    marginBottom: 20,
  },

  breadcrumbText: {
    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '600',
  },

  breadcrumbActive: {
    color: '#64748B',
  },

  // =======================================================
  // SEARCH HERO
  // =======================================================

  searchHero: {
    alignItems: 'center',

    paddingTop: 7,
    paddingBottom: 23,

    paddingHorizontal: 15,
  },

  searchHeroIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  heroTitle: {
    marginTop: 17,

    color: TEXT_PRIMARY,

    fontSize: 22,

    fontWeight: '700',

    textAlign: 'center',
  },

  heroDescription: {
    maxWidth: 330,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    fontWeight: '500',

    textAlign: 'center',
  },

  // =======================================================
  // SEARCH CARD
  // =======================================================

  searchCard: {
    padding: 17,

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.035,
    shadowRadius: 8,

    elevation: 2,
  },

  inputLabel: {
    marginBottom: 8,

    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  searchContainer: {
    minHeight: 50,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,

    borderRadius: 11,

    backgroundColor: '#F8FAFC',

    borderWidth: 1,

    borderColor: '#E2E8F0',
  },

  searchContainerFocused: {
    borderColor:
      `${PRIMARY_COLOR}65`,

    backgroundColor:
      '#FFFFFF',
  },

  searchInput: {
    flex: 1,

    height: 48,

    marginLeft: 9,

    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '500',
  },

  clearButton: {
    padding: 4,
  },

  searchButton: {
    minHeight: 47,

    marginTop: 12,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    borderRadius: 11,

    backgroundColor:
      PRIMARY_COLOR,
  },

  searchButtonDisabled: {
    opacity: 0.45,
  },

  searchButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  searchHint: {
    marginTop: 12,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,
  },

  searchHintText: {
    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // EMPLOYEE CARD
  // =======================================================

  employeeCard: {
    position: 'relative',

    alignItems: 'center',

    paddingTop: 27,
    paddingBottom: 21,
    paddingHorizontal: 20,

    borderRadius: 18,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.045,
    shadowRadius: 10,

    elevation: 2,
  },

  employeeAccent: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    height: 3,
  },

  employeeAvatar: {
    marginBottom: 13,
  },

  employeeName: {
    maxWidth: 300,

    color: TEXT_PRIMARY,

    fontSize: 22,

    lineHeight: 28,

    fontWeight: '700',

    textAlign: 'center',
  },

  employeeBadge: {
    marginTop: 8,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 20,

    backgroundColor:
      `${PRIMARY_COLOR}0D`,
  },

  activeDot: {
    width: 6,
    height: 6,

    marginRight: 5,

    borderRadius: 3,

    backgroundColor: '#22C55E',
  },

  employeeBadgeText: {
    color: PRIMARY_COLOR,

    fontSize: 9,

    fontWeight: '600',
  },

  changeUserButton: {
    marginTop: 17,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    paddingVertical: 4,
  },

  changeUserText: {
    color: PRIMARY_COLOR,

    fontSize: 10,

    fontWeight: '600',
  },

  // =======================================================
  // CONTACT
  // =======================================================

  contactSection: {
    marginTop: 25,
  },

  sectionTitle: {
    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  sectionSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // PHONE CARD
  // =======================================================

  phoneCard: {
    marginTop: 13,

    minHeight: 76,

    flexDirection: 'row',
    alignItems: 'center',

    padding: 13,

    borderRadius: 14,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,
  },

  phoneCardEditing: {
    borderColor:
      `${PRIMARY_COLOR}75`,

    backgroundColor: '#FFFFFF',
  },

  phoneIconContainer: {
    width: 49,
    height: 49,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  phoneInfo: {
    flex: 1,

    marginLeft: 12,
  },

  phoneLabel: {
    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',
  },

  phoneNumber: {
    marginTop: 4,

    color: TEXT_PRIMARY,

    fontSize: 20,

    fontWeight: '700',

    letterSpacing: 0.2,
  },

  phoneEditInput: {
    marginTop: 2,

    paddingVertical: 4,

    paddingHorizontal: 0,

    color: TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',

    letterSpacing: 0.3,
  },

  noPhoneText: {
    marginTop: 4,

    color: '#64748B',

    fontSize: 12,

    fontWeight: '600',
  },

  errorPhoneText: {
    marginTop: 4,

    color: '#EF4444',

    fontSize: 12,

    fontWeight: '600',
  },

  // Pencil button on the right of the phone card (view mode)

  editIconButton: {
    width: 36,
    height: 36,

    marginLeft: 6,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  // Inline error message shown while editing

  editErrorRow: {
    marginTop: 6,

    flexDirection: 'row',
    alignItems: 'flex-start',

    gap: 4,
  },

  editErrorText: {
    flex: 1,

    color: '#EF4444',

    fontSize: 10,

    lineHeight: 14,

    fontWeight: '600',
  },

  // =======================================================
  // EDIT MODE ACTIONS
  // =======================================================

  editActions: {
    marginTop: 13,

    flexDirection: 'row',

    gap: 10,
  },

  cancelEditButton: {
    flex: 1,

    minHeight: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 11,

    backgroundColor: '#F1F5F9',

    borderWidth: 1,

    borderColor: '#E2E8F0',
  },

  cancelEditText: {
    color: TEXT_SECONDARY,

    fontSize: 12,

    fontWeight: '700',
  },

  saveEditButton: {
    flex: 1,

    minHeight: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 11,
  },

  saveEditText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  editButtonDisabled: {
    opacity: 0.55,
  },

  // =======================================================
  // ACTIONS
  // =======================================================

  actions: {
    marginTop: 13,

    flexDirection: 'row',

    gap: 10,
  },

  callButton: {
    flex: 1,

    minHeight: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 11,
  },

  callButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  messageButton: {
    flex: 1,

    minHeight: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 11,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      `${PRIMARY_COLOR}45`,
  },

  messageButtonText: {
    color: PRIMARY_COLOR,

    fontSize: 12,

    fontWeight: '700',
  },

  // =======================================================
  // NO PHONE
  // =======================================================

  noPhoneContainer: {
    marginTop: 13,

    minHeight: 45,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    paddingHorizontal: 14,

    borderRadius: 10,

    backgroundColor: '#F8FAFC',
  },

  noPhoneContainerText: {
    flex: 1,

    color: '#94A3B8',

    fontSize: 10,

    lineHeight: 14,

    fontWeight: '500',
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 18,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  loadingSpinner: {
    marginTop: 20,
  },

  loadingTitle: {
    marginTop: 13,

    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 5,

    color: TEXT_SECONDARY,

    fontSize: 11,
  },

});