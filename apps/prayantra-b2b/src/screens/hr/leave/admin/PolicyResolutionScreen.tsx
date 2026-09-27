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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  searchEmployeesTypeahead,
  resolveBatchUsers,
  resolveSingleUser,
} from '@b2b/api-client';
import type {
  DecryptedEmployeeDetails,
  EmployeeTypeaheadDetailsResponse,
  LeavePolicyResolutionResult,
} from '@b2b/shared-types';
import { UserAvatar } from '../../../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'PolicyResolution'>;

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 300;

const REASON_OPTIONS = [
  { value: 'initial_seed',      label: 'Initial seed' },
  { value: 'policy change',     label: 'Policy change' },
  { value: 'position_change',   label: 'Position change' },
  { value: 'workcenter_change', label: 'Work-center change' },
  { value: 'onboarding',        label: 'Onboarding' },
  { value: 'exit',              label: 'Exit' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------
// Same normalize pattern as HREmployeeList so both screens accept
// snake_case or PascalCase from the backend.
// ----------------------------------------------------------------
const pick = <T,>(row: any, s: string, p: string): T | undefined =>
  row?.[s] ?? row?.[p];

const extractDetails = (
  res: EmployeeTypeaheadDetailsResponse | any,
): DecryptedEmployeeDetails[] => {
  if (!res) return [];
  const data = res.data ?? res?.data?.data ?? [];
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (x: any) => !!x && typeof x === 'object' && ('user_id' in x || 'UserID' in x),
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
      location_access_scope:
        pick(row, 'location_access_scope', 'LocationAccessScope') ?? 'ALL',
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
};

// ================================================================
// SCREEN
// ================================================================
export default function PolicyResolutionScreen() {
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

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Resolve config
  const [asOf, setAsOf] = useState<string>(todayISO());
  const [reason, setReason] = useState<string>('initial_seed');

  // UI state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvingSingleId, setResolvingSingleId] = useState<string | null>(null);
  const [result, setResult] = useState<LeavePolicyResolutionResult | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  // ---------------------------------------------------------------
  // Fetch employees (identical pattern to HREmployeeList)
  // ---------------------------------------------------------------
  const fetchEmployees = useCallback(
    async (opts: { reset: boolean; query?: string } = { reset: true }) => {
      const { reset, query } = opts;
      if (!accessToken || !companyId || !deviceId) return;

      const targetPage = reset ? 1 : page + 1;
      const effectiveQuery = query ?? activeQuery;

      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await searchEmployeesTypeahead(
          companyId,
          deviceId,
          accessToken,
          { q: effectiveQuery, page: targetPage, page_size: PAGE_SIZE },
          false,
        );
        const rows = extractDetails(res);

        if (reset) {
          setEmployees(rows);
          setPage(1);
        } else {
          setEmployees((prev) => [...prev, ...rows]);
          setPage(targetPage);
        }
        setHasMore(rows.length === PAGE_SIZE);
      } catch (error: any) {
        if (reset) setEmployees([]);
        Alert.alert('Error', error?.message || 'Failed to load employees');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [accessToken, companyId, deviceId, activeQuery, page],
  );

  useFocusEffect(
    useCallback(() => {
      fetchEmployees({ reset: true, query: activeQuery });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuery]),
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const q = searchTerm.trim();
      if (q === activeQuery) return;
      setActiveQuery(q);
    }, DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, activeQuery]);

  // ---------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------
  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(employees.map((e) => e.user_id)));
  const clearAll = () => setSelected(new Set());

  // ---------------------------------------------------------------
  // Resolve — batch
  // ---------------------------------------------------------------
  const openConfirm = () => {
    if (selected.size === 0) {
      Alert.alert('No users selected', 'Select at least one employee.');
      return;
    }
    setConfirmVisible(true);
  };

  const runBatchResolve = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }

    setResolving(true);
    try {
      const res = await resolveBatchUsers(companyId, deviceId, accessToken, {
        user_ids: Array.from(selected),
        as_of: asOf,
        reason,
      });
      setResult(res);
      setConfirmVisible(false);
      setResultVisible(true);
      setSelected(new Set());
    } catch (e: any) {
      Alert.alert('Resolve failed', e?.message || 'Unexpected error');
    } finally {
      setResolving(false);
    }
  };

  // ---------------------------------------------------------------
  // Resolve — single
  // ---------------------------------------------------------------
  const runSingleResolve = async (userId: string) => {
    if (!accessToken || !companyId || !deviceId) return;
    setResolvingSingleId(userId);
    try {
      await resolveSingleUser(companyId, userId, deviceId, accessToken, {
        as_of: asOf,
        reason,
      });
      Alert.alert('Resolved', `Resolution triggered for user.`, [
        {
          text: 'View policies',
          onPress: () =>
            navigation.navigate('UserEffectivePolicies', {
              userId,
              asOf,
            }),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (e: any) {
      Alert.alert('Resolve failed', e?.message || 'Unexpected error');
    } finally {
      setResolvingSingleId(null);
    }
  };

  // ---------------------------------------------------------------
  // Row render
  // ---------------------------------------------------------------
  const renderItem = ({ item }: { item: DecryptedEmployeeDetails }) => {
    const isSelected = selected.has(item.user_id);
    const isBusy = resolvingSingleId === item.user_id;
    const displayName = item.full_name || item.username || 'Unnamed';

    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        activeOpacity={0.85}
        onPress={() => toggle(item.user_id)}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Icon name="check" size={14} color="#fff" />}
        </View>

        <UserAvatar
          userId={item.user_id}
          username={item.username}
          fullName={item.full_name ?? undefined}
          size={40}
          style={styles.avatar}
        />

        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            @{item.username} · {item.position_title || item.job_title || 'no title'}
          </Text>
          {item.primary_location_name ? (
            <Text style={styles.rowMetaSmall} numberOfLines={1}>
              <Icon name="map-marker-outline" size={10} color={TEXT_SECONDARY} />{' '}
              {item.primary_location_name}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.singleBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              runSingleResolve(item.user_id);
            }}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Icon name="refresh" size={16} color={PRIMARY_COLOR} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.singleBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              navigation.navigate('UserEffectivePolicies', {
                userId: item.user_id,
                username: displayName,
                asOf,
              });
            }}
          >
            <Icon name="eye-outline" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Resolve Policies</Text>
          <Text style={styles.headerSubtitle}>
            {selected.size} selected · {employees.length} shown
          </Text>
        </View>
      </View>

      {/* Config row — date + reason */}
      <View style={styles.configBar}>
        <View style={styles.dateBox}>
          <Icon name="calendar-outline" size={14} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.dateInput}
            value={asOf}
            onChangeText={setAsOf}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Reason chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reasonRow}
      >
        {REASON_OPTIONS.map((opt) => {
          const active = reason === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setReason(opt.value)}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon
          name="magnify"
          size={20}
          color={TEXT_SECONDARY}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor={TEXT_SECONDARY}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              Keyboard.dismiss();
            }}
            style={styles.clearButton}
          >
            <Icon name="close" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Select-all row */}
      <View style={styles.selectAllRow}>
        <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
          <Icon name="checkbox-multiple-marked-outline" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.selectAllText}>Select all</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAll} style={styles.selectAllBtn}>
          <Icon name="close-box-outline" size={16} color={TEXT_SECONDARY} />
          <Text style={[styles.selectAllText, { color: TEXT_SECONDARY }]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading employees…</Text>
        </View>
      ) : (
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
              <Icon name="account-off" size={50} color={TEXT_SECONDARY} />
              <Text style={styles.emptyTitle}>No employees</Text>
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
      )}

      {/* Sticky footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.resolveBtn,
            (selected.size === 0 || resolving) && styles.resolveBtnDisabled,
          ]}
          onPress={openConfirm}
          disabled={selected.size === 0 || resolving}
        >
          <Icon name="refresh-auto" size={18} color="#fff" />
          <Text style={styles.resolveBtnText}>
            {selected.size === 0
              ? 'Select employees to resolve'
              : `Resolve ${selected.size} selected`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============ Confirm modal ============ */}
      <Modal
        visible={confirmVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !resolving && setConfirmVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Resolution</Text>
              <TouchableOpacity
                onPress={() => !resolving && setConfirmVisible(false)}
              >
                <Icon name="close" size={22} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Employees</Text>
                <Text style={styles.summaryValue}>{selected.size}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>As-of</Text>
                <Text style={styles.summaryValue}>{asOf}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Reason</Text>
                <Text style={styles.summaryValue}>{reason}</Text>
              </View>

              <View style={styles.warnBox}>
                <Icon name="information-outline" size={14} color="#B45309" />
                <Text style={styles.warnText}>
                  Existing policy-sourced entitlements for these employees may
                  be closed and replaced with new ones. The idempotency key is
                  <Text style={{ fontWeight: '700' }}> per-user, per-day</Text> —
                  re-running with the same as-of on the same day is a no-op.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmVisible(false)}
                disabled={resolving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, resolving && { opacity: 0.6 }]}
                onPress={runBatchResolve}
                disabled={resolving}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Resolve now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============ Result modal ============ */}
      <Modal
        visible={resultVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResultVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resolution Result</Text>
              <TouchableOpacity onPress={() => setResultVisible(false)}>
                <Icon name="close" size={22} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {result && (
                <>
                  <View style={styles.bigStatRow}>
                    <View style={styles.bigStat}>
                      <Text style={[styles.bigStatNum, { color: TEXT_PRIMARY }]}>
                        {result.TotalUsers}
                      </Text>
                      <Text style={styles.bigStatLabel}>Total</Text>
                    </View>
                    <View style={styles.bigStat}>
                      <Text style={[styles.bigStatNum, { color: SUCCESS_COLOR }]}>
                        {result.ProcessedUsers}
                      </Text>
                      <Text style={styles.bigStatLabel}>Processed</Text>
                    </View>
                    <View style={styles.bigStat}>
                      <Text style={[styles.bigStatNum, { color: ERROR_COLOR }]}>
                        {result.FailedUsers?.length ?? 0}
                      </Text>
                      <Text style={styles.bigStatLabel}>Failed</Text>
                    </View>
                  </View>

                  {result.Errors?.length ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorBoxTitle}>Errors</Text>
                      {result.Errors.map((msg, i) => (
                        <Text key={i} style={styles.errorBoxLine}>
                          • {msg}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setResultVisible(false)}
              >
                <Text style={styles.saveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },

  configBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: CARD_BACKGROUND,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#fff',
  },
  dateInput: { flex: 1, marginLeft: 8, fontSize: 14, color: TEXT_PRIMARY },

  reasonRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  chipActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: PRIMARY_COLOR + '20',
  },
  chipText: { fontSize: 12, color: TEXT_PRIMARY },
  chipTextActive: { color: PRIMARY_COLOR, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_PRIMARY, paddingVertical: 0 },
  clearButton: { padding: 4 },

  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 12, fontWeight: '700', color: PRIMARY_COLOR },

  listContent: { paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: PRIMARY_COLOR + '08',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  avatar: { marginRight: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  rowMeta: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  rowMetaSmall: { fontSize: 10, color: TEXT_SECONDARY, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 4 },
  singleBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR + '12',
  },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: TEXT_SECONDARY, fontSize: 13 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
  },
  resolveBtnDisabled: { opacity: 0.5 },
  resolveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: BACKGROUND_COLOR,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  modalBody: { padding: 20 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 13, color: TEXT_SECONDARY },
  summaryValue: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },

  warnBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  warnText: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },

  bigStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  bigStat: { alignItems: 'center' },
  bigStatNum: { fontSize: 22, fontWeight: '800' },
  bigStatLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  errorBoxTitle: { fontSize: 12, fontWeight: '700', color: ERROR_COLOR, marginBottom: 6 },
  errorBoxLine: { fontSize: 11, color: ERROR_COLOR, marginTop: 2 },
});