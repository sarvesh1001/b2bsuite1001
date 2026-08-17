// apps/prayantra-b2b/src/screens/module/administration/EditEmployeeScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Text,
  Switch,
  HelperText,
} from 'react-native-paper';

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

import {
  getEmployeeDetails,
  updateEmployee,
  getCompanyEmployees,
  listRoles,
  listPositions,
  findEmployeeByUsername,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

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
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
  ERROR_COLOR,
  SELECTED_ITEM_BG,
} from '../../../constants/colors';

import {
  Role,
  Position,
  CompanyEmployee,
} from '@b2b/shared-types';

// =========================================================
// TYPES
// =========================================================

type EditEmployeeRouteProp = RouteProp<
  RootStackParamList,
  'EditEmployee'
>;

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'EditEmployee'
  >;

// =========================================================
// COMPONENT
// =========================================================

export default function EditEmployeeScreen() {
  const insets = useSafeAreaInsets();

  const navigation =
    useNavigation<NavigationProp>();

  const route =
    useRoute<EditEmployeeRouteProp>();

  const { userId } = route.params;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // STATE
  // =======================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // -------------------------------------------------------
  // Form
  // -------------------------------------------------------

  const [employeeId, setEmployeeId] =
    useState('');

  const [roleId, setRoleId] =
    useState('');

  const [positionId, setPositionId] =
    useState('');

  const [reportsTo, setReportsTo] =
    useState<string | null>(null);

  const [isActive, setIsActive] =
    useState(true);

  // -------------------------------------------------------
  // Options
  // -------------------------------------------------------

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [managers, setManagers] =
    useState<CompanyEmployee[]>([]);

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
  // Search
  // -------------------------------------------------------

  const [roleSearchTerm, setRoleSearchTerm] =
    useState('');

  const [positionSearchTerm, setPositionSearchTerm] =
    useState('');

  const [reportsToSearchTerm, setReportsToSearchTerm] =
    useState('');

  const [reportsToSearchQuery, setReportsToSearchQuery] =
    useState('');

  const [reportsToResults, setReportsToResults] =
    useState<CompanyEmployee[]>([]);

  const [reportsToLoading, setReportsToLoading] =
    useState(false);

  // -------------------------------------------------------
  // Validation
  // -------------------------------------------------------

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  // =======================================================
  // LOAD MANAGERS
  // =======================================================

  const loadManagers = useCallback(
    async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      try {
        const response =
          await getCompanyEmployees(
            companyId,
            deviceId,
            accessToken
          );

        const allEmployees =
          response.data?.employees || [];

        const filtered =
          allEmployees.filter(
            (employee) =>
              employee.user_id !== userId
          );

        setManagers(filtered);
        setReportsToResults(filtered);
      } catch (error) {
        console.error(
          'Failed to load managers',
          error
        );
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      userId,
    ]
  );

  // =======================================================
  // SEARCH MANAGER
  // =======================================================

  const searchManagers =
    useCallback(
      async (query: string) => {
        if (
          !accessToken ||
          !companyId ||
          !deviceId
        ) {
          setReportsToResults(
            managers
          );

          return;
        }

        if (!query.trim()) {
          setReportsToResults(
            managers
          );

          return;
        }

        setReportsToLoading(true);

        try {
          const response =
            await findEmployeeByUsername(
              companyId,
              deviceId,
              query.trim(),
              accessToken
            );

          const employee =
            (response.data as any)
              ?.employee || null;

          if (
            employee &&
            employee.user_id !== userId
          ) {
            setReportsToResults([
              employee,
            ]);
          } else {
            setReportsToResults([]);
          }
        } catch (error) {
          setReportsToResults([]);
        } finally {
          setReportsToLoading(false);
        }
      },
      [
        accessToken,
        companyId,
        deviceId,
        managers,
        userId,
      ]
    );

  // =======================================================
  // LOAD EMPLOYEE
  // =======================================================

  useEffect(() => {
    const fetchData = async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        Alert.alert(
          'Error',
          'Missing authentication information.'
        );

        navigation.goBack();

        return;
      }

      setLoading(true);

      try {
        const [
          employeeRaw,
          rolesResponse,
          positionsResponse,
        ] = await Promise.all([
          getEmployeeDetails(
            companyId,
            userId,
            deviceId,
            accessToken
          ),

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
              offset: 0,
              limit: 100,
            },
            accessToken
          ),
        ]);

        const employee =
          employeeRaw as any;

        if (!employee) {
          throw new Error(
            'Employee data not found'
          );
        }

        setEmployeeId(
          employee.employee_id || ''
        );

        setRoleId(
          employee.role_id || ''
        );

        setPositionId(
          employee.position_id || ''
        );

        setReportsTo(
          employee.reports_to ?? null
        );

        setIsActive(
          employee.is_active ?? true
        );

        setRoles(
          rolesResponse.data?.roles ||
            []
        );

        setPositions(
          positionsResponse.data
            ?.positions || []
        );
      } catch (error: any) {
        Alert.alert(
          'Unable to load employee',
          error?.message ||
            'Failed to load employee information.'
        );

        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    userId,
    accessToken,
    companyId,
    deviceId,
    navigation,
  ]);

  // =======================================================
  // LOAD MANAGERS
  // =======================================================

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  // =======================================================
  // RESET MANAGER SEARCH
  // =======================================================

  useEffect(() => {
    if (reportsToModalVisible) {
      setReportsToResults(
        managers
      );

      setReportsToSearchTerm('');

      setReportsToSearchQuery('');

      setReportsToLoading(false);
    }
  }, [
    reportsToModalVisible,
    managers,
  ]);

  // =======================================================
  // FILTERS
  // =======================================================

  const filteredRoles =
    useMemo(() => {
      const query =
        roleSearchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return roles;
      }

      return roles.filter(
        (role) =>
          role.role_name
            .toLowerCase()
            .includes(query)
      );
    }, [
      roles,
      roleSearchTerm,
    ]);

  const filteredPositions =
    useMemo(() => {
      const query =
        positionSearchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return positions;
      }

      return positions.filter(
        (position) =>
          position.title
            .toLowerCase()
            .includes(query)
      );
    }, [
      positions,
      positionSearchTerm,
    ]);

  // =======================================================
  // SELECTED VALUES
  // =======================================================

  const selectedRole =
    roles.find(
      (role) =>
        role.role_id === roleId
    );

  const selectedPosition =
    positions.find(
      (position) =>
        position.position_id ===
        positionId
    );

  const selectedManager =
    managers.find(
      (manager) =>
        manager.user_id ===
        reportsTo
    );

  const selectedRoleName =
    selectedRole?.role_name ||
    'Select a role';

  const selectedPositionName =
    selectedPosition?.title ||
    'Select a position';

  const selectedManagerName =
    selectedManager
      ? selectedManager.full_name ||
        selectedManager.username ||
        selectedManager.user_id
      : 'No manager assigned';

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = () => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (!employeeId.trim()) {
      newErrors.employeeId =
        'Employee ID is required';
    }

    if (!roleId) {
      newErrors.roleId =
        'Please select a role';
    }

    if (!positionId) {
      newErrors.positionId =
        'Please select a position';
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0
    );
  };

  // =======================================================
  // UPDATE
  // =======================================================

  const handleUpdate = async () => {
    if (!validate()) {
      return;
    }

    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      Alert.alert(
        'Error',
        'Missing authentication information.'
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        employee_id:
          employeeId.trim(),

        role_id: roleId,

        position_id:
          positionId,

        reports_to:
          reportsTo || null,

        is_active:
          isActive,
      };

      await updateEmployee(
        companyId,
        userId,
        deviceId,
        accessToken,
        payload
      );

      Alert.alert(
        'Employee Updated',
        'Employee information has been updated successfully.',
        [
          {
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error?.message ||
          'Unable to update employee.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // CLEAR MANAGER SEARCH
  // =======================================================

  const clearReportsToSearch =
    () => {
      setReportsToSearchTerm('');

      setReportsToSearchQuery('');

      setReportsToResults(
        managers
      );

      setReportsToLoading(false);
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
              name="account-edit-outline"
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
            Loading employee
          </Text>

          <Text style={styles.loadingSubtitle}>
            Preparing employee information...
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
        style={styles.container}
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

            <View style={styles.headerText}>
              <Text
                style={styles.headerTitle}
              >
                Edit Employee
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                Administration
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Icon
                name="account-edit-outline"
                size={22}
                color="#FFFFFF"
              />
            </View>

          </View>
        </LinearGradient>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + 110,
            },
          ]}
        >

          {/* =================================================
              EMPLOYEE SUMMARY
          ================================================= */}

          <View style={styles.employeeSummary}>

            <View style={styles.employeeAvatar}>
              <Icon
                name="account"
                size={27}
                color={PRIMARY_COLOR}
              />
            </View>

            <View style={styles.employeeSummaryText}>

              <Text
                style={
                  styles.employeeSummaryTitle
                }
              >
                Employee Profile
              </Text>

              <Text
                style={
                  styles.employeeSummarySubtitle
                }
              >
                Update role, position and reporting
                structure
              </Text>

            </View>

            <View
              style={[
                styles.statusBadge,
                isActive
                  ? styles.activeBadge
                  : styles.inactiveBadge,
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
                    color:
                      isActive
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

          <View style={styles.sectionHeader}>

            <View
              style={styles.sectionIcon}
            >
              <Icon
                name="card-account-details-outline"
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
                Employee Information
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Basic employee identification
              </Text>
            </View>

          </View>

          <View style={styles.formCard}>

            {/* Employee ID */}

            <View style={styles.field}>

              <Text style={styles.label}>
                Employee ID
              </Text>

              <View
                style={[
                  styles.readOnlyInput,
                  errors.employeeId &&
                    styles.inputError,
                ]}
              >
                <Icon
                  name="identifier"
                  size={19}
                  color={TEXT_SECONDARY}
                />

                <TextInput
                  style={
                    styles.readOnlyInputText
                  }
                  value={employeeId}
                  editable={false}
                  placeholder="EMP-2024-001"
                  placeholderTextColor={
                    TEXT_SECONDARY
                  }
                />

                <View
                  style={
                    styles.lockIcon
                  }
                >
                  <Icon
                    name="lock-outline"
                    size={15}
                    color={TEXT_SECONDARY}
                  />
                </View>
              </View>

              <Text
                style={styles.fieldHint}
              >
                Employee ID cannot be changed.
              </Text>

              {errors.employeeId && (
                <HelperText
                  type="error"
                  style={
                    styles.helperText
                  }
                >
                  {errors.employeeId}
                </HelperText>
              )}

            </View>

          </View>

          {/* =================================================
              ORGANIZATION
          ================================================= */}

          <View
            style={[
              styles.sectionHeader,
              {
                marginTop: 25,
              },
            ]}
          >

            <View
              style={styles.sectionIcon}
            >
              <Icon
                name="office-building-outline"
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
                Organization
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Define employee responsibilities
              </Text>
            </View>

          </View>

          <View style={styles.formCard}>

            {/* Role */}

            <View style={styles.field}>

              <Text style={styles.label}>
                Role
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.selector,
                  errors.roleId &&
                    styles.inputError,
                ]}
                onPress={() =>
                  setRoleModalVisible(
                    true
                  )
                }
              >

                <View
                  style={
                    styles.selectorLeft
                  }
                >
                  <View
                    style={[
                      styles.selectorIcon,
                      {
                        backgroundColor:
                          `${PRIMARY_COLOR}12`,
                      },
                    ]}
                  >
                    <Icon
                      name="account-key-outline"
                      size={18}
                      color={
                        PRIMARY_COLOR
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.selectorTextContainer
                    }
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        !selectedRole &&
                          styles.placeholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {
                        selectedRoleName
                      }
                    </Text>

                    <Text
                      style={
                        styles.selectorHint
                      }
                    >
                      Employee role
                    </Text>
                  </View>
                </View>

                <Icon
                  name="chevron-down"
                  size={21}
                  color={
                    TEXT_SECONDARY
                  }
                />

              </TouchableOpacity>

              {errors.roleId && (
                <HelperText
                  type="error"
                  style={
                    styles.helperText
                  }
                >
                  {errors.roleId}
                </HelperText>
              )}

            </View>

            {/* Position */}

            <View
              style={[
                styles.field,
                {
                  marginTop: 5,
                },
              ]}
            >

              <Text style={styles.label}>
                Position
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.selector,
                  errors.positionId &&
                    styles.inputError,
                ]}
                onPress={() =>
                  setPositionModalVisible(
                    true
                  )
                }
              >

                <View
                  style={
                    styles.selectorLeft
                  }
                >
                  <View
                    style={[
                      styles.selectorIcon,
                      {
                        backgroundColor:
                          `${PRIMARY_COLOR}12`,
                      },
                    ]}
                  >
                    <Icon
                      name="briefcase-outline"
                      size={18}
                      color={
                        PRIMARY_COLOR
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.selectorTextContainer
                    }
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        !selectedPosition &&
                          styles.placeholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {
                        selectedPositionName
                      }
                    </Text>

                    <Text
                      style={
                        styles.selectorHint
                      }
                    >
                      Employee position
                    </Text>
                  </View>
                </View>

                <Icon
                  name="chevron-down"
                  size={21}
                  color={
                    TEXT_SECONDARY
                  }
                />

              </TouchableOpacity>

              {errors.positionId && (
                <HelperText
                  type="error"
                  style={
                    styles.helperText
                  }
                >
                  {errors.positionId}
                </HelperText>
              )}

            </View>

            {/* Reports To */}

            <View
              style={[
                styles.field,
                {
                  marginTop: 5,
                  marginBottom: 0,
                },
              ]}
            >

              <Text style={styles.label}>
                Reports To
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.selector}
                onPress={() =>
                  setReportsToModalVisible(
                    true
                  )
                }
              >

                <View
                  style={
                    styles.selectorLeft
                  }
                >
                  <View
                    style={[
                      styles.selectorIcon,
                      {
                        backgroundColor:
                          '#7C3AED12',
                      },
                    ]}
                  >
                    <Icon
                      name="account-supervisor-outline"
                      size={18}
                      color="#7C3AED"
                    />
                  </View>

                  <View
                    style={
                      styles.selectorTextContainer
                    }
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        !selectedManager &&
                          styles.placeholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {
                        selectedManagerName
                      }
                    </Text>

                    <Text
                      style={
                        styles.selectorHint
                      }
                    >
                      Direct reporting manager
                    </Text>
                  </View>
                </View>

                <Icon
                  name="chevron-down"
                  size={21}
                  color={
                    TEXT_SECONDARY
                  }
                />

              </TouchableOpacity>

            </View>

          </View>

          {/* =================================================
              EMPLOYMENT STATUS
          ================================================= */}

          <View
            style={[
              styles.sectionHeader,
              {
                marginTop: 25,
              },
            ]}
          >

            <View
              style={styles.sectionIcon}
            >
              <Icon
                name="account-check-outline"
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
                Employment Status
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Control employee account status
              </Text>
            </View>

          </View>

          <View
            style={[
              styles.statusCard,
              isActive
                ? styles.statusCardActive
                : styles.statusCardInactive,
            ]}
          >

            <View
              style={[
                styles.statusLargeIcon,
                {
                  backgroundColor:
                    isActive
                      ? '#DCFCE7'
                      : '#F1F5F9',
                },
              ]}
            >
              <Icon
                name={
                  isActive
                    ? 'account-check'
                    : 'account-off-outline'
                }
                size={23}
                color={
                  isActive
                    ? '#16A34A'
                    : '#64748B'
                }
              />
            </View>

            <View
              style={
                styles.statusCardContent
              }
            >
              <Text
                style={
                  styles.statusCardTitle
                }
              >
                {isActive
                  ? 'Employee is active'
                  : 'Employee is inactive'}
              </Text>

              <Text
                style={
                  styles.statusCardDescription
                }
              >
                {isActive
                  ? 'This employee can currently access the system.'
                  : 'This employee will not be considered active.'}
              </Text>
            </View>

            <Switch
              value={isActive}
              onValueChange={
                setIsActive
              }
              trackColor={{
                false: '#CBD5E1',
                true: `${PRIMARY_COLOR}70`,
              }}
              thumbColor={
                isActive
                  ? PRIMARY_COLOR
                  : '#F8FAFC'
              }
            />

          </View>

        </ScrollView>

        {/* =================================================
            BOTTOM SAVE BAR
        ================================================= */}

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom:
                Math.max(
                  insets.bottom,
                  12
                ),
            },
          ]}
        >

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleUpdate}
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
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    Saving changes...
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name="content-save-outline"
                    size={20}
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

      </KeyboardAvoidingView>

      {/* ===================================================
          ROLE MODAL
      =================================================== */}

      <Modal
        visible={roleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setRoleModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>

          <View
            style={[
              styles.modalContent,
              {
                paddingBottom:
                  insets.bottom + 12,
              },
            ]}
          >

            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Role
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Choose the employee's role
                </Text>
              </View>

              <View
                style={
                  styles.modalHeaderActions
                }
              >

                {roleId && (
                  <TouchableOpacity
                    onPress={() => {
                      setRoleId('');
                      setRoleModalVisible(
                        false
                      );
                      setRoleSearchTerm(
                        ''
                      );
                    }}
                    style={
                      styles.clearButton
                    }
                  >
                    <Text
                      style={
                        styles.clearButtonText
                      }
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setRoleModalVisible(
                      false
                    )
                  }
                >
                  <Icon
                    name="close"
                    size={19}
                    color={
                      TEXT_SECONDARY
                    }
                  />
                </TouchableOpacity>

              </View>

            </View>

            <SearchBar
              value={roleSearchTerm}
              onChangeText={
                setRoleSearchTerm
              }
              placeholder="Search roles..."
              onClear={() =>
                setRoleSearchTerm('')
              }
            />

            <FlatList
              data={filteredRoles}
              keyExtractor={(item) =>
                item.role_id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.modalList
              }
              renderItem={({
                item,
              }) => {
                const selected =
                  roleId ===
                  item.role_id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.optionItem,
                      selected &&
                        styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      setRoleId(
                        item.role_id
                      );

                      setRoleModalVisible(
                        false
                      );

                      setRoleSearchTerm(
                        ''
                      );
                    }}
                  >

                    <View
                      style={[
                        styles.optionIcon,
                        {
                          backgroundColor:
                            selected
                              ? `${PRIMARY_COLOR}18`
                              : '#F1F5F9',
                        },
                      ]}
                    >
                      <Icon
                        name="account-key-outline"
                        size={20}
                        color={
                          selected
                            ? PRIMARY_COLOR
                            : TEXT_SECONDARY
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.optionTitle
                      }
                    >
                      {item.role_name}
                    </Text>

                    {selected && (
                      <Icon
                        name="check-circle"
                        size={21}
                        color={
                          PRIMARY_COLOR
                        }
                      />
                    )}

                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <EmptyModalState
                  icon="account-search-outline"
                  text="No roles found"
                />
              }
            />

          </View>
        </View>
      </Modal>

      {/* ===================================================
          POSITION MODAL
      =================================================== */}

      <Modal
        visible={positionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPositionModalVisible(
            false
          )
        }
      >
        <View style={styles.modalOverlay}>

          <View
            style={[
              styles.modalContent,
              {
                paddingBottom:
                  insets.bottom + 12,
              },
            ]}
          >

            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Position
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Choose the employee's position
                </Text>
              </View>

              <View
                style={
                  styles.modalHeaderActions
                }
              >

                {positionId && (
                  <TouchableOpacity
                    onPress={() => {
                      setPositionId(
                        ''
                      );

                      setPositionModalVisible(
                        false
                      );

                      setPositionSearchTerm(
                        ''
                      );
                    }}
                    style={
                      styles.clearButton
                    }
                  >
                    <Text
                      style={
                        styles.clearButtonText
                      }
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setPositionModalVisible(
                      false
                    )
                  }
                >
                  <Icon
                    name="close"
                    size={19}
                    color={
                      TEXT_SECONDARY
                    }
                  />
                </TouchableOpacity>

              </View>

            </View>

            <SearchBar
              value={
                positionSearchTerm
              }
              onChangeText={
                setPositionSearchTerm
              }
              placeholder="Search positions..."
              onClear={() =>
                setPositionSearchTerm(
                  ''
                )
              }
            />

            <FlatList
              data={
                filteredPositions
              }
              keyExtractor={(item) =>
                item.position_id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.modalList
              }
              renderItem={({
                item,
              }) => {
                const selected =
                  positionId ===
                  item.position_id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.optionItem,
                      selected &&
                        styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      setPositionId(
                        item.position_id
                      );

                      setPositionModalVisible(
                        false
                      );

                      setPositionSearchTerm(
                        ''
                      );
                    }}
                  >

                    <View
                      style={[
                        styles.optionIcon,
                        {
                          backgroundColor:
                            selected
                              ? `${PRIMARY_COLOR}18`
                              : '#F1F5F9',
                        },
                      ]}
                    >
                      <Icon
                        name="briefcase-outline"
                        size={20}
                        color={
                          selected
                            ? PRIMARY_COLOR
                            : TEXT_SECONDARY
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.optionTitle
                      }
                    >
                      {item.title}
                    </Text>

                    {selected && (
                      <Icon
                        name="check-circle"
                        size={21}
                        color={
                          PRIMARY_COLOR
                        }
                      />
                    )}

                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <EmptyModalState
                  icon="briefcase-off-outline"
                  text="No positions found"
                />
              }
            />

          </View>
        </View>
      </Modal>

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
              {
                paddingBottom:
                  insets.bottom + 12,
              },
            ]}
          >

            <View style={styles.modalHandle} />

            <View
              style={styles.modalHeader}
            >

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Reports To
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Select the direct manager
                </Text>
              </View>

              <View
                style={
                  styles.modalHeaderActions
                }
              >

                {reportsTo && (
                  <TouchableOpacity
                    onPress={() => {
                      setReportsTo(
                        null
                      );

                      setReportsToModalVisible(
                        false
                      );

                      clearReportsToSearch();
                    }}
                    style={
                      styles.clearButton
                    }
                  >
                    <Text
                      style={
                        styles.clearButtonText
                      }
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setReportsToModalVisible(
                      false
                    )
                  }
                >
                  <Icon
                    name="close"
                    size={19}
                    color={
                      TEXT_SECONDARY
                    }
                  />
                </TouchableOpacity>

              </View>

            </View>

            <SearchBar
              value={
                reportsToSearchTerm
              }
              onChangeText={
                setReportsToSearchTerm
              }
              placeholder="Search by exact username..."
              onClear={
                clearReportsToSearch
              }
              onSubmit={() => {
                setReportsToSearchQuery(
                  reportsToSearchTerm
                );

                searchManagers(
                  reportsToSearchTerm
                );
              }}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={
                styles.managerSearchButton
              }
              onPress={() => {
                setReportsToSearchQuery(
                  reportsToSearchTerm
                );

                searchManagers(
                  reportsToSearchTerm
                );
              }}
            >
              <Icon
                name="magnify"
                size={17}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.managerSearchButtonText
                }
              >
                Search Employee
              </Text>
            </TouchableOpacity>

            {reportsToLoading ? (
              <View
                style={
                  styles.modalLoading
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
                    styles.modalLoadingText
                  }
                >
                  Searching employees...
                </Text>
              </View>
            ) : (
              <FlatList
                data={
                  reportsToResults
                }
                keyExtractor={(
                  item
                ) =>
                  item.user_id
                }
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.modalList
                }
                renderItem={({
                  item,
                }) => {
                  const selected =
                    reportsTo ===
                    item.user_id;

                  const displayName =
                    item.full_name ||
                    item.username ||
                    'Unnamed Employee';

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.managerItem,
                        selected &&
                          styles.optionItemSelected,
                      ]}
                      onPress={() => {
                        setReportsTo(
                          item.user_id
                        );

                        setReportsToModalVisible(
                          false
                        );

                        clearReportsToSearch();
                      }}
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
                        size={44}
                        style={
                          styles.managerAvatar
                        }
                      />

                      <View
                        style={
                          styles.managerInfo
                        }
                      >

                        <Text
                          style={
                            styles.managerName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {displayName}
                        </Text>

                        {item.username && (
                          <Text
                            style={
                              styles.managerUsername
                            }
                            numberOfLines={
                              1
                            }
                          >
                            @{item.username}
                          </Text>
                        )}

                        <Text
                          style={
                            styles.managerEmployeeId
                          }
                          numberOfLines={
                            1
                          }
                        >
                          ID:{' '}
                          {item.employee_id ||
                            'N/A'}
                        </Text>

                      </View>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={22}
                          color={
                            PRIMARY_COLOR
                          }
                        />
                      )}

                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <EmptyModalState
                    icon="account-off-outline"
                    text={
                      reportsToSearchQuery
                        ? 'No employee found'
                        : 'No employees available'
                    }
                  />
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
// SEARCH BAR
// =========================================================

