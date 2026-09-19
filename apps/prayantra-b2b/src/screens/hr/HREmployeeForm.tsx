// apps/prayantra-b2b/src/screens/hr/HREmployeeForm.tsx
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Switch } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  createEmployee,
  updateEmployeeProfile,
  getEmployeeProfile,
  listRoles,
  listPositions,
  listLocations,
  listCostCenters,
  listWorkCenters,
  findEmployeeByUsername,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../store/userAuthStore';
import type {
  Role,
  Position,
  CompanyEmployee,
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
  AddMemberPayload,
  CostCenter,
  WorkCenter,
} from '@b2b/shared-types';
import { RootStackParamList } from '../../navigation';
import { UserAvatar } from '../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  SELECTED_ITEM_BG,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../constants/colors';

// =========================================================
// SCHEMA
// =========================================================
const schema = z.object({
  // identity (create-only)
  phone: z.string().optional(),
  username: z
    .string()
    .optional()
    .refine((v) => !v || /^[a-zA-Z0-9]+$/.test(v), 'Letters and digits only'),
  full_name: z.string().optional(),

  // roster
  employee_id: z.string().optional(),
  role_id: z.string().min(1, 'Role is required'),
  reports_to: z.string().optional(),
  position_id: z.string().optional(),
  is_manager: z.boolean(),

  // profile
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  marital_status: z
    .enum(['single', 'married', 'divorced', 'widowed'])
    .nullable()
    .optional(),
  nationality: z.string().max(10).nullable().optional(),
  employment_type: z
    .enum(['full_time', 'part_time', 'contract', 'internship'])
    .nullable()
    .optional(),
  employment_status: z
    .enum(['active', 'inactive', 'probation', 'terminated'])
    .nullable()
    .optional(),
  probation_end_date: z.string().nullable().optional(),
  confirmation_date: z.string().nullable().optional(),
  grade: z.string().max(20).nullable().optional(),
  cost_center_id: z.string().uuid().nullable().optional(),  // 👈 FK to accounting.cost_centers
  tax_id: z.string().max(50).nullable().optional(),
  social_security_id: z.string().max(50).nullable().optional(),
});

type FormData = z.infer<typeof schema>;

type RouteProps = RouteProp<RootStackParamList, 'HREmployeeForm'>;
type NavProps = StackNavigationProp<RootStackParamList, 'HREmployeeForm'>;

type SelectedLocationEntry = {
  location_id: string;
  access_level: LocationAccessLevel;
};

const DEFAULT_ACCESS_LEVEL: LocationAccessLevel = 'VIEW';
type DateField = 'date_of_birth' | 'probation_end_date' | 'confirmation_date';

// Sensible starting dates so the picker doesn't open on "today" for
// every field. Saves the user from scrolling 30 years back for DOB.
function defaultPickerDate(field: DateField): Date {
  const now = new Date();
  switch (field) {
    case 'date_of_birth': {
      // Open on Jan 1, 1990 — typical working-age midpoint.
      return new Date(1990, 0, 1);
    }
    case 'probation_end_date': {
      // Default: 3 months from today (most common probation length).
      const d = new Date(now);
      d.setMonth(d.getMonth() + 3);
      return d;
    }
    case 'confirmation_date': {
      // Default: 6 months from today.
      const d = new Date(now);
      d.setMonth(d.getMonth() + 6);
      return d;
    }
    default:
      return now;
  }
}

// =========================================================
// SCREEN
// =========================================================
export default function HREmployeeForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProps>();
  const { employeeId } = route.params || {};
  const isEdit = !!employeeId;

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // ---- state ----
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [roleModal, setRoleModal] = useState(false);
  const [positionModal, setPositionModal] = useState(false);
  const [reportsToModal, setReportsToModal] = useState(false);
  const [primaryLocationModal, setPrimaryLocationModal] = useState(false);
  const [selectedLocationsModal, setSelectedLocationsModal] = useState(false);
  const [costCenterModal, setCostCenterModal] = useState(false);

  const [reportsToSearch, setReportsToSearch] = useState('');
  const [reportsToResult, setReportsToResult] = useState<CompanyEmployee | null>(null);
  const [reportsToSearched, setReportsToSearched] = useState(false);
  const [loadingReportsTo, setLoadingReportsTo] = useState(false);
  const [selectedReportsToName, setSelectedReportsToName] = useState('');

  const [primaryLocationId, setPrimaryLocationId] = useState('');
  const [locationScope, setLocationScope] = useState<LocationAccessScope | ''>('');
  const [selectedLocations, setSelectedLocations] = useState<SelectedLocationEntry[]>([]);

  const [showDatePicker, setShowDatePicker] = useState<DateField | null>(null);

  // ---- form ----
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
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
      email: '',
      date_of_birth: null,
      gender: null,
      marital_status: null,
      nationality: '',
      employment_type: null,
      employment_status: 'active',
      probation_end_date: null,
      confirmation_date: null,
      grade: '',
      cost_center_id: null,
      tax_id: '',
      social_security_id: '',
    },
  });

  const selectedRoleId = watch('role_id');
  const selectedPositionId = watch('position_id');
  const selectedCostCenterId = watch('cost_center_id');
  const isManager = watch('is_manager');
  const reportsToId = watch('reports_to');

  // ---- fetch picker options ----
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingOptions(false);
        return;
      }
      try {
        setLoadingOptions(true);
        const [
          rolesRes,
          positionsRes,
          locationsRes,
          costCentersRes,
          workCentersRes,
        ] = await Promise.all([
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          listPositions(companyId, deviceId, { limit: 100, offset: 0 }, accessToken),
          listLocations(companyId, 1, 100).catch(
            () => ({ data: { locations: [] } } as any),
          ),
          listCostCenters(
            companyId,
            deviceId,
            { limit: 200, offset: 0 },
            accessToken,
          ).catch(() => ({ data: { items: [] } } as any)),
          listWorkCenters(
            companyId,
            deviceId,
            { page: 1, page_size: 200 },
            accessToken,
          ).catch(() => ({ data: [] } as any)),
        ]);

        setRoles(rolesRes.data?.roles || []);
        setPositions(positionsRes.data?.positions || []);

        const raw =
          (locationsRes as any)?.locations ||
          (locationsRes as any)?.data?.locations ||
          (Array.isArray(locationsRes) ? locationsRes : []);
        setLocations(
          (raw || []).filter((l: AccessibleLocation) => l?.is_active !== false),
        );

        // Cost centers — flat list, filter active
        const ccItems: CostCenter[] =
          (costCentersRes as any)?.data?.items ||
          (costCentersRes as any)?.items ||
          [];
        setCostCenters(ccItems.filter((c) => c.is_active !== false));

        // Work centers — flat list, filter active
        const wcItems: WorkCenter[] =
          (workCentersRes as any)?.data ||
          (workCentersRes as any)?.items ||
          [];
        setWorkCenters(wcItems.filter((w) => w.is_active !== false));
      } catch (err) {
        console.error('[HREmployeeForm] options fetch failed', err);
        Alert.alert(
          'Unable to Load',
          'Failed to load roles, positions, and locations. Please try again.',
        );
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  // ---- load existing (edit mode) ----
  useEffect(() => {
    if (!isEdit || !employeeId) {
      setFetching(false);
      return;
    }
    const load = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getEmployeeProfile(companyId, employeeId, deviceId, accessToken);
        const data: any = res.data || {};

        // identity
        setValue('phone', data.phone || '');
        setValue('username', data.username || '');
        setValue('full_name', data.full_name || '');
        setValue('employee_id', data.employee_id || '');

        // roster
        if (data.role_id) setValue('role_id', data.role_id);
        if (data.position_id) setValue('position_id', data.position_id);
        if (data.reports_to) {
          setValue('reports_to', data.reports_to);
          setSelectedReportsToName(data.reports_to_name || '');
        }

        // location
        if (data.primary_location_id) setPrimaryLocationId(data.primary_location_id);
        if (data.location_access_scope) setLocationScope(data.location_access_scope);

        // profile
        if (data.email) setValue('email', data.email);
        if (data.date_of_birth) setValue('date_of_birth', data.date_of_birth);
        if (data.gender) setValue('gender', data.gender);
        if (data.marital_status) setValue('marital_status', data.marital_status);
        if (data.nationality) setValue('nationality', data.nationality);
        if (data.employment_type) setValue('employment_type', data.employment_type);
        if (data.employment_status)
          setValue('employment_status', data.employment_status);
        if (data.probation_end_date)
          setValue('probation_end_date', data.probation_end_date);
        if (data.confirmation_date)
          setValue('confirmation_date', data.confirmation_date);
        if (data.grade) setValue('grade', data.grade);
        if (data.cost_center_id) setValue('cost_center_id', data.cost_center_id); // 👈 FK
        if (data.tax_id) setValue('tax_id', data.tax_id);
        if (data.social_security_id)
          setValue('social_security_id', data.social_security_id);
      } catch (err) {
        console.error('[HREmployeeForm] load failed', err);
        Alert.alert('Error', 'Failed to load employee data');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [isEdit, employeeId, accessToken, companyId, deviceId, setValue, navigation]);

  // ---- reports-to reset on close ----
  useEffect(() => {
    if (!reportsToModal) {
      setReportsToSearch('');
      setReportsToResult(null);
      setReportsToSearched(false);
    }
  }, [reportsToModal]);

  // ---- reports-to lookup ----
  const handleReportsToLookup = async () => {
    const uname = reportsToSearch.trim();
    if (!uname || !accessToken || !companyId || !deviceId) return;
    setLoadingReportsTo(true);
    setReportsToResult(null);
    setReportsToSearched(true);
    try {
      const res = await findEmployeeByUsername(companyId, deviceId, uname, accessToken);
      setReportsToResult((res.data as any)?.employee || null);
    } catch (err: any) {
      if (err?.response?.status === 404) setReportsToResult(null);
      else Alert.alert('Search Failed', 'Could not search for the employee.');
    } finally {
      setLoadingReportsTo(false);
    }
  };

  const clearReportsToLookup = () => {
    setReportsToSearch('');
    setReportsToResult(null);
    setReportsToSearched(false);
  };

  const selectReportsTo = (emp: CompanyEmployee) => {
    setValue('reports_to', emp.user_id, { shouldValidate: true });
    setSelectedReportsToName(emp.full_name || emp.username || emp.user_id);
    setReportsToModal(false);
  };

  // ---- location helpers ----
  const primaryLocation = useMemo(
    () => locations.find((l) => l.location_id === primaryLocationId),
    [locations, primaryLocationId],
  );

  const selectedLocationObjects = useMemo(() => {
    return selectedLocations
      .map((entry) => {
        const loc = locations.find((l) => l.location_id === entry.location_id);
        return loc ? { ...entry, location: loc } : null;
      })
      .filter(
        (x): x is SelectedLocationEntry & { location: AccessibleLocation } => !!x,
      );
  }, [locations, selectedLocations]);

  const isLocationSelected = (id: string) =>
    selectedLocations.some((sl) => sl.location_id === id);

  const getLocationAccessLevel = (id: string) =>
    selectedLocations.find((sl) => sl.location_id === id)?.access_level;

  const toggleSelectedLocation = (id: string) => {
    setSelectedLocations((prev) => {
      if (prev.some((sl) => sl.location_id === id)) {
        return prev.filter((sl) => sl.location_id !== id);
      }
      return [...prev, { location_id: id, access_level: DEFAULT_ACCESS_LEVEL }];
    });
  };

  const setLocationAccessLevel = (id: string, level: LocationAccessLevel) => {
    setSelectedLocations((prev) =>
      prev.map((sl) => (sl.location_id === id ? { ...sl, access_level: level } : sl)),
    );
  };

  useEffect(() => {
    if (locationScope === 'SELECTED' && !primaryLocationId && selectedLocations.length > 0) {
      setPrimaryLocationId(selectedLocations[0].location_id);
    }
  }, [locationScope, primaryLocationId, selectedLocations]);

  // ---- derived: cost center + work center ----
  const selectedCostCenter = useMemo(
    () => costCenters.find((c) => c.cost_center_id === selectedCostCenterId),
    [costCenters, selectedCostCenterId],
  );

  // Work center is not stored on the employee — it comes from the position.
  // The DB trigger `sync_work_center_assignment` writes the actual attendance
  // assignment row; this is just for display.
  const derivedWorkCenter = useMemo(() => {
    const pos = positions.find((p) => p.position_id === selectedPositionId);
    const code = pos ? (pos as any).work_center_code : null;
    if (!code) return null;
    return workCenters.find((w) => w.work_center_code === code) ?? null;
  }, [positions, selectedPositionId, workCenters]);

  // ---- submit ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Authentication Error', 'Session info missing. Log in again.');
      return;
    }

    // create-mode required checks
    if (!isEdit) {
      const missing: string[] = [];
      if (!data.phone?.trim()) missing.push('Phone Number');
      if (!data.username?.trim()) missing.push('Username');
      if (!data.full_name?.trim()) missing.push('Full Name');
      if (!data.role_id) missing.push('Role');
      if (missing.length) {
        Alert.alert('Missing fields', `Please fill: ${missing.join(', ')}`);
        return;
      }
    }

    // location validation
    if (locationScope === 'PRIMARY' && !primaryLocationId) {
      Alert.alert('Location Required', 'Pick a primary location or change the scope.');
      return;
    }
    if (locationScope === 'SELECTED' && selectedLocations.length === 0) {
      Alert.alert('Locations Required', 'Select at least one location for SELECTED scope.');
      return;
    }

    // =============== EDIT MODE ================
    if (isEdit && employeeId) {
      const profilePayload: Record<string, any> = {};
      const profileKeys: Array<keyof FormData> = [
        'email',
        'date_of_birth',
        'gender',
        'marital_status',
        'nationality',
        'employment_type',
        'employment_status',
        'probation_end_date',
        'confirmation_date',
        'grade',
        'cost_center_id',   // 👈 FK, replaces legacy cost_center string
        'tax_id',
        'social_security_id',
      ];
      profileKeys.forEach((k) => {
        const v = data[k];
        if (v !== undefined && v !== null && v !== '') profilePayload[k] = v;
      });

      setLoading(true);
      try {
        await updateEmployeeProfile(
          companyId,
          employeeId,
          deviceId,
          accessToken,
          profilePayload,
        );
        Alert.alert('Success', 'Employee updated', [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } catch (err: any) {
        console.error('[HREmployeeForm] update failed', err);
        Alert.alert(
          'Unable to Update',
          err?.response?.data?.message || err?.message || 'Update failed',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // =============== CREATE MODE ================
    const cleanPhone = data.phone!.trim().replace(/\s/g, '');

    const locationBlock: Record<string, unknown> = {};
    const hasLocationInput =
      !!primaryLocationId || !!locationScope || selectedLocations.length > 0;

    if (hasLocationInput) {
      if (primaryLocationId) locationBlock.primary_location_id = primaryLocationId;

      let effectiveScope: LocationAccessScope =
        (locationScope as LocationAccessScope) ||
        (selectedLocations.length > 0
          ? 'SELECTED'
          : primaryLocationId
          ? 'PRIMARY'
          : 'ALL');

      if (effectiveScope === 'PRIMARY' && !primaryLocationId) effectiveScope = 'ALL';
      locationBlock.location_access_scope = effectiveScope;

      if (effectiveScope === 'SELECTED' && selectedLocations.length > 0) {
        locationBlock.selected_locations = selectedLocations.map((sl) => ({
          location_id: sl.location_id,
          access_level: sl.access_level,
        }));
      }
    }

    const payload: AddMemberPayload = {
      member_type: isManager ? 'manager' : 'employee',
      phone: cleanPhone,
      username: data.username!.trim(),
      full_name: data.full_name!.trim(),
      employee_id: data.employee_id?.trim() || undefined,
      role_id: data.role_id,
      reports_to: data.reports_to || undefined,
      position_id: data.position_id || undefined,
      ...locationBlock,
      // profile fields
      ...(data.email ? { email: data.email } : {}),
      ...(data.date_of_birth ? { date_of_birth: data.date_of_birth } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
      ...(data.marital_status ? { marital_status: data.marital_status } : {}),
      ...(data.nationality ? { nationality: data.nationality } : {}),
      ...(data.employment_type ? { employment_type: data.employment_type } : {}),
      ...(data.employment_status
        ? { employment_status: data.employment_status }
        : {}),
      ...(data.probation_end_date
        ? { probation_end_date: data.probation_end_date }
        : {}),
      ...(data.confirmation_date
        ? { confirmation_date: data.confirmation_date }
        : {}),
      ...(data.grade ? { grade: data.grade } : {}),
      ...(data.cost_center_id ? { cost_center_id: data.cost_center_id } : {}), // 👈
      ...(data.tax_id ? { tax_id: data.tax_id } : {}),
      ...(data.social_security_id
        ? { social_security_id: data.social_security_id }
        : {}),
    } as AddMemberPayload;

    setLoading(true);
    try {
      await createEmployee(companyId, deviceId, accessToken, payload);
      Alert.alert(
        'Success',
        `${isManager ? 'Manager' : 'Employee'} added successfully.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      console.error('[HREmployeeForm] create failed', err);
      Alert.alert(
        'Unable to Add',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find((r) => r.role_id === selectedRoleId);
  const selectedPosition = positions.find((p) => p.position_id === selectedPositionId);

  // ---- loading ----
  if (loadingOptions || fetching) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon
              name={isEdit ? 'account-edit-outline' : 'account-plus-outline'}
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginTop: 18 }} />
          <Text style={styles.loadingTitle}>
            {isEdit ? 'Loading employee' : 'Preparing employee form'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {isEdit
              ? 'Fetching profile data...'
              : 'Loading roles, positions, and locations...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Icon name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerIcon}>
              <Icon
                name={isEdit ? 'account-edit-outline' : 'account-plus-outline'}
                size={24}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {isEdit ? 'Edit Employee' : 'Add Employee'}
              </Text>
              <Text style={styles.headerSubtitle}>HR · People</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* MODE TOGGLE — create only */}
          {!isEdit && (
            <View style={styles.modeCard}>
              <View style={styles.modeIcon}>
                <Icon
                  name={isManager ? 'account-tie-outline' : 'account-outline'}
                  size={23}
                  color={PRIMARY_COLOR}
                />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>
                  {isManager ? 'Adding a Manager' : 'Adding an Employee'}
                </Text>
                <Text style={styles.modeDescription}>
                  {isManager
                    ? 'This person will be added with manager privileges (role level ≥ 500).'
                    : 'Add a regular employee to your organization.'}
                </Text>
              </View>
              <Controller
                control={control}
                name="is_manager"
                render={({ field: { onChange, value } }) => (
                  <Switch value={value} onValueChange={onChange} color={PRIMARY_COLOR} />
                )}
              />
            </View>
          )}

          {/* IDENTITY — create only */}
          {!isEdit && (
            <>
              <SectionHeader
                icon="account-outline"
                title="Identity"
                subtitle="Login details for this employee"
              />
              <View style={styles.formCard}>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormInput
                      label="Phone Number"
                      placeholder="Enter phone number"
                      icon="phone-outline"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                      error={errors.phone?.message as string}
                      required
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="full_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormInput
                      label="Full Name"
                      placeholder="Enter employee name"
                      icon="account-outline"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.full_name?.message as string}
                      required
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="username"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormInput
                      label="Username"
                      placeholder="Alphanumeric, 3–100"
                      icon="at"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.username?.message as string}
                      required
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="employee_id"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormInput
                      label="Employee ID"
                      placeholder="Auto-generated if left blank"
                      icon="badge-account-outline"
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      isLast
                    />
                  )}
                />
              </View>
            </>
          )}

          {/* ORGANIZATION */}
          <SectionHeader
            icon="office-building-outline"
            title="Organization"
            subtitle="Role, position, and cost center"
          />
          <View style={styles.formCard}>
            <SelectField
              label="Role"
              required
              icon="shield-account-outline"
              value={selectedRole?.role_name || ''}
              placeholder="Select a role"
              error={errors.role_id?.message as string}
              disabled={isEdit}
              onPress={() => !isEdit && setRoleModal(true)}
            />
            <SelectField
              label="Position"
              icon="briefcase-outline"
              value={selectedPosition?.title || ''}
              placeholder="Select a position"
              disabled={isEdit}
              onPress={() => !isEdit && setPositionModal(true)}
            />
            {/* Work Center — read-only, derived from position's work_center_code */}
            <SelectField
              label="Work Center (from position)"
              icon="factory"
              value={
                derivedWorkCenter
                  ? derivedWorkCenter.name
                  : selectedPositionId
                  ? '—'
                  : ''
              }
              placeholder="Set by the position's work center"
              disabled
              onPress={() => {}}
            />
            {/* Cost Center — dropdown from accounting.cost_centers */}
            <SelectField
              label="Cost Center"
              icon="currency-usd"
              value={selectedCostCenter?.cost_center_name || ''}
              placeholder="Select a cost center"
              onPress={() => setCostCenterModal(true)}
              isLast
            />
          </View>

          {/* REPORTING */}
          <SectionHeader
            icon="account-supervisor-outline"
            title="Reporting"
            subtitle="Manager this person reports to"
          />
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.reportsField}
              onPress={() => !isEdit && setReportsToModal(true)}
              activeOpacity={isEdit ? 1 : 0.75}
              disabled={isEdit}
            >
              <View style={styles.fieldIcon}>
                <Icon
                  name="account-supervisor-outline"
                  size={21}
                  color={PRIMARY_COLOR}
                />
              </View>
              <View style={styles.reportsContent}>
                <Text style={styles.fieldLabel}>Reports To</Text>
                {reportsToId ? (
                  <>
                    <Text numberOfLines={1} style={styles.selectedValue}>
                      {selectedReportsToName || 'Selected manager'}
                    </Text>
                    {!isEdit && <Text style={styles.selectedHint}>Tap to change</Text>}
                  </>
                ) : (
                  <Text style={styles.placeholderText}>
                    {isEdit ? 'Not set' : 'Search for manager by username'}
                  </Text>
                )}
              </View>
              {!isEdit && (
                <Icon name="chevron-right" size={22} color={TEXT_SECONDARY} />
              )}
            </TouchableOpacity>

            {!isEdit && reportsToId && (
              <TouchableOpacity
                style={styles.removeManager}
                onPress={() => {
                  setValue('reports_to', '');
                  setSelectedReportsToName('');
                }}
              >
                <Icon name="close-circle-outline" size={15} color={ERROR_COLOR} />
                <Text style={styles.removeManagerText}>Remove reporting manager</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LOCATION ACCESS */}
          <SectionHeader
            icon="map-marker-outline"
            title="Location Access"
            subtitle={
              isEdit ? 'Read-only here — managed by admin' : 'Optional — primary & allowed'
            }
          />
          <View style={styles.formCard}>
            <TouchableOpacity
              style={[styles.reportsField, styles.inputDivider]}
              onPress={() => !isEdit && setPrimaryLocationModal(true)}
              activeOpacity={isEdit ? 1 : 0.75}
              disabled={isEdit}
            >
              <View style={styles.fieldIcon}>
                <Icon name="map-marker-outline" size={21} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.reportsContent}>
                <Text style={styles.fieldLabel}>Primary Location</Text>
                {primaryLocation ? (
                  <>
                    <Text numberOfLines={1} style={styles.selectedValue}>
                      {primaryLocation.location_name}
                      {primaryLocation.location_code
                        ? ` (${primaryLocation.location_code})`
                        : ''}
                    </Text>
                    {!isEdit && <Text style={styles.selectedHint}>Tap to change</Text>}
                  </>
                ) : (
                  <Text style={styles.placeholderText}>
                    {isEdit ? 'Not set' : 'Select a primary location'}
                  </Text>
                )}
              </View>
              {!isEdit && (
                <Icon name="chevron-right" size={22} color={TEXT_SECONDARY} />
              )}
            </TouchableOpacity>

            {!isEdit && primaryLocationId && (
              <TouchableOpacity
                style={styles.removeManager}
                onPress={() => setPrimaryLocationId('')}
              >
                <Icon name="close-circle-outline" size={15} color={ERROR_COLOR} />
                <Text style={styles.removeManagerText}>Clear primary location</Text>
              </TouchableOpacity>
            )}

            {!isEdit && (
              <>
                <View style={styles.scopeBlock}>
                  <Text style={styles.scopeLabel}>Location Access Scope</Text>
                  <View style={styles.scopeRow}>
                    {(
                      [
                        { key: 'PRIMARY', label: 'Primary Only' },
                        { key: 'SELECTED', label: 'Selected' },
                        { key: 'ALL', label: 'All Locations' },
                      ] as const
                    ).map((opt) => {
                      const active = locationScope === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => {
                            setLocationScope(opt.key);
                            if (opt.key !== 'SELECTED') setSelectedLocations([]);
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
                      ? 'Member will only access their primary location.'
                      : locationScope === 'SELECTED'
                      ? 'Pick the specific locations this member can access.'
                      : 'Member will have access to every active location.'}
                  </Text>
                </View>

                {locationScope === 'SELECTED' && (
                  <TouchableOpacity
                    style={styles.selectedLocationsField}
                    onPress={() => setSelectedLocationsModal(true)}
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
                      <Text style={styles.fieldLabel}>Selected Locations</Text>
                      {selectedLocations.length > 0 ? (
                        <>
                          <Text numberOfLines={2} style={styles.selectedValue}>
                            {selectedLocationObjects
                              .map(
                                (sl) =>
                                  `${sl.location.location_name} · ${
                                    sl.access_level === 'MANAGE' ? 'Manage' : 'View'
                                  }`,
                              )
                              .join(', ')}
                          </Text>
                          <Text style={styles.selectedHint}>
                            {selectedLocations.length} location
                            {selectedLocations.length === 1 ? '' : 's'} · tap to edit
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.placeholderText}>
                          Choose one or more locations
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={22} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* PERSONAL INFORMATION */}
          <SectionHeader
            icon="account-details-outline"
            title="Personal Information"
            subtitle="HR-only details stored in employee_profiles"
          />
          <View style={styles.formCard}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Email"
                  placeholder="employee@company.com"
                  icon="email-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  error={errors.email?.message as string}
                />
              )}
            />

            <DateField
              label="Date of Birth"
              icon="calendar-outline"
              value={watch('date_of_birth')}
              onPress={() => setShowDatePicker('date_of_birth')}
            />

            <ChipSelectField
              label="Gender"
              options={[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ]}
              value={watch('gender') || ''}
              onChange={(v) => setValue('gender', v as any)}
            />

            <ChipSelectField
              label="Marital Status"
              options={[
                { label: 'Single', value: 'single' },
                { label: 'Married', value: 'married' },
                { label: 'Divorced', value: 'divorced' },
                { label: 'Widowed', value: 'widowed' },
              ]}
              value={watch('marital_status') || ''}
              onChange={(v) => setValue('marital_status', v as any)}
            />

            <Controller
              control={control}
              name="nationality"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Nationality"
                  placeholder="e.g. IN"
                  icon="flag-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            <ChipSelectField
              label="Employment Type"
              options={[
                { label: 'Full Time', value: 'full_time' },
                { label: 'Part Time', value: 'part_time' },
                { label: 'Contract', value: 'contract' },
                { label: 'Internship', value: 'internship' },
              ]}
              value={watch('employment_type') || ''}
              onChange={(v) => setValue('employment_type', v as any)}
            />

            <ChipSelectField
              label="Employment Status"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Probation', value: 'probation' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Terminated', value: 'terminated' },
              ]}
              value={watch('employment_status') || ''}
              onChange={(v) => setValue('employment_status', v as any)}
            />

            <DateField
              label="Probation End Date"
              icon="calendar-check-outline"
              value={watch('probation_end_date')}
              onPress={() => setShowDatePicker('probation_end_date')}
            />

            <DateField
              label="Confirmation Date"
              icon="calendar-star"
              value={watch('confirmation_date')}
              onPress={() => setShowDatePicker('confirmation_date')}
            />

            <Controller
              control={control}
              name="grade"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Grade"
                  placeholder="e.g. A1"
                  icon="star-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="tax_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Tax ID"
                  placeholder="e.g. TAX123"
                  icon="file-document-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="social_security_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Social Security ID"
                  placeholder="e.g. SSN456"
                  icon="shield-account-outline"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  isLast
                />
              )}
            />
          </View>

          {/* SUMMARY */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Icon
                name={isEdit ? 'account-edit-outline' : 'account-check-outline'}
                size={22}
                color={PRIMARY_COLOR}
              />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>
                {isEdit ? 'Ready to update' : 'Ready to add'}
              </Text>
              <Text style={styles.summaryText}>
                {isEdit
                  ? 'Profile fields will be updated.'
                  : `${isManager ? 'Manager' : 'Employee'}${
                      selectedRole ? ` • ${selectedRole.role_name}` : ''
                    }${selectedPosition ? ` • ${selectedPosition.title}` : ''}${
                      derivedWorkCenter ? ` • 🏭 ${derivedWorkCenter.name}` : ''
                    }${
                      selectedCostCenter
                        ? ` • 💰 ${selectedCostCenter.cost_center_code}`
                        : ''
                    }${
                      primaryLocation ? ` • 📍 ${primaryLocation.location_name}` : ''
                    }${
                      selectedLocations.length > 0
                        ? ` • ${selectedLocations.length} location${
                            selectedLocations.length === 1 ? '' : 's'
                          }`
                        : ''
                    }`}
              </Text>
            </View>
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.submitWrapper}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon
                    name={isEdit ? 'content-save-outline' : isManager ? 'account-tie-outline' : 'account-plus-outline'}
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Update Employee' : `Add ${isManager ? 'Manager' : 'Employee'}`}
                  </Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            {isEdit
              ? 'Only profile fields are editable here. Roster changes are managed by Admin.'
              : 'Profile can be enriched later from the employee detail screen.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ROLE MODAL */}
      <SelectionModal
        visible={roleModal}
        title="Select Role"
        icon="shield-account-outline"
        data={roles}
        selectedId={selectedRoleId}
        getId={(item) => item.role_id}
        renderLabel={(item) => `${item.role_name} • Level ${item.role_level}`}
        onClose={() => setRoleModal(false)}
        onSelect={(item) => {
          setValue('role_id', item.role_id, { shouldValidate: true });
          setRoleModal(false);
        }}
      />

      {/* POSITION MODAL */}
      <SelectionModal
        visible={positionModal}
        title="Select Position"
        icon="briefcase-outline"
        data={positions}
        selectedId={selectedPositionId}
        getId={(item) => item.position_id}
        renderLabel={(item) => item.title}
        onClose={() => setPositionModal(false)}
        onSelect={(item) => {
          setValue('position_id', item.position_id);
          setPositionModal(false);
        }}
      />

      {/* COST CENTER MODAL */}
      <SelectionModal
        visible={costCenterModal}
        title="Select Cost Center"
        icon="currency-usd"
        data={costCenters}
        selectedId={selectedCostCenterId ?? ''}
        getId={(item) => item.cost_center_id}
        renderLabel={(item) =>
          `${item.cost_center_code} — ${item.cost_center_name}`
        }
        onClose={() => setCostCenterModal(false)}
        onSelect={(item) => {
          setValue('cost_center_id', item.cost_center_id, {
            shouldValidate: true,
          });
          setCostCenterModal(false);
        }}
      />

      {/* PRIMARY LOCATION MODAL */}
      <SelectionModal
        visible={primaryLocationModal}
        title="Select Primary Location"
        icon="map-marker-outline"
        data={locations}
        selectedId={primaryLocationId}
        getId={(item) => item.location_id}
        renderLabel={(item) =>
          item.location_code
            ? `${item.location_name} (${item.location_code})`
            : item.location_name
        }
        onClose={() => setPrimaryLocationModal(false)}
        onSelect={(item) => {
          setPrimaryLocationId(item.location_id);
          setPrimaryLocationModal(false);
        }}
      />

      {/* SELECTED LOCATIONS MODAL */}
      <Modal
        visible={selectedLocationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLocationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalTitleIcon}>
                  <Icon name="format-list-bulleted" size={20} color={PRIMARY_COLOR} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select Locations</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedLocations.length} selected
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedLocationsModal(false)}
                style={styles.modalClose}
              >
                <Icon name="check" size={20} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={locations}
              keyExtractor={(item) => item.location_id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => {
                const active = isLocationSelected(item.location_id);
                const level = getLocationAccessLevel(item.location_id);
                return (
                  <View
                    style={[
                      styles.selectionItem,
                      styles.locationSelectionItem,
                      active && styles.selectionItemSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.locationSelectionHead}
                      onPress={() => toggleSelectedLocation(item.location_id)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.selectionIcon,
                          active && { backgroundColor: `${PRIMARY_COLOR}15` },
                        ]}
                      >
                        <Icon
                          name="map-marker-outline"
                          size={18}
                          color={active ? PRIMARY_COLOR : '#7D8794'}
                        />
                      </View>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.selectionText,
                          active && styles.selectionTextSelected,
                        ]}
                      >
                        {item.location_name}
                        {item.location_code ? ` (${item.location_code})` : ''}
                      </Text>
                      {active && (
                        <View style={styles.checkCircle}>
                          <Icon name="check" size={15} color="#FFFFFF" />
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
                        ).map((opt) => {
                          const chipActive = level === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              onPress={() =>
                                setLocationAccessLevel(item.location_id, opt.key)
                              }
                              style={[styles.levelChip, chipActive && styles.levelChipActive]}
                              activeOpacity={0.75}
                            >
                              <Icon
                                name={opt.key === 'MANAGE' ? 'shield-edit-outline' : 'eye-outline'}
                                size={13}
                                color={chipActive ? PRIMARY_COLOR : TEXT_SECONDARY}
                              />
                              <Text
                                style={[
                                  styles.levelChipText,
                                  chipActive && styles.levelChipTextActive,
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
                    <Icon name="map-marker-off-outline" size={26} color={PRIMARY_COLOR} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>No locations available</Text>
                  <Text style={styles.modalEmptyText}>
                    Create a location first from Company Settings.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* REPORTS-TO MODAL */}
      <Modal
        visible={reportsToModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReportsToModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.reportsModal]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalTitleIcon}>
                  <Icon name="account-supervisor-outline" size={20} color={PRIMARY_COLOR} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select Manager</Text>
                  <Text style={styles.modalSubtitle}>Search by exact username</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setReportsToModal(false)}
                style={styles.modalClose}
              >
                <Icon name="close" size={20} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="account-outline" size={21} color={TEXT_SECONDARY} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Enter username"
                placeholderTextColor="#9AA4B2"
                value={reportsToSearch}
                onChangeText={setReportsToSearch}
                onSubmitEditing={handleReportsToLookup}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loadingReportsTo}
                autoFocus
              />
              {reportsToSearch.length > 0 && (
                <TouchableOpacity onPress={clearReportsToLookup}>
                  <Icon name="close-circle" size={19} color="#9AA4B2" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.searchLookupButton,
                (!reportsToSearch.trim() || loadingReportsTo) &&
                  styles.searchLookupButtonDisabled,
              ]}
              onPress={handleReportsToLookup}
              disabled={!reportsToSearch.trim() || loadingReportsTo}
              activeOpacity={0.85}
            >
              {loadingReportsTo ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="magnify" size={18} color="#FFFFFF" />
                  <Text style={styles.searchLookupButtonText}>Search Employee</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.searchHintRow}>
              <Icon name="information-outline" size={14} color="#94A3B8" />
              <Text style={styles.searchHintText}>
                Enter the exact employee username.
              </Text>
            </View>

            {loadingReportsTo ? null : reportsToResult ? (
              <TouchableOpacity
                style={styles.employeeResult}
                onPress={() => selectReportsTo(reportsToResult)}
                activeOpacity={0.75}
              >
                <UserAvatar
                  userId={reportsToResult.user_id}
                  username={reportsToResult.username}
                  fullName={reportsToResult.full_name}
                  size={46}
                  style={styles.avatar}
                />
                <View style={styles.employeeResultInfo}>
                  <Text numberOfLines={1} style={styles.employeeName}>
                    {reportsToResult.full_name ||
                      reportsToResult.username ||
                      reportsToResult.user_id}
                  </Text>
                  {reportsToResult.username && reportsToResult.full_name && (
                    <Text style={styles.employeeMeta}>@{reportsToResult.username}</Text>
                  )}
                  <View style={styles.employeeMetaRow}>
                    {reportsToResult.employee_id && (
                      <Text style={styles.employeeMeta}>
                        ID: {reportsToResult.employee_id}
                      </Text>
                    )}
                    {reportsToResult.role_name && (
                      <Text style={styles.employeeRole}>{reportsToResult.role_name}</Text>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#B4BCC8" />
              </TouchableOpacity>
            ) : reportsToSearched ? (
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon name="account-search-outline" size={27} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.modalEmptyTitle}>No employee found</Text>
                <Text style={styles.modalEmptyText}>
                  No employee matches that username. Try a different one.
                </Text>
              </View>
            ) : (
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon name="text-search" size={27} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.modalEmptyTitle}>Search for a manager</Text>
                <Text style={styles.modalEmptyText}>
                  Type the username and tap Search Employee.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* DATE PICKER — spinner shows an explicit year column */}
      <DateTimePickerModal
        isVisible={!!showDatePicker}
        mode="date"
        display="spinner"
        date={
          showDatePicker && watch(showDatePicker)
            ? new Date(watch(showDatePicker) as string)
            : showDatePicker
            ? defaultPickerDate(showDatePicker)
            : new Date()
        }
        onConfirm={(date: Date) => {
          if (showDatePicker) setValue(showDatePicker, date.toISOString());
          setShowDatePicker(null);
        }}
        onCancel={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  );
}

// =========================================================
// SECTION HEADER
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
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Icon name={icon} size={19} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// =========================================================
// FORM INPUT
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
    <View style={[styles.inputWrapper, !isLast && styles.inputDivider]}>
      <View style={styles.inputIcon}>
        <Icon name={icon} size={20} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.inputContent}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor="#A0A8B5"
          keyboardType={keyboardType}
          style={[styles.nativeInput, error && styles.inputError]}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

// =========================================================
// SELECT FIELD
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
  disabled,
}: {
  label: string;
  icon: string;
  value: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  onPress: () => void;
  isLast?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.selectField,
        !isLast && styles.inputDivider,
        disabled && styles.disabledField,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.75}
      disabled={disabled}
    >
      <View style={styles.inputIcon}>
        <Icon name={icon} size={20} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.selectContent}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.selectValue, !value && styles.placeholderText]}
        >
          {value || placeholder}
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      {!disabled && <Icon name="chevron-down" size={21} color={TEXT_SECONDARY} />}
    </TouchableOpacity>
  );
}

// =========================================================
// DATE FIELD
// =========================================================
function DateField({
  label,
  icon,
  value,
  onPress,
}: {
  label: string;
  icon: string;
  value?: string | null;
  onPress: () => void;
}) {
  const display = value ? new Date(value).toLocaleDateString() : 'Select date';
  return (
    <TouchableOpacity
      style={[styles.selectField, styles.inputDivider]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.inputIcon}>
        <Icon name={icon} size={20} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.selectContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          numberOfLines={1}
          style={[styles.selectValue, !value && styles.placeholderText]}
        >
          {display}
        </Text>
      </View>
      <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
    </TouchableOpacity>
  );
}

// =========================================================
// CHIP SELECT FIELD
// =========================================================
function ChipSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={[styles.chipField, styles.inputDivider]}>
      <Text style={styles.chipFieldLabel}>{label}</Text>
      <View style={styles.scopeRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(active ? '' : opt.value)}
              style={[styles.scopeChip, active && styles.scopeChipActive]}
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
    </View>
  );
}

// =========================================================
// GENERIC SELECTION MODAL
// =========================================================
function SelectionModal<T>({
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <View style={styles.modalTitleIcon}>
                <Icon name={icon} size={20} color={PRIMARY_COLOR} />
              </View>
              <View>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>Choose one option</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Icon name="close" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => getId(item)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const id = getId(item);
              const selected = selectedId === id;
              return (
                <TouchableOpacity
                  style={[styles.selectionItem, selected && styles.selectionItemSelected]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.selectionIcon,
                      selected && { backgroundColor: `${PRIMARY_COLOR}15` },
                    ]}
                  >
                    <Icon
                      name={
                        icon === 'briefcase-outline'
                          ? 'briefcase-outline'
                          : icon === 'map-marker-outline'
                          ? 'map-marker-outline'
                          : icon === 'currency-usd'
                          ? 'currency-usd'
                          : icon === 'factory'
                          ? 'factory'
                          : 'shield-account-outline'
                      }
                      size={18}
                      color={selected ? PRIMARY_COLOR : '#7D8794'}
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.selectionText, selected && styles.selectionTextSelected]}
                  >
                    {renderLabel(item)}
                  </Text>
                  {selected && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={15} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon name="database-off-outline" size={26} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.modalEmptyTitle}>Nothing available</Text>
                <Text style={styles.modalEmptyText}>
                  No options are currently available.
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
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  keyboardContainer: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { marginLeft: 11, flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '500',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 45,
  },

  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 15,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modeContent: { flex: 1, marginLeft: 11, marginRight: 7 },
  modeTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  modeDescription: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },

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
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  sectionHeaderText: { marginLeft: 10, flex: 1 },
  sectionHeaderTitle: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  sectionHeaderSubtitle: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  formCard: {
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
  },
  inputDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F4',
  },
  inputIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },
  inputContent: { flex: 1, marginLeft: 11 },
  fieldLabel: { color: TEXT_PRIMARY, fontSize: 10, fontWeight: '600' },
  required: { color: ERROR_COLOR },
  nativeInput: {
    minHeight: 38,
    marginTop: 2,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  inputError: { color: ERROR_COLOR },
  errorText: {
    marginTop: 2,
    color: ERROR_COLOR,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },

  selectField: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  selectContent: { flex: 1, marginLeft: 11, marginRight: 8 },
  selectValue: {
    marginTop: 5,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderText: { color: '#A0A8B5', fontWeight: '400' },
  disabledField: { opacity: 0.55 },

  chipField: { paddingVertical: 13 },
  chipFieldLabel: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
  },

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
  reportsContent: { flex: 1, marginLeft: 11, marginRight: 8 },
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
  fieldIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },

  scopeBlock: { paddingTop: 12, paddingBottom: 14 },
  scopeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
  },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  scopeChipText: { color: TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },
  scopeChipTextActive: { color: PRIMARY_COLOR, fontWeight: '700' },
  scopeHint: {
    marginTop: 8,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 13,
    borderRadius: 14,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}18`,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  summaryContent: { flex: 1, marginLeft: 10 },
  summaryTitle: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '700' },
  summaryText: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  submitWrapper: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
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
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  footerHint: {
    marginTop: 10,
    color: '#9AA3AF',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
  },

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
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  loadingTitle: {
    marginTop: 13,
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  loadingSubtitle: { marginTop: 4, color: TEXT_SECONDARY, fontSize: 10 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  modalContent: {
    maxHeight: '75%',
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    paddingBottom: 20,
  },
  reportsModal: { maxHeight: '84%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF2',
  },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  modalTitleIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
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
    backgroundColor: '#F1F3F6',
  },
  modalList: { paddingHorizontal: 14, paddingTop: 7, paddingBottom: 20 },
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
    backgroundColor: SELECTED_ITEM_BG || `${PRIMARY_COLOR}0C`,
  },
  selectionIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F5F8',
  },
  selectionText: {
    flex: 1,
    marginLeft: 11,
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  selectionTextSelected: { color: PRIMARY_COLOR, fontWeight: '700' },
  checkCircle: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    marginLeft: 7,
  },
  locationSelectionItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 8,
  },
  locationSelectionHead: { flexDirection: 'row', alignItems: 'center' },
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
  levelChipText: { color: TEXT_SECONDARY, fontSize: 10, fontWeight: '600' },
  levelChipTextActive: { color: PRIMARY_COLOR, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    marginHorizontal: 16,
    marginTop: 13,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    height: 43,
    marginLeft: 8,
    paddingVertical: 0,
    color: TEXT_PRIMARY,
    fontSize: 13,
  },
  searchLookupButton: {
    minHeight: 46,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    backgroundColor: PRIMARY_COLOR,
  },
  searchLookupButtonDisabled: { opacity: 0.45 },
  searchLookupButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  searchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 4,
  },
  searchHintText: { color: '#94A3B8', fontSize: 9, fontWeight: '500' },
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
  employeeResultInfo: { flex: 1, marginLeft: 11, marginRight: 8 },
  employeeName: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700' },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  employeeMeta: { color: TEXT_SECONDARY, fontSize: 9, fontWeight: '500' },
  employeeRole: { color: PRIMARY_COLOR, fontSize: 9, fontWeight: '600' },
  avatar: { marginRight: 1 },

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
    backgroundColor: `${PRIMARY_COLOR}10`,
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
});