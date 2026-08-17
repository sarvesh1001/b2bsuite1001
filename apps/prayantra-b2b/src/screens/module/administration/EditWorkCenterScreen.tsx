// apps/prayantra-b2b/src/screens/modules/administration/EditWorkCenterScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
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
  useForm,
  Controller,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  z,
} from 'zod';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// API
import {
  getWorkCenterByCode,
  updateWorkCenter,
} from '@b2b/api-client';

// Store
import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  RootStackParamList,
} from '../../../navigation';

// Colors
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// VALIDATION
// =========================================================

const updateWorkCenterSchema = z.object({
  name: z
    .string()
    .min(1, 'Work center name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),

  description: z
    .string()
    .max(
      500,
      'Description cannot exceed 500 characters'
    )
    .optional()
    .nullable(),

  is_active: z
    .boolean()
    .optional(),
});

type FormData = z.infer<
  typeof updateWorkCenterSchema
>;

// =========================================================
// NAVIGATION
// =========================================================

type EditWorkCenterRouteProp =
  RouteProp<
    RootStackParamList,
    'EditWorkCenter'
  >;

type NavigationProp =
  StackNavigationProp<any>;

// =========================================================
// SCREEN
// =========================================================

export default function EditWorkCenterScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const route =
    useRoute<EditWorkCenterRouteProp>();

  const { code } = route.params;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [workCenterData, setWorkCenterData] =
    useState<any>(null);

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<FormData>({
    resolver: zodResolver(
      updateWorkCenterSchema
    ),

    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  const isActive = watch(
    'is_active'
  );

  const descriptionValue =
    watch('description') || '';

  // =======================================================
  // FETCH WORK CENTER
  // =======================================================

  useEffect(() => {
    const fetchData = async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        Alert.alert(
          'Authentication Required',
          'Your session information is missing. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await getWorkCenterByCode(
            companyId,
            deviceId,
            code,
            accessToken
          );

        if (
          response.success &&
          response.data
        ) {
          setWorkCenterData(
            response.data
          );

          reset({
            name:
              response.data.name || '',

            description:
              response.data.description ||
              '',

            is_active:
              response.data.is_active ??
              true,
          });
        } else {
          Alert.alert(
            'Work Center Not Found',
            'The requested work center could not be found.',
            [
              {
                text: 'OK',
                onPress: () =>
                  navigation.goBack(),
              },
            ]
          );
        }
      } catch (error: any) {
        console.error(
          'Failed to load work center:',
          error
        );

        Alert.alert(
          'Unable to Load',
          error?.message ||
            'Failed to load the work center.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    code,
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // SAVE
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
        'Authentication Required',
        'You are no longer logged in.'
      );

      return;
    }

    try {
      setSaving(true);

      const payload: any = {};

      if (
        data.name !== undefined
      ) {
        payload.name =
          data.name.trim();
      }

      if (
        data.description !== undefined
      ) {
        payload.description =
          data.description?.trim() ||
          '';
      }

      if (
        data.is_active !== undefined
      ) {
        payload.is_active =
          data.is_active;
      }

      const response =
        await updateWorkCenter(
          companyId,
          deviceId,
          code,
          payload,
          accessToken
        );

      if (response.success) {
        Alert.alert(
          'Changes Saved',
          'The work center has been updated successfully.',
          [
            {
              text: 'Done',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Update Failed',
          response.message ||
            'Unable to update the work center.'
        );
      }
    } catch (error: any) {
      console.error(
        'Update work center error:',
        error
      );

      const message =
        error?.response?.data?.error ||
        error?.message ||
        'An unexpected error occurred.';

      Alert.alert(
        'Update Failed',
        message
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // CANCEL
  // =======================================================

  const handleBack = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          {
            text: 'Stay',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );

      return;
    }

    navigation.goBack();
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>

          <View style={styles.loadingIcon}>
            <Icon
              name="factory"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>
            Loading Work Center
          </Text>

          <Text style={styles.loadingSubtitle}>
            Please wait...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
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
              activeOpacity={0.8}
              onPress={handleBack}
              style={styles.backButton}
            >
              <Icon
                name="arrow-left"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.headerTitleArea}>

              <Text style={styles.headerEyebrow}>
                ADMINISTRATION
              </Text>

              <Text style={styles.headerTitle}>
                Edit Work Center
              </Text>

            </View>

            <View style={styles.headerSpacer} />

          </View>

        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >

          {/* =================================================
              WORK CENTER IDENTITY
          ================================================= */}

          <View style={styles.identityCard}>

            <View
              style={styles.identityIcon}
            >
              <Icon
                name="factory"
                size={27}
                color={PRIMARY_COLOR}
              />
            </View>

            <View
              style={styles.identityContent}
            >

              <Text
                style={styles.identityLabel}
              >
                WORK CENTER
              </Text>

              <Text
                numberOfLines={1}
                style={styles.identityName}
              >
                {workCenterData?.name ||
                  'Work Center'}
              </Text>

              <View
                style={styles.codeRow}
              >

                <Icon
                  name="identifier"
                  size={13}
                  color={TEXT_SECONDARY}
                />

                <Text
                  style={styles.codeText}
                >
                  {code}
                </Text>

              </View>

            </View>

            <View
              style={[
                styles.statusBadge,
                isActive
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >

              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      isActive
                        ? '#16A34A'
                        : '#94A3B8',
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: isActive
                      ? '#15803D'
                      : '#64748B',
                  },
                ]}
              >
                {isActive
                  ? 'Active'
                  : 'Inactive'}
              </Text>

            </View>

          </View>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <View style={styles.section}>

            <View style={styles.sectionHeader}>

              <View
                style={styles.sectionIcon}
              >
                <Icon
                  name="information-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View>

                <Text
                  style={styles.sectionTitle}
                >
                  Basic Information
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Update the work center details
                </Text>

              </View>

            </View>

            {/* NAME */}

            <View style={styles.field}>

              <Text style={styles.fieldLabel}>
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
                    placeholder="Enter work center name"
                    placeholderTextColor="#A0A9B5"
                    error={
                      !!errors.name
                    }
                    style={styles.input}
                    contentStyle={
                      styles.inputContent
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
                    theme={{
                      roundness: 11,
                    }}
                    maxLength={100}
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
                    style={
                      styles.errorText
                    }
                  >
                    {errors.name.message}
                  </Text>
                </View>
              )}

            </View>

            {/* DESCRIPTION */}

            <View style={styles.field}>

              <View
                style={
                  styles.labelWithCount
                }
              >

                <Text
                  style={styles.fieldLabel}
                >
                  Description
                </Text>

                <Text
                  style={
                    styles.characterCount
                  }
                >
                  {descriptionValue.length}/500
                </Text>

              </View>

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
                    placeholder="Add a description..."
                    placeholderTextColor="#A0A9B5"
                    multiline
                    numberOfLines={5}
                    maxLength={500}
                    style={[
                      styles.input,
                      styles.descriptionInput,
                    ]}
                    contentStyle={[
                      styles.inputContent,
                      styles.descriptionContent,
                    ]}
                    outlineColor={
                      BORDER_COLOR
                    }
                    activeOutlineColor={
                      PRIMARY_COLOR
                    }
                    theme={{
                      roundness: 11,
                    }}
                  />
                )}
              />

            </View>

          </View>

          {/* =================================================
              STATUS SECTION
          ================================================= */}

          <View style={styles.section}>

            <View style={styles.sectionHeader}>

              <View
                style={styles.sectionIcon}
              >
                <Icon
                  name="toggle-switch-outline"
                  size={19}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View>

                <Text
                  style={styles.sectionTitle}
                >
                  Status
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Control whether this work center is active
                </Text>

              </View>

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
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    onChange(
                      !value
                    )
                  }
                  style={[
                    styles.statusControl,
                    value
                      ? styles.statusControlActive
                      : styles.statusControlInactive,
                  ]}
                >

                  <View
                    style={[
                      styles.statusControlIcon,
                      {
                        backgroundColor:
                          value
                            ? '#DCFCE7'
                            : '#F1F5F9',
                      },
                    ]}
                  >
                    <Icon
                      name={
                        value
                          ? 'check-circle-outline'
                          : 'pause-circle-outline'
                      }
                      size={22}
                      color={
                        value
                          ? '#16A34A'
                          : '#64748B'
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.statusControlText
                    }
                  >

                    <Text
                      style={
                        styles.statusControlTitle
                      }
                    >
                      {value
                        ? 'Work center is active'
                        : 'Work center is inactive'}
                    </Text>

                    <Text
                      style={
                        styles.statusControlSubtitle
                      }
                    >
                      {value
                        ? 'This work center can be used in operations.'
                        : 'This work center will not be available for use.'}
                    </Text>

                  </View>

                  <Switch
                    value={
                      value || false
                    }
                    onValueChange={
                      onChange
                    }
                    color={
                      PRIMARY_COLOR
                    }
                  />

                </TouchableOpacity>
              )}
            />

          </View>

          {/* =================================================
              CODE INFORMATION
          ================================================= */}

          <View
            style={styles.infoCard}
          >

            <View
              style={styles.infoIcon}
            >
              <Icon
                name="lock-outline"
                size={18}
                color="#64748B"
              />
            </View>

            <View
              style={styles.infoContent}
            >

              <Text
                style={styles.infoTitle}
              >
                Work Center Code
              </Text>

              <Text
                style={styles.infoDescription}
              >
                The code is a unique identifier and
                cannot be changed from this screen.
              </Text>

              <View
                style={styles.codePill}
              >
                <Text
                  style={styles.codePillText}
                >
                  {code}
                </Text>
              </View>

            </View>

          </View>

          {/* =================================================
              SAVE BUTTON
          ================================================= */}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleSubmit(
              onSubmit
            )}
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
          >

            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.saveGradient}
            >

              {saving ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={styles.saveText}
                  >
                    Saving Changes...
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name="check"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.saveText}
                  >
                    Save Changes
                  </Text>
                </>
              )}

            </LinearGradient>

          </TouchableOpacity>

          {/* Cancel */}

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={saving}
            onPress={handleBack}
            style={styles.cancelButton}
          >

            <Text
              style={styles.cancelText}
            >
              Cancel
            </Text>

          </TouchableOpacity>

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

  container: {
    flex: 1,
    backgroundColor:
      BACKGROUND_COLOR,
  },

  keyboardContainer: {
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
      'rgba(255,255,255,0.14)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  headerTitleArea: {
    marginLeft: 12,
  },

  headerEyebrow: {
    color:
      'rgba(255,255,255,0.65)',

    fontSize: 9,

    fontWeight: '700',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,

    color: '#FFFFFF',

    fontSize: 20,

    fontWeight: '700',

    letterSpacing: -0.2,
  },

  headerSpacer: {
    flex: 1,
  },

  // =======================================================
  // CONTENT
  // =======================================================

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // =======================================================
  // IDENTITY CARD
  // =======================================================

  identityCard: {
    minHeight: 88,

    padding: 15,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      CARD_BACKGROUND,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.04,

    shadowRadius: 8,

    elevation: 2,
  },

  identityIcon: {
    width: 55,
    height: 55,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 15,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  identityContent: {
    flex: 1,

    marginLeft: 12,
  },

  identityLabel: {
    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 1,
  },

  identityName: {
    marginTop: 3,

    color: TEXT_PRIMARY,

    fontSize: 16,

    fontWeight: '700',
  },

  codeRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 5,
  },

  codeText: {
    marginLeft: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // STATUS BADGE
  // =======================================================

  statusBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 8,

    paddingVertical: 6,

    borderRadius: 20,
  },

  statusActive: {
    backgroundColor: '#F0FDF4',
  },

  statusInactive: {
    backgroundColor: '#F8FAFC',
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,
  },

  statusText: {
    fontSize: 9,

    fontWeight: '700',
  },

  // =======================================================
  // SECTION
  // =======================================================

  section: {
    marginTop: 18,

    padding: 17,

    backgroundColor:
      CARD_BACKGROUND,

    borderRadius: 16,

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

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 18,
  },

  sectionIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
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
  // FORM
  // =======================================================

  field: {
    marginBottom: 16,
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

  labelWithCount: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 7,
  },

  characterCount: {
    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
  },

  input: {
    backgroundColor:
      CARD_BACKGROUND,

    fontSize: 13,
  },

  inputContent: {
    minHeight: 48,

    paddingHorizontal: 13,

    color: TEXT_PRIMARY,
  },

  descriptionInput: {
    minHeight: 120,
  },

  descriptionContent: {
    minHeight: 105,

    paddingTop: 12,

    textAlignVertical: 'top',
  },

  errorRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 5,

    marginLeft: 4,
  },

  errorText: {
    marginLeft: 4,

    color: ERROR_COLOR,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS CONTROL
  // =======================================================

  statusControl: {
    minHeight: 82,

    padding: 12,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 13,

    borderWidth: 1,
  },

  statusControlActive: {
    backgroundColor: '#F0FDF4',

    borderColor: '#BBF7D0',
  },

  statusControlInactive: {
    backgroundColor: '#F8FAFC',

    borderColor: '#E2E8F0',
  },

  statusControlIcon: {
    width: 39,
    height: 39,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  statusControlText: {
    flex: 1,

    marginLeft: 10,

    marginRight: 8,
  },

  statusControlTitle: {
    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  statusControlSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 8.5,

    lineHeight: 13,
  },

  // =======================================================
  // INFO CARD
  // =======================================================

  infoCard: {
    marginTop: 18,

    padding: 14,

    flexDirection: 'row',

    borderRadius: 14,

    backgroundColor:
      '#F8FAFC',

    borderWidth: 1,

    borderColor: '#E5EAF0',
  },

  infoIcon: {
    width: 35,
    height: 35,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      '#EEF2F6',
  },

  infoContent: {
    flex: 1,

    marginLeft: 10,
  },

  infoTitle: {
    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  infoDescription: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 14,
  },

  codePill: {
    alignSelf: 'flex-start',

    marginTop: 8,

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 6,

    backgroundColor:
      '#E2E8F0',
  },

  codePillText: {
    color: '#475569',

    fontSize: 9,

    fontWeight: '700',

    letterSpacing: 0.4,
  },

  // =======================================================
  // SAVE
  // =======================================================

  saveButton: {
    marginTop: 22,

    borderRadius: 12,

    overflow: 'hidden',

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.2,

    shadowRadius: 10,

    elevation: 5,
  },

  saveButtonDisabled: {
    opacity: 0.8,
  },

  saveGradient: {
    minHeight: 53,

    paddingHorizontal: 18,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  saveText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '700',

    letterSpacing: 0.1,
  },

  // =======================================================
  // CANCEL
  // =======================================================

  cancelButton: {
    minHeight: 45,

    marginTop: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '600',
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
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingTitle: {
    marginTop: 13,

    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 10,
  },
});