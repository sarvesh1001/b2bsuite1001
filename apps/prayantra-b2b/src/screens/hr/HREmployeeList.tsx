// apps/prayantra-b2b/src/screens/hr/HREmployeeList.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useUserAuthStore } from '../../store/userAuthStore';
import {
  searchEmployeesTypeahead,
  getEmployeeStats,
  deleteEmployeeProfile,
  exportEmployeeData,
  reactivateEmployee,          // 👈 NEW — static import, no more dynamic import
} from '@b2b/api-client';
import type {
  DecryptedEmployeeDetails,
  EmployeeTypeaheadDetailsResponse,
  EmploymentStatusFilter,      // 👈 NEW — canonical filter union from shared-types
} from '@b2b/shared-types';
import { UserAvatar } from '../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';
import { RootStackParamList } from '../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'HREmployeeList'>;

const TAG = '[HREmployeeList]';
const log = (...args: any[]) => console.log(TAG, ...args);
const logErr = (...args: any[]) => console.error(TAG, ...args);

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 300;

// ── Status filter ────────────────────────────────────────────────────
//
// Values mirror the backend's accepted `employment_status` query param:
//   active | probation | notice | on_hold | terminated | resigned
// plus the local-only 'all' (maps to "no filter").
//
// The ui uses `EmploymentStatusFilter` from shared-types, aliased as
// `UIStatusFilter` here so the local file's vocabulary stays clear.

type UIStatusFilter = 'all' | Exclude<EmploymentStatusFilter, ''>;

const STATUS_FILTERS: { key: UIStatusFilter; label: string; color: string }[] = [
  { key: 'all',        label: 'All',         color: TEXT_PRIMARY },
  { key: 'active',     label: 'Active',      color: '#10b981' },
  { key: 'probation',  label: 'Probation',   color: '#f59e0b' },
  { key: 'notice',     label: 'Notice',      color: '#f97316' },
  { key: 'on_hold',    label: 'On Hold',     color: '#6366f1' },
  { key: 'terminated', label: 'Terminated',  color: '#ef4444' },
  { key: 'resigned',   label: 'Resigned',    color: '#dc2626' },
];

// Verbose dump helper — one line so RN's LogBox doesn't truncate.
const dump = (label: string, value: any) => {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    log(`${label}:`, s?.slice(0, 2000));
  } catch (e) {
    log(`${label}: <unserialisable>`, e);
  }
};

const describeError = (error: any) => ({
  message: error?.message,
  status: error?.response?.status,
  url: error?.config?.url,
  responseData: error?.response?.data,
});

