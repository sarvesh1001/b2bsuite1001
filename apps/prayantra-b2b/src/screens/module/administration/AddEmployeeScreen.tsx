// apps/prayantra-b2b/src/screens/module/administration/AddEmployeeScreen.tsx

import React, { useEffect, useState } from 'react';

import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
  TextInput as RNTextInput,
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

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  addEmployee,
  addManager,
  listRoles,
  listPositions,
  getEmployeeSuggestions,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  Role,
  Position,
  CompanyEmployee,
} from '@b2b/shared-types';

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
  ERROR_COLOR,
  BORDER_COLOR,
  SELECTED_ITEM_BG,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// FORM SCHEMA
// =========================================================

const schema = z.object({
  phone: z
    .string()
    .min(
      10,
      'Phone must be at least 10 digits'
    ),

  username: z.string().optional(),

  full_name: z.string().optional(),

  employee_id: z.string().optional(),

  role_id: z
    .string()
    .min(
      1,
      'Role is required'
    ),

  reports_to: z.string().optional(),

  position_id: z.string().optional(),

  is_manager: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// NAVIGATION
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'AddEmployee'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function AddEmployeeScreen() {
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

  const [loading, setLoading] =
    useState(false);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  // -------------------------------------------------------
  // Modals
  // -------------------------------------------------------

  const [roleModalVisible, setRoleModalVisible] =
    useState(false);

  const [positionModalVisible, setPositionModalVisible] =
    useState(false);

  const [reportsToModalVisible, setReportsToModalVisible] =
    useState(false);

  // -------------------------------------------------------
  // Reports To
  // -------------------------------------------------------

  const [reportsToSearch, setReportsToSearch] =
    useState('');

  const [reportsToSuggestions, setReportsToSuggestions] =
    useState<CompanyEmployee[]>([]);

  const [loadingReportsTo, setLoadingReportsTo] =
    useState(false);

  const [selectedReportsToName, setSelectedReportsToName] =
    useState('');

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
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      phone: '',
      username: '',
      full_name: '',
      employee_id: '',
      role_id: '',
      position_id: '',
      reports_to: '',
      is_manager: false,
    },
  });

  const selectedRoleId =
    watch('role_id');

  const selectedPositionId =
    watch('position_id');

  const isManager =
    watch('is_manager');

  const reportsToId =
    watch('reports_to');

  // =======================================================
  // FETCH ROLES + POSITIONS
  // =======================================================

  useEffect(() => {
    const fetchOptions =
      async () => {
        if (
          !accessToken ||
          !companyId ||
          !deviceId
        ) {
          setLoadingOptions(false);
          return;
        }

        try {
          setLoadingOptions(true);

          const [
            rolesRes,
            positionsRes,
          ] = await Promise.all([
            listRoles(
              companyId,
              deviceId,
              {
                page: 1,
                limit: 100,
              },
              accessToken
            ),

            listPositions(
              companyId,
              deviceId,
              {
                limit: 100,
                offset: 0,
              },
              accessToken
            ),
          ]);

          setRoles(
            rolesRes.data?.roles || []
          );

          setPositions(
            positionsRes.data?.positions || []
          );
        } catch (error) {
          console.error(
            'Failed to load employee options:',
            error
          );

          Alert.alert(
            'Unable to Load',
            'Failed to load roles and positions. Please try again.'
          );
        } finally {
          setLoadingOptions(false);
        }
      };

    fetchOptions();
  }, [
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // RESET REPORTS SEARCH WHEN MODAL CLOSES
  // =======================================================

  useEffect(() => {
    if (!reportsToModalVisible) {
      setReportsToSearch('');
      setReportsToSuggestions([]);
    }
  }, [
    reportsToModalVisible,
  ]);

  // =======================================================
  // SEARCH REPORTS TO
  // =======================================================

  const handleReportsToSearch =
    async (text: string) => {
      setReportsToSearch(text);

      if (text.length < 2) {
        setReportsToSuggestions([]);
        return;
      }

      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      setLoadingReportsTo(true);

      try {
        const response =
          await getEmployeeSuggestions(
            companyId,
            deviceId,
            text,
            20,
            accessToken
          );

        setReportsToSuggestions(
          response.data || []
        );
      } catch (error) {
        console.error(
          'Failed to search employees:',
          error
        );
      } finally {
        setLoadingReportsTo(false);
      }
    };

  // =======================================================
  // SELECT REPORTS TO
  // =======================================================

  const selectReportsTo =
    (employee: CompanyEmployee) => {
      setValue(
        'reports_to',
        employee.user_id,
        {
          shouldValidate: true,
        }
      );

      setSelectedReportsToName(
        employee.full_name ||
          employee.username ||
          employee.user_id
      );

      setReportsToModalVisible(false);
    };

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit =
    async (data: FormData) => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        Alert.alert(
          'Authentication Error',
          'Your session information is missing. Please log in again.'
        );

        return;
      }

      const cleanPhone =
        data.phone
          .trim()
          .replace(/\s/g, '');

      const payload = {
        phone: cleanPhone,
        username:
          data.username?.trim() || undefined,
        full_name:
          data.full_name?.trim() || undefined,
        employee_id:
          data.employee_id?.trim() || undefined,
        role_id: data.role_id,
        reports_to:
          data.reports_to || undefined,
        position_id:
          data.position_id || undefined,
      };

      setLoading(true);

      try {
        if (data.is_manager) {
          await addManager(
            companyId,
            deviceId,
            payload,
            accessToken
          );
        } else {
          await addEmployee(
            companyId,
            deviceId,
            payload,
            accessToken
          );
        }

        Alert.alert(
          'Success',
          `${data.is_manager ? 'Manager' : 'Employee'} has been added successfully.`,
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
          'Add employee error:',
          error
        );

        Alert.alert(
          'Unable to Add',
          error?.response?.data?.message ||
            error?.message ||
            'Something went wrong while adding the employee.'
        );
      } finally {
        setLoading(false);
      }
    };

  // =======================================================
  // SELECTED ROLE / POSITION
  // =======================================================

  const selectedRole =
    roles.find(
      role =>
        role.role_id ===
        selectedRoleId
    );

  const selectedPosition =
    positions.find(
      position =>
        position.position_id ===
        selectedPositionId
    );

  // =======================================================
  // LOADING OPTIONS
  // =======================================================

  if (loadingOptions) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={styles.safeArea}
      >
        <View style={styles.loadingScreen}>

          <View style={styles.loadingIcon}>
            <Icon
              name="account-plus-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingTitle}>
            Preparing employee form
          </Text>

          <Text style={styles.loadingSubtitle}>
            Loading roles and positions...
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
      edges={[
        'top',
        'bottom',
      ]}
      style={styles.safeArea}
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
              style={styles.backButton}
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.8}
            >
              <Icon
                name="arrow-left"
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.headerIcon}>
              <Icon
                name="account-plus-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Add Employee
              </Text>

              <Text style={styles.headerSubtitle}>
                Administration
              </Text>
            </View>

          </View>

        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >

          {/* =================================================
              MODE SELECTOR
          ================================================= */}

          <View style={styles.modeCard}>

            <View style={styles.modeIcon}>
              <Icon
                name={
                  isManager
                    ? 'account-tie-outline'
                    : 'account-outline'
                }
                size={23}
                color={PRIMARY_COLOR}
              />
            </View>

            <View style={styles.modeContent}>

              <Text style={styles.modeTitle}>
                {isManager
                  ? 'Adding a Manager'
                  : 'Adding an Employee'}
              </Text>

              <Text style={styles.modeDescription}>
                {isManager
                  ? 'This person will be added with manager privileges.'
                  : 'Add a regular employee to your organization.'}
              </Text>

            </View>

            <Controller
              control={control}
              name="is_manager"
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
                />
              )}
            />

          </View>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <SectionHeader
            icon="account-outline"
            title="Basic Information"
            subtitle="Enter the employee's personal details"
          />

          <View style={styles.formCard}>

            {/* PHONE */}

            <Controller
              control={control}
              name="phone"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
              }) => (
                <FormInput
                  label="Phone Number"
                  placeholder="Enter phone number"
                  icon="phone-outline"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  error={
                    errors.phone?.message
                  }
                  required
                />
              )}
            />

            {/* FULL NAME */}

            <Controller
              control={control}
              name="full_name"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
              }) => (
                <FormInput
                  label="Full Name"
                  placeholder="Enter employee name"
                  icon="account-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            {/* USERNAME */}

            <Controller
              control={control}
              name="username"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
              }) => (
                <FormInput
                  label="Username"
                  placeholder="Enter username"
                  icon="at"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            {/* EMPLOYEE ID */}

            <Controller
              control={control}
              name="employee_id"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
              }) => (
                <FormInput
                  label="Employee ID"
                  placeholder="e.g. EMP-001"
                  icon="badge-account-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isLast
                />
              )}
            />

          </View>

          {/* =================================================
              ORGANIZATION
          ================================================= */}

          <SectionHeader
            icon="office-building-outline"
            title="Organization"
            subtitle="Assign role and position"
          />

          <View style={styles.formCard}>

            {/* ROLE */}

            <SelectField
              label="Role"
              required
              icon="shield-account-outline"
              value={
                selectedRole?.role_name ||
                ''
              }
              placeholder="Select a role"
              error={
                errors.role_id?.message
              }
              onPress={() =>
                setRoleModalVisible(true)
              }
            />

            {/* POSITION */}

            <SelectField
              label="Position"
              icon="briefcase-outline"
              value={
                selectedPosition?.title ||
                ''
              }
              placeholder="Select a position"
              onPress={() =>
                setPositionModalVisible(
                  true
                )
              }
              isLast
            />

          </View>

          {/* =================================================
              REPORTING
          ================================================= */}

          <SectionHeader
            icon="account-supervisor-outline"
            title="Reporting"
            subtitle="Define the employee's reporting structure"
          />

          <View style={styles.formCard}>

            <TouchableOpacity
              style={styles.reportsField}
              onPress={() =>
                setReportsToModalVisible(
                  true
                )
              }
              activeOpacity={0.75}
            >

              <View style={styles.fieldIcon}>
                <Icon
                  name="account-supervisor-outline"
                  size={21}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View style={styles.reportsContent}>

                <Text style={styles.fieldLabel}>
                  Reports To
                </Text>

                {reportsToId ? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={
                        styles.selectedValue
                      }
                    >
                      {selectedReportsToName ||
                        'Selected manager'}
                    </Text>

                    <Text style={styles.selectedHint}>
                      Tap to change
                    </Text>
                  </>
                ) : (
                  <Text
                    style={
                      styles.placeholderText
                    }
                  >
                    Search for manager or supervisor
                  </Text>
                )}

              </View>

              <Icon
                name="chevron-right"
                size={22}
                color={TEXT_SECONDARY}
              />

            </TouchableOpacity>

            {reportsToId && (
              <TouchableOpacity
                style={styles.removeManager}
                onPress={() => {
                  setValue(
                    'reports_to',
                    ''
                  );
                  setSelectedReportsToName(
                    ''
                  );
                }}
              >
                <Icon
                  name="close-circle-outline"
                  size={15}
                  color={ERROR_COLOR}
                />

                <Text
                  style={
                    styles.removeManagerText
                  }
                >
                  Remove reporting manager
                </Text>
              </TouchableOpacity>
            )}

          </View>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <View style={styles.summaryCard}>

            <View style={styles.summaryIcon}>
              <Icon
                name={
                  isManager
                    ? 'account-tie-outline'
                    : 'account-check-outline'
                }
                size={22}
                color={PRIMARY_COLOR}
              />
            </View>

            <View style={styles.summaryContent}>

              <Text style={styles.summaryTitle}>
                Ready to add
              </Text>

              <Text style={styles.summaryText}>
                {isManager
                  ? 'Manager'
                  : 'Employee'}
                {selectedRole
                  ? ` • ${selectedRole.role_name}`
                  : ''}
                {selectedPosition
                  ? ` • ${selectedPosition.title}`
                  : ''}
              </Text>

            </View>

          </View>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <TouchableOpacity
            onPress={handleSubmit(
              onSubmit
            )}
            disabled={loading}
            activeOpacity={0.85}
            style={
              styles.submitWrapper
            }
          >
            <LinearGradient
              colors={
                GRADIENT_COLORS
              }
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={
                styles.submitButton
              }
            >

              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <>
                  <Icon
                    name={
                      isManager
                        ? 'account-tie-outline'
                        : 'account-plus-outline'
                    }
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.submitText
                    }
                  >
                    Add{' '}
                    {isManager
                      ? 'Manager'
                      : 'Employee'}
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

          <Text style={styles.footerHint}>
            You can update employee details later
            from the employee profile.
          </Text>

        </ScrollView>

      </KeyboardAvoidingView>

      {/* ===================================================
          ROLE MODAL
      =================================================== */}

      <SelectionModal
        visible={roleModalVisible}
        title="Select Role"
        icon="shield-account-outline"
        data={roles}
        selectedId={selectedRoleId}
        getId={item => item.role_id}
        renderLabel={item =>
          `${item.role_name} • Level ${item.role_level}`
        }
        onClose={() =>
          setRoleModalVisible(false)
        }
        onSelect={item => {
          setValue(
            'role_id',
            item.role_id,
            {
              shouldValidate: true,
            }
          );

          setRoleModalVisible(false);
        }}
      />

      {/* ===================================================
          POSITION MODAL
      =================================================== */}

      <SelectionModal
        visible={
          positionModalVisible
        }
        title="Select Position"
        icon="briefcase-outline"
        data={positions}
        selectedId={
          selectedPositionId
        }
        getId={item =>
          item.position_id
        }
        renderLabel={item =>
          item.title
        }
        onClose={() =>
          setPositionModalVisible(
            false
          )
        }
        onSelect={item => {
          setValue(
            'position_id',
            item.position_id
          );

          setPositionModalVisible(
            false
          );
        }}
      />

      {/* ===================================================
          REPORTS TO MODAL
      =================================================== */}

      <Modal
        visible={
          reportsToModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setReportsToModalVisible(
            false
          )
        }
      >

        <View style={styles.modalOverlay}>

          <View
            style={[
              styles.modalContent,
              styles.reportsModal,
            ]}
          >

            {/* HEADER */}

            <View
              style={
                styles.modalHeader
              }
            >

              <View
                style={
                  styles.modalTitleContainer
                }
              >

                <View
                  style={
                    styles.modalTitleIcon
                  }
                >
                  <Icon
                    name="account-supervisor-outline"
                    size={20}
                    color={
                      PRIMARY_COLOR
                    }
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Select Manager
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Search employees
                  </Text>
                </View>

              </View>

              <TouchableOpacity
                onPress={() =>
                  setReportsToModalVisible(
                    false
                  )
                }
                style={
                  styles.modalClose
                }
              >
                <Icon
                  name="close"
                  size={20}
                  color={
                    TEXT_SECONDARY
                  }
                />
              </TouchableOpacity>

            </View>

            {/* SEARCH */}

            <View
              style={
                styles.searchContainer
              }
            >

              <Icon
                name="magnify"
                size={21}
                color={
                  TEXT_SECONDARY
                }
              />

              <RNTextInput
                style={
                  styles.searchInput
                }
                placeholder="Search name or username"
                placeholderTextColor={
                  '#9AA4B2'
                }
                value={
                  reportsToSearch
                }
                onChangeText={
                  handleReportsToSearch
                }
                autoFocus
              />

              {reportsToSearch.length >
                0 && (
                <TouchableOpacity
                  onPress={() =>
                    handleReportsToSearch(
                      ''
                    )
                  }
                >
                  <Icon
                    name="close-circle"
                    size={19}
                    color={
                      '#9AA4B2'
                    }
                  />
                </TouchableOpacity>
              )}

            </View>

            {/* RESULTS */}

            {loadingReportsTo ? (
              <View
                style={
                  styles.searchLoading
                }
              >
                <ActivityIndicator
                  size="small"
                  color={
                    PRIMARY_COLOR
                  }
                />

                <Text
                  style={
                    styles.searchLoadingText
                  }
                >
                  Searching employees...
                </Text>
              </View>
            ) : (
              <FlatList
                data={
                  reportsToSuggestions
                }
                keyExtractor={item =>
                  item.user_id
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.modalList
                }
                renderItem={({
                  item,
                }) => (
                  <TouchableOpacity
                    style={
                      styles.employeeResult
                    }
                    onPress={() =>
                      selectReportsTo(
                        item
                      )
                    }
                    activeOpacity={
                      0.75
                    }
                  >

                    <UserAvatar
                      userId={
                        item.user_id
                      }
                      username={
                        item.username
                      }
                      fullName={
                        item.full_name
                      }
                      size={46}
                      style={
                        styles.avatar
                      }
                    />

                    <View
                      style={
                        styles.employeeResultInfo
                      }
                    >

                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.employeeName
                        }
                      >
                        {item.full_name ||
                          item.username ||
                          item.user_id}
                      </Text>

                      {item.username &&
                        item.full_name && (
                          <Text
                            style={
                              styles.employeeMeta
                            }
                          >
                            @{item.username}
                          </Text>
                        )}

                      <View
                        style={
                          styles.employeeMetaRow
                        }
                      >

                        {item.employee_id && (
                          <Text
                            style={
                              styles.employeeMeta
                            }
                          >
                            ID: {
                              item.employee_id
                            }
                          </Text>
                        )}

                        {item.role_name && (
                          <Text
                            style={
                              styles.employeeRole
                            }
                          >
                            {item.role_name}
                          </Text>
                        )}

                      </View>

                    </View>

                    <Icon
                      name="chevron-right"
                      size={20}
                      color={
                        '#B4BCC8'
                      }
                    />

                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View
                    style={
                      styles.modalEmpty
                    }
                  >

                    <View
                      style={
                        styles.modalEmptyIcon
                      }
                    >
                      <Icon
                        name={
                          reportsToSearch.length >=
                          2
                            ? 'account-search-outline'
                            : 'text-search'
                        }
                        size={27}
                        color={
                          PRIMARY_COLOR
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.modalEmptyTitle
                      }
                    >
                      {reportsToSearch.length >=
                      2
                        ? 'No employees found'
                        : 'Search for a manager'}
                    </Text>

                    <Text
                      style={
                        styles.modalEmptyText
                      }
                    >
                      {reportsToSearch.length >=
                      2
                        ? 'Try a different name or username.'
                        : 'Enter at least 2 characters to begin searching.'}
                    </Text>

                  </View>
                }
              />
            )}

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

