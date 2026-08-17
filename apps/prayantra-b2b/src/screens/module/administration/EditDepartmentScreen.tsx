// apps/prayantra-b2b/src/screens/module/administration/EditDepartmentScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
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
  useRoute,
  RouteProp,
} from '@react-navigation/native';

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
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getRootDepartments,
  updateDepartment,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  RootStackParamList,
} from '../../../navigation';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type EditDepartmentRouteProp = RouteProp<
  RootStackParamList,
  'EditDepartment'
>;

// =========================================================
// VALIDATION
// =========================================================

const schema = z.object({
  department_name: z
    .string()
    .min(1, 'Department name is required'),

  module_code: z
    .string()
    .optional()
    .nullable(),

  is_active: z
    .boolean()
    .optional(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// SCREEN
// =========================================================

export default function EditDepartmentScreen() {
  const navigation = useNavigation();

  const route =
    useRoute<EditDepartmentRouteProp>();

  const {
    departmentId,
  } = route.params;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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
    resolver: zodResolver(schema),

    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true,
    },
  });

  const isActive =
    watch('is_active');

  // =======================================================
  // FETCH DEPARTMENT
  // =======================================================

  useEffect(() => {
    const fetchDepartment =
      async () => {
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

          setLoading(false);
          return;
        }

        try {
          setLoading(true);

          const response =
            await getRootDepartments(
              companyId,
              deviceId,
              accessToken
            );

          const department =
            response.data?.find(
              (item) =>
                item.department_id ===
                departmentId
            );

          if (!department) {
            Alert.alert(
              'Department Not Found',
              'The department you are trying to edit could not be found.',
              [
                {
                  text: 'Go Back',
                  onPress: () =>
                    navigation.goBack(),
                },
              ]
            );

            return;
          }

          reset({
            department_name:
              department.department_name ||
              '',

            module_code:
              department.module_code ||
              '',

            is_active:
              department.is_active ??
              true,
          });
        } catch (error: any) {
          console.error(
            'Failed to load department:',
            error
          );

          Alert.alert(
            'Unable to Load',
            error?.response?.data?.message ||
              error?.message ||
              'Failed to load department details.',
            [
              {
                text: 'Go Back',
                onPress: () =>
                  navigation.goBack(),
              },
            ]
          );
        } finally {
          setLoading(false);
        }
      };

    fetchDepartment();
  }, [
    departmentId,
    accessToken,
    companyId,
    deviceId,
    reset,
    navigation,
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
        'Your session has expired. Please log in again.'
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...data,

        department_name:
          data.department_name.trim(),

        module_code:
          data.module_code?.trim() ||
          undefined,

        is_active:
          data.is_active ?? true,
      };

      await updateDepartment(
        companyId,
        deviceId,
        departmentId,
        payload,
        accessToken
      );

      Alert.alert(
        'Department Updated',
        'The department has been updated successfully.',
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
        'Failed to update department:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update the department. Please try again.';

      Alert.alert(
        'Update Failed',
        message
      );
    } finally {
      setSaving(false);
    }
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
              name="office-building-outline"
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
            Loading department
          </Text>

          <Text style={styles.loadingSubtitle}>
            Please wait...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN SCREEN
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

            {/* Header title */}

            <View style={styles.headerText}>
              <Text style={styles.headerEyebrow}>
                ADMINISTRATION
              </Text>

              <Text style={styles.headerTitle}>
                Edit Department
              </Text>

              <Text style={styles.headerSubtitle}>
                Update department information
              </Text>
            </View>

            {/* Icon */}

            <View style={styles.headerIcon}>
              <Icon
                name="office-building-outline"
                size={26}
                color="#FFFFFF"
              />
            </View>

          </View>
        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <View style={styles.sectionHeader}>

            <View style={styles.sectionIcon}>
              <Icon
                name="information-outline"
                size={19}
                color={PRIMARY_COLOR}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Department Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Basic details of this department
              </Text>
            </View>

          </View>

          <View style={styles.formCard}>

            {/* Department Name */}

            <View style={styles.fieldContainer}>

              <Text style={styles.fieldLabel}>
                Department Name
                <Text style={styles.required}>
                  {' '}*
                </Text>
              </Text>

              <Controller
                control={control}
                name="department_name"
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
                    placeholder="Enter department name"
                    placeholderTextColor="#A1AAB7"
                    error={
                      !!errors.department_name
                    }
                    style={styles.input}
                    contentStyle={
                      styles.inputContent
                    }
                    outlineStyle={
                      styles.inputOutline
                    }
                    left={
                      <TextInput.Icon
                        icon="office-building-outline"
                        color={
                          errors.department_name
                            ? ERROR_COLOR
                            : '#94A3B8'
                        }
                      />
                    }
                    theme={{
                      colors: {
                        primary:
                          PRIMARY_COLOR,

                        outline:
                          '#DDE3EA',

                        error:
                          ERROR_COLOR,
                      },
                      roundness: 11,
                    }}
                  />
                )}
              />

              {errors.department_name && (
                <View
                  style={
                    styles.errorContainer
                  }
                >
                  <Icon
                    name="alert-circle-outline"
                    size={13}
                    color={ERROR_COLOR}
                  />

                  <Text style={styles.error}>
                    {
                      errors
                        .department_name
                        .message
                    }
                  </Text>
                </View>
              )}

            </View>

            {/* Divider */}

            <View style={styles.divider} />

            {/* Module Code */}

            <View style={styles.fieldContainer}>

              <View style={styles.labelRow}>

                <Text style={styles.fieldLabel}>
                  Module Code
                </Text>

                <View
                  style={
                    styles.optionalBadge
                  }
                >
                  <Text
                    style={
                      styles.optionalText
                    }
                  >
                    OPTIONAL
                  </Text>
                </View>

              </View>

              <Controller
                control={control}
                name="module_code"
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
                    placeholder="e.g. HR, FIN, ADM"
                    placeholderTextColor="#A1AAB7"
                    autoCapitalize="characters"
                    style={styles.input}
                    contentStyle={
                      styles.inputContent
                    }
                    outlineStyle={
                      styles.inputOutline
                    }
                    left={
                      <TextInput.Icon
                        icon="code-tags"
                        color="#94A3B8"
                      />
                    }
                    theme={{
                      colors: {
                        primary:
                          PRIMARY_COLOR,

                        outline:
                          '#DDE3EA',
                      },
                      roundness: 11,
                    }}
                  />
                )}
              />

              <Text style={styles.helperText}>
                A short code used to identify this
                department internally.
              </Text>

            </View>

          </View>

          {/* =================================================
              STATUS
          ================================================= */}

          <View
            style={[
              styles.sectionHeader,
              styles.statusSectionHeader,
            ]}
          >

            <View style={styles.sectionIcon}>
              <Icon
                name="toggle-switch-outline"
                size={19}
                color={PRIMARY_COLOR}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Department Status
              </Text>

              <Text style={styles.sectionSubtitle}>
                Control whether this department is active
              </Text>
            </View>

          </View>

          <View style={styles.statusCard}>

            <View
              style={[
                styles.statusIcon,
                {
                  backgroundColor: isActive
                    ? '#DCFCE7'
                    : '#F1F5F9',
                },
              ]}
            >
              <Icon
                name={
                  isActive
                    ? 'check-circle-outline'
                    : 'pause-circle-outline'
                }
                size={24}
                color={
                  isActive
                    ? '#16A34A'
                    : '#64748B'
                }
              />
            </View>

            <View style={styles.statusContent}>

              <Text style={styles.statusTitle}>
                {isActive
                  ? 'Department is Active'
                  : 'Department is Inactive'}
              </Text>

              <Text style={styles.statusDescription}>
                {isActive
                  ? 'Employees can currently access and use this department.'
                  : 'This department is currently disabled and unavailable for normal use.'}
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
                  value={value ?? true}
                  onValueChange={onChange}
                  color={PRIMARY_COLOR}
                />
              )}
            />

          </View>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <View style={styles.actions}>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                navigation.goBack()
              }
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              activeOpacity={0.85}
              style={styles.saveButtonWrapper}
            >
              <LinearGradient
                colors={GRADIENT_COLORS}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={styles.saveButton}
              >

                {saving ? (
                  <>
                    <ActivityIndicator
                      color="#FFFFFF"
                      size="small"
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Saving...
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon
                      name="content-save-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Changes
                    </Text>
                  </>
                )}

              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* =================================================
              FOOTER INFO
          ================================================= */}

          <View style={styles.footerInfo}>

            <Icon
              name="shield-check-outline"
              size={15}
              color="#94A3B8"
            />

            <Text style={styles.footerText}>
              Changes will be applied immediately to
              this department.
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

  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingVertical: 17,

    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
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
      'rgba(255,255,255,0.20)',
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerEyebrow: {
    color:
      'rgba(255,255,255,0.68)',

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 1.1,
  },

  headerTitle: {
    marginTop: 3,

    color: '#FFFFFF',

    fontSize: 20,

    lineHeight: 24,

    fontWeight: '700',
  },

  headerSubtitle: {
    marginTop: 2,

    color:
      'rgba(255,255,255,0.68)',

    fontSize: 9,

    fontWeight: '500',
  },

  headerIcon: {
    width: 45,
    height: 45,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      'rgba(255,255,255,0.12)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.17)',
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 12,
  },

  sectionIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  sectionTitle: {
    marginLeft: 10,

    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  sectionSubtitle: {
    marginLeft: 10,
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  statusSectionHeader: {
    marginTop: 25,
  },

  // =======================================================
  // FORM CARD
  // =======================================================

  formCard: {
    padding: 17,

    borderRadius: 16,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,

    borderColor: '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.035,

    shadowRadius: 8,

    elevation: 1,
  },

  fieldContainer: {
    width: '100%',
  },

  fieldLabel: {
    marginBottom: 7,

    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  required: {
    color: ERROR_COLOR,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 7,
  },

  optionalBadge: {
    marginLeft: 8,

    paddingHorizontal: 6,
    paddingVertical: 3,

    borderRadius: 5,

    backgroundColor: '#F1F5F9',
  },

  optionalText: {
    color: '#94A3B8',

    fontSize: 7,

    fontWeight: '700',

    letterSpacing: 0.4,
  },

  input: {
    height: 53,

    backgroundColor: '#FFFFFF',

    fontSize: 12,

    color: TEXT_PRIMARY,
  },

  inputContent: {
    fontSize: 12,
  },

  inputOutline: {
    borderRadius: 11,

    borderWidth: 1,
  },

  helperText: {
    marginTop: 6,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 14,
  },

  divider: {
    height: 1,

    marginVertical: 18,

    backgroundColor: '#EEF1F5',
  },

  // =======================================================
  // ERROR
  // =======================================================

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 5,
    marginLeft: 2,
  },

  error: {
    marginLeft: 4,

    color: ERROR_COLOR,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusCard: {
    minHeight: 92,

    padding: 15,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 16,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,

    borderColor: '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.035,

    shadowRadius: 8,

    elevation: 1,
  },

  statusIcon: {
    width: 45,
    height: 45,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,
  },

  statusContent: {
    flex: 1,

    marginHorizontal: 11,
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
  // ACTIONS
  // =======================================================

  actions: {
    flexDirection: 'row',

    gap: 10,

    marginTop: 25,
  },

  cancelButton: {
    height: 51,

    flex: 0.38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    borderWidth: 1,

    borderColor: '#DDE3EA',

    backgroundColor: CARD_BACKGROUND,
  },

  cancelButtonText: {
    color: '#64748B',

    fontSize: 12,

    fontWeight: '600',
  },

  saveButtonWrapper: {
    flex: 0.62,

    borderRadius: 11,

    overflow: 'hidden',

    shadowColor: '#6B32A8',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.20,

    shadowRadius: 9,

    elevation: 4,
  },

  saveButton: {
    minHeight: 51,

    paddingHorizontal: 14,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 7,
  },

  saveButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  // =======================================================
  // FOOTER
  // =======================================================

  footerInfo: {
    marginTop: 19,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  footerText: {
    marginLeft: 5,

    color: '#94A3B8',

    fontSize: 8,

    fontWeight: '500',

    textAlign: 'center',
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
    marginTop: 20,
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