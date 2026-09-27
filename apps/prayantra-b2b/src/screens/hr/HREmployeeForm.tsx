// apps/prayantra-b2b/src/screens/hr/HREmployeeForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
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
  updateMember,
  getEmployeeDetailsByIDs,
  listCostCenters,
  searchEmployeesTypeahead,
  getEmployeeFormOptions,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../store/userAuthStore';
import type {
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
  AddMemberPayload,
  UpdateMemberRequest,
  CostCenter,
  DecryptedEmployeeDetails,
  EmployeeFormOptions,
  RoleWithDepartments,
  FormPositionView,
  FormWorkCenterView,
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
// DEV LOGGER
// =========================================================
const LOG_TAG = '[HREmployeeForm]';
const DEBOUNCE_MS = 300;
const REPORTS_TO_PAGE_SIZE = 20;

function logInfo(label: string, payload?: unknown) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`${LOG_TAG} ${label}`, payload ?? '');
  }
}
function logWarn(label: string, payload?: unknown) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`${LOG_TAG} ${label}`, payload ?? '');
  }
}
function logError(label: string, payload?: unknown) {
  // eslint-disable-next-line no-console
  console.error(`${LOG_TAG} ${label}`, payload ?? '');
}

function safeStringify(v: unknown, max = 4000): string {
  if (v === undefined) return 'undefined';
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    return s.length > max ? s.slice(0, max) + '\n… (truncated)' : s;
  } catch {
    return String(v);
  }
}

// =========================================================
// ON-SCREEN API LOGGER
// =========================================================
type ApiLogEntry = {
  id: string;
  ts: number;
  label: string;
  method?: string;
  url?: string;
  request?: unknown;
  status?: number | string;
  ok?: boolean;
  durationMs?: number;
  response?: unknown;
  error?: unknown;
};

const apiLogsStore: ApiLogEntry[] = [];
let apiLogListeners: ((logs: ApiLogEntry[]) => void)[] = [];

function notifyApiLogs() {
  apiLogListeners.forEach((l) => l([...apiLogsStore]));
}

function pushApiLog(entry: Omit<ApiLogEntry, 'id' | 'ts'>) {
  const full: ApiLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    ...entry,
  };
  apiLogsStore.unshift(full);
  if (apiLogsStore.length > 200) apiLogsStore.length = 200;
  // eslint-disable-next-line no-console
  console.log(`${LOG_TAG} API ${full.label}`, full);
  notifyApiLogs();
}

function clearApiLogs() {
  apiLogsStore.length = 0;
  notifyApiLogs();
}

async function loggedApi<T>(
  label: string,
  request: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const res = await fn();
    pushApiLog({
      label,
      request,
      response: res,
      ok: true,
      durationMs: Date.now() - started,
    });
    return res;
  } catch (err: any) {
    pushApiLog({
      label,
      request,
      error: {
        message: err?.message,
        status: err?.response?.status,
        url: err?.config?.url,
        method: err?.config?.method,
        data: err?.response?.data,
      },
      ok: false,
      durationMs: Date.now() - started,
    });
    throw err;
  }
}

// =========================================================
// SCHEMA
// =========================================================
const schema = z.object({
  phone: z.string().optional(),
  username: z
    .string()
    .optional()
    .refine((v) => !v || /^[a-zA-Z0-9]+$/.test(v), 'Letters and digits only'),
  full_name: z.string().optional(),

  employee_id: z.string().optional(),
  role_id: z.string().min(1, 'Role is required'),
  reports_to: z.string().optional(),
  position_id: z.string().optional(),

  work_center_code: z.string().nullable().optional(),

  is_manager: z.boolean(),

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
    .enum(['active', 'probation', 'notice', 'on_hold', 'terminated'])
    .nullable()
    .optional(),
  probation_end_date: z.string().nullable().optional(),
  confirmation_date: z.string().nullable().optional(),
  grade: z.string().max(20).nullable().optional(),
  cost_center_id: z.string().uuid().nullable().optional(),
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

type WCSource = 'position' | 'user' | null;

const DEFAULT_ACCESS_LEVEL: LocationAccessLevel = 'VIEW';
type DateField = 'date_of_birth' | 'probation_end_date' | 'confirmation_date';

function defaultPickerDate(field: DateField): Date {
  const now = new Date();
  switch (field) {
    case 'date_of_birth':
      return new Date(1990, 0, 1);
    case 'probation_end_date': {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 3);
      return d;
    }
    case 'confirmation_date': {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 6);
      return d;
    }
    default:
      return now;
  }
}

// =========================================================
// Typeahead helpers
// =========================================================
const pickVal = <T = any>(row: any, snake: string, pascal: string): T | undefined =>
  row?.[snake] ?? row?.[pascal];

const normalizeTypeaheadRow = (raw: any) => {
  if (!raw || typeof raw !== 'object') return null;
  const uid = pickVal<string>(raw, 'user_id', 'UserID');
  if (!uid) return null;
  return {
    user_id: uid,
    username: pickVal<string>(raw, 'username', 'Username') ?? '',
    full_name: pickVal<string | null>(raw, 'full_name', 'FullName') ?? null,
    employee_id: pickVal<string>(raw, 'employee_id', 'EmployeeID') ?? '',
    role_name: pickVal<string>(raw, 'role_name', 'RoleName') ?? '',
    job_title: pickVal<string | null>(raw, 'job_title', 'JobTitle') ?? null,
    position_title: pickVal<string | null>(raw, 'position_title', 'PositionTitle') ?? null,
    department_name: pickVal<string | null>(raw, 'department_name', 'DepartmentName') ?? null,
    primary_location_name:
      pickVal<string | null>(raw, 'primary_location_name', 'PrimaryLocationName') ?? null,
  };
};

const extractTypeaheadRows = (res: any): DecryptedEmployeeDetails[] => {
  if (!res) return [];
  const data = res.data ?? res?.data?.data ?? [];
  if (!Array.isArray(data)) return [];
  return data.map(normalizeTypeaheadRow).filter(Boolean) as DecryptedEmployeeDetails[];
};

// ---- Position display helper (FormPositionView from the prefetch) ----
const positionDisplayTitle = (p: FormPositionView): string =>
  p.title_override || p.job_title || '—';