// =========================================================
// SECTION HEADER COMPONENT
// =========================================================

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >

      <View
        style={
          styles.sectionHeaderIcon
        }
      >
        <Icon
          name={icon}
          size={19}
          color={PRIMARY_COLOR}
        />
      </View>

      <View
        style={
          styles.sectionHeaderText
        }
      >

        <Text
          style={
            styles.sectionHeaderTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionHeaderSubtitle
          }
        >
          {subtitle}
        </Text>

      </View>

    </View>
  );
}

// =========================================================
// FORM INPUT COMPONENT
// =========================================================

function FormInput({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  onBlur,
  keyboardType,
  error,
  required,
  isLast,
}: {
  label: string;
  placeholder: string;
  icon: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  keyboardType?: any;
  error?: string;
  required?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.inputWrapper,
        !isLast &&
          styles.inputDivider,
      ]}
    >

      <View
        style={styles.inputIcon}
      >
        <Icon
          name={icon}
          size={20}
          color={PRIMARY_COLOR}
        />
      </View>

      <View
        style={
          styles.inputContent
        }
      >

        <Text
          style={
            styles.fieldLabel
          }
        >
          {label}
          {required && (
            <Text
              style={
                styles.required
              }
            >
              {' '}
              *
            </Text>
          )}
        </Text>

        <RNTextInput
          value={value}
          onChangeText={
            onChangeText
          }
          onBlur={onBlur}
          placeholder={
            placeholder
          }
          placeholderTextColor={
            '#A0A8B5'
          }
          keyboardType={
            keyboardType
          }
          style={[
            styles.nativeInput,
            error &&
              styles.inputError,
          ]}
        />

        {error && (
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        )}

      </View>

    </View>
  );
}

