// apps/prayantra-b2b/src/screens/hr/HREmployeeList.tsx
import React, { useCallback, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useUserAuthStore } from '../../store/userAuthStore';
import {
  listEmployees,
  getEmployeeStats,
  deleteEmployeeProfile,
  exportEmployeeData,
} from '@b2b/api-client';
import { HREmployeeProfile } from '@b2b/shared-types';
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

// ---------- logging helpers ----------
const TAG = '[HREmployeeList]';
const log = (...args: any[]) => console.log(TAG, ...args);
const logErr = (...args: any[]) => console.error(TAG, ...args);
const logWarn = (...args: any[]) => console.warn(TAG, ...args);

const describeError = (error: any) => {
  if (!error) return { message: 'Unknown error' };
  return {
    message: error?.message,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    url: error?.config?.url,
    method: error?.config?.method,
    requestParams: error?.config?.params,
    requestHeaders: error?.config?.headers,
    responseData: error?.response?.data,
    code: error?.code,
  };
};

// ------------------------------------------------------------------
// extractEmployees — tolerates every shape we've seen in the wild:
//   - { data: [ ... ] }            ← current backend
//   - { data: { employees: [...] } }
//   - { data: { data: { employees: [...] } } }
//   - [ ... ]                      ← bare array
// ------------------------------------------------------------------
const extractEmployees = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return (
    res?.employees ??
    res?.data?.employees ??
    res?.data?.data?.employees ??
    []
  );
};

// ------------------------------------------------------------------
// normalizeEmployee — the backend returns employee_profile_id + user_id.
// The screen uses `id` as the React key, route param, and delete target.
// Prefer profile_id (the profile-scoped identifier); fall back to user_id.
// Also surface `full_name` if a future backend version joins users, and
// fall back to a short label so the card isn't completely blank.
// ------------------------------------------------------------------
const normalizeEmployee = (row: any): HREmployeeProfile & { id: string } => {
  const id =
    row?.id ??
    row?.employee_profile_id ??
    row?.user_id ??
    '';
  const email = row?.email ?? undefined;
  const fallbackLabel = row?.full_name ?? row?.employee_id ?? id;
  return {
    ...row,
    id,
    email: email ?? fallbackLabel,
  };
};