// ------------------------------------------------------------------
// extractDetails — parse rows, log every branch
// ------------------------------------------------------------------
const extractDetails = (
  res: EmployeeTypeaheadDetailsResponse | any,
): DecryptedEmployeeDetails[] => {
  log('── extractDetails ──');
  log('  res type:', typeof res, Array.isArray(res) ? 'ARRAY' : 'object');
  log('  res keys:', res && typeof res === 'object' ? Object.keys(res) : null);
  log('  res.success:', res?.success);
  log('  res.data type:', typeof res?.data, Array.isArray(res?.data) ? 'ARRAY' : '');

  if (!res) {
    logErr('  ❌ res is null/undefined → returning []');
    return [];
  }

  const data = res.data ?? res?.data?.data ?? [];
  log(
    '  chosen data source:',
    res.data ? 'res.data' : res?.data?.data ? 'res.data.data' : 'fallback []',
  );
  log(
    '  data is array:',
    Array.isArray(data),
    'length:',
    Array.isArray(data) ? data.length : 'n/a',
  );

  if (!Array.isArray(data)) {
    logErr('  ❌ data is not an array → returning []');
    return [];
  }

  if (data.length === 0) {
    log('  ⚠️ data array is empty — backend returned 0 rows');
    return [];
  }

  log('  first row (raw):', JSON.stringify(data[0]).slice(0, 1500));
  log('  first row keys:', Object.keys(data[0] || {}));

  const first = data[0] as any;
  const hasSnakeUserId = 'user_id' in first;
  const hasPascalUserId = 'UserID' in first;
  log('  has "user_id":', hasSnakeUserId, '| has "UserID":', hasPascalUserId);

  if (!hasSnakeUserId && !hasPascalUserId) {
    logErr('  ❌ No recognizable user id key found on the row');
  }

  const pick = <T = any>(row: any, snake: string, pascal: string): T | undefined =>
    row?.[snake] ?? row?.[pascal];

  const normalized: DecryptedEmployeeDetails[] = data
    .filter(
      (x: any) =>
        !!x && typeof x === 'object' && ('user_id' in x || 'UserID' in x),
    )
    .map(
      (row: any): DecryptedEmployeeDetails => ({
        user_id: pick<string>(row, 'user_id', 'UserID') ?? '',
        company_id: pick<string>(row, 'company_id', 'CompanyID') ?? '',
        username: pick<string>(row, 'username', 'Username') ?? '',
        full_name: pick(row, 'full_name', 'FullName') ?? null,
        phone_number: pick(row, 'phone_number', 'PhoneNumber') ?? null,
        email: pick(row, 'email', 'Email') ?? null,
        employee_id: pick<string>(row, 'employee_id', 'EmployeeID') ?? '',
        role_id: pick<string>(row, 'role_id', 'RoleID') ?? '',
        role_name: pick<string>(row, 'role_name', 'RoleName') ?? '',
        position_id: pick(row, 'position_id', 'PositionID') ?? null,
        position_title: pick(row, 'position_title', 'PositionTitle') ?? null,
        department_id: pick(row, 'department_id', 'DepartmentID') ?? null,
        department_name: pick(row, 'department_name', 'DepartmentName') ?? null,
        primary_location_id:
          pick(row, 'primary_location_id', 'PrimaryLocationID') ?? null,
        primary_location_name:
          pick(row, 'primary_location_name', 'PrimaryLocationName') ?? null,
        location_access_scope:
          pick(row, 'location_access_scope', 'LocationAccessScope') ?? 'ALL',
        reports_to: pick(row, 'reports_to', 'ReportsTo') ?? null,
        hire_date: pick<string>(row, 'hire_date', 'HireDate') ?? '',
        is_active: pick<boolean>(row, 'is_active', 'IsActive') ?? false,
        employee_profile_id:
          pick(row, 'employee_profile_id', 'EmployeeProfileID') ?? null,
        gender: pick(row, 'gender', 'Gender') ?? null,
        employment_type: pick(row, 'employment_type', 'EmploymentType') ?? null,
        employment_status:
          pick(row, 'employment_status', 'EmploymentStatus') ?? null,
        job_title: pick(row, 'job_title', 'JobTitle') ?? null,
        grade: pick(row, 'grade', 'Grade') ?? null,
        cost_center_id: pick(row, 'cost_center_id', 'CostCenterID') ?? null,
        cost_center: pick(row, 'cost_center', 'CostCenter') ?? null,
        cost_center_name: pick(row, 'cost_center_name', 'CostCenterName') ?? null,
        cost_center_code: pick(row, 'cost_center_code', 'CostCenterCode') ?? null,
        probation_end_date:
          pick(row, 'probation_end_date', 'ProbationEndDate') ?? null,
        confirmation_date:
          pick(row, 'confirmation_date', 'ConfirmationDate') ?? null,
        date_of_birth: pick(row, 'date_of_birth', 'DateOfBirth') ?? null,
        nationality: pick(row, 'nationality', 'Nationality') ?? null,
        marital_status: pick(row, 'marital_status', 'MaritalStatus') ?? null,
        tax_id: pick(row, 'tax_id', 'TaxID') ?? null,
        social_security_id:
          pick(row, 'social_security_id', 'SocialSecurityID') ?? null,
        profile_created_at:
          pick(row, 'profile_created_at', 'ProfileCreatedAt') ?? null,
        profile_updated_at:
          pick(row, 'profile_updated_at', 'ProfileUpdatedAt') ?? null,
        user_created_at:
          pick<string>(row, 'user_created_at', 'UserCreatedAt') ?? '',
        user_last_login:
          pick(row, 'user_last_login', 'UserLastLogin') ?? null,
      }),
    );

  log('  ✅ normalized row count:', normalized.length);
  if (normalized[0]) {
    log('  first normalized user_id:', normalized[0].user_id);
    log('  first normalized username:', normalized[0].username);
    log('  first normalized full_name:', normalized[0].full_name);
    log('  first normalized status:', normalized[0].employment_status);
  }
  return normalized;
};