// =========================================================
// SELECT FIELD COMPONENT
// =========================================================

function SelectField({
  label,
  icon,
  value,
  placeholder,
  error,
  required,
  onPress,
  isLast,
}: {
  label: string;
  icon: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.selectField,
        !isLast &&
          styles.inputDivider,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >

      <View
        style={styles.inputIcon}
      >
        <Icon
          name={icon}
          size={20}
          color={PRIMARY_COLOR}
        />
      </View>

      <View
        style={
          styles.selectContent
        }
      >

        <Text
          style={
            styles.fieldLabel
          }
        >
          {label}
          {required && (
            <Text
              style={
                styles.required
              }
            >
              {' '}
              *
            </Text>
          )}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.selectValue,
            !value &&
              styles.placeholderText,
          ]}
        >
          {value ||
            placeholder}
        </Text>

        {error && (
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        )}

      </View>

      <Icon
        name="chevron-down"
        size={21}
        color={
          TEXT_SECONDARY
        }
      />

    </TouchableOpacity>
  );
}

// =========================================================
// GENERIC SELECTION MODAL
// =========================================================

function SelectionModal<
  T
>({
  visible,
  title,
  icon,
  data,
  selectedId,
  getId,
  renderLabel,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  icon: string;
  data: T[];
  selectedId?: string;
  getId: (item: T) => string;
  renderLabel: (item: T) => string;
  onClose: () => void;
  onSelect: (item: T) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >

      <View
        style={
          styles.modalOverlay
        }
      >

        <View
          style={
            styles.modalContent
          }
        >

          {/* HEADER */}

          <View
            style={
              styles.modalHeader
            }
          >

            <View
              style={
                styles.modalTitleContainer
              }
            >

              <View
                style={
                  styles.modalTitleIcon
                }
              >
                <Icon
                  name={icon}
                  size={20}
                  color={
                    PRIMARY_COLOR
                  }
                />
              </View>

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {title}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Choose one option
                </Text>
              </View>

            </View>

            <TouchableOpacity
              onPress={
                onClose
              }
              style={
                styles.modalClose
              }
            >
              <Icon
                name="close"
                size={20}
                color={
                  TEXT_SECONDARY
                }
              />
            </TouchableOpacity>

          </View>

          {/* LIST */}

          <FlatList
            data={data}
            keyExtractor={item =>
              getId(item)
            }
            contentContainerStyle={
              styles.modalList
            }
            renderItem={({
              item,
            }) => {
              const id =
                getId(item);

              const selected =
                selectedId === id;

              return (
                <TouchableOpacity
                  style={[
                    styles.selectionItem,
                    selected &&
                      styles.selectionItemSelected,
                  ]}
                  onPress={() =>
                    onSelect(
                      item
                    )
                  }
                  activeOpacity={
                    0.75
                  }
                >

                  <View
                    style={[
                      styles.selectionIcon,
                      selected && {
                        backgroundColor:
                          `${PRIMARY_COLOR}15`,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        icon ===
                        'briefcase-outline'
                          ? 'briefcase-outline'
                          : 'shield-account-outline'
                      }
                      size={18}
                      color={
                        selected
                          ? PRIMARY_COLOR
                          : '#7D8794'
                      }
                    />
                  </View>

                  <Text
                    numberOfLines={
                      2
                    }
                    style={[
                      styles.selectionText,
                      selected &&
                        styles.selectionTextSelected,
                    ]}
                  >
                    {renderLabel(
                      item
                    )}
                  </Text>

                  {selected && (
                    <View
                      style={
                        styles.checkCircle
                      }
                    >
                      <Icon
                        name="check"
                        size={15}
                        color="#FFFFFF"
                      />
                    </View>
                  )}

                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View
                style={
                  styles.modalEmpty
                }
              >

                <View
                  style={
                    styles.modalEmptyIcon
                  }
                >
                  <Icon
                    name="database-off-outline"
                    size={26}
                    color={
                      PRIMARY_COLOR
                    }
                  />
                </View>

                <Text
                  style={
                    styles.modalEmptyTitle
                  }
                >
                  Nothing available
                </Text>

                <Text
                  style={
                    styles.modalEmptyText
                  }
                >
                  No options are currently
                  available.
                </Text>

              </View>
            }
          />

        </View>

      </View>

    </Modal>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // BASE
  // =======================================================

  safeArea: {
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
    paddingVertical: 13,

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

  headerIcon: {
    width: 40,
    height: 40,

    marginLeft: 10,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  headerText: {
    marginLeft: 11,

    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',

    fontSize: 17,

    fontWeight: '700',
  },

  headerSubtitle: {
    marginTop: 2,

    color:
      'rgba(255,255,255,0.65)',

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // CONTENT
  // =======================================================

  scrollContent: {
    paddingHorizontal: 20,

    paddingTop: 18,

    paddingBottom: 45,
  },

  // =======================================================
  // MODE CARD
  // =======================================================

  modeCard: {
    flexDirection: 'row',

    alignItems: 'center',

    padding: 14,

    borderRadius: 15,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      '#E4E9F0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 7,

    elevation: 1,
  },

  modeIcon: {
    width: 43,
    height: 43,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  modeContent: {
    flex: 1,

    marginLeft: 11,

    marginRight: 7,
  },

  modeTitle: {
    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '700',
  },

  modeDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  // =======================================================
  // SECTION HEADER
  // =======================================================

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 25,

    marginBottom: 11,
  },

  sectionHeaderIcon: {
    width: 36,
    height: 36,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  sectionHeaderText: {
    marginLeft: 10,

    flex: 1,
  },

  sectionHeaderTitle: {
    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  sectionHeaderSubtitle: {
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // FORM CARD
  // =======================================================

  formCard: {
    paddingHorizontal: 14,

    borderRadius: 15,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.03,

    shadowRadius: 7,

    elevation: 1,
  },

  // =======================================================
  // INPUT
  // =======================================================

  inputWrapper: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    paddingVertical: 13,
  },

  inputDivider: {
    borderBottomWidth: 1,

    borderBottomColor:
      '#EDF0F4',
  },

  inputIcon: {
    width: 37,
    height: 37,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 3,

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}0D`,
  },

  inputContent: {
    flex: 1,

    marginLeft: 11,
  },

  fieldLabel: {
    color: TEXT_PRIMARY,

    fontSize: 10,

    fontWeight: '600',
  },

  required: {
    color: ERROR_COLOR,
  },

  nativeInput: {
    minHeight: 38,

    marginTop: 2,

    paddingHorizontal: 0,
    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '500',
  },

  inputError: {
    color: ERROR_COLOR,
  },

  errorText: {
    marginTop: 2,

    color: ERROR_COLOR,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  // =======================================================
  // SELECT
  // =======================================================

  selectField: {
    minHeight: 67,

    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 11,
  },

  selectContent: {
    flex: 1,

    marginLeft: 11,

    marginRight: 8,
  },

  selectValue: {
    marginTop: 5,

    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '500',
  },

  placeholderText: {
    color: '#A0A8B5',

    fontWeight: '400',
  },

  // =======================================================
  // REPORTS TO
  // =======================================================

  reportsField: {
    minHeight: 75,

    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 13,
  },

  reportsContent: {
    flex: 1,

    marginLeft: 11,

    marginRight: 8,
  },

  selectedValue: {
    marginTop: 4,

    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '600',
  },

  selectedHint: {
    marginTop: 2,

    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '600',
  },

  removeManager: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingBottom: 12,

    paddingLeft: 48,
  },

  removeManagerText: {
    marginLeft: 5,

    color: ERROR_COLOR,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // SUMMARY
  // =======================================================

  summaryCard: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 24,

    padding: 13,

    borderRadius: 14,

    backgroundColor:
      `${PRIMARY_COLOR}08`,

    borderWidth: 1,

    borderColor:
      `${PRIMARY_COLOR}18`,
  },

  summaryIcon: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  summaryContent: {
    flex: 1,

    marginLeft: 10,
  },

  summaryTitle: {
    color: TEXT_PRIMARY,

    fontSize: 11,

    fontWeight: '700',
  },

  summaryText: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // SUBMIT
  // =======================================================

  submitWrapper: {
    marginTop: 16,

    borderRadius: 14,

    overflow: 'hidden',

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.2,

    shadowRadius: 10,

    elevation: 5,
  },

  submitButton: {
    minHeight: 54,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 18,

    gap: 9,
  },

  submitText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',

    flex: 0,
  },

  footerHint: {
    marginTop: 10,

    color: '#9AA3AF',

    fontSize: 8,

    lineHeight: 12,

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
    maxHeight: '75%',

    backgroundColor:
      CARD_BACKGROUND,

    borderTopLeftRadius: 23,

    borderTopRightRadius: 23,

    paddingBottom: 20,
  },

  reportsModal: {
    maxHeight: '84%',
  },

  modalHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 18,

    paddingVertical: 15,

    borderBottomWidth: 1,

    borderBottomColor:
      '#E9EDF2',
  },

  modalTitleContainer: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  modalTitleIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  modalTitle: {
    marginLeft: 10,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  modalSubtitle: {
    marginLeft: 10,

    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  modalClose: {
    width: 35,
    height: 35,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      '#F1F3F6',
  },

  modalList: {
    paddingHorizontal: 14,

    paddingTop: 7,

    paddingBottom: 20,
  },

  // =======================================================
  // SELECTION ITEMS
  // =======================================================

  selectionItem: {
    minHeight: 58,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 8,

    paddingVertical: 8,

    marginBottom: 4,

    borderRadius: 11,
  },

  selectionItemSelected: {
    backgroundColor:
      SELECTED_ITEM_BG ||
      `${PRIMARY_COLOR}0C`,
  },

  selectionIcon: {
    width: 37,
    height: 37,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      '#F3F5F8',
  },

  selectionText: {
    flex: 1,

    marginLeft: 11,

    color: TEXT_PRIMARY,

    fontSize: 12,

    lineHeight: 17,

    fontWeight: '500',
  },

  selectionTextSelected: {
    color: PRIMARY_COLOR,

    fontWeight: '700',
  },

  checkCircle: {
    width: 23,
    height: 23,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      PRIMARY_COLOR,

    marginLeft: 7,
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    minHeight: 46,

    marginHorizontal: 16,

    marginTop: 13,

    marginBottom: 7,

    paddingHorizontal: 12,

    borderWidth: 1,

    borderColor:
      '#E1E6ED',

    borderRadius: 11,

    backgroundColor:
      '#F8FAFC',
  },

  searchInput: {
    flex: 1,

    height: 43,

    marginLeft: 8,

    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 12,
  },

  searchLoading: {
    minHeight: 180,

    alignItems: 'center',

    justifyContent: 'center',
  },

  searchLoadingText: {
    marginTop: 10,

    color: TEXT_SECONDARY,

    fontSize: 10,
  },

  // =======================================================
  // EMPLOYEE RESULTS
  // =======================================================

  employeeResult: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 8,

    paddingVertical: 10,

    marginBottom: 2,

    borderRadius: 12,
  },

  employeeResultInfo: {
    flex: 1,

    marginLeft: 11,

    marginRight: 8,
  },

  employeeName: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  employeeMetaRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    marginTop: 3,
  },

  employeeMeta: {
    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  employeeRole: {
    color: PRIMARY_COLOR,

    fontSize: 9,

    fontWeight: '600',
  },

  avatar: {
    marginRight: 1,
  },

  // =======================================================
  // EMPTY MODAL
  // =======================================================

  modalEmpty: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,

    paddingVertical: 45,
  },

  modalEmptyIcon: {
    width: 58,
    height: 58,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 16,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  modalEmptyTitle: {
    marginTop: 14,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  modalEmptyText: {
    marginTop: 5,

    color: TEXT_SECONDARY,

    fontSize: 10,

    textAlign: 'center',

    lineHeight: 15,
  },
  fieldIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },
});