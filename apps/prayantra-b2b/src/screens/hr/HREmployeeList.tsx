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
} from '@b2b/api-client';
import type {
  DecryptedEmployeeDetails,
  EmployeeTypeaheadDetailsResponse,
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

// Verbose dump helper — one line so RN's LogBox doesn't truncate.
const dump = (label: string, value: any) => {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    log(`${label}:`, s?.slice(0, 1500));
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
// Diagnostic extraction — logs at every branch so we know EXACTLY
// where rows are lost.
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
  log('  chosen data source:',
    res.data ? 'res.data' : res?.data?.data ? 'res.data.data' : 'fallback []');
  log('  data is array:', Array.isArray(data), 'length:', Array.isArray(data) ? data.length : 'n/a');

  if (!Array.isArray(data)) {
    logErr('  ❌ data is not an array → returning []');
    return [];
  }

  if (data.length === 0) {
    log('  ⚠️ data array is empty — backend returned 0 rows');
    return [];
  }

  // Dump first row in full so we can see its keys.
  log('  first row (raw):', JSON.stringify(data[0]).slice(0, 1200));
  log('  first row keys:', Object.keys(data[0] || {}));

  // Which id key is present?
  const first = data[0] as any;
  const hasSnakeUserId = 'user_id' in first;
  const hasPascalUserId = 'UserID' in first;
  log('  has "user_id":', hasSnakeUserId, '| has "UserID":', hasPascalUserId);

  if (!hasSnakeUserId && !hasPascalUserId) {
    logErr('  ❌ No recognizable user id key found on the row');
  }

  // Normalizer: accept either casing so we don't silently drop anything.
  const pick = <T = any>(row: any, snake: string, pascal: string): T | undefined =>
    row?.[snake] ?? row?.[pascal];

  const normalized: DecryptedEmployeeDetails[] = data
    .filter(
      (x: any) =>
        !!x &&
        typeof x === 'object' &&
        ('user_id' in x || 'UserID' in x),
    )
    .map((row: any): DecryptedEmployeeDetails => ({
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
      primary_location_id: pick(row, 'primary_location_id', 'PrimaryLocationID') ?? null,
      primary_location_name: pick(row, 'primary_location_name', 'PrimaryLocationName') ?? null,
      location_access_scope: pick(row, 'location_access_scope', 'LocationAccessScope') ?? 'ALL',
      reports_to: pick(row, 'reports_to', 'ReportsTo') ?? null,
      hire_date: pick<string>(row, 'hire_date', 'HireDate') ?? '',
      is_active: pick<boolean>(row, 'is_active', 'IsActive') ?? false,
      employee_profile_id: pick(row, 'employee_profile_id', 'EmployeeProfileID') ?? null,
      gender: pick(row, 'gender', 'Gender') ?? null,
      employment_type: pick(row, 'employment_type', 'EmploymentType') ?? null,
      employment_status: pick(row, 'employment_status', 'EmploymentStatus') ?? null,
      job_title: pick(row, 'job_title', 'JobTitle') ?? null,
      grade: pick(row, 'grade', 'Grade') ?? null,
      cost_center: pick(row, 'cost_center', 'CostCenter') ?? null,
      date_of_birth: pick(row, 'date_of_birth', 'DateOfBirth') ?? null,
      nationality: pick(row, 'nationality', 'Nationality') ?? null,
      marital_status: pick(row, 'marital_status', 'MaritalStatus') ?? null,
      tax_id: pick(row, 'tax_id', 'TaxID') ?? null,
      social_security_id: pick(row, 'social_security_id', 'SocialSecurityID') ?? null,
      profile_created_at: pick(row, 'profile_created_at', 'ProfileCreatedAt') ?? null,
      profile_updated_at: pick(row, 'profile_updated_at', 'ProfileUpdatedAt') ?? null,
      user_created_at: pick<string>(row, 'user_created_at', 'UserCreatedAt') ?? '',
      user_last_login: pick(row, 'user_last_login', 'UserLastLogin') ?? null,
    }));

  log('  ✅ normalized row count:', normalized.length);
  if (normalized[0]) {
    log('  first normalized user_id:', normalized[0].user_id);
    log('  first normalized username:', normalized[0].username);
    log('  first normalized full_name:', normalized[0].full_name);
  }
  return normalized;
};

const extractStats = (res: any): any => {
  if (!res) return null;
  const raw = res?.stats ?? res?.data?.stats ?? res?.data ?? res;
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    total: raw.total ?? raw.total_employees ?? 0,
    active: raw.active ?? raw.active_employees ?? 0,
    probation: raw.probation ?? 0,
    terminated: raw.terminated ?? 0,
  };
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

  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // ---------- fetch ----------
  const fetchEmployees = useCallback(
    async (opts: { reset: boolean; query?: string; silent?: boolean } = { reset: true }) => {
      const { reset, query, silent } = opts;

      log('═══ fetchEmployees ═══', {
        reset,
        query,
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
        log('→ calling searchEmployeesTypeahead', {
          q: effectiveQuery,
          page: targetPage,
          page_size: PAGE_SIZE,
        });

        const res = await searchEmployeesTypeahead(
          companyId,
          deviceId,
          accessToken,
          {
            q: effectiveQuery,
            page: targetPage,
            page_size: PAGE_SIZE,
          },
          false,
        );

        log('← searchEmployeesTypeahead returned');
        dump('  RAW RESPONSE', res);
        log('  typeof res:', typeof res);
        log('  res keys:', res ? Object.keys(res) : null);
        log('  res.success:', (res as any)?.success);
        log('  res.data isArray:', Array.isArray((res as any)?.data));
        log('  res.data length:', Array.isArray((res as any)?.data) ? (res as any).data.length : 'n/a');
        log('  res.meta:', JSON.stringify((res as any)?.meta));

        const rows = extractDetails(res);
        log('  extractDetails →', rows.length, 'rows');

        if (reset) {
          setEmployees(rows);
          setPage(1);
        } else {
          setEmployees(prev => [...prev, ...rows]);
          setPage(targetPage);
        }
        setHasMore(rows.length === PAGE_SIZE);

        log('  final employees state will be:', reset ? rows.length : employees.length + rows.length);
      } catch (error: any) {
        const info = describeError(error);
        logErr('❌ searchEmployeesTypeahead FAILED:', JSON.stringify(info, null, 2));
        if (reset) {
          setEmployees([]);
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
    [accessToken, companyId, deviceId, activeQuery, page],
  );

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
      setStatsError(info.responseData?.error || info.message || 'Failed to load stats');
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(
    useCallback(() => {
      fetchEmployees({ reset: true, query: activeQuery });
      fetchStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuery]),
  );

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
                await deleteEmployeeProfile(companyId, userId, deviceId, accessToken);
                setEmployees(prev => prev.filter(e => e.user_id !== userId));
              } catch (error: any) {
                logErr('deleteEmployeeProfile FAILED:', JSON.stringify(describeError(error), null, 2));
                Alert.alert('Error', error?.message || 'Failed to delete employee');
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

  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Error', 'Missing authentication');
        return;
      }
      setExporting(true);
      try {
        const blob = await exportEmployeeData(companyId, deviceId, accessToken, format);
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(',')[1] || '';
          const filename = `employees_${new Date().toISOString().slice(0, 10)}.${format}`;
          const fileUri = (FileSystem as any).documentDirectory + filename;
          try {
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert('Export Successful', `File saved to ${filename}`, [
              {
                text: 'Share',
                onPress: async () => {
                  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
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

  const renderItem = ({ item, index }: { item: DecryptedEmployeeDetails; index: number }) => {
    const isDeleting = deletingId === item.user_id;
    const displayName = item.full_name || item.username || 'Unnamed Employee';

    const statusColor =
      item.employment_status === 'active'
        ? '#10b981'
        : item.employment_status === 'probation' || item.employment_status === 'notice'
        ? '#f59e0b'
        : item.employment_status === 'terminated'
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
        <View style={styles.cardAccent} />
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
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
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
            <Icon name="badge-account-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.footerChipText} numberOfLines={1}>
              {item.employee_id || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
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
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total ?? 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.active ?? 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.probation ?? 0}</Text>
          <Text style={styles.statLabel}>Probation</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.terminated ?? 0}</Text>
          <Text style={styles.statLabel}>Terminated</Text>
        </View>
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

  log('render — employees.length:', employees.length, 'loading:', loading);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={TEXT_SECONDARY} style={styles.searchIcon} />
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
            }}
          />
        }
        onEndReached={() => {
          if (loadingMore || !hasMore || loading) return;
          fetchEmployees({ reset: false, query: activeQuery });
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>
              {activeQuery ? 'No matching employees' : 'No employees yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeQuery
                ? 'Try a different search term'
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
  retryText: { color: PRIMARY_COLOR, fontWeight: '700', fontSize: 12, marginLeft: 8 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  statLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginVertical: 12,
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
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  iconBtn: { padding: 6, marginLeft: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});