// ------------------------------------------------------------------
// extractMeta — find pagination info wherever the backend puts it
// ------------------------------------------------------------------
interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  raw: any;
}

const extractMeta = (res: any): PaginationMeta => {
  log('── extractMeta ──');
  log('  res.meta         :', JSON.stringify(res?.meta));
  log('  res.pagination   :', JSON.stringify(res?.pagination));
  log('  res.data.meta    :', JSON.stringify(res?.data?.meta));
  log('  res.data.pagination:', JSON.stringify(res?.data?.pagination));

  const meta =
    res?.meta ??
    res?.pagination ??
    res?.data?.meta ??
    res?.data?.pagination ??
    {};

  const num = (...candidates: any[]): number => {
    for (const c of candidates) {
      if (c === undefined || c === null || c === '') continue;
      const n = Number(c);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  };

  const parsed: PaginationMeta = {
    total: num(meta.total, meta.total_count, meta.count, meta.total_employees),
    page: num(meta.page, meta.current_page, meta.page_number) || 1,
    page_size: num(meta.page_size, meta.per_page, meta.limit) || PAGE_SIZE,
    total_pages: num(meta.total_pages, meta.pages, meta.page_count),
    raw: meta,
  };

  log(
    '  parsed meta:',
    JSON.stringify({
      total: parsed.total,
      page: parsed.page,
      page_size: parsed.page_size,
      total_pages: parsed.total_pages,
    }),
  );

  if (parsed.total === 0) {
    log(
      '  ⚠️ total is 0 or missing — pagination metadata not returned by backend. ' +
        'Falling back to "row count === page size" heuristic.',
    );
  }

  return parsed;
};

// ------------------------------------------------------------------
// extractStats — verbose, handles nested/grouped counters
// ------------------------------------------------------------------
const extractStats = (res: any): any => {
  log('── extractStats ──');
  log('  res keys:', res && typeof res === 'object' ? Object.keys(res) : null);

  if (!res) {
    logErr('  ❌ res is null/undefined');
    return null;
  }

  // Candidate locations for the stats payload
  const candidates = [
    { src: 'res.stats', value: res?.stats },
    { src: 'res.data.stats', value: res?.data?.stats },
    { src: 'res.data', value: res?.data },
    { src: 'res (top-level)', value: res },
  ];
  for (const c of candidates) {
    log(
      `  candidate ${c.src}:`,
      c.value ? JSON.stringify(c.value).slice(0, 800) : '<undefined>',
    );
  }

  const raw = res?.stats ?? res?.data?.stats ?? res?.data ?? res;

  if (!raw || typeof raw !== 'object') {
    logErr('  ❌ no object found for stats');
    return null;
  }

  log('  chosen raw keys:', Object.keys(raw));

  // Common group containers
  const byStatus =
    raw.by_status ??
    raw.status_counts ??
    raw.status_breakdown ??
    raw.by_employment_status ??
    raw.byEmploymentStatus ??
    {};

  if (byStatus && Object.keys(byStatus).length > 0) {
    log('  byStatus keys:', Object.keys(byStatus));
    log('  byStatus values:', JSON.stringify(byStatus));
  } else {
    log('  ⚠️ no by_status/status_counts group found on raw payload');
  }

  const num = (...candidates: any[]): number => {
    for (const c of candidates) {
      if (c === undefined || c === null || c === '') continue;
      const n = Number(c);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  };

  const parsed = {
    total: num(raw.total, raw.total_employees, raw.total_count, raw.count),
    active: num(
      raw.active,
      raw.active_employees,
      raw.active_count,
      byStatus.active,
      byStatus.ACTIVE,
    ),
    probation: num(
      raw.probation,
      raw.probation_count,
      raw.probation_employees,
      byStatus.probation,
      byStatus.PROBATION,
    ),
    notice: num(raw.notice, raw.notice_count, byStatus.notice, byStatus.NOTICE),
    on_hold: num(
      raw.on_hold,
      raw.on_hold_count,
      raw.onHold,
      byStatus.on_hold,
      byStatus.onHold,
      byStatus.on_leave,
    ),
    terminated: num(
      raw.terminated,
      raw.terminated_count,
      raw.terminated_employees,
      byStatus.terminated,
      byStatus.TERMINATED,
    ),
    resigned: num(
      raw.resigned,
      raw.resigned_count,
      byStatus.resigned,
      byStatus.RESIGNED,
    ),
  };

  log('  parsed stats:', JSON.stringify(parsed));

  if (parsed.total > 0 && parsed.active === 0 && parsed.probation === 0) {
    log(
      '  ⚠️ total > 0 but active/probation are both 0 — the per-status keys ' +
        'are named differently. Check the RAW RESPONSE above and add the ' +
        'field name to extractStats().',
    );
  }

  return parsed;
};

export default function HREmployeeList() {
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [employees, setEmployees] = useState<DecryptedEmployeeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState<UIStatusFilter>('all');

  const [stats, setStats] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // ---------- fetch employees ----------
  const fetchEmployees = useCallback(
    async (
      opts: { reset: boolean; query?: string; silent?: boolean } = { reset: true },
    ) => {
      const { reset, query, silent } = opts;

      log('═══ fetchEmployees ═══', {
        reset,
        query,
        status: statusFilter,
        targetPage: reset ? 1 : page + 1,
        hasToken: !!accessToken,
        hasCompany: !!companyId,
        hasDevice: !!deviceId,
      });

      if (!accessToken || !companyId || !deviceId) {
        logErr('Missing auth context, aborting');
        Alert.alert('Error', 'Missing authentication. Please log in again.');
        setLoading(false);
        return;
      }

      const targetPage = reset ? 1 : page + 1;
      const effectiveQuery = query ?? activeQuery;

      if (reset) {
        if (!silent) setLoading(true);
        setLoadError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const requestParams: {
          q?: string;
          page: number;
          page_size: number;
          employment_status?: EmploymentStatusFilter;
        } = {
          q: effectiveQuery,
          page: targetPage,
          page_size: PAGE_SIZE,
        };
        if (statusFilter !== 'all') {
          requestParams.employment_status = statusFilter;
        }

        log('→ calling searchEmployeesTypeahead', requestParams);

        const res = await searchEmployeesTypeahead(
          companyId,
          deviceId,
          accessToken,
          requestParams,
          false,
        );

        log('← searchEmployeesTypeahead returned');
        dump('  RAW RESPONSE', res);

        const rows = extractDetails(res);
        const meta = extractMeta(res);

        log('  rows.length:', rows.length);
        log('  meta.total:', meta.total);

        if (reset) {
          setEmployees(rows);
          setPage(1);
        } else {
          setEmployees(prev => {
            const seen = new Set(prev.map(e => e.user_id));
            const merged = [...prev];
            for (const r of rows) {
              if (!seen.has(r.user_id)) {
                merged.push(r);
                seen.add(r.user_id);
              }
            }
            log(
              `  append dedupe: prev=${prev.length} incoming=${rows.length} after=${merged.length}`,
            );
            return merged;
          });
          setPage(targetPage);
        }

        // Pagination decision
        if (meta.total > 0) {
          setTotalCount(meta.total);
          const loadedCount = reset
            ? rows.length
            : employees.length + rows.length;
          const more = loadedCount < meta.total;
          log(
            `  hasMore from meta: loaded=${loadedCount} total=${meta.total} → ${more}`,
          );
          setHasMore(more);
        } else {
          const more = rows.length === PAGE_SIZE;
          log(
            `  hasMore from heuristic (no meta): rows.length=${rows.length} PAGE_SIZE=${PAGE_SIZE} → ${more}`,
          );
          setHasMore(more);
          setTotalCount(prev => (reset ? rows.length : prev + rows.length));
        }
      } catch (error: any) {
        const info = describeError(error);
        logErr(
          '❌ searchEmployeesTypeahead FAILED:',
          JSON.stringify(info, null, 2),
        );
        if (reset) {
          setEmployees([]);
          setTotalCount(0);
          setLoadError(
            info.responseData?.error ||
              info.responseData?.message ||
              info.message ||
              'Failed to load employees',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      activeQuery,
      page,
      statusFilter,
      employees.length,
    ],
  );

  // ---------- fetch stats ----------
  const fetchStats = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setStatsError(null);
    try {
      log('→ calling getEmployeeStats');
      const raw = await getEmployeeStats(companyId, deviceId, accessToken);
      dump('← STATS RAW RESPONSE', raw);
      const parsed = extractStats(raw);
      dump('  parsed stats', parsed);
      setStats(parsed);
    } catch (error: any) {
      const info = describeError(error);
      logErr('❌ getEmployeeStats FAILED:', JSON.stringify(info, null, 2));
      setStats(null);
      setStatsError(
        info.responseData?.error || info.message || 'Failed to load stats',
      );
    }
  }, [accessToken, companyId, deviceId]);

  // Refetch on focus + when filter/query changes
  useFocusEffect(
    useCallback(() => {
      log(
        'useFocusEffect fired — activeQuery:',
        activeQuery,
        'status:',
        statusFilter,
      );
      fetchEmployees({ reset: true, query: activeQuery });
      fetchStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuery, statusFilter]),
  );

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const q = searchTerm.trim();
      if (q === activeQuery) return;
      log('debounced query change:', { from: activeQuery, to: q });
      setActiveQuery(q);
    }, DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, activeQuery]);

  const clearSearch = () => {
    setSearchTerm('');
    setActiveQuery('');
    Keyboard.dismiss();
  };

  const handleStatusFilter = (next: UIStatusFilter) => {
    if (next === statusFilter) return;
    log('status filter changed:', { from: statusFilter, to: next });
    setStatusFilter(next);
  };

  // ---------- delete ----------
  const handleDelete = useCallback(
    (userId: string, displayName?: string) => {
      Alert.alert(
        'Delete Employee',
        `Are you sure you want to delete "${displayName || userId}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!accessToken || !companyId || !deviceId) return;
              setDeletingId(userId);
              try {
                await deleteEmployeeProfile(
                  companyId,
                  userId,
                  deviceId,
                  accessToken,
                );
                setEmployees(prev => prev.filter(e => e.user_id !== userId));
                setTotalCount(prev => Math.max(0, prev - 1));
              } catch (error: any) {
                logErr(
                  'deleteEmployeeProfile FAILED:',
                  JSON.stringify(describeError(error), null, 2),
                );
                Alert.alert(
                  'Error',
                  error?.message || 'Failed to delete employee',
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [accessToken, companyId, deviceId],
  );

  // ---------- reactivate terminated ----------
  const handleReactivate = useCallback(
    (item: DecryptedEmployeeDetails) => {
      const displayName = item.full_name || item.username || item.user_id;
      Alert.alert(
        'Reactivate employee',
        `Restore "${displayName}" as an active employee?\n\n` +
          `This sets employment_status back to "active", re-enables the roster ` +
          `row, and marks the last exit as rehired. Leave entitlements will be ` +
          `re-resolved in the background.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reactivate',
            style: 'default',
            onPress: async () => {
              if (!accessToken || !companyId || !deviceId) return;

              const url = `/api/v1/companies/${companyId}/hr/employees/user/${item.user_id}/reactivate`;
              console.log('[Reactivate] ▶️ firing', {
                url,
                method: 'PATCH',
                userId: item.user_id,
                employeeId: item.employee_id,
                currentStatus: item.employment_status,
              });

              setReactivatingId(item.user_id);
              const started = Date.now();
              try {
                const res = await reactivateEmployee(
                  companyId,
                  item.user_id,
                  deviceId,
                  accessToken,
                );
                console.log('[Reactivate] ✅ success', {
                  elapsedMs: Date.now() - started,
                  response: res,
                });
                Alert.alert('Success', `${displayName} reactivated`);
                // Refetch both the list and stats so counts update
                fetchEmployees({ reset: true, query: activeQuery });
                fetchStats();
              } catch (error: any) {
                const info = describeError(error);
                console.error('[Reactivate] ❌ failed', {
                  elapsedMs: Date.now() - started,
                  ...info,
                });
                Alert.alert(
                  'Error',
                  info.responseData?.error ||
                    info.responseData?.message ||
                    info.message ||
                    'Reactivate failed',
                );
              } finally {
                setReactivatingId(null);
              }
            },
          },
        ],
      );
    },
    [accessToken, companyId, deviceId, activeQuery, fetchEmployees, fetchStats],
  );

  // ---------- export ----------
  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Error', 'Missing authentication');
        return;
      }
      setExporting(true);
      try {
        const blob = await exportEmployeeData(
          companyId,
          deviceId,
          accessToken,
          format,
        );
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(',')[1] || '';
          const filename = `employees_${new Date()
            .toISOString()
            .slice(0, 10)}.${format}`;
          const fileUri = (FileSystem as any).documentDirectory + filename;
          try {
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert('Export Successful', `File saved to ${filename}`, [
              {
                text: 'Share',
                onPress: async () => {
                  if (await Sharing.isAvailableAsync())
                    await Sharing.shareAsync(fileUri);
                },
              },
              { text: 'OK', style: 'cancel' },
            ]);
          } catch (writeError: any) {
            Alert.alert('Error', 'Failed to save file: ' + writeError.message);
          }
        };
        reader.readAsDataURL(blob);
      } catch (error: any) {
        Alert.alert('Export Failed', error?.message || 'Failed to export data');
      } finally {
        setExporting(false);
      }
    },
    [accessToken, companyId, deviceId],
  );

  const showExportOptions = () => {
    Alert.alert('Export Employees', 'Choose export format', [
      { text: 'JSON', onPress: () => handleExport('json') },
      { text: 'CSV', onPress: () => handleExport('csv') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ---------- render item ----------
  const renderItem = ({
    item,
    index,
  }: {
    item: DecryptedEmployeeDetails;
    index: number;
  }) => {
    const isDeleting = deletingId === item.user_id;
    const isReactivating = reactivatingId === item.user_id;
    const displayName = item.full_name || item.username || 'Unnamed Employee';
    const isTerminated =
      item.employment_status === 'terminated' ||
      item.employment_status === 'resigned';

    const statusColor =
      item.employment_status === 'active'
        ? '#10b981'
        : item.employment_status === 'probation' ||
          item.employment_status === 'notice'
        ? '#f59e0b'
        : item.employment_status === 'on_hold'
        ? '#6366f1'
        : item.employment_status === 'terminated' ||
          item.employment_status === 'resigned'
        ? '#ef4444'
        : '#64748b';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('HREmployeeDetail', {
            userId: item.user_id,
            employeeProfileId: item.employee_profile_id ?? undefined,
          })
        }
      >
        <View
          style={[
            styles.cardAccent,
            isTerminated && { backgroundColor: '#ef4444' },
          ]}
        />
        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(2, '0')}
        </Text>

        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.user_id}
            username={item.username}
            fullName={item.full_name ?? undefined}
            size={48}
            style={styles.avatar}
          />

          <View style={styles.cardInfo}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.subRow}>
              <Icon name="at" size={12} color={TEXT_SECONDARY} />
              <Text style={styles.subText} numberOfLines={1}>
                {item.username || '—'}
              </Text>
            </View>
            <View style={styles.subRow}>
              <Icon name="briefcase-outline" size={12} color={TEXT_SECONDARY} />
              <Text style={styles.subText} numberOfLines={1}>
                {item.job_title || item.position_title || 'No title'}
              </Text>
            </View>
          </View>

          <View style={styles.statusWrap}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(item.employment_status || 'unknown').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerChip}>
            <Icon name="domain" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.footerChipText} numberOfLines={1}>
              {item.department_name || 'No dept'}
            </Text>
          </View>
          <View style={styles.footerChip}>
            <Icon name="map-marker-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.footerChipText} numberOfLines={1}>
              {item.primary_location_name || 'No location'}
            </Text>
          </View>
          <View style={styles.footerChip}>
            <Icon
              name="badge-account-outline"
              size={12}
              color={TEXT_SECONDARY}
            />
            <Text style={styles.footerChipText} numberOfLines={1}>
              {item.employee_id || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {/* Reactivate — only for terminated / resigned rows */}
          {isTerminated && (
            <TouchableOpacity
              style={[styles.iconBtn, styles.reactivateBtn]}
              onPress={() => handleReactivate(item)}
              disabled={isReactivating}
            >
              {isReactivating ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <Icon
                    name="account-reactivate"
                    size={16}
                    color="#10b981"
                  />
                  <Text style={styles.reactivateText}>Reactivate</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('HREmployeeDetail', {
                userId: item.user_id,
                employeeProfileId: item.employee_profile_id ?? undefined,
              })
            }
          >
            <Icon name="eye-outline" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('HREmployeeForm', {
                employeeId: item.employee_profile_id ?? item.user_id,
              })
            }
          >
            <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleDelete(item.user_id, displayName)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Icon name="delete" size={18} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- render stats bar ----------
  const renderStats = () => {
    if (statsError) {
      return (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color="#b91c1c" />
          <Text style={styles.errorBannerText}>Stats: {statsError}</Text>
        </View>
      );
    }
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => handleStatusFilter('all')}
        >
          <Text style={styles.statNumber}>{stats.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => handleStatusFilter('active')}
        >
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {stats.active ?? 0}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => handleStatusFilter('probation')}
        >
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {stats.probation ?? 0}
          </Text>
          <Text style={styles.statLabel}>Probation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => handleStatusFilter('terminated')}
        >
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {stats.terminated ?? 0}
          </Text>
          <Text style={styles.statLabel}>Terminated</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && employees.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </SafeAreaView>
    );
  }

  log(
    'render — employees.length:',
    employees.length,
    'totalCount:',
    totalCount,
    'hasMore:',
    hasMore,
    'loading:',
    loading,
    'filter:',
    statusFilter,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={showExportOptions}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="export" size={22} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('HREmployeeForm', {})}
          >
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color="#b91c1c" />
          <Text style={styles.errorBannerText}>Employees: {loadError}</Text>
          <TouchableOpacity onPress={() => fetchEmployees({ reset: true })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderStats()}

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: f.color + '20',
                    borderColor: f.color,
                  },
                ]}
                onPress={() => handleStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                {f.key !== 'all' && (
                  <View
                    style={[styles.filterDot, { backgroundColor: f.color }]}
                  />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    active && { color: f.color, fontWeight: '700' },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <Icon
          name="magnify"
          size={20}
          color={TEXT_SECONDARY}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, username..."
          placeholderTextColor={TEXT_SECONDARY}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Icon name="close" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>

      {employees.length > 0 && (
        <View style={styles.countBar}>
          <Text style={styles.countBarText}>
            Showing {employees.length}
            {totalCount > 0 ? ` of ${totalCount}` : ''}
            {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            {activeQuery ? ` · "${activeQuery}"` : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={employees}
        keyExtractor={(item, idx) => item?.user_id ?? String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchEmployees({ reset: true, query: activeQuery });
              fetchStats();
            }}
          />
        }
        onEndReached={() => {
          if (loadingMore || !hasMore || loading) return;
          log('onEndReached fired — fetching next page', {
            page,
            hasMore,
            totalCount,
          });
          fetchEmployees({ reset: false, query: activeQuery });
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>
              {activeQuery
                ? 'No matching employees'
                : statusFilter !== 'all'
                ? `No ${statusFilter} employees`
                : 'No employees yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeQuery
                ? 'Try a different search term'
                : statusFilter !== 'all'
                ? 'Tap "All" to see everyone'
                : loadError
                ? 'Pull to refresh or tap Retry above'
                : 'Add your first employee by tapping the + button'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            </View>
          ) : !hasMore && employees.length > 0 ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerEndText}>End of list</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  exportButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
  },
  errorBannerText: { flex: 1, color: '#991b1b', fontSize: 12, marginLeft: 8 },
  retryText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  statItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  statNumber: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  statLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterRow: {
    backgroundColor: BACKGROUND_COLOR,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  clearButton: { padding: 4 },
  countBar: {
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  countBarText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20, flexGrow: 1 },
  card: {
    position: 'relative',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: PRIMARY_COLOR,
  },
  cardNumber: {
    position: 'absolute',
    top: 9,
    right: 11,
    color: '#D2D8E0',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginLeft: 3, marginRight: 12 },
  cardInfo: { flex: 1, paddingRight: 8 },
  employeeName: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  subText: { marginLeft: 4, fontSize: 11, color: TEXT_SECONDARY, flex: 1 },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 9, fontWeight: '700' },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '48%',
  },
  footerChipText: {
    marginLeft: 4,
    fontSize: 10,
    color: TEXT_SECONDARY,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  iconBtn: { padding: 6, marginLeft: 10 },
  reactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#10b98120',
    borderRadius: 6,
  },
  reactivateText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerEndText: { fontSize: 11, color: TEXT_SECONDARY, fontStyle: 'italic' },
});