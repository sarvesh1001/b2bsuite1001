// apps/prayantra-b2b/src/screens/module/administration/CreateWorkCenterScreen.tsx

import React, { useMemo, useState } from 'react';

import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
  TextInput,
  Switch,
} from 'react-native-paper';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  z,
} from 'zod';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  createWorkCenter,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SELECTED_ITEM_BG,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// TIMEZONES
// =========================================================

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

// =========================================================
// VALIDATION
// =========================================================

const schema = z.object({
  work_center_code: z
    .string()
    .trim()
    .min(1, 'Work center code is required'),

  name: z
    .string()
    .trim()
    .min(1, 'Work center name is required'),

  description: z
    .string()
    .optional(),

  timezone: z
    .string()
    .min(1, 'Timezone is required'),

  is_active: z
    .boolean(),
});

type FormData = z.infer<typeof schema>;

type NavigationProp =
  StackNavigationProp<any>;

// =========================================================
// COMPONENT
// =========================================================

export default function CreateWorkCenterScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // STATE
  // =======================================================

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    timezoneSearch,
    setTimezoneSearch,
  ] = useState('');

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      work_center_code: '',
      name: '',
      description: '',
      timezone: 'Asia/Kolkata',
      is_active: true,
    },
  });

  const selectedTimezone =
    watch('timezone');

  const isActive =
    watch('is_active');

  // =======================================================
  // FILTER TIMEZONES
  // =======================================================

  const filteredTimezones =
    useMemo(() => {
      const query =
        timezoneSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return TIMEZONES;
      }

      return TIMEZONES.filter(
        (timezone) =>
          timezone
            .toLowerCase()
            .includes(query)
      );
    }, [timezoneSearch]);

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (
    data: FormData
  ) => {
    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      Alert.alert(
        'Authentication Error',
        'Your authentication session is missing. Please log in again.'
      );

      return;
    }

    try {
      await createWorkCenter(
        companyId,
        deviceId,
        data,
        accessToken
      );

      Alert.alert(
        'Work Center Created',
        'The work center has been created successfully.',
        [
          {
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Create work center error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create the work center. Please try again.';

      Alert.alert(
        'Unable to Create',
        message
      );
    }
  };

  // =======================================================
  // TIMEZONE
  // =======================================================

  const openTimezoneModal = () => {
    setTimezoneSearch('');
    setModalVisible(true);
  };

  const closeTimezoneModal = () => {
    setTimezoneSearch('');
    setModalVisible(false);
  };

  const selectTimezone = (
    timezone: string
  ) => {
    setValue(
      'timezone',
      timezone,
      {
        shouldValidate: true,
      }
    );

    closeTimezoneModal();
  };

  // =======================================================
  // MAIN
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

            {/* Back */}

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

            {/* Title */}

            <View
              style={
                styles.headerTitleContainer
              }
            >

              <Text
                style={styles.headerEyebrow}
              >
                ADMINISTRATION
              </Text>

              <Text
                style={styles.headerTitle}
              >
                Create Work Center
              </Text>

            </View>

            {/* Header icon */}

            <View style={styles.headerIcon}>
              <Icon
                name="factory"
                size={22}
                color="#FFFFFF"
              />
            </View>

          </View>

          {/* Breadcrumb */}

          <View style={styles.breadcrumb}>

            <Text style={styles.breadcrumbText}>
              Administration
            </Text>

            <Icon
              name="chevron-right"
              size={14}
              color="rgba(255,255,255,0.55)"
            />

            <Text
              style={[
                styles.breadcrumbText,
                styles.breadcrumbActive,
              ]}
            >
              Work Centers
            </Text>

            <Icon
              name="chevron-right"
              size={14}
              color="rgba(255,255,255,0.55)"
            />

            <Text
              style={[
                styles.breadcrumbText,
                styles.breadcrumbActive,
              ]}
            >
              New
            </Text>

          </View>

        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =================================================
              INTRO
          ================================================= */}

          <View style={styles.introSection}>

            <View
              style={styles.introIcon}
            >
              <Icon
                name="factory"
                size={24}
                color={PRIMARY_COLOR}
              />
            </View>

            <View style={styles.introText}>

              <Text
                style={styles.introTitle}
              >
                Work Center Details
              </Text>

              <Text
                style={styles.introDescription}
              >
                Add the basic information for
                this work center.
              </Text>

            </View>

          </View>

          {/* =================================================
              BASIC INFORMATION CARD
          ================================================= */}

          <View style={styles.formCard}>

            <View
              style={styles.sectionHeading}
            >

              <View
                style={[
                  styles.sectionIcon,
                  {
                    backgroundColor:
                      `${PRIMARY_COLOR}12`,
                  },
                ]}
              >
                <Icon
                  name="information-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Basic Information
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Required details
                </Text>
              </View>

            </View>

            {/* =================================================
                WORK CENTER CODE
            ================================================= */}

            <View style={styles.fieldContainer}>

              <Text
                style={styles.fieldLabel}
              >
                Work Center Code
                <Text
                  style={styles.required}
                >
                  {' '}*
                </Text>
              </Text>

              <Controller
                control={control}
                name="work_center_code"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <TextInput
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. WC-001"
                    placeholderTextColor="#A0A9B5"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    error={
                      !!errors.work_center_code
                    }
                    style={
                      styles.textInput
                    }
                    outlineColor={
                      errors.work_center_code
                        ? ERROR_COLOR
                        : BORDER_COLOR
                    }
                    activeOutlineColor={
                      errors.work_center_code
                        ? ERROR_COLOR
                        : PRIMARY_COLOR
                    }
                    textColor={TEXT_PRIMARY}
                    theme={{
                      colors: {
                        primary:
                          PRIMARY_COLOR,
                        error:
                          ERROR_COLOR,
                      },
                    }}
                  />
                )}
              />

              {errors.work_center_code && (
                <View
                  style={
                    styles.errorRow
                  }
                >
                  <Icon
                    name="alert-circle-outline"
                    size={14}
                    color={ERROR_COLOR}
                  />

                  <Text
                    style={styles.error}
                  >
                    {
                      errors
                        .work_center_code
                        .message
                    }
                  </Text>
                </View>
              )}

            </View>

            {/* =================================================
                NAME
            ================================================= */}

            <View style={styles.fieldContainer}>

              <Text
                style={styles.fieldLabel}
              >
                Work Center Name
                <Text
                  style={styles.required}
                >
                  {' '}*
                </Text>
              </Text>

              <Controller
                control={control}
                name="name"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <TextInput
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Assembly Line 1"
                    placeholderTextColor="#A0A9B5"
                    autoCapitalize="sentences"
                    error={
                      !!errors.name
                    }
                    style={
                      styles.textInput
                    }
                    outlineColor={
                      errors.name
                        ? ERROR_COLOR
                        : BORDER_COLOR
                    }
                    activeOutlineColor={
                      errors.name
                        ? ERROR_COLOR
                        : PRIMARY_COLOR
                    }
                    textColor={TEXT_PRIMARY}
                    theme={{
                      colors: {
                        primary:
                          PRIMARY_COLOR,
                        error:
                          ERROR_COLOR,
                      },
                    }}
                  />
                )}
              />

              {errors.name && (
                <View
                  style={
                    styles.errorRow
                  }
                >
                  <Icon
                    name="alert-circle-outline"
                    size={14}
                    color={ERROR_COLOR}
                  />

                  <Text
                    style={styles.error}
                  >
                    {
                      errors.name
                        .message
                    }
                  </Text>
                </View>
              )}

            </View>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <View style={styles.fieldContainer}>

              <Text
                style={styles.fieldLabel}
              >
                Description
              </Text>

              <Controller
                control={control}
                name="description"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <TextInput
                    mode="outlined"
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Add a short description..."
                    placeholderTextColor="#A0A9B5"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[
                      styles.textInput,
                      styles.descriptionInput,
                    ]}
                    outlineColor={
                      BORDER_COLOR
                    }
                    activeOutlineColor={
                      PRIMARY_COLOR
                    }
                    textColor={TEXT_PRIMARY}
                    theme={{
                      colors: {
                        primary:
                          PRIMARY_COLOR,
                      },
                    }}
                  />
                )}
              />

              <Text
                style={styles.helperText}
              >
                Optional. Describe the purpose
                or function of this work center.
              </Text>

            </View>

          </View>

          {/* =================================================
              LOCATION & TIMEZONE
          ================================================= */}

          <View style={styles.formCard}>

            <View
              style={styles.sectionHeading}
            >

              <View
                style={[
                  styles.sectionIcon,
                  {
                    backgroundColor:
                      '#3B82F612',
                  },
                ]}
              >
                <Icon
                  name="map-clock-outline"
                  size={18}
                  color="#3B82F6"
                />
              </View>

              <View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Regional Settings
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Time and location
                </Text>

              </View>

            </View>

            {/* Timezone */}

            <View style={styles.fieldContainer}>

              <Text
                style={styles.fieldLabel}
              >
                Timezone
                <Text
                  style={styles.required}
                >
                  {' '}*
                </Text>
              </Text>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  errors.timezone &&
                    styles.selectButtonError,
                ]}
                onPress={
                  openTimezoneModal
                }
                activeOpacity={0.8}
              >

                <View
                  style={
                    styles.selectLeft
                  }
                >

                  <View
                    style={[
                      styles.selectIcon,
                      {
                        backgroundColor:
                          `${PRIMARY_COLOR}10`,
                      },
                    ]}
                  >
                    <Icon
                      name="earth"
                      size={19}
                      color={PRIMARY_COLOR}
                    />
                  </View>

                  <View
                    style={
                      styles.selectTextContainer
                    }
                  >

                    <Text
                      style={
                        styles.selectValue
                      }
                      numberOfLines={1}
                    >
                      {selectedTimezone}
                    </Text>

                    <Text
                      style={
                        styles.selectHint
                      }
                    >
                      Tap to change timezone
                    </Text>

                  </View>

                </View>

                <Icon
                  name="chevron-down"
                  size={22}
                  color={TEXT_SECONDARY}
                />

              </TouchableOpacity>

              {errors.timezone && (
                <View
                  style={
                    styles.errorRow
                  }
                >
                  <Icon
                    name="alert-circle-outline"
                    size={14}
                    color={ERROR_COLOR}
                  />

                  <Text
                    style={styles.error}
                  >
                    {
                      errors.timezone
                        .message
                    }
                  </Text>
                </View>
              )}

            </View>

          </View>

          {/* =================================================
              STATUS
          ================================================= */}

          <View style={styles.statusCard}>

            <View
              style={[
                styles.statusIcon,
                {
                  backgroundColor:
                    isActive
                      ? '#10B98112'
                      : '#94A3B812',
                },
              ]}
            >
              <Icon
                name={
                  isActive
                    ? 'check-circle-outline'
                    : 'pause-circle-outline'
                }
                size={22}
                color={
                  isActive
                    ? '#10B981'
                    : '#94A3B8'
                }
              />
            </View>

            <View
              style={styles.statusText}
            >

              <Text
                style={styles.statusTitle}
              >
                Work Center Status
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                {isActive
                  ? 'This work center is active and available for use.'
                  : 'This work center is inactive and unavailable for use.'}
              </Text>

            </View>

            <Controller
              control={control}
              name="is_active"
              render={({
                field: {
                  onChange,
                  value,
                },
              }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  color={PRIMARY_COLOR}
                  trackColor={{
                    false: '#CBD5E1',
                    true: `${PRIMARY_COLOR}70`,
                  }}
                  thumbColor={
                    value
                      ? PRIMARY_COLOR
                      : '#F8FAFC'
                  }
                />
              )}
            />

          </View>

          {/* =================================================
              REQUIRED NOTE
          ================================================= */}

          <View style={styles.requiredNote}>

            <Icon
              name="information-outline"
              size={15}
              color={TEXT_SECONDARY}
            />

            <Text
              style={styles.requiredNoteText}
            >
              Fields marked with * are required.
            </Text>

          </View>

          {/* =================================================
              CREATE BUTTON
          ================================================= */}

          <TouchableOpacity
            onPress={handleSubmit(
              onSubmit
            )}
            disabled={isSubmitting}
            activeOpacity={0.88}
            style={[
              styles.submitButton,
              isSubmitting &&
                styles.submitButtonDisabled,
            ]}
          >

            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.submitGradient}
            >

              {isSubmitting ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={[
                      styles.submitText,
                      {
                        marginLeft: 9,
                      },
                    ]}
                  >
                    Creating Work Center...
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name="plus-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={[
                      styles.submitText,
                      {
                        marginLeft: 8,
                      },
                    ]}
                  >
                    Create Work Center
                  </Text>

                  <Icon
                    name="arrow-right"
                    size={19}
                    color="rgba(255,255,255,0.85)"
                    style={{
                      marginLeft: 'auto',
                    }}
                  />
                </>
              )}

            </LinearGradient>

          </TouchableOpacity>

          <View
            style={styles.bottomSpace}
          />

        </ScrollView>

      </KeyboardAvoidingView>

      {/* =====================================================
          TIMEZONE MODAL
      ===================================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={
          closeTimezoneModal
        }
      >

        <View
          style={styles.modalOverlay}
        >

          <View
            style={styles.modalContent}
          >

            {/* Modal handle */}

            <View
              style={styles.modalHandle}
            />

            {/* Modal header */}

            <View
              style={styles.modalHeader}
            >

              <View>

                <Text
                  style={styles.modalEyebrow}
                >
                  REGIONAL SETTINGS
                </Text>

                <Text
                  style={styles.modalTitle}
                >
                  Select Timezone
                </Text>

              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={
                  closeTimezoneModal
                }
                activeOpacity={0.8}
              >
                <Icon
                  name="close"
                  size={20}
                  color={TEXT_SECONDARY}
                />
              </TouchableOpacity>

            </View>

            {/* Search */}

            <View
              style={styles.timezoneSearch}
            >

              <Icon
                name="magnify"
                size={20}
                color="#94A3B8"
              />

              <TextInput
                value={timezoneSearch}
                onChangeText={
                  setTimezoneSearch
                }
                placeholder="Search timezone"
                placeholderTextColor="#94A3B8"
                style={
                  styles.timezoneSearchInput
                }
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />

              {timezoneSearch.length >
                0 && (
                <TouchableOpacity
                  onPress={() =>
                    setTimezoneSearch('')
                  }
                >
                  <Icon
                    name="close-circle"
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              )}

            </View>

            {/* Current timezone */}

            <View
              style={styles.currentTimezone}
            >

              <View
                style={[
                  styles.currentTimezoneIcon,
                  {
                    backgroundColor:
                      `${PRIMARY_COLOR}12`,
                  },
                ]}
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View
                style={
                  styles.currentTimezoneText
                }
              >

                <Text
                  style={
                    styles.currentTimezoneLabel
                  }
                >
                  Current selection
                </Text>

                <Text
                  style={
                    styles.currentTimezoneValue
                  }
                >
                  {selectedTimezone}
                </Text>

              </View>

            </View>

            {/* List */}

            <FlatList
              data={filteredTimezones}
              keyExtractor={(item) =>
                item
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.timezoneList
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({
                item,
              }) => {
                const selected =
                  selectedTimezone ===
                  item;

                return (
                  <TouchableOpacity
                    style={[
                      styles.timezoneItem,
                      selected &&
                        styles.timezoneItemSelected,
                    ]}
                    onPress={() =>
                      selectTimezone(
                        item
                      )
                    }
                    activeOpacity={0.8}
                  >

                    <View
                      style={[
                        styles.timezoneItemIcon,
                        selected && {
                          backgroundColor:
                            `${PRIMARY_COLOR}12`,
                        },
                      ]}
                    >
                      <Icon
                        name="earth"
                        size={18}
                        color={
                          selected
                            ? PRIMARY_COLOR
                            : '#94A3B8'
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.timezoneItemText,
                        selected &&
                          styles.timezoneItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>

                    {selected && (
                      <Icon
                        name="check-circle"
                        size={20}
                        color={
                          PRIMARY_COLOR
                        }
                      />
                    )}

                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View
                  style={
                    styles.noTimezone
                  }
                >
                  <Icon
                    name="earth-off"
                    size={30}
                    color="#CBD5E1"
                  />

                  <Text
                    style={
                      styles.noTimezoneTitle
                    }
                  >
                    No timezone found
                  </Text>

                  <Text
                    style={
                      styles.noTimezoneText
                    }
                  >
                    Try a different search.
                  </Text>
                </View>
              }
            />

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // GENERAL
  // =======================================================

  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  flex: {
    flex: 1,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingTop: 11,
    paddingBottom: 16,

    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
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
    marginTop: 3,

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

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 14,

    paddingLeft: 52,
  },

  breadcrumbText: {
    color:
      'rgba(255,255,255,0.55)',

    fontSize: 9,

    fontWeight: '500',
  },

  breadcrumbActive: {
    color:
      'rgba(255,255,255,0.88)',

    fontWeight: '600',
  },

  // =======================================================
  // SCROLL
  // =======================================================

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // =======================================================
  // INTRO
  // =======================================================

  introSection: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 17,
  },

  introIcon: {
    width: 46,
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  introText: {
    flex: 1,
    marginLeft: 11,
  },

  introTitle: {
    color: TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',
  },

  introDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 10,

    lineHeight: 15,

    fontWeight: '500',
  },

  // =======================================================
  // FORM CARD
  // =======================================================

  formCard: {
    padding: 17,

    marginBottom: 13,

    borderRadius: 17,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,
    borderColor: '#E5EAF0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 7,

    elevation: 1,
  },

  // =======================================================
  // SECTION HEADER
  // =======================================================

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingBottom: 15,

    marginBottom: 2,

    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },

  sectionIcon: {
    width: 37,
    height: 37,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  sectionTitle: {
    marginLeft: 10,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  sectionSubtitle: {
    marginLeft: 10,
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // FIELD
  // =======================================================

  fieldContainer: {
    marginTop: 17,
  },

  fieldLabel: {
    marginBottom: 7,

    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '600',
  },

  required: {
    color: ERROR_COLOR,
  },

  textInput: {
    minHeight: 50,

    backgroundColor:
      CARD_BACKGROUND,

    fontSize: 13,
  },

  descriptionInput: {
    minHeight: 105,
    paddingTop: 12,
  },

  helperText: {
    marginTop: 6,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 14,
  },

  // =======================================================
  // ERROR
  // =======================================================

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 5,

    paddingLeft: 2,
  },

  error: {
    marginLeft: 4,

    color: ERROR_COLOR,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // SELECT
  // =======================================================

  selectButton: {
    minHeight: 62,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 12,

    borderWidth: 1,
    borderColor: BORDER_COLOR,

    borderRadius: 10,

    backgroundColor:
      CARD_BACKGROUND,
  },

  selectButtonError: {
    borderColor: ERROR_COLOR,
  },

  selectLeft: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',
  },

  selectIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  selectTextContainer: {
    flex: 1,

    marginLeft: 10,
  },

  selectValue: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '600',
  },

  selectHint: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 8,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS CARD
  // =======================================================

  statusCard: {
    minHeight: 82,

    padding: 14,

    marginBottom: 13,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 16,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,
    borderColor: '#E5EAF0',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,

    elevation: 1,
  },

  statusIcon: {
    width: 42,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,
  },

  statusText: {
    flex: 1,

    marginLeft: 10,
    marginRight: 8,
  },

  statusTitle: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  statusDescription: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  // =======================================================
  // REQUIRED NOTE
  // =======================================================

  requiredNote: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 3,
    marginBottom: 14,

    paddingHorizontal: 2,
  },

  requiredNoteText: {
    marginLeft: 5,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // SUBMIT
  // =======================================================

  submitButton: {
    minHeight: 55,

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor: '#6D35A5',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,

    elevation: 5,
  },

  submitButtonDisabled: {
    opacity: 0.75,
  },

  submitGradient: {
    minHeight: 55,

    paddingHorizontal: 17,

    flexDirection: 'row',
    alignItems: 'center',
  },

  submitText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '700',

    letterSpacing: 0.1,
  },

  bottomSpace: {
    height: 30,
  },

  // =======================================================
  // MODAL
  // =======================================================

  modalOverlay: {
    flex: 1,

    justifyContent: 'flex-end',

    backgroundColor:
      'rgba(15,23,42,0.48)',
  },

  modalContent: {
    maxHeight: '82%',

    paddingTop: 9,
    paddingBottom: 20,

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    backgroundColor:
      CARD_BACKGROUND,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,

    elevation: 10,
  },

  modalHandle: {
    alignSelf: 'center',

    width: 38,
    height: 4,

    marginBottom: 15,

    borderRadius: 3,

    backgroundColor: '#CBD5E1',
  },

  modalHeader: {
    paddingHorizontal: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalEyebrow: {
    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 0.8,
  },

  modalTitle: {
    marginTop: 4,

    color: TEXT_PRIMARY,

    fontSize: 19,

    fontWeight: '700',
  },

  modalClose: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor: '#F1F5F9',
  },

  // =======================================================
  // TIMEZONE SEARCH
  // =======================================================

  timezoneSearch: {
    height: 48,

    marginHorizontal: 20,
    marginTop: 17,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: BORDER_COLOR,

    borderRadius: 11,

    backgroundColor: '#F8FAFC',
  },

  timezoneSearchInput: {
    flex: 1,

    marginLeft: 7,

    paddingVertical: 0,

    backgroundColor:
      'transparent',

    color: TEXT_PRIMARY,

    fontSize: 12,
  },

  // =======================================================
  // CURRENT TIMEZONE
  // =======================================================

  currentTimezone: {
    marginHorizontal: 20,
    marginTop: 13,

    padding: 11,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 11,

    backgroundColor:
      `${PRIMARY_COLOR}08`,

    borderWidth: 1,
    borderColor:
      `${PRIMARY_COLOR}18`,
  },

  currentTimezoneIcon: {
    width: 35,
    height: 35,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,
  },

  currentTimezoneText: {
    marginLeft: 9,
  },

  currentTimezoneLabel: {
    color: TEXT_SECONDARY,

    fontSize: 8,

    fontWeight: '600',
  },

  currentTimezoneValue: {
    marginTop: 2,

    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // TIMEZONE LIST
  // =======================================================

  timezoneList: {
    paddingHorizontal: 20,

    paddingTop: 10,
    paddingBottom: 15,
  },

  timezoneItem: {
    minHeight: 55,

    paddingHorizontal: 10,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 11,

    marginBottom: 4,
  },

  timezoneItemSelected: {
    backgroundColor:
      SELECTED_ITEM_BG ||
      `${PRIMARY_COLOR}08`,
  },

  timezoneItemIcon: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,
  },

  timezoneItemText: {
    flex: 1,

    marginLeft: 9,

    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '500',
  },

  timezoneItemTextSelected: {
    color: PRIMARY_COLOR,

    fontWeight: '700',
  },

  // =======================================================
  // NO TIMEZONE
  // =======================================================

  noTimezone: {
    alignItems: 'center',

    paddingVertical: 45,
  },

  noTimezoneTitle: {
    marginTop: 10,

    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '700',
  },

  noTimezoneText: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 10,
  },
});