type SearchBarProps = {
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder: string;
  onClear: () => void;
  onSubmit?: () => void;
};

function SearchBar({
  value,
  onChangeText,
  placeholder,
  onClear,
  onSubmit,
}: SearchBarProps) {
  return (
    <View style={styles.searchContainer}>

      <Icon
        name="magnify"
        size={20}
        color={TEXT_SECONDARY}
      />

      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          '#A0AAB8'
        }
        returnKeyType={
          onSubmit
            ? 'search'
            : 'done'
        }
        onSubmitEditing={
          onSubmit
        }
        autoCapitalize="none"
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          style={
            styles.searchClear
          }
        >
          <Icon
            name="close-circle"
            size={18}
            color="#A0AAB8"
          />
        </TouchableOpacity>
      )}

    </View>
  );
}

// =========================================================
// EMPTY MODAL STATE
// =========================================================

function EmptyModalState({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View
      style={
        styles.emptyModalState
      }
    >
      <View
        style={
          styles.emptyModalIcon
        }
      >
        <Icon
          name={icon}
          size={28}
          color={TEXT_SECONDARY}
        />
      </View>

      <Text
        style={
          styles.emptyModalTitle
        }
      >
        {text}
      </Text>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // BASE
  // =======================================================

  container: {
    flex: 1,
    backgroundColor:
      BACKGROUND_COLOR,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,

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

    borderRadius: 12,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '700',
  },

  headerSubtitle: {
    marginTop: 2,

    color:
      'rgba(255,255,255,0.65)',

    fontSize: 10,

    fontWeight: '500',
  },

  headerIcon: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  // =======================================================
  // CONTENT
  // =======================================================

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  // =======================================================
  // EMPLOYEE SUMMARY
  // =======================================================

  employeeSummary: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 15,

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 7,

    elevation: 1,
  },

  employeeAvatar: {
    width: 47,
    height: 47,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 14,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  employeeSummaryText: {
    flex: 1,

    marginLeft: 11,
  },

  employeeSummaryTitle: {
    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  employeeSummarySubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: 20,
  },

  activeBadge: {
    backgroundColor: '#F0FDF4',
  },

  inactiveBadge: {
    backgroundColor: '#F8FAFC',
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,
  },

  statusText: {
    fontSize: 8,

    fontWeight: '700',
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 11,
  },

  sectionIcon: {
    width: 35,
    height: 35,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  sectionTitle: {
    marginLeft: 9,

    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  sectionSubtitle: {
    marginLeft: 9,
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // FORM CARD
  // =======================================================

  formCard: {
    padding: 16,

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.025,

    shadowRadius: 6,

    elevation: 1,
  },

  field: {
    marginBottom: 17,
  },

  label: {
    marginBottom: 7,

    color: '#475569',

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // READ ONLY
  // =======================================================

  readOnlyInput: {
    minHeight: 50,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,

    borderRadius: 11,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    backgroundColor:
      '#F8FAFC',
  },

  readOnlyInputText: {
    flex: 1,

    marginLeft: 9,

    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '600',
  },

  lockIcon: {
    width: 27,
    height: 27,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 7,

    backgroundColor:
      '#EEF2F6',
  },

  fieldHint: {
    marginTop: 5,

    color: '#94A3B8',

    fontSize: 9,
  },

  // =======================================================
  // SELECTOR
  // =======================================================

  selector: {
    minHeight: 60,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 11,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    borderRadius: 11,

    backgroundColor:
      '#FFFFFF',
  },

  selectorLeft: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',
  },

  selectorIcon: {
    width: 36,
    height: 36,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,
  },

  selectorTextContainer: {
    flex: 1,

    marginLeft: 9,
  },

  selectorText: {
    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '600',
  },

  placeholderText: {
    color: TEXT_SECONDARY,
  },

  selectorHint: {
    marginTop: 3,

    color: '#94A3B8',

    fontSize: 8,

    fontWeight: '500',
  },

  inputError: {
    borderColor:
      ERROR_COLOR,
  },

  helperText: {
    marginTop: 2,

    marginLeft: -5,

    fontSize: 10,
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusCard: {
    minHeight: 80,

    flexDirection: 'row',

    alignItems: 'center',

    padding: 13,

    borderRadius: 15,

    borderWidth: 1,
  },

  statusCardActive: {
    backgroundColor:
      '#F7FEF9',

    borderColor:
      '#D1FAE5',
  },

  statusCardInactive: {
    backgroundColor:
      '#F8FAFC',

    borderColor:
      '#E2E8F0',
  },

  statusLargeIcon: {
    width: 44,
    height: 44,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,
  },

  statusCardContent: {
    flex: 1,

    marginLeft: 10,
  },

  statusCardTitle: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  statusCardDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,
  },

  // =======================================================
  // BOTTOM SAVE BAR
  // =======================================================

  bottomBar: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    paddingHorizontal: 20,
    paddingTop: 10,

    backgroundColor:
      'rgba(255,255,255,0.96)',

    borderTopWidth: 1,

    borderTopColor:
      '#E5EAF0',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -3,
    },

    shadowOpacity: 0.05,

    shadowRadius: 8,

    elevation: 8,
  },

  saveButtonWrapper: {
    borderRadius: 13,

    overflow: 'hidden',

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.2,

    shadowRadius: 8,

    elevation: 4,
  },

  saveButton: {
    minHeight: 52,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    borderRadius: 13,
  },

  saveButtonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '700',
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
    marginTop: 19,
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

    justifyContent:
      'flex-end',

    backgroundColor:
      'rgba(15,23,42,0.42)',
  },

  modalContent: {
    maxHeight: '82%',

    backgroundColor:
      CARD_BACKGROUND,

    borderTopLeftRadius: 24,

    borderTopRightRadius: 24,

    paddingTop: 9,
  },

  modalHandle: {
    width: 38,
    height: 4,

    alignSelf: 'center',

    borderRadius: 4,

    backgroundColor:
      '#CBD5E1',

    marginBottom: 8,
  },

  modalHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 20,

    paddingVertical: 12,
  },

  modalTitle: {
    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  modalSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,
  },

  modalHeaderActions: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  clearButton: {
    marginRight: 11,
  },

  clearButtonText: {
    color: PRIMARY_COLOR,

    fontSize: 11,

    fontWeight: '700',
  },

  closeButton: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      '#F1F5F9',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchContainer: {
    height: 47,

    flexDirection: 'row',

    alignItems: 'center',

    marginHorizontal: 16,
    marginBottom: 10,

    paddingHorizontal: 12,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    borderRadius: 11,

    backgroundColor:
      '#F8FAFC',
  },

  searchInput: {
    flex: 1,

    height: 47,

    marginLeft: 8,

    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 12,
  },

  searchClear: {
    padding: 3,
  },

  // =======================================================
  // OPTIONS
  // =======================================================

  modalList: {
    paddingHorizontal: 16,

    paddingBottom: 15,
  },

  optionItem: {
    minHeight: 58,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 11,

    marginBottom: 8,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    borderRadius: 12,

    backgroundColor:
      '#FFFFFF',
  },

  optionItemSelected: {
    backgroundColor:
      SELECTED_ITEM_BG,

    borderColor:
      `${PRIMARY_COLOR}55`,
  },

  optionIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  optionTitle: {
    flex: 1,

    marginLeft: 10,

    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '600',
  },

  // =======================================================
  // MANAGERS
  // =======================================================

  managerSearchButton: {
    height: 40,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    marginHorizontal: 16,
    marginBottom: 10,

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,
  },

  managerSearchButtonText: {
    color: '#FFFFFF',

    fontSize: 11,

    fontWeight: '700',
  },

  managerItem: {
    minHeight: 68,

    flexDirection: 'row',

    alignItems: 'center',

    padding: 10,

    marginBottom: 8,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    borderRadius: 12,

    backgroundColor:
      '#FFFFFF',
  },

  managerAvatar: {
    marginRight: 10,
  },

  managerInfo: {
    flex: 1,
  },

  managerName: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '700',
  },

  managerUsername: {
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,
  },

  managerEmployeeId: {
    marginTop: 2,

    color: '#94A3B8',

    fontSize: 8,
  },

  // =======================================================
  // MODAL LOADING
  // =======================================================

  modalLoading: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 45,
  },

  modalLoadingText: {
    marginTop: 9,

    color: TEXT_SECONDARY,

    fontSize: 10,
  },

  // =======================================================
  // EMPTY MODAL
  // =======================================================

  emptyModalState: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 45,
  },

  emptyModalIcon: {
    width: 58,
    height: 58,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 16,

    backgroundColor:
      '#F1F5F9',
  },

  emptyModalTitle: {
    marginTop: 12,

    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '600',
  },
});