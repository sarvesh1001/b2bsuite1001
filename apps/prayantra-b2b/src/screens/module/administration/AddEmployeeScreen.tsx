// apps/prayantra-b2b/src/screens/module/administration/AddEmployeeScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';

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

// 👇 Unified member API + locations + username lookup (matches UserPhoneScreen)
import {
  addMember,
  listRoles,
  listPositions,
  listLocations,
  findEmployeeByUsername,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  Role,
  Position,
  CompanyEmployee,
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
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

  // Backend requires these on the unified endpoint
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username is too long')
    .regex(/^[a-zA-Z0-9]+$/, 'Letters and digits only'),

  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name is too long'),

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
// SELECTED LOCATION LOCAL TYPE
// =========================================================

type SelectedLocationEntry = {
  location_id: string;
  access_level: LocationAccessLevel;
};

const DEFAULT_ACCESS_LEVEL: LocationAccessLevel = 'VIEW';

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

  const [locations, setLocations] =
    useState<AccessibleLocation[]>([]);

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

  const [primaryLocationModalVisible, setPrimaryLocationModalVisible] =
    useState(false);

  const [selectedLocationsModalVisible, setSelectedLocationsModalVisible] =
    useState(false);

  // -------------------------------------------------------
  // Reports To — username lookup (same pattern as UserPhoneScreen)
  // -------------------------------------------------------

  const [reportsToSearch, setReportsToSearch] =
    useState('');

  const [reportsToResult, setReportsToResult] =
    useState<CompanyEmployee | null>(null);

  const [reportsToSearched, setReportsToSearched] =
    useState(false);

  const [loadingReportsTo, setLoadingReportsTo] =
    useState(false);

  const [selectedReportsToName, setSelectedReportsToName] =
    useState('');

  // -------------------------------------------------------
  // Location state (kept outside react-hook-form — non-trivial shape)
  // -------------------------------------------------------

  const [primaryLocationId, setPrimaryLocationId] =
    useState<string>('');

  const [locationScope, setLocationScope] =
    useState<LocationAccessScope | ''>('');

  const [selectedLocations, setSelectedLocations] =
    useState<SelectedLocationEntry[]>([]);

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
  // FETCH ROLES + POSITIONS + LOCATIONS
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
            locationsRes,
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

            listLocations(companyId, 1, 100).catch(
              () => ({ data: { locations: [] } } as any)
            ),
          ]);

          setRoles(
            rolesRes.data?.roles || []
          );

          setPositions(
            positionsRes.data?.positions || []
          );

          // API shape may be { locations: [...] } or an array directly
          const rawLocations =
            (locationsRes as any)?.locations ||
            (locationsRes as any)?.data?.locations ||
            (Array.isArray(locationsRes) ? locationsRes : []);

          setLocations(
            (rawLocations || []).filter(
              (l: AccessibleLocation) => l?.is_active !== false
            )
          );
        } catch (error) {
          console.error(
            'Failed to load employee options:',
            error
          );

          Alert.alert(
            'Unable to Load',
            'Failed to load roles, positions, and locations. Please try again.'
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
      setReportsToResult(null);
      setReportsToSearched(false);
    }
  }, [
    reportsToModalVisible,
  ]);

  // =======================================================
  // LOOKUP REPORTS TO (exact username — same as UserPhoneScreen)
  // =======================================================

  const handleReportsToLookup =
    async () => {
      const username =
        reportsToSearch.trim();

      if (
        !username ||
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      setLoadingReportsTo(true);
      setReportsToResult(null);
      setReportsToSearched(true);

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

        setReportsToResult(employee);
      } catch (error: any) {
        console.error(
          'Employee lookup failed:',
          error
        );

        // 404 → show empty state instead of a hard alert
        if (error?.response?.status === 404) {
          setReportsToResult(null);
        } else {
          Alert.alert(
            'Search Failed',
            'Could not search for the employee. Please try again.'
          );
        }
      } finally {
        setLoadingReportsTo(false);
      }
    };

  // =======================================================
  // CLEAR REPORTS TO LOOKUP
  // =======================================================

  const clearReportsToLookup = () => {
    setReportsToSearch('');
    setReportsToResult(null);
    setReportsToSearched(false);
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
  // LOCATION HELPERS
  // =======================================================

  const primaryLocation =
    useMemo(
      () =>
        locations.find(
          l => l.location_id === primaryLocationId
        ),
      [locations, primaryLocationId]
    );

  const selectedLocationObjects =
    useMemo(() => {
      return selectedLocations
        .map(entry => {
          const loc = locations.find(
            l => l.location_id === entry.location_id
          );
          return loc
            ? { ...entry, location: loc }
            : null;
        })
        .filter(
          (
            x
          ): x is SelectedLocationEntry & {
            location: AccessibleLocation;
          } => Boolean(x)
        );
    }, [locations, selectedLocations]);

  const isLocationSelected = (locationId: string) =>
    selectedLocations.some(
      sl => sl.location_id === locationId
    );

  const getLocationAccessLevel = (
    locationId: string
  ): LocationAccessLevel | undefined =>
    selectedLocations.find(
      sl => sl.location_id === locationId
    )?.access_level;

  const toggleSelectedLocation = (locationId: string) => {
    setSelectedLocations(prev => {
      const exists = prev.some(
        sl => sl.location_id === locationId
      );
      if (exists) {
        return prev.filter(
          sl => sl.location_id !== locationId
        );
      }
      return [
        ...prev,
        {
          location_id: locationId,
          access_level: DEFAULT_ACCESS_LEVEL,
        },
      ];
    });
  };

  const setLocationAccessLevel = (
    locationId: string,
    accessLevel: LocationAccessLevel
  ) => {
    setSelectedLocations(prev =>
      prev.map(sl =>
        sl.location_id === locationId
          ? { ...sl, access_level: accessLevel }
          : sl
      )
    );
  };

  // When user picks SELECTED but has no primary, default primary to the
  // first selected location (backend requires primary when scope is SELECTED).
  useEffect(() => {
    if (
      locationScope === 'SELECTED' &&
      !primaryLocationId &&
      selectedLocations.length > 0
    ) {
      setPrimaryLocationId(
        selectedLocations[0].location_id
      );
    }
  }, [
    locationScope,
    primaryLocationId,
    selectedLocations,
  ]);

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

      // ---- Location validation (client-side, before hitting the API) ----
      if (
        locationScope === 'PRIMARY' &&
        !primaryLocationId
      ) {
        Alert.alert(
          'Location Required',
          'Please pick a primary location or change the access scope.'
        );
        return;
      }

      if (
        locationScope === 'SELECTED' &&
        selectedLocations.length === 0
      ) {
        Alert.alert(
          'Locations Required',
          'Please select at least one location for SELECTED scope.'
        );
        return;
      }

      const cleanPhone =
        data.phone
          .trim()
          .replace(/\s/g, '');

      // ---- Location block (only included when the user touched it) ----
      const locationBlock: Record<string, unknown> = {};
      const hasLocationInput =
        !!primaryLocationId ||
        !!locationScope ||
        selectedLocations.length > 0;

      if (hasLocationInput) {
        if (primaryLocationId) {
          locationBlock.primary_location_id =
            primaryLocationId;
        }

        let effectiveScope: LocationAccessScope =
          (locationScope as LocationAccessScope) ||
          (selectedLocations.length > 0
            ? 'SELECTED'
            : primaryLocationId
            ? 'PRIMARY'
            : 'ALL');

        if (
          effectiveScope === 'PRIMARY' &&
          !primaryLocationId
        ) {
          effectiveScope = 'ALL';
        }

        locationBlock.location_access_scope =
          effectiveScope;

        if (
          effectiveScope === 'SELECTED' &&
          selectedLocations.length > 0
        ) {
          locationBlock.selected_locations =
            selectedLocations.map(sl => ({
              location_id: sl.location_id,
              access_level: sl.access_level,
            }));
        }
      }

      // 👇 Single unified payload for POST /rbac/members
      const payload = {
        member_type: (data.is_manager
          ? 'manager'
          : 'employee') as 'manager' | 'employee',
        phone: cleanPhone,
        username: data.username.trim(),
        full_name: data.full_name.trim(),
        employee_id:
          data.employee_id?.trim() || undefined,
        role_id: data.role_id,
        reports_to:
          data.reports_to || undefined,
        position_id:
          data.position_id || undefined,
        ...locationBlock,
      };

      setLoading(true);

      try {
        await addMember(
          companyId,
          deviceId,
          payload as any,
          accessToken
        );

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
          'Add member error:',
          error
        );

        Alert.alert(
          'Unable to Add',
          error?.response?.data?.message ||
            error?.message ||
            'Something went wrong while adding the member.'
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
            Loading roles, positions, and locations...
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
                Add Member
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
                  error={
                    errors.full_name?.message
                  }
                  required
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
                  error={
                    errors.username?.message
                  }
                  required
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
                    Search for manager by username
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
              LOCATION ACCESS (OPTIONAL)
          ================================================= */}

          <SectionHeader
            icon="map-marker-outline"
            title="Location Access"
            subtitle="Optional — assign primary & allowed locations"
          />

          <View style={styles.formCard}>

            {/* PRIMARY LOCATION */}

            <TouchableOpacity
              style={[
                styles.reportsField,
                styles.inputDivider,
              ]}
              onPress={() =>
                setPrimaryLocationModalVisible(true)
              }
              activeOpacity={0.75}
            >

              <View style={styles.fieldIcon}>
                <Icon
                  name="map-marker-outline"
                  size={21}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View style={styles.reportsContent}>

                <Text style={styles.fieldLabel}>
                  Primary Location
                </Text>

                {primaryLocation ? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={styles.selectedValue}
                    >
                      {primaryLocation.location_name}
                      {primaryLocation.location_code
                        ? ` (${primaryLocation.location_code})`
                        : ''}
                    </Text>

                    <Text style={styles.selectedHint}>
                      Tap to change
                    </Text>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>
                    Select a primary location
                  </Text>
                )}

              </View>

              <Icon
                name="chevron-right"
                size={22}
                color={TEXT_SECONDARY}
              />

            </TouchableOpacity>

            {primaryLocationId && (
              <TouchableOpacity
                style={styles.removeManager}
                onPress={() =>
                  setPrimaryLocationId('')
                }
              >
                <Icon
                  name="close-circle-outline"
                  size={15}
                  color={ERROR_COLOR}
                />

                <Text style={styles.removeManagerText}>
                  Clear primary location
                </Text>
              </TouchableOpacity>
            )}

            {/* ACCESS SCOPE */}

            <View style={styles.scopeBlock}>

              <Text style={styles.scopeLabel}>
                Location Access Scope
              </Text>

              <View style={styles.scopeRow}>

                {(
                  [
                    { key: 'PRIMARY', label: 'Primary Only' },
                    { key: 'SELECTED', label: 'Selected' },
                    { key: 'ALL', label: 'All Locations' },
                  ] as const
                ).map(opt => {
                  const active = locationScope === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setLocationScope(opt.key);
                        if (opt.key !== 'SELECTED') {
                          setSelectedLocations([]);
                        }
                      }}
                      style={[
                        styles.scopeChip,
                        active && styles.scopeChipActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.scopeChipText,
                          active && styles.scopeChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              </View>

              <Text style={styles.scopeHint}>
                {locationScope === ''
                  ? 'Leave empty to auto-resolve: PRIMARY if a primary is set, otherwise ALL.'
                  : locationScope === 'PRIMARY'
                  ? 'Member will only be able to access their primary location.'
                  : locationScope === 'SELECTED'
                  ? 'Pick the specific locations this member can access.'
                  : 'Member will have access to every active company location.'}
              </Text>

            </View>

            {/* SELECTED LOCATIONS LIST */}

            {locationScope === 'SELECTED' && (
              <TouchableOpacity
                style={styles.selectedLocationsField}
                onPress={() =>
                  setSelectedLocationsModalVisible(true)
                }
                activeOpacity={0.75}
              >
                <View style={styles.fieldIcon}>
                  <Icon
                    name="format-list-bulleted"
                    size={21}
                    color={PRIMARY_COLOR}
                  />
                </View>

                <View style={styles.reportsContent}>
                  <Text style={styles.fieldLabel}>
                    Selected Locations
                  </Text>

                  {selectedLocations.length > 0 ? (
                    <>
                      <Text
                        numberOfLines={2}
                        style={styles.selectedValue}
                      >
                        {selectedLocationObjects
                          .map(
                            sl =>
                              `${sl.location.location_name} · ${
                                sl.access_level === 'MANAGE'
                                  ? 'Manage'
                                  : 'View'
                              }`
                          )
                          .join(', ')}
                      </Text>

                      <Text style={styles.selectedHint}>
                        {selectedLocations.length} location
                        {selectedLocations.length === 1
                          ? ''
                          : 's'}{' '}
                        · tap to edit
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      Choose one or more locations
                    </Text>
                  )}
                </View>

                <Icon
                  name="chevron-right"
                  size={22}
                  color={TEXT_SECONDARY}
                />
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
                {primaryLocation
                  ? ` • 📍 ${primaryLocation.location_name}`
                  : ''}
                {selectedLocations.length > 0
                  ? ` • ${selectedLocations.length} location${
                      selectedLocations.length === 1
                        ? ''
                        : 's'
                    }`
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
          PRIMARY LOCATION MODAL
      =================================================== */}

      <SelectionModal
        visible={primaryLocationModalVisible}
        title="Select Primary Location"
        icon="map-marker-outline"
        data={locations}
        selectedId={primaryLocationId}
        getId={item => item.location_id}
        renderLabel={item =>
          item.location_code
            ? `${item.location_name} (${item.location_code})`
            : item.location_name
        }
        onClose={() =>
          setPrimaryLocationModalVisible(false)
        }
        onSelect={item => {
          setPrimaryLocationId(item.location_id);
          setPrimaryLocationModalVisible(false);
        }}
      />

      {/* ===================================================
          SELECTED LOCATIONS MODAL (multi-select + access level)
      =================================================== */}

      <Modal
        visible={selectedLocationsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedLocationsModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalTitleIcon}>
                  <Icon
                    name="format-list-bulleted"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    Select Locations
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedLocations.length} selected
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setSelectedLocationsModalVisible(false)
                }
                style={styles.modalClose}
              >
                <Icon
                  name="check"
                  size={20}
                  color={PRIMARY_COLOR}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={locations}
              keyExtractor={item => item.location_id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => {
                const active = isLocationSelected(
                  item.location_id
                );
                const level = getLocationAccessLevel(
                  item.location_id
                );

                return (
                  <View
                    style={[
                      styles.selectionItem,
                      styles.locationSelectionItem,
                      active &&
                        styles.selectionItemSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.locationSelectionHead}
                      onPress={() =>
                        toggleSelectedLocation(
                          item.location_id
                        )
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.selectionIcon,
                          active && {
                            backgroundColor: `${PRIMARY_COLOR}15`,
                          },
                        ]}
                      >
                        <Icon
                          name="map-marker-outline"
                          size={18}
                          color={
                            active
                              ? PRIMARY_COLOR
                              : '#7D8794'
                          }
                        />
                      </View>

                      <Text
                        numberOfLines={2}
                        style={[
                          styles.selectionText,
                          active &&
                            styles.selectionTextSelected,
                        ]}
                      >
                        {item.location_name}
                        {item.location_code
                          ? ` (${item.location_code})`
                          : ''}
                      </Text>

                      {active && (
                        <View style={styles.checkCircle}>
                          <Icon
                            name="check"
                            size={15}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </TouchableOpacity>

                    {active && (
                      <View style={styles.levelChipsRow}>
                        {(
                          [
                            { key: 'VIEW', label: 'View only' },
                            { key: 'MANAGE', label: 'Manage' },
                          ] as const
                        ).map(opt => {
                          const chipActive =
                            level === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              onPress={() =>
                                setLocationAccessLevel(
                                  item.location_id,
                                  opt.key
                                )
                              }
                              style={[
                                styles.levelChip,
                                chipActive &&
                                  styles.levelChipActive,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Icon
                                name={
                                  opt.key === 'MANAGE'
                                    ? 'shield-edit-outline'
                                    : 'eye-outline'
                                }
                                size={13}
                                color={
                                  chipActive
                                    ? PRIMARY_COLOR
                                    : TEXT_SECONDARY
                                }
                              />
                              <Text
                                style={[
                                  styles.levelChipText,
                                  chipActive &&
                                    styles.levelChipTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <View style={styles.modalEmptyIcon}>
                    <Icon
                      name="map-marker-off-outline"
                      size={26}
                      color={PRIMARY_COLOR}
                    />
                  </View>
                  <Text style={styles.modalEmptyTitle}>
                    No locations available
                  </Text>
                  <Text style={styles.modalEmptyText}>
                    Create a location first from Company Settings.
                  </Text>
                </View>
              }
            />

          </View>
        </View>
      </Modal>

      {/* ===================================================
          REPORTS TO MODAL — username lookup (mirrors UserPhoneScreen)
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
                    Search by exact username
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

            {/* SEARCH INPUT */}

            <View
              style={
                styles.searchContainer
              }
            >

              <Icon
                name="account-outline"
                size={21}
                color={
                  TEXT_SECONDARY
                }
              />

              <RNTextInput
                style={
                  styles.searchInput
                }
                placeholder="Enter username"
                placeholderTextColor={
                  '#9AA4B2'
                }
                value={
                  reportsToSearch
                }
                onChangeText={
                  setReportsToSearch
                }
                onSubmitEditing={
                  handleReportsToLookup
                }
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loadingReportsTo}
                autoFocus
              />

              {reportsToSearch.length >
                0 && (
                <TouchableOpacity
                  onPress={
                    clearReportsToLookup
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

            {/* SEARCH BUTTON */}

            <TouchableOpacity
              style={[
                styles.searchLookupButton,
                (!reportsToSearch.trim() ||
                  loadingReportsTo) &&
                  styles.searchLookupButtonDisabled,
              ]}
              onPress={
                handleReportsToLookup
              }
              disabled={
                !reportsToSearch.trim() ||
                loadingReportsTo
              }
              activeOpacity={0.85}
            >
              {loadingReportsTo ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Icon
                    name="magnify"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text
                    style={
                      styles.searchLookupButtonText
                    }
                  >
                    Search Employee
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* HINT */}

            <View
              style={
                styles.searchHintRow
              }
            >
              <Icon
                name="information-outline"
                size={14}
                color="#94A3B8"
              />
              <Text
                style={
                  styles.searchHintText
                }
              >
                Enter the exact employee
                username.
              </Text>
            </View>

            {/* RESULTS */}

            {loadingReportsTo ? null : reportsToResult ? (
              <TouchableOpacity
                style={styles.employeeResult}
                onPress={() =>
                  selectReportsTo(
                    reportsToResult
                  )
                }
                activeOpacity={0.75}
              >

                <UserAvatar
                  userId={
                    reportsToResult.user_id
                  }
                  username={
                    reportsToResult.username
                  }
                  fullName={
                    reportsToResult.full_name
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
                    numberOfLines={1}
                    style={
                      styles.employeeName
                    }
                  >
                    {reportsToResult.full_name ||
                      reportsToResult.username ||
                      reportsToResult.user_id}
                  </Text>

                  {reportsToResult.username &&
                    reportsToResult.full_name && (
                      <Text
                        style={
                          styles.employeeMeta
                        }
                      >
                        @
                        {
                          reportsToResult.username
                        }
                      </Text>
                    )}

                  <View
                    style={
                      styles.employeeMetaRow
                    }
                  >

                    {reportsToResult.employee_id && (
                      <Text
                        style={
                          styles.employeeMeta
                        }
                      >
                        ID:{' '}
                        {
                          reportsToResult.employee_id
                        }
                      </Text>
                    )}

                    {reportsToResult.role_name && (
                      <Text
                        style={
                          styles.employeeRole
                        }
                      >
                        {
                          reportsToResult.role_name
                        }
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
            ) : reportsToSearched ? (
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
                    name="account-search-outline"
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
                  No employee found
                </Text>

                <Text
                  style={
                    styles.modalEmptyText
                  }
                >
                  No employee matches that
                  username. Try a different
                  one.
                </Text>
              </View>
            ) : (
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
                    name="text-search"
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
                  Search for a manager
                </Text>

                <Text
                  style={
                    styles.modalEmptyText
                  }
                >
                  Type the username and tap
                  Search Employee.
                </Text>
              </View>
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
                          : icon === 'map-marker-outline'
                          ? 'map-marker-outline'
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
  // REPORTS TO / LOCATION ROWS
  // =======================================================

  reportsField: {
    minHeight: 75,

    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 13,
  },

  selectedLocationsField: {
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
  // LOCATION SCOPE CHIPS
  // =======================================================

  scopeBlock: {
    paddingTop: 12,
    paddingBottom: 14,
  },

  scopeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
  },

  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#F8FAFC',
  },

  scopeChipActive: {
    backgroundColor: `${PRIMARY_COLOR}12`,
    borderColor: PRIMARY_COLOR,
  },

  scopeChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },

  scopeChipTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },

  scopeHint: {
    marginTop: 8,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
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

  // location row layout + access level chips
  locationSelectionItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 8,
  },

  locationSelectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  levelChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginLeft: 48,
  },

  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#F8FAFC',
  },

  levelChipActive: {
    backgroundColor: `${PRIMARY_COLOR}12`,
    borderColor: PRIMARY_COLOR,
  },

  levelChipText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
  },

  levelChipTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
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

    marginBottom: 10,

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

    fontSize: 13,
  },

  // NEW: matches UserPhoneScreen's search button
  searchLookupButton: {
    minHeight: 46,

    marginHorizontal: 16,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 11,

    backgroundColor:
      PRIMARY_COLOR,
  },

  searchLookupButtonDisabled: {
    opacity: 0.45,
  },

  searchLookupButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  searchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,

    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 4,
  },

  searchHintText: {
    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
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

    marginHorizontal: 14,
    marginTop: 8,

    paddingHorizontal: 10,
    paddingVertical: 10,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}22`,

    backgroundColor: `${PRIMARY_COLOR}06`,
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