// ------------------------------------------------------------------
// extractStats — the backend returns { total_employees, active_employees, ... }.
// The screen's renderStats expects { total, active, probation, terminated }.
// Map both shapes so either works.
// ------------------------------------------------------------------
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

  // State
  const [employees, setEmployees] = useState<(HREmployeeProfile & { id: string })[]>([]);
  const [filtered, setFiltered] = useState<(HREmployeeProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // ---------- fetch ----------
  const fetchEmployees = useCallback(
    async (showRefresh = false) => {
      log('─── fetchEmployees ───', {
        showRefresh,
        hasAccessToken: !!accessToken,
        accessTokenLen: accessToken?.length,
        companyId,
        deviceId,
      });

      if (!accessToken || !companyId || !deviceId) {
        logErr('Missing auth context, aborting fetch', {
          hasAccessToken: !!accessToken,
          companyId,
          deviceId,
        });
        Alert.alert('Error', 'Missing authentication. Please log in again.');
        setLoading(false);
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setLoadError(null);
      setStatsError(null);

      const [listResult, statsResult] = await Promise.allSettled([
        listEmployees(companyId, deviceId, accessToken, 1, 100),
        getEmployeeStats(companyId, deviceId, accessToken),
      ]);

      // ---- list ----
      if (listResult.status === 'fulfilled') {
        const raw = listResult.value;
        log('listEmployees raw response:', JSON.stringify(raw, null, 2));

        const rows = extractEmployees(raw);
        const data = rows.map(normalizeEmployee);
        log('listEmployees parsed employee count:', data.length);
        if (data[0]) {
          log('sample employee:', JSON.stringify(data[0], null, 2));
        }

        setEmployees(data);
        setFiltered(data);
      } else {
        const info = describeError(listResult.reason);
        logErr('listEmployees FAILED:', JSON.stringify(info, null, 2));
        setEmployees([]);
        setFiltered([]);
        setLoadError(
          info.responseData?.error ||
            info.responseData?.message ||
            info.message ||
            'Failed to load employees'
        );
      }

      // ---- stats ----
      if (statsResult.status === 'fulfilled') {
        const raw = statsResult.value;
        log('getEmployeeStats raw response:', JSON.stringify(raw, null, 2));
        const parsed = extractStats(raw);
        log('getEmployeeStats parsed:', JSON.stringify(parsed, null, 2));
        setStats(parsed);
      } else {
        const info = describeError(statsResult.reason);
        logErr('getEmployeeStats FAILED:', JSON.stringify(info, null, 2));
        setStats(null);
        setStatsError(
          info.responseData?.error ||
            info.responseData?.message ||
            info.message ||
            'Failed to load stats'
        );
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken, companyId, deviceId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [fetchEmployees])
  );

  // ---------- search ----------
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      const q = query.trim().toLowerCase();
      if (!q) {
        setFiltered(employees);
        return;
      }
      setSearching(true);
      const filteredData = employees.filter((emp) => {
        return (
          emp.email?.toLowerCase().includes(q) ||
          emp.job_title?.toLowerCase().includes(q) ||
          emp.department_name?.toLowerCase().includes(q) ||
          emp.grade?.toLowerCase().includes(q)
        );
      });
      log('search', { query, total: employees.length, matches: filteredData.length });
      setFiltered(filteredData);
      setSearching(false);
    },
    [employees]
  );

  const clearSearch = () => {
    setSearchQuery('');
    setFiltered(employees);
  };

  // ---------- delete ----------
  const handleDelete = useCallback(
    (employeeId: string, fullName?: string) => {
      Alert.alert(
        'Delete Employee',
        `Are you sure you want to delete "${fullName || employeeId}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!accessToken || !companyId || !deviceId) return;
              setDeletingId(employeeId);
              log('deleteEmployeeProfile →', { employeeId });
              try {
                await deleteEmployeeProfile(companyId, employeeId, deviceId, accessToken);
                log('deleteEmployeeProfile OK', { employeeId });
                setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
                setFiltered((prev) => prev.filter((e) => e.id !== employeeId));
              } catch (error: any) {
                logErr(
                  'deleteEmployeeProfile FAILED:',
                  JSON.stringify(describeError(error), null, 2)
                );
                Alert.alert('Error', error?.message || 'Failed to delete employee');
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [accessToken, companyId, deviceId]
  );

  // ---------- export ----------
  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Error', 'Missing authentication');
        return;
      }
      setExporting(true);
      log('exportEmployeeData →', { format });
      try {
        const blob = await exportEmployeeData(companyId, deviceId, accessToken, format);
        log('exportEmployeeData OK', {
          type: typeof blob,
          size: (blob as any)?.size,
        });

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
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                  } else {
                    Alert.alert('Sharing not available');
                  }
                },
              },
              { text: 'OK', style: 'cancel' },
            ]);
          } catch (writeError) {
            logErr('export write failed', writeError);
            Alert.alert('Error', 'Failed to save file: ' + (writeError as any).message);
          }
        };
        reader.onerror = () => {
          logErr('export reader.onerror');
          Alert.alert('Error', 'Failed to read file data');
        };
        reader.readAsDataURL(blob);
      } catch (error: any) {
        logErr('exportEmployeeData FAILED:', JSON.stringify(describeError(error), null, 2));
        Alert.alert('Export Failed', error?.message || 'Failed to export data');
      } finally {
        setExporting(false);
      }
    },
    [accessToken, companyId, deviceId]
  );

  const showExportOptions = () => {
    Alert.alert(
      'Export Employees',
      'Choose export format',
      [
        { text: 'JSON', onPress: () => handleExport('json') },
        { text: 'CSV', onPress: () => handleExport('csv') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // ---------- render ----------
  const renderItem = ({ item }: { item: HREmployeeProfile & { id: string } }) => {
    const isDeleting = deletingId === item.id;
    const statusColor =
      item.employment_status === 'active'
        ? '#10b981'
        : item.employment_status === 'probation'
        ? '#f59e0b'
        : '#ef4444';

    const displayName = item.email || item.id.slice(0, 8);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('HREmployeeDetail', { employeeId: item.id })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.employeeJob} numberOfLines={1}>
              {item.job_title || 'No title'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.employment_status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.detailText}>
            <Icon name="email" size={14} color={TEXT_SECONDARY} />{' '}
            {item.email || 'N/A'}
          </Text>
          <Text style={styles.detailText}>
            <Icon name="domain" size={14} color={TEXT_SECONDARY} />{' '}
            {item.department_name || 'No dept'}
          </Text>
          <Text style={styles.detailText}>
            <Icon name="account-key" size={14} color={TEXT_SECONDARY} />{' '}
            {item.grade || 'N/A'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate('HREmployeeForm', { employeeId: item.id })
            }
          >
            <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.email)}
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
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {stats.active ?? 0}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {stats.probation ?? 0}
          </Text>
          <Text style={styles.statLabel}>Probation</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {stats.terminated ?? 0}
          </Text>
          <Text style={styles.statLabel}>Terminated</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
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

      {/* Load error banner */}
      {loadError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color="#b91c1c" />
          <Text style={styles.errorBannerText}>Employees: {loadError}</Text>
          <TouchableOpacity onPress={() => fetchEmployees()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      {renderStats()}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={TEXT_SECONDARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email, title, department..."
          placeholderTextColor={TEXT_SECONDARY}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator size="small" color={PRIMARY_COLOR} style={styles.searchSpinner} />
        ) : searchQuery.length > 0 ? (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Icon name="close" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => item?.id ?? String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEmployees(true)}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching employees' : 'No employees yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try adjusting your search'
                : loadError
                ? 'Pull to refresh or tap Retry above'
                : 'Add your first employee by tapping the + button'}
            </Text>
          </View>
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  errorBannerText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 12,
    marginLeft: 8,
  },
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
  searchSpinner: { marginLeft: 8 },
  clearButton: { padding: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: PRIMARY_COLOR },
  cardInfo: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  employeeJob: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  statusBadge: {
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
    justifyContent: 'space-between',
  },
  detailText: { fontSize: 11, color: TEXT_SECONDARY, marginRight: 8 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  editButton: { padding: 6, marginRight: 10 },
  deleteButton: { padding: 6 },
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
  },
});