// =========================================================
// SCREEN
// =========================================================
export default function HREmployeeForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProps>();
  const { employeeId } = route.params || {};
  const isEdit = !!employeeId;

  const { accessToken, deviceId, companyId, locationId, primaryLocationId } =
    useUserAuthStore() as any;

  // ---- state ----
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // ---- on-screen API logger ----
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([...apiLogsStore]);
  const [showApiLogs, setShowApiLogs] = useState(false);

  useEffect(() => {
    const listener = (logs: ApiLogEntry[]) => setApiLogs(logs);
    apiLogListeners.push(listener);
    return () => {
      apiLogListeners = apiLogListeners.filter((l) => l !== listener);
    };
  }, []);

  // ---- prefetch state (single-call bootstrap) ----
  const [roles, setRoles] = useState<RoleWithDepartments[]>([]);
  const [positions, setPositions] = useState<FormPositionView[]>([]);
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [workCenters, setWorkCenters] = useState<FormWorkCenterView[]>([]);
  const [callerLocationScope, setCallerLocationScope] =
    useState<LocationAccessScope | ''>('');
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [roleModal, setRoleModal] = useState(false);
  const [positionModal, setPositionModal] = useState(false);
  const [reportsToModal, setReportsToModal] = useState(false);
  const [primaryLocationModal, setPrimaryLocationModal] = useState(false);
  const [selectedLocationsModal, setSelectedLocationsModal] = useState(false);
  const [costCenterModal, setCostCenterModal] = useState(false);
  const [workCenterModal, setWorkCenterModal] = useState(false);

  // ---- reports-to (typeahead) ----
  const [reportsToSearch, setReportsToSearch] = useState('');
  const [reportsToActiveQuery, setReportsToActiveQuery] = useState('');
  const [reportsToResults, setReportsToResults] = useState<DecryptedEmployeeDetails[]>([]);
  const [reportsToSearched, setReportsToSearched] = useState(false);
  const [loadingReportsTo, setLoadingReportsTo] = useState(false);
  const [reportsToError, setReportsToError] = useState<string | null>(null);
  const [selectedReportsToName, setSelectedReportsToName] = useState('');
  const reportsToDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [primaryLocationIdState, setPrimaryLocationId] = useState('');
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
      work_center_code: null,
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
  const selectedWorkCenterCode = watch('work_center_code');
  const selectedCostCenterId = watch('cost_center_id');
  const isManager = watch('is_manager');
  const reportsToId = watch('reports_to');

  // ---- mount log ----
  useEffect(() => {
    logInfo('mounted', {
      isEdit,
      employeeId: employeeId ?? null,
      hasToken: !!accessToken,
      hasDeviceId: !!deviceId,
      companyId: companyId ?? null,
    });
  }, [isEdit, employeeId, accessToken, deviceId, companyId]);

  // ---- fetch picker options (single-call prefetch) ----
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        logWarn('options fetch skipped — missing auth context', {
          hasToken: !!accessToken,
          hasDeviceId: !!deviceId,
          companyId: companyId ?? null,
        });
        setLoadingOptions(false);
        return;
      }
      try {
        setLoadingOptions(true);
        logInfo('fetching form options…', { companyId, deviceId });

        const [opts, costCentersRes] = await Promise.all([
          loggedApi(
            'getEmployeeFormOptions',
            { companyId, deviceId },
            () => getEmployeeFormOptions(companyId, deviceId, accessToken),
          ),
          loggedApi(
            'listCostCenters',
            { companyId, deviceId, params: { limit: 200, offset: 0 } },
            () =>
              listCostCenters(companyId, deviceId, { limit: 200, offset: 0 }, accessToken).catch(
                (e) => {
                  logWarn('listCostCenters failed, defaulting to []', e?.message || e);
                  return { data: { items: [] } } as any;
                },
              ),
          ),
        ]);

        const options: EmployeeFormOptions =
          (opts as any)?.data ?? (opts as any);

        setRoles(options.roles ?? []);
        setPositions(options.positions ?? []);
        setWorkCenters(options.work_centers ?? []);
        setLocations(options.allowed_locations ?? []);
        setCallerLocationScope(options.location_scope ?? '');

        if (!isEdit && options.primary_location_id && !primaryLocationIdState) {
          setPrimaryLocationId(options.primary_location_id);
        }

        const ccItems: CostCenter[] =
          (costCentersRes as any)?.data?.items || (costCentersRes as any)?.items || [];
        setCostCenters(ccItems.filter((c) => c.is_active !== false));

        logInfo('parsed options counts', {
          scope: options.location_scope,
          roles: options.roles?.length ?? 0,
          positions: options.positions?.length ?? 0,
          locations: options.allowed_locations?.length ?? 0,
          costCenters: ccItems.length,
          workCenters: options.work_centers?.length ?? 0,
        });

        logInfo(
          'ROLES ▶',
          (options.roles ?? []).map(
            (r) =>
              `${r.role_name} (lvl ${r.role_level}) → [${r.departments
                .map((d) => d.department_name)
                .join(', ')}]`,
          ),
        );
        logInfo(
          'POSITIONS ▶',
          (options.positions ?? []).map((p) => {
            const t = p.title_override ?? p.job_title ?? '—';
            const wc = p.work_center_code ? ` @ ${p.work_center_code}` : '';
            const loc = p.location_id
              ? ` · ${p.location_name ?? p.location_id}`
              : ' · universal';
            return `${t}${wc}${loc}`;
          }),
        );
        logInfo(
          'LOCATIONS ▶',
          (options.allowed_locations ?? []).map(
            (l) =>
              `${l.location_name} (${l.location_code ?? '—'})${
                l.access_level ? ` · ${l.access_level}` : ''
              }`,
          ),
        );
        logInfo(
          'WORK CENTERS ▶',
          (options.work_centers ?? []).map(
            (w) =>
              `${w.work_center_code} — ${w.name}${
                w.is_universal ? ' · universal' : w.location_id ? ` · ${w.location_id}` : ''
              }`,
          ),
        );
      } catch (err) {
        logError('options fetch failed', err);
        Alert.alert(
          'Unable to Load',
          'Failed to load form options. Please try again.',
        );
      } finally {
        setLoadingOptions(false);
        logInfo('options fetch done');
      }
    };
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, companyId, deviceId]);

  // ---- load existing (edit mode) ----
  useEffect(() => {
    if (!isEdit || !employeeId) {
      setFetching(false);
      return;
    }
    const load = async () => {
      if (!accessToken || !companyId || !deviceId) {
        logWarn('profile load skipped — missing auth context');
        setFetching(false);
        return;
      }
      try {
        logInfo('loading employee details', { userId: employeeId });
        const res = await loggedApi(
          'getEmployeeDetailsByIDs',
          { companyId, deviceId, body: { user_ids: [employeeId] } },
          () =>
            getEmployeeDetailsByIDs(companyId, deviceId, accessToken, {
              user_ids: [employeeId],
            }),
        );
        const data: any = (res as any)?.data?.[0] ?? {};
        logInfo('employee data', data);

        setValue('phone', data.phone_number || '');
        setValue('username', data.username || '');
        setValue('full_name', data.full_name || '');
        setValue('employee_id', data.employee_id || '');

        if (data.role_id) setValue('role_id', data.role_id);
        if (data.position_id) setValue('position_id', data.position_id);
        if (data.reports_to) {
          setValue('reports_to', data.reports_to);
          setSelectedReportsToName(data.reports_to_name || '');
        }

        if (data.primary_location_id) setPrimaryLocationId(data.primary_location_id);
        if (data.location_access_scope) setLocationScope(data.location_access_scope);

        if (data.email) setValue('email', data.email);
        if (data.date_of_birth) setValue('date_of_birth', data.date_of_birth);
        if (data.gender) setValue('gender', data.gender);
        if (data.marital_status) setValue('marital_status', data.marital_status);
        if (data.nationality) setValue('nationality', data.nationality);
        if (data.employment_type) setValue('employment_type', data.employment_type);
        if (data.employment_status) setValue('employment_status', data.employment_status);
        if (data.probation_end_date) setValue('probation_end_date', data.probation_end_date);
        if (data.confirmation_date) setValue('confirmation_date', data.confirmation_date);
        if (data.grade) setValue('grade', data.grade);
        if (data.cost_center_id) setValue('cost_center_id', data.cost_center_id);
        if (data.tax_id) setValue('tax_id', data.tax_id);
        if (data.social_security_id) setValue('social_security_id', data.social_security_id);

        logInfo('employee hydration done');
      } catch (err) {
        logError('employee load failed', err);
        Alert.alert('Error', 'Failed to load employee data');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, employeeId, accessToken, companyId, deviceId, setValue, navigation]);

  // ---- reports-to: reset when modal closes ----
  useEffect(() => {
    if (!reportsToModal) {
      if (reportsToDebounceRef.current) clearTimeout(reportsToDebounceRef.current);
      setReportsToSearch('');
      setReportsToActiveQuery('');
      setReportsToResults([]);
      setReportsToSearched(false);
      setReportsToError(null);
      setLoadingReportsTo(false);
    }
  }, [reportsToModal]);

  const fetchReportsToTypeahead = React.useCallback(
    async (q: string) => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoadingReportsTo(true);
      setReportsToError(null);
      try {
        const res: any = await loggedApi(
          'searchEmployeesTypeahead',
          { companyId, deviceId, q, page: 1, page_size: REPORTS_TO_PAGE_SIZE },
          () =>
            searchEmployeesTypeahead(
              companyId,
              deviceId,
              accessToken,
              { q, page: 1, page_size: REPORTS_TO_PAGE_SIZE },
              false,
            ),
        );
        const rows = extractTypeaheadRows(res);
        const filtered = employeeId
          ? rows.filter((r) => r.user_id !== employeeId)
          : rows;
        setReportsToResults(filtered);
        setReportsToSearched(true);
      } catch (err: any) {
        const info = {
          message: err?.message,
          status: err?.response?.status,
          url: err?.config?.url,
          responseData: err?.response?.data,
        };
        logError('reports-to typeahead failed', JSON.stringify(info, null, 2));
        setReportsToError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to search users',
        );
        setReportsToResults([]);
      } finally {
        setLoadingReportsTo(false);
      }
    },
    [accessToken, companyId, deviceId, employeeId],
  );

  useEffect(() => {
    if (reportsToModal) {
      fetchReportsToTypeahead('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsToModal]);

  useEffect(() => {
    if (!reportsToModal) return;
    if (reportsToDebounceRef.current) clearTimeout(reportsToDebounceRef.current);

    reportsToDebounceRef.current = setTimeout(() => {
      const q = reportsToSearch.trim();
      if (q === reportsToActiveQuery) return;
      setReportsToActiveQuery(q);
      fetchReportsToTypeahead(q);
    }, DEBOUNCE_MS);

    return () => {
      if (reportsToDebounceRef.current) clearTimeout(reportsToDebounceRef.current);
    };
  }, [reportsToSearch, reportsToModal, reportsToActiveQuery, fetchReportsToTypeahead]);

  const clearReportsToLookup = () => {
    if (reportsToDebounceRef.current) clearTimeout(reportsToDebounceRef.current);
    setReportsToSearch('');
    setReportsToActiveQuery('');
    setReportsToResults([]);
    setReportsToSearched(false);
    setReportsToError(null);
    setLoadingReportsTo(false);
    fetchReportsToTypeahead('');
  };

  const selectReportsTo = (emp: DecryptedEmployeeDetails) => {
    setValue('reports_to', emp.user_id, { shouldValidate: true });
    setSelectedReportsToName(emp.full_name || emp.username || emp.user_id);
    setReportsToModal(false);
  };

  // ---- location helpers ----
  const primaryLocation = useMemo(
    () => locations.find((l) => l.location_id === primaryLocationIdState),
    [locations, primaryLocationIdState],
  );

  const selectedLocationObjects = useMemo(() => {
    return selectedLocations
      .map((entry) => {
        const loc = locations.find((l) => l.location_id === entry.location_id);
        return loc ? { ...entry, location: loc } : null;
      })
      .filter(
        (x): x is SelectedLocationEntry & { location: AccessibleLocation } =>
          !!x,
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
      prev.map((sl) =>
        sl.location_id === id ? { ...sl, access_level: level } : sl,
      ),
    );
  };

  useEffect(() => {
    if (
      locationScope === 'SELECTED' &&
      !primaryLocationIdState &&
      selectedLocations.length > 0
    ) {
      setPrimaryLocationId(selectedLocations[0].location_id);
    }
  }, [locationScope, primaryLocationIdState, selectedLocations]);

  // ---- derived ----
  const selectedCostCenter = useMemo(
    () => costCenters.find((c) => c.cost_center_id === selectedCostCenterId),
    [costCenters, selectedCostCenterId],
  );

  // ---- Role-filtered positions ----------------------------------------
  const roleDeptIds = useMemo(() => {
    const role = roles.find((r) => r.role_id === selectedRoleId);
    return new Set((role?.departments ?? []).map((d) => d.department_id));
  }, [roles, selectedRoleId]);

  const visiblePositions = useMemo(() => {
    if (isEdit) return positions;
    if (roleDeptIds.size === 0) return positions;
    return positions.filter((p) => roleDeptIds.has(p.department_id));
  }, [positions, roleDeptIds, isEdit]);

  // ---------------------------------------------------------
  // Effective work center resolution.
  //
  // Priority (highest first):
  //   1. Existing position → its own WC, locked
  //   2. User's manual pick → when the position has no WC
  // ---------------------------------------------------------
  const effectiveWorkCenter = useMemo(() => {
    const pos = visiblePositions.find((p) => p.position_id === selectedPositionId);
    const code = pos?.work_center_code ?? null;
    if (code) {
      const wc = workCenters.find((w) => w.work_center_code === code) ?? null;
      return { code, wc, source: 'position' as WCSource, locked: true };
    }

    if (selectedWorkCenterCode) {
      const wc =
        workCenters.find((w) => w.work_center_code === selectedWorkCenterCode) ??
        null;
      return {
        code: selectedWorkCenterCode,
        wc,
        source: 'user' as WCSource,
        locked: false,
      };
    }

    return { code: null, wc: null, source: null as WCSource, locked: false };
  }, [
    visiblePositions,
    selectedPositionId,
    selectedWorkCenterCode,
    workCenters,
  ]);

  const derivedWorkCenter = effectiveWorkCenter.wc;

  // ---------------------------------------------------------
  // Seat-required location.
  //
  // When the resolved work center is bound to a single location,
  // surface that location so the user can set it as the primary
  // without leaving the Location Access section.
  // ---------------------------------------------------------
  const seatRequiredLocation = useMemo<AccessibleLocation | null>(() => {
    const wcLocId = effectiveWorkCenter.wc?.location_id;
    if (!wcLocId) return null;
    return locations.find((l) => l.location_id === wcLocId) ?? null;
  }, [effectiveWorkCenter.wc, locations]);

  const wcDisplayLabel = (code: string, wc: FormWorkCenterView | null) => {
    if (wc) {
      return wc.work_center_code ? `${wc.name} (${wc.work_center_code})` : wc.name;
    }
    return code;
  };

  const clearWorkCenter = () => {
    setValue('work_center_code', null, { shouldValidate: true });
  };

  // ---- submit ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Authentication Error', 'Session info missing. Log in again.');
      return;
    }

    if (!isEdit) {
      const missing: string[] = [];
      if (!data.phone?.trim()) missing.push('Phone Number');
      if (!data.username?.trim()) missing.push('Username');
      if (!data.full_name?.trim()) missing.push('Full Name');
      if (!data.role_id) missing.push('Role');
      if (!data.position_id) missing.push('Position');
      if (missing.length) {
        Alert.alert('Missing fields', `Please fill: ${missing.join(', ')}`);
        return;
      }
    }

    // =============== EDIT MODE ===============
    if (isEdit && employeeId) {
      const payload: UpdateMemberRequest = {};

      if (data.username?.trim()) payload.username = data.username.trim();
      if (data.full_name?.trim()) payload.full_name = data.full_name.trim();

      if (data.role_id) payload.role_id = data.role_id;
      if (data.position_id) payload.position_id = data.position_id;
      if (data.reports_to) payload.reports_to = data.reports_to;

      if (data.email) payload.email = data.email;
      if (data.date_of_birth) payload.date_of_birth = data.date_of_birth;
      if (data.gender) payload.gender = data.gender as any;
      if (data.marital_status)
        payload.marital_status = data.marital_status as any;
      if (data.nationality) payload.nationality = data.nationality;
      if (data.employment_type)
        payload.employment_type = data.employment_type as any;
      if (data.employment_status)
        payload.employment_status = data.employment_status as any;
      if (data.probation_end_date)
        payload.probation_end_date = data.probation_end_date;
      if (data.confirmation_date)
        payload.confirmation_date = data.confirmation_date;
      if (data.grade) payload.grade = data.grade;
      if (data.cost_center_id)
        payload.cost_center_id = data.cost_center_id;
      if (data.tax_id) payload.tax_id = data.tax_id;
      if (data.social_security_id)
        payload.social_security_id = data.social_security_id;

      if (Object.keys(payload).length === 0) {
        Alert.alert('Nothing to Update', 'No changes were detected.');
        return;
      }

      const writeLocationId =
        locationId && locationId !== 'ALL'
          ? locationId
          : primaryLocationId || undefined;

      logInfo('submitting UpdateMember payload', {
        userId: employeeId,
        payload,
        writeLocationId,
      });

      setLoading(true);
      try {
        await loggedApi(
          'updateMember',
          { companyId, employeeId, payload, writeLocationId },
          () =>
            updateMember(
              companyId,
              employeeId,
              payload,
              deviceId,
              accessToken,
              writeLocationId,
            ),
        );
        Alert.alert('Success', 'Employee updated', [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } catch (err: any) {
        logError('updateMember failed', err);
        Alert.alert(
          'Unable to Update',
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Update failed',
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
      !!primaryLocationIdState || !!locationScope || selectedLocations.length > 0;

    if (hasLocationInput) {
      if (primaryLocationIdState)
        locationBlock.primary_location_id = primaryLocationIdState;

      let effectiveScope: LocationAccessScope =
        (locationScope as LocationAccessScope) ||
        (selectedLocations.length > 0
          ? 'SELECTED'
          : primaryLocationIdState
          ? 'PRIMARY'
          : 'ALL');

      if (effectiveScope === 'PRIMARY' && !primaryLocationIdState)
        effectiveScope = 'ALL';
      locationBlock.location_access_scope = effectiveScope;

      if (effectiveScope === 'SELECTED' && selectedLocations.length > 0) {
        locationBlock.selected_locations = selectedLocations.map((sl) => ({
          location_id: sl.location_id,
          access_level: sl.access_level,
        }));
      }
    }

    const basePayload: AddMemberPayload = {
      member_type: isManager ? 'manager' : 'employee',
      phone: cleanPhone,
      username: data.username!.trim(),
      full_name: data.full_name!.trim(),
      employee_id: data.employee_id?.trim() || undefined,
      role_id: data.role_id,
      position_id: data.position_id,
      reports_to: data.reports_to || undefined,
      ...locationBlock,
      ...(data.email ? { email: data.email } : {}),
      ...(data.date_of_birth ? { date_of_birth: data.date_of_birth } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
      ...(data.marital_status ? { marital_status: data.marital_status } : {}),
      ...(data.nationality ? { nationality: data.nationality } : {}),
      ...(data.employment_type ? { employment_type: data.employment_type } : {}),
      ...(data.employment_status ? { employment_status: data.employment_status } : {}),
      ...(data.probation_end_date ? { probation_end_date: data.probation_end_date } : {}),
      ...(data.confirmation_date ? { confirmation_date: data.confirmation_date } : {}),
      ...(data.grade ? { grade: data.grade } : {}),
      ...(data.cost_center_id ? { cost_center_id: data.cost_center_id } : {}),
      ...(data.tax_id ? { tax_id: data.tax_id } : {}),
      ...(data.social_security_id ? { social_security_id: data.social_security_id } : {}),
    } as AddMemberPayload;

    logInfo('submitting CREATE payload', basePayload);

    setLoading(true);
    try {
      const res = await loggedApi(
        'createEmployee',
        { companyId, deviceId, payload: basePayload },
        () => createEmployee(companyId, deviceId, accessToken, basePayload),
      );
      logInfo('RAW create response', res);
      Alert.alert(
        'Success',
        `${isManager ? 'Manager' : 'Employee'} added successfully.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      logError('create failed', err);
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
  const selectedPosition = positions.find(
    (p) => p.position_id === selectedPositionId,
  );

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
          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{ marginTop: 18 }}
          />
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
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    color={PRIMARY_COLOR}
                  />
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

          {/* ACCOUNT — edit only */}
          {isEdit && (
            <>
              <SectionHeader
                icon="account-outline"
                title="Account"
                subtitle="Display name and login handle"
              />
              <View style={styles.formCard}>
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
            {/* Role */}
            <SelectField
              label="Role"
              required
              icon="shield-account-outline"
              value={selectedRole?.role_name || ''}
              placeholder="Select a role"
              error={errors.role_id?.message as string}
              onPress={() => setRoleModal(true)}
            />

            {/* Position picker — always visible */}
            <SelectField
              label="Position"
              required
              icon="briefcase-outline"
              value={
                selectedPosition ? positionDisplayTitle(selectedPosition) : ''
              }
              placeholder="Select a position"
              onPress={() => setPositionModal(true)}
            />

            {/* Work center — inherited from position, or manually picked
                when the position has no WC of its own */}
            {(selectedPositionId || effectiveWorkCenter.code) && (
              <View style={styles.jobSubField}>
                <Text style={styles.fieldLabelInline}>
                  Work center{' '}
                  {effectiveWorkCenter.locked ? (
                    <Text style={styles.optionalHint}>
                      (inherited from position — locked)
                    </Text>
                  ) : (
                    <Text style={styles.optionalHint}>(optional)</Text>
                  )}
                </Text>

                {effectiveWorkCenter.locked ? (
                  <View
                    style={[styles.selectFieldInline, styles.lockedField]}
                  >
                    <Text numberOfLines={1} style={styles.selectValue}>
                      {wcDisplayLabel(
                        effectiveWorkCenter.code!,
                        effectiveWorkCenter.wc,
                      )}
                    </Text>
                    <Icon
                      name="lock-outline"
                      size={18}
                      color={TEXT_SECONDARY}
                    />
                  </View>
                ) : (
                  <View style={styles.workCenterFieldRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectFieldInline,
                        styles.workCenterSelect,
                      ]}
                      onPress={() => setWorkCenterModal(true)}
                      activeOpacity={0.75}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.selectValue,
                          !selectedWorkCenterCode &&
                            styles.placeholderText,
                        ]}
                      >
                        {derivedWorkCenter
                          ? wcDisplayLabel(
                              selectedWorkCenterCode ?? '',
                              derivedWorkCenter,
                            )
                          : 'Select a work center'}
                      </Text>
                      <Icon
                        name="chevron-down"
                        size={20}
                        color={TEXT_SECONDARY}
                      />
                    </TouchableOpacity>

                    {!!selectedWorkCenterCode && (
                      <TouchableOpacity
                        style={styles.workCenterClear}
                        onPress={clearWorkCenter}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Clear work center"
                      >
                        <Icon name="close" size={18} color={ERROR_COLOR} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Cost Center — hidden when caller has no permission (list empty) */}
            {costCenters.length > 0 && (
              <SelectField
                label="Cost Center"
                icon="currency-usd"
                value={selectedCostCenter?.cost_center_name || ''}
                placeholder="Select a cost center"
                onPress={() => setCostCenterModal(true)}
                isLast
              />
            )}
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
              onPress={() => setReportsToModal(true)}
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
                <Text style={styles.fieldLabel}>Reports To</Text>
                {reportsToId ? (
                  <>
                    <Text numberOfLines={1} style={styles.selectedValue}>
                      {selectedReportsToName || 'Selected manager'}
                    </Text>
                    <Text style={styles.selectedHint}>Tap to change</Text>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>Search for a manager</Text>
                )}
              </View>
              <Icon name="chevron-right" size={22} color={TEXT_SECONDARY} />
            </TouchableOpacity>

            {reportsToId && (
              <TouchableOpacity
                style={styles.removeManager}
                onPress={() => {
                  setValue('reports_to', '');
                  setSelectedReportsToName('');
                }}
              >
                <Icon
                  name="close-circle-outline"
                  size={15}
                  color={ERROR_COLOR}
                />
                <Text style={styles.removeManagerText}>
                  Remove reporting manager
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LOCATION ACCESS — create only */}
          {!isEdit && (
            <>
              {/* Seat-location reminder — shown whenever the resolved
                  work center is bound to a concrete location. */}
              {seatRequiredLocation && (
                <View style={styles.locationReminder}>
                  <View style={styles.locationReminderIcon}>
                    <Icon
                      name="map-marker-alert-outline"
                      size={18}
                      color="#B45309"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationReminderTitle}>
                      Seat is at {seatRequiredLocation.location_name}
                      {seatRequiredLocation.location_code
                        ? ` (${seatRequiredLocation.location_code})`
                        : ''}
                    </Text>
                    <Text style={styles.locationReminderText}>
                      The selected seat's work center is tied to this
                      location. Set it as the primary so the roster matches.
                    </Text>
                    {primaryLocationIdState !==
                      seatRequiredLocation.location_id && (
                      <TouchableOpacity
                        style={styles.locationReminderCta}
                        onPress={() => {
                          setPrimaryLocationId(
                            seatRequiredLocation.location_id,
                          );
                          logInfo('primary location set from reminder', {
                            location_id: seatRequiredLocation.location_id,
                            location_name:
                              seatRequiredLocation.location_name,
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        <Icon
                          name="check-circle-outline"
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.locationReminderCtaText}>
                          Use as primary location
                        </Text>
                      </TouchableOpacity>
                    )}
                    {primaryLocationIdState ===
                      seatRequiredLocation.location_id && (
                      <View style={styles.locationReminderDone}>
                        <Icon
                          name="check-circle"
                          size={14}
                          color="#059669"
                        />
                        <Text style={styles.locationReminderDoneText}>
                          Already set as primary
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <SectionHeader
                icon="map-marker-outline"
                title="Location Access"
                subtitle="Optional — primary & allowed"
              />
              <View style={styles.formCard}>
                <TouchableOpacity
                  style={[styles.reportsField, styles.inputDivider]}
                  onPress={() => setPrimaryLocationModal(true)}
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
                    <Text style={styles.fieldLabel}>Primary Location</Text>
                    {primaryLocation ? (
                      <>
                        <Text numberOfLines={1} style={styles.selectedValue}>
                          {primaryLocation.location_name}
                          {primaryLocation.location_code
                            ? ` (${primaryLocation.location_code})`
                            : ''}
                        </Text>
                        <Text style={styles.selectedHint}>Tap to change</Text>
                      </>
                    ) : (
                      <Text style={styles.placeholderText}>
                        Select a primary location
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={22} color={TEXT_SECONDARY} />
                </TouchableOpacity>

                {primaryLocationIdState && (
                  <TouchableOpacity
                    style={styles.removeManager}
                    onPress={() => setPrimaryLocationId('')}
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
                      <Text style={styles.fieldLabel}>
                        Selected Locations
                      </Text>
                      {selectedLocations.length > 0 ? (
                        <>
                          <Text numberOfLines={2} style={styles.selectedValue}>
                            {selectedLocationObjects
                              .map(
                                (sl) =>
                                  `${sl.location.location_name} · ${
                                    sl.access_level === 'MANAGE'
                                      ? 'Manage'
                                      : 'View'
                                  }`,
                              )
                              .join(', ')}
                          </Text>
                          <Text style={styles.selectedHint}>
                            {selectedLocations.length} location
                            {selectedLocations.length === 1 ? '' : 's'} · tap
                            to edit
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
            </>
          )}

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
                { label: 'Notice', value: 'notice' },
                { label: 'On Hold', value: 'on_hold' },
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
                name={
                  isEdit ? 'account-edit-outline' : 'account-check-outline'
                }
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
                  ? `${
                      selectedRole ? `${selectedRole.role_name}` : 'Employee'
                    }${
                      selectedPosition
                        ? ` • ${positionDisplayTitle(selectedPosition)}`
                        : ''
                    }`
                  : `${isManager ? 'Manager' : 'Employee'}${
                      selectedRole ? ` • ${selectedRole.role_name}` : ''
                    }${
                      selectedPosition
                        ? ` • ${positionDisplayTitle(selectedPosition)}`
                        : ''
                    }${
                      effectiveWorkCenter.code
                        ? ` • 🏭 ${
                            effectiveWorkCenter.wc
                              ? effectiveWorkCenter.wc.name
                              : effectiveWorkCenter.code
                          }`
                        : ''
                    }${
                      selectedCostCenter
                        ? ` • 💰 ${selectedCostCenter.cost_center_code}`
                        : ''
                    }${
                      primaryLocation
                        ? ` • 📍 ${primaryLocation.location_name}`
                        : ''
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
            onPress={handleSubmit(onSubmit, (errs) =>
              logWarn('form validation errors', errs),
            )}
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
                    name={
                      isEdit
                        ? 'content-save-outline'
                        : isManager
                        ? 'account-tie-outline'
                        : 'account-plus-outline'
                    }
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitText}>
                    {isEdit
                      ? 'Update Employee'
                      : `Add ${isManager ? 'Manager' : 'Employee'}`}
                  </Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            {isEdit
              ? 'Account, roster, and dossier fields are editable here. Location grants are managed from the Location Access screen.'
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
        renderLabel={(item) =>
          `${item.role_name} • Level ${item.role_level}${
            item.departments?.length
              ? ` • ${item.departments.map((d) => d.department_name).join(', ')}`
              : ''
          }`
        }
        onClose={() => setRoleModal(false)}
        onSelect={(item) => {
          setValue('role_id', item.role_id, { shouldValidate: true });
          // Clear position when role changes: the new role may not
          // cover the previously-chosen seat's department.
          setValue('position_id', '', { shouldValidate: false });
          setPositionModal(false);
          setRoleModal(false);
        }}
      />

      {/* POSITION MODAL — filtered to the selected role's departments */}
      <SelectionModal
        visible={positionModal}
        title="Select Position"
        icon="briefcase-outline"
        data={visiblePositions}
        selectedId={selectedPositionId}
        getId={(item) => item.position_id}
        renderLabel={(item) => {
          const t = positionDisplayTitle(item);
          const dept = item.department_name ? ` • ${item.department_name}` : '';
          const loc = item.location_id
            ? ` • ${item.location_name ?? 'located'}`
            : ' • Universal';
          const wc = item.work_center_code ? ` • 🏭 ${item.work_center_code}` : '';
          return `${t}${dept}${loc}${wc}`;
        }}
        onClose={() => setPositionModal(false)}
        onSelect={(item) => {
          setValue('position_id', item.position_id, { shouldValidate: true });
          setPositionModal(false);
        }}
      />

      {/* WORK CENTER MODAL — only reachable when the position has no WC
          of its own (i.e. `effectiveWorkCenter.locked === false`) */}
      <SelectionModal
        visible={workCenterModal}
        title="Select Work Center"
        icon="factory"
        data={workCenters}
        selectedId={selectedWorkCenterCode ?? ''}
        getId={(item) => item.work_center_code}
        renderLabel={(item) =>
          item.work_center_code
            ? `${item.name} (${item.work_center_code})${
                item.is_universal ? ' • Universal' : ''
              }`
            : item.name
        }
        onClose={() => setWorkCenterModal(false)}
        onSelect={(item) => {
          setValue('work_center_code', item.work_center_code, {
            shouldValidate: true,
          });
          setWorkCenterModal(false);
        }}
        allowClear
        clearLabel="No work center"
        onClear={() => {
          clearWorkCenter();
          setWorkCenterModal(false);
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
        selectedId={primaryLocationIdState}
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
                  <Icon
                    name="format-list-bulleted"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
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
                          active && {
                            backgroundColor: `${PRIMARY_COLOR}15`,
                          },
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
                        {item.location_code
                          ? ` (${item.location_code})`
                          : ''}
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
                                setLocationAccessLevel(
                                  item.location_id,
                                  opt.key,
                                )
                              }
                              style={[
                                styles.levelChip,
                                chipActive && styles.levelChipActive,
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

      {/* REPORTS-TO MODAL */}
      <Modal
        visible={reportsToModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReportsToModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, styles.reportsModal]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalTitleIcon}>
                  <Icon
                    name="account-supervisor-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select Manager</Text>
                  <Text style={styles.modalSubtitle}>
                    Search by name, username, or employee ID
                  </Text>
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
              <Icon name="magnify" size={21} color={TEXT_SECONDARY} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search employee…"
                placeholderTextColor="#9AA4B2"
                value={reportsToSearch}
                onChangeText={setReportsToSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {loadingReportsTo && reportsToResults.length === 0 ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              ) : reportsToSearch.length > 0 ? (
                <TouchableOpacity onPress={clearReportsToLookup}>
                  <Icon name="close-circle" size={19} color="#9AA4B2" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.searchHintRow}>
              <Icon name="information-outline" size={14} color="#94A3B8" />
              <Text style={styles.searchHintText}>
                Results appear as you type. Tap a card to set as manager.
              </Text>
            </View>

            {reportsToError ? (
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon
                    name="alert-circle-outline"
                    size={27}
                    color="#ef4444"
                  />
                </View>
                <Text style={styles.modalEmptyTitle}>Search failed</Text>
                <Text style={styles.modalEmptyText}>{reportsToError}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchReportsToTypeahead(reportsToActiveQuery)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : loadingReportsTo && reportsToResults.length === 0 ? (
              <View style={styles.modalEmpty}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={[styles.modalEmptyTitle, { marginTop: 12 }]}>
                  Searching…
                </Text>
              </View>
            ) : reportsToResults.length > 0 ? (
              <FlatList
                data={reportsToResults}
                keyExtractor={(item) => item.user_id}
                contentContainerStyle={styles.modalList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const displayName =
                    item.full_name || item.username || item.user_id;
                  const subtitle =
                    item.job_title ||
                    item.position_title ||
                    item.role_name ||
                    null;
                  return (
                    <TouchableOpacity
                      style={styles.selectionItem}
                      onPress={() => selectReportsTo(item)}
                      activeOpacity={0.75}
                    >
                      <UserAvatar
                        userId={item.user_id}
                        username={item.username}
                        fullName={item.full_name ?? undefined}
                        size={44}
                      />
                      <View style={styles.employeeResultInfo}>
                        <Text numberOfLines={1} style={styles.employeeName}>
                          {displayName}
                        </Text>
                        {item.username ? (
                          <View style={styles.employeeMetaRow}>
                            <Icon name="at" size={11} color={TEXT_SECONDARY} />
                            <Text
                              style={styles.employeeMeta}
                              numberOfLines={1}
                            >
                              {item.username}
                            </Text>
                          </View>
                        ) : null}
                        {(subtitle || item.department_name) && (
                          <View style={styles.employeeMetaRow}>
                            {item.employee_id ? (
                              <Text style={styles.employeeMeta}>
                                ID: {item.employee_id}
                              </Text>
                            ) : null}
                            {subtitle ? (
                              <Text
                                style={styles.employeeRole}
                                numberOfLines={1}
                              >
                                {subtitle}
                              </Text>
                            ) : null}
                            {item.department_name ? (
                              <Text
                                style={styles.employeeMeta}
                                numberOfLines={1}
                              >
                                {item.department_name}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                      <Icon name="chevron-right" size={20} color="#B4BCC8" />
                    </TouchableOpacity>
                  );
                }}
              />
            ) : reportsToSearched ? (
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon
                    name="account-search-outline"
                    size={27}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text style={styles.modalEmptyTitle}>
                  No employees found
                </Text>
                <Text style={styles.modalEmptyText}>
                  No employee matches "{reportsToActiveQuery}". Try a
                  different term.
                </Text>
              </View>
            ) : (
              <View style={styles.modalEmpty}>
                <View style={styles.modalEmptyIcon}>
                  <Icon
                    name="account-search-outline"
                    size={27}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text style={styles.modalEmptyTitle}>
                  Search for a manager
                </Text>
                <Text style={styles.modalEmptyText}>
                  Start typing a name or username to see matching
                  employees.
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DATE PICKER */}
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

      {/* FLOATING API LOG BUTTON */}
      {__DEV__ && (
        <Pressable
          style={styles.apiLogFab}
          onPress={() => setShowApiLogs(true)}
          accessibilityLabel="Open API logs"
        >
          <Icon name="bug-outline" size={22} color="#FFFFFF" />
          {apiLogs.length > 0 && (
            <View style={styles.apiLogBadge}>
              <Text style={styles.apiLogBadgeText}>
                {apiLogs.length > 99 ? '99+' : apiLogs.length}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* API LOG MODAL */}
      <Modal
        visible={showApiLogs}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApiLogs(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalTitleIcon}>
                  <Icon name="bug-outline" size={20} color={PRIMARY_COLOR} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>API Logs</Text>
                  <Text style={styles.modalSubtitle}>
                    {apiLogs.length} call{apiLogs.length === 1 ? '' : 's'} ·
                    tap a row to copy JSON
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={clearApiLogs}
                  style={styles.modalClose}
                >
                  <Icon name="delete-outline" size={19} color={ERROR_COLOR} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowApiLogs(false)}
                  style={styles.modalClose}
                >
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={apiLogs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Clipboard.setString(JSON.stringify(item, null, 2));
                    Alert.alert('Copied', 'Log entry copied to clipboard.');
                  }}
                  style={[
                    styles.apiLogRow,
                    { borderLeftColor: item.ok ? '#10b981' : '#ef4444' },
                  ]}
                >
                  <View style={styles.apiLogHead}>
                    <Text style={styles.apiLogLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.apiLogStatus,
                        { color: item.ok ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      {item.ok ? 'OK' : 'ERR'}
                      {item.durationMs != null ? ` · ${item.durationMs}ms` : ''}
                    </Text>
                  </View>
                  <Text style={styles.apiLogTime}>
                    {new Date(item.ts).toLocaleTimeString()}
                  </Text>

                  <Text style={styles.apiLogSection}>REQUEST</Text>
                  <Text style={styles.apiLogJson} numberOfLines={8}>
                    {safeStringify(item.request)}
                  </Text>

                  {item.ok ? (
                    <>
                      <Text style={styles.apiLogSection}>RESPONSE</Text>
                      <Text style={styles.apiLogJson} numberOfLines={12}>
                        {safeStringify(item.response)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.apiLogSection, { color: ERROR_COLOR }]}>
                        ERROR
                      </Text>
                      <Text style={styles.apiLogJson} numberOfLines={12}>
                        {safeStringify(item.error)}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <View style={styles.modalEmptyIcon}>
                    <Icon name="bug-outline" size={26} color={PRIMARY_COLOR} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>No API calls yet</Text>
                  <Text style={styles.modalEmptyText}>
                    Every request/response will appear here.
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
      {!disabled && (
        <Icon name="chevron-down" size={21} color={TEXT_SECONDARY} />
      )}
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
  const display = value
    ? new Date(value).toLocaleDateString()
    : 'Select date';
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
  allowClear = false,
  clearLabel = 'None',
  onClear,
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
  allowClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}) {
  const SAFE_ICONS = new Set([
    'briefcase-outline',
    'map-marker-outline',
    'currency-usd',
    'factory',
    'shield-account-outline',
  ]);
  const safeIcon = SAFE_ICONS.has(icon) ? icon : 'shield-account-outline';

  const hasSelection = !!selectedId;

  const handleClear = () => {
    onClear?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <View style={styles.modalTitleIcon}>
                <Icon name={safeIcon} size={20} color={PRIMARY_COLOR} />
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
            ListHeaderComponent={
              allowClear ? (
                <TouchableOpacity
                  style={[
                    styles.selectionItem,
                    !hasSelection && styles.selectionItemSelected,
                  ]}
                  onPress={handleClear}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.selectionIcon,
                      !hasSelection && {
                        backgroundColor: `${PRIMARY_COLOR}15`,
                      },
                    ]}
                  >
                    <Icon
                      name="close-circle-outline"
                      size={18}
                      color={!hasSelection ? PRIMARY_COLOR : '#7D8794'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.selectionText,
                      !hasSelection && styles.selectionTextSelected,
                    ]}
                  >
                    {clearLabel}
                  </Text>
                  {!hasSelection && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={15} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              const id = getId(item);
              const selected = selectedId === id;
              return (
                <TouchableOpacity
                  style={[
                    styles.selectionItem,
                    selected && styles.selectionItemSelected,
                  ]}
                  onPress={() => {
                    if (allowClear && selected) {
                      handleClear();
                      return;
                    }
                    onSelect(item);
                  }}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.selectionIcon,
                      selected && {
                        backgroundColor: `${PRIMARY_COLOR}15`,
                      },
                    ]}
                  >
                    <Icon
                      name={safeIcon}
                      size={18}
                      color={selected ? PRIMARY_COLOR : '#7D8794'}
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.selectionText,
                      selected && styles.selectionTextSelected,
                    ]}
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
                  <Icon
                    name="database-off-outline"
                    size={26}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text style={styles.modalEmptyTitle}>
                  Nothing available
                </Text>
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
  inputDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF0F4' },
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
  fieldLabelInline: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
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
  selectFieldInline: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
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

  workCenterFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workCenterSelect: {
    flex: 1,
    marginTop: 0,
  },
  workCenterClear: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${ERROR_COLOR}33`,
    borderRadius: 10,
    backgroundColor: `${ERROR_COLOR}0D`,
  },
  lockedField: {
    opacity: 0.75,
    backgroundColor: '#EEF2F7',
    borderColor: '#D9E0E8',
  },

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

  jobSubField: { marginTop: 14 },
  optionalHint: { color: '#94A3B8', fontSize: 9, fontWeight: '500' },

  locationReminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 22,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  locationReminderIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  locationReminderTitle: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '700',
  },
  locationReminderText: {
    marginTop: 2,
    color: '#92400E',
    fontSize: 10,
    lineHeight: 14,
  },
  locationReminderCta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  locationReminderCtaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  locationReminderDone: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationReminderDoneText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
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
  reportsModal: { maxHeight: '85%' },
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 43,
    paddingVertical: 0,
    color: TEXT_PRIMARY,
    fontSize: 13,
  },
  searchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  searchHintText: { color: '#94A3B8', fontSize: 9, fontWeight: '500' },
  employeeResultInfo: { flex: 1, marginLeft: 11, marginRight: 8 },
  employeeName: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  employeeMeta: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '500',
  },
  employeeRole: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: '600',
  },

  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },

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

  apiLogFab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  apiLogBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: ERROR_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiLogBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  apiLogRow: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
  },
  apiLogHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  apiLogLabel: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  apiLogStatus: { fontSize: 10, fontWeight: '700' },
  apiLogTime: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },
  apiLogSection: {
    marginTop: 8,
    color: '#475569',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  apiLogJson: {
    marginTop: 3,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    lineHeight: 14,
  },
});