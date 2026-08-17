// apps/prayantra-b2b/src/screens/module/administration/CreateDepartmentScreen.tsx

import React, { useState } from 'react';

import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
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

import {
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  ActivityIndicator,
} from 'react-native';

import {
  createDepartment,
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
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// VALIDATION
// =========================================================

const schema = z.object({
  department_name: z
    .string()
    .trim()
    .min(1, 'Department name is required'),

  module_code: z
    .string()
    .trim()
    .optional(),

  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// NAVIGATION
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'CreateDepartment'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function CreateDepartmentScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] =
    useState(false);

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true,
    },
  });

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (
    data: FormData
  ) => {
    if (!accessToken || !companyId) {
      Alert.alert(
        'Authentication Error',
        'Your authentication session is missing. Please log in again.'
      );

      return;
    }

    if (!deviceId) {
      Alert.alert(
        'Device Error',
        'Device information is missing. Please try logging in again.'
      );

      return;
    }

    try {
      setLoading(true);

      await createDepartment(
        companyId,
        deviceId,
        data,
        accessToken
      );

      Alert.alert(
        'Department Created',
        `${data.department_name} has been created successfully.`,
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
        'Create department error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create the department. Please try again.';

      Alert.alert(
        'Creation Failed',
        message
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER
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
              <MaterialCommunityIcons
                name="arrow-left"
                size={21}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Title */}

            <View style={styles.headerText}>

              <Text style={styles.headerEyebrow}>
                ADMINISTRATION
              </Text>

              <Text style={styles.headerTitle}>
                Create Department
              </Text>

              <Text style={styles.headerSubtitle}>
                Add a new department to your company
              </Text>

            </View>

            {/* Icon */}

            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="office-building-plus-outline"
                size={25}
                color="#FFFFFF"
              />
            </View>

          </View>

        </LinearGradient>

        {/* =================================================
            FORM
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >

          {/* =================================================
              INTRO
          ================================================= */}

          <View style={styles.intro}>

            <View style={styles.introIcon}>
              <MaterialCommunityIcons
                name="office-building-outline"
                size={21}
                color={PRIMARY_COLOR}
              />
            </View>

            <View style={styles.introText}>

              <Text style={styles.introTitle}>
                Department Information
              </Text>

              <Text style={styles.introDescription}>
                Enter the basic information for the
                department you want to create.
              </Text>

            </View>

          </View>

          {/* =================================================
              FORM CARD
          ================================================= */}

          <View style={styles.formCard}>

            {/* ------------------------------------------------
                DEPARTMENT NAME
            ------------------------------------------------ */}

            <View style={styles.field}>

              <View style={styles.fieldLabelRow}>

                <Text style={styles.fieldLabel}>
                  Department Name
                </Text>

                <Text style={styles.required}>
                  Required
                </Text>

              </View>

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
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Human Resources"
                    placeholderTextColor="#A0A8B4"
                    style={styles.input}
                    contentStyle={
                      styles.inputContent
                    }
                    outlineColor={
                      errors.department_name
                        ? ERROR_COLOR
                        : BORDER_COLOR
                    }
                    activeOutlineColor={
                      errors.department_name
                        ? ERROR_COLOR
                        : PRIMARY_COLOR
                    }
                    error={
                      !!errors.department_name
                    }
                    left={
                      <TextInput.Icon
                        icon="office-building-outline"
                        color={
                          errors.department_name
                            ? ERROR_COLOR
                            : PRIMARY_COLOR
                        }
                      />
                    }
                  />
                )}
              />

              {errors.department_name && (
                <View
                  style={styles.errorRow}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={14}
                    color={ERROR_COLOR}
                  />

                  <Text
                    style={styles.errorText}
                  >
                    {
                      errors.department_name
                        .message
                    }
                  </Text>
                </View>
              )}

            </View>

            {/* ------------------------------------------------
                MODULE CODE
            ------------------------------------------------ */}

            <View style={styles.field}>

              <View style={styles.fieldLabelRow}>

                <Text style={styles.fieldLabel}>
                  Module Code
                </Text>

                <Text style={styles.optional}>
                  Optional
                </Text>

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
                    placeholder="e.g. HR"
                    placeholderTextColor="#A0A8B4"
                    autoCapitalize="characters"
                    style={styles.input}
                    contentStyle={
                      styles.inputContent
                    }
                    outlineColor={
                      BORDER_COLOR
                    }
                    activeOutlineColor={
                      PRIMARY_COLOR
                    }
                    left={
                      <TextInput.Icon
                        icon="code-tags"
                        color="#7B8794"
                      />
                    }
                  />
                )}
              />

              <Text
                style={styles.helperText}
              >
                A short internal code used to
                identify this department.
              </Text>

            </View>

          </View>

          {/* =================================================
              STATUS CARD
          ================================================= */}

          <Controller
            control={control}
            name="is_active"
            render={({
              field: {
                onChange,
                value,
              },
            }) => (
              <View style={styles.statusCard}>

                <View
                  style={[
                    styles.statusIcon,
                    {
                      backgroundColor: value
                        ? '#10B98115'
                        : '#94A3B815',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      value
                        ? 'check-circle-outline'
                        : 'pause-circle-outline'
                    }
                    size={23}
                    color={
                      value
                        ? '#10B981'
                        : '#64748B'
                    }
                  />
                </View>

                <View
                  style={styles.statusText}
                >

                  <Text
                    style={styles.statusTitle}
                  >
                    Department Status
                  </Text>

                  <Text
                    style={styles.statusDescription}
                  >
                    {value
                      ? 'This department will be active immediately.'
                      : 'This department will be created as inactive.'}
                  </Text>

                </View>

                <Switch
                  value={value}
                  onValueChange={onChange}
                  color={PRIMARY_COLOR}
                />

              </View>
            )}
          />

          {/* =================================================
              SUMMARY
          ================================================= */}

          <View style={styles.infoCard}>

            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={PRIMARY_COLOR}
            />

            <Text style={styles.infoText}>
              You can modify the department's
              details later from the Administration
              module.
            </Text>

          </View>

          {/* =================================================
              CREATE BUTTON
          ================================================= */}

          <TouchableOpacity
            onPress={handleSubmit(
              onSubmit
            )}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              styles.createButton,
              loading &&
                styles.createButtonDisabled,
            ]}
          >

            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.createGradient}
            >

              {loading ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.createButtonText
                    }
                  >
                    Creating Department...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.createButtonText
                    }
                  >
                    Create Department
                  </Text>

                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color="rgba(255,255,255,0.85)"
                  />
                </>
              )}

            </LinearGradient>

          </TouchableOpacity>

          {/* =================================================
              CANCEL
          ================================================= */}

          <TouchableOpacity
            disabled={loading}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.7}
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
  // CONTAINER
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,

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
      'rgba(255,255,255,0.2)',
  },

  headerText: {
    flex: 1,

    marginLeft: 12,
  },

  headerEyebrow: {
    color:
      'rgba(255,255,255,0.65)',

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 3,

    color: '#FFFFFF',

    fontSize: 20,

    fontWeight: '700',

    letterSpacing: -0.2,
  },

  headerSubtitle: {
    marginTop: 3,

    color:
      'rgba(255,255,255,0.68)',

    fontSize: 9,

    fontWeight: '500',
  },

  headerIcon: {
    width: 44,
    height: 44,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  // =======================================================
  // SCROLL
  // =======================================================

  scrollContent: {
    paddingHorizontal: 20,

    paddingTop: 22,

    paddingBottom: 45,
  },

  // =======================================================
  // INTRO
  // =======================================================

  intro: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 17,
  },

  introIcon: {
    width: 43,
    height: 43,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  introText: {
    flex: 1,

    marginLeft: 11,
  },

  introTitle: {
    color: TEXT_PRIMARY,

    fontSize: 16,

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

    borderRadius: 17,

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

    shadowOpacity: 0.04,

    shadowRadius: 9,

    elevation: 2,
  },

  // =======================================================
  // FIELD
  // =======================================================

  field: {
    marginBottom: 20,
  },

  fieldLabelRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 8,
  },

  fieldLabel: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  required: {
    color: ERROR_COLOR,

    fontSize: 8,

    fontWeight: '600',

    textTransform: 'uppercase',

    letterSpacing: 0.4,
  },

  optional: {
    color: '#94A3B8',

    fontSize: 8,

    fontWeight: '600',

    textTransform: 'uppercase',

    letterSpacing: 0.4,
  },

  // =======================================================
  // INPUT
  // =======================================================

  input: {
    height: 53,

    backgroundColor:
      CARD_BACKGROUND,

    fontSize: 13,
  },

  inputContent: {
    fontSize: 13,
  },

  // =======================================================
  // ERROR
  // =======================================================

  errorRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 6,

    paddingHorizontal: 2,
  },

  errorText: {
    marginLeft: 5,

    color: ERROR_COLOR,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // HELPER
  // =======================================================

  helperText: {
    marginTop: 6,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 14,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusCard: {
    marginTop: 14,

    padding: 15,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,
  },

  statusIcon: {
    width: 43,
    height: 43,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,
  },

  statusText: {
    flex: 1,

    marginLeft: 11,

    marginRight: 8,
  },

  statusTitle: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  statusDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 14,

    fontWeight: '500',
  },

  // =======================================================
  // INFO
  // =======================================================

  infoCard: {
    marginTop: 13,

    padding: 13,

    flexDirection: 'row',

    alignItems: 'flex-start',

    borderRadius: 12,

    backgroundColor:
      `${PRIMARY_COLOR}08`,

    borderWidth: 1,

    borderColor:
      `${PRIMARY_COLOR}18`,
  },

  infoText: {
    flex: 1,

    marginLeft: 8,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 14,

    fontWeight: '500',
  },

  // =======================================================
  // CREATE BUTTON
  // =======================================================

  createButton: {
    marginTop: 22,

    borderRadius: 13,

    overflow: 'hidden',

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.22,

    shadowRadius: 10,

    elevation: 5,
  },

  createButtonDisabled: {
    opacity: 0.7,
  },

  createGradient: {
    minHeight: 54,

    paddingHorizontal: 17,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',

    gap: 8,
  },

  createButtonText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '700',

    letterSpacing: 0.1,
  },

  // =======================================================
  // CANCEL
  // =======================================================

  cancelButton: {
    height: 44,

    marginTop: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '600',
  },
});