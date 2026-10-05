// apps/prayantra-b2b/src/screens/hr/leave/admin/LeaveLedgerScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listCompanyLeaveLedger } from '@b2b/api-client';
import UserSearchModal, { PickedUser } from '../../../../components/UserSearchModal';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveLedger'>;

interface LedgerEntry {
  ledger_id: string;
  entitlement_id: string;
  user_id: string;
  user_full_name?: string;
  user_username?: string;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  entry_type: string;
  days: number;
  entry_date: string;
  leave_request_id?: string | null;
  created_at: string;
}

const PAGE_SIZE = 100;

const ENTRY_TYPES = [
  { key: 'grant',       label: 'Grant',       color: '#10b981', icon: 'plus-circle-outline',  sign: +1 },
  { key: 'accrual',     label: 'Accrual',     color: '#3b82f6', icon: 'clock-outline',         sign: +1 },
  { key: 'adjustment',  label: 'Adjustment',  color: '#8b5cf6', icon: 'tune-variant',          sign: +1 },
  { key: 'reversal',    label: 'Reversal',    color: '#f59e0b', icon: 'backup-restore',        sign: +1 },
  { key: 'consumption', label: 'Consumption', color: '#ef4444', icon: 'minus-circle-outline',  sign: -1 },
  { key: 'lapse',       label: 'Lapse',       color: '#6b7280', icon: 'calendar-remove',       sign: -1 },
] as const;

const COLOR: Record<string, string> = Object.fromEntries(
  ENTRY_TYPES.map((t) => [t.key, t.color]),
);
const ICON: Record<string, string> = Object.fromEntries(
  ENTRY_TYPES.map((t) => [t.key, t.icon]),
);
const SIGN: Record<string, number> = Object.fromEntries(
  ENTRY_TYPES.map((t) => [t.key, t.sign]),
);

const fmtDays = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(2)));
};

const toDateOnly = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const log = (...a: any[]) => console.log('[LeaveLedger]', ...a);
const logErr = (...a: any[]) => console.error('[LeaveLedger]', ...a);

export default function LeaveLedgerScreen() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);       // full-screen first load
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
  const [loadingMore, setLoadingMore] = useState(false); // infinite-scroll append
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // guards duplicate concurrent fetches from onEndReached
  const fetchingRef = useRef(false);

  const hasFilters = useMemo(
    () =>
      !!selectedUser ||
      selectedTypes.length > 0 ||
      !!fromDate ||
      !!toDate,
    [selectedUser, selectedTypes, fromDate, toDate],
  );

  // ── Fetch ────────────────────────────────────────────────────────────
  //
  // targetPage 1 = fresh load; > 1 = append for infinite scroll.
  const fetchLedger = useCallback(
    async (mode: 'initial' | 'refresh' | 'more' = 'initial', targetPage = 1) => {
      if (!accessToken || !companyId || !deviceId) {
        log('fetch skipped — missing auth/company/device', {
          hasToken: !!accessToken,
          companyId,
          deviceId,
        });
        return;
      }
      if (fetchingRef.current) {
        log('fetch skipped — already in flight');
        return;
      }
      fetchingRef.current = true;

      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'more') setLoadingMore(true);
      else setLoading(true);
      setError(null);

      // ⚠️ entry_type must be a COMMA-JOINED STRING.
      //    If we pass an array, axios serializes it as
      //      ?entry_type[]=grant&entry_type[]=consumption
      //    and the backend key it reads is `entry_type`, not `entry_type[]`
      //    — so the filter silently no-ops.
      const params: Record<string, any> = {
        page: targetPage,
        page_size: PAGE_SIZE,
      };
      if (selectedUser?.user_id) params.user_id = selectedUser.user_id;
      if (selectedTypes.length > 0) params.entry_type = selectedTypes.join(',');
      if (fromDate) params.from_date = toDateOnly(fromDate);
      if (toDate) params.to_date = toDateOnly(toDate);

      log('─── fetch start ───');
      log('mode     :', mode);
      log('page     :', targetPage);
      log('selectedTypes state :', selectedTypes);
      log('params sent to server :', params);

      try {
        const data = await listCompanyLeaveLedger(
          companyId,
          deviceId,
          accessToken,
          params,
        );

        log('fetch success — received', data.entries.length, 'rows');
        log('fetch success — pagination', data.pagination);
        log(
          'fetch success — entry_type breakdown',
          data.entries.reduce<Record<string, number>>((acc, e) => {
            acc[e.entry_type] = (acc[e.entry_type] || 0) + 1;
            return acc;
          }, {}),
        );

        if (targetPage === 1) {
          setEntries(data.entries);
        } else {
          setEntries((prev) => [...prev, ...data.entries]);
        }

        setTotal(data.pagination.total);
        setPage(targetPage);
        setHasMore(targetPage * PAGE_SIZE < data.pagination.total);

        log(
          'ui state after fetch — entries:',
          targetPage === 1 ? data.entries.length : entries.length + data.entries.length,
          'total:',
          data.pagination.total,
          'hasMore:',
          targetPage * PAGE_SIZE < data.pagination.total,
        );
      } catch (err: any) {
        logErr('─── fetch FAILED ───');
        logErr('message :', err?.message);
        logErr('status  :', err?.response?.status);
        logErr('data    :', err?.response?.data);
        setError(err?.message || 'Failed to load ledger');
        if (targetPage === 1) {
          setEntries([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        log('─── fetch end ───');
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      selectedUser?.user_id,
      selectedTypes,
      fromDate,
      toDate,
      entries.length,
    ],
  );

  // On focus and whenever filters change → reload from page 1
  useFocusEffect(
    useCallback(() => {
      log('useFocusEffect fired — reloading from page 1');
      fetchLedger('initial', 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser?.user_id, selectedTypes, fromDate, toDate, accessToken, companyId, deviceId]),
  );

  // ── Handlers ─────────────────────────────────────────────────────────
  const toggleType = (key: string) => {
    setSelectedTypes((cur) => {
      const next = cur.includes(key)
        ? cur.filter((k) => k !== key)
        : [...cur, key];
      log('toggleType — pill tapped :', key, '| new selection :', next);
      return next;
    });
  };

  const clearAllFilters = () => {
    log('clearAllFilters — resetting user, types, date range');
    setSelectedUser(null);
    setSelectedTypes([]);
    setFromDate(null);
    setToDate(null);
  };

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    const nextPage = page + 1;
    log('loadMore — page', page, '→', nextPage);
    fetchLedger('more', nextPage);
  };

  // ── Row render ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: LedgerEntry }) => {
    const sign = SIGN[item.entry_type] ?? 1;
    const signedDays = sign * Math.abs(item.days);
    const color = COLOR[item.entry_type] ?? '#6b7280';
    const icon = ICON[item.entry_type] ?? 'circle-small';
    const requester = item.user_full_name || item.user_username || item.user_id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={18} color={color} />
          </View>

          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color }]}>
              {item.entry_type.toUpperCase()}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.entry_date).toLocaleDateString()}
            </Text>
          </View>

          <Text
            style={[
              styles.daysText,
              { color: signedDays >= 0 ? '#10b981' : '#ef4444' },
            ]}
          >
            {signedDays >= 0 ? '+' : ''}
            {fmtDays(signedDays)}
          </Text>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Icon name="account-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.metaText} numberOfLines={1}>
              {requester}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="tag-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.leave_type_name} ({item.leave_type_code})
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── List header (filters) ────────────────────────────────────────────
  const FiltersHeader = () => (
    <View style={styles.filtersWrap}>
      {/* User picker */}
      <TouchableOpacity
        style={styles.pickerTrigger}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <Icon
          name={selectedUser ? 'account-check' : 'account-search'}
          size={18}
          color={selectedUser ? PRIMARY_COLOR : TEXT_SECONDARY}
        />
        <Text
          style={[
            styles.pickerText,
            selectedUser && styles.pickerTextActive,
          ]}
          numberOfLines={1}
        >
          {selectedUser
            ? selectedUser.full_name || selectedUser.username || selectedUser.user_id
            : 'Filter by user (optional)…'}
        </Text>
        {selectedUser ? (
          <TouchableOpacity
            onPress={() => {
              log('user filter cleared');
              setSelectedUser(null);
            }}
            style={styles.clearInline}
          >
            <Icon name="close-circle" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        ) : (
          <Icon name="chevron-right" size={16} color={TEXT_SECONDARY} />
        )}
      </TouchableOpacity>

      {/* Entry type pills */}
      <View style={styles.pillsRow}>
        {ENTRY_TYPES.map((t) => {
          const active = selectedTypes.includes(t.key);
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.pill,
                active && {
                  backgroundColor: t.color + '20',
                  borderColor: t.color,
                },
              ]}
              onPress={() => toggleType(t.key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.pillDot,
                  { backgroundColor: t.color, opacity: active ? 1 : 0.4 },
                ]}
              />
              <Text
                style={[
                  styles.pillText,
                  active && { color: t.color, fontWeight: '700' },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date range */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowFromPicker(true)}
          activeOpacity={0.7}
        >
          <Icon name="calendar-start" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.dateBtnText} numberOfLines={1}>
            {fromDate ? toDateOnly(fromDate) : 'From'}
          </Text>
        </TouchableOpacity>

        <Icon name="arrow-right" size={14} color={TEXT_SECONDARY} />

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowToPicker(true)}
          activeOpacity={0.7}
        >
          <Icon name="calendar-end" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.dateBtnText} numberOfLines={1}>
            {toDate ? toDateOnly(toDate) : 'To'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clear filters row */}
      {hasFilters ? (
        <TouchableOpacity
          style={styles.clearRow}
          onPress={clearAllFilters}
          activeOpacity={0.7}
        >
          <Icon name="filter-remove-outline" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.clearRowText}>Clear all filters</Text>
        </TouchableOpacity>
      ) : null}

      {/* "showing X of Y" hint */}
      {!loading && entries.length > 0 ? (
        <Text style={styles.showingText}>
          Showing {entries.length} of {total}
          {hasMore ? ' — scroll for more' : ''}
        </Text>
      ) : null}
    </View>
  );

  // ── Footer (load-more spinner) ───────────────────────────────────────
  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerSpinner}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.footerSpinnerText}>Loading more…</Text>
        </View>
      );
    }
    if (!hasMore && entries.length > 0 && total > entries.length) {
      return (
        <Text style={styles.footerEndText}>
          End of results
        </Text>
      );
    }
    return null;
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Ledger</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {entries.length < total
              ? `${entries.length}/${total}`
              : `${total}`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading ledger…</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.ledger_id}
          renderItem={renderItem}
          ListHeaderComponent={<FiltersHeader />}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                log('pull-to-refresh');
                fetchLedger('refresh', 1);
              }}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIconWrap}>
                <Icon
                  name={error ? 'alert-circle-outline' : 'book-open-page-variant-outline'}
                  size={44}
                  color={error ? '#ef4444' : PRIMARY_COLOR}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {error ? 'Something went wrong' : 'No ledger entries'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {error
                  ? error
                  : hasFilters
                    ? 'Try adjusting your filters.'
                    : 'Ledger entries will appear here as balances move.'}
              </Text>
            </View>
          }
        />
      )}

      <UserSearchModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(u) => {
          log('user picked :', u.user_id, u.full_name || u.username);
          setSelectedUser(u);
        }}
        title="Filter by user"
      />

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={fromDate ?? new Date()}
        maximumDate={toDate ?? undefined}
        onConfirm={(d) => {
          setShowFromPicker(false);
          log('from_date picked :', toDateOnly(d));
          setFromDate(d);
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={toDate ?? new Date()}
        minimumDate={fromDate ?? undefined}
        onConfirm={(d) => {
          setShowToPicker(false);
          log('to_date picked :', toDateOnly(d));
          setToDate(d);
        }}
        onCancel={() => setShowToPicker(false)}
      />
    </SafeAreaView>
  );
}

// ========================================================================
// STYLES
// ========================================================================
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
  backButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  countBadge: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PRIMARY_COLOR + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  list: { padding: 16, paddingTop: 0, flexGrow: 1 },

  filtersWrap: { paddingTop: 12, paddingBottom: 12, gap: 10 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  pickerText: { flex: 1, fontSize: 13, color: TEXT_SECONDARY },
  pickerTextActive: { color: TEXT_PRIMARY, fontWeight: '600' },
  clearInline: { padding: 2 },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 6,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  dateBtnText: { fontSize: 13, color: TEXT_PRIMARY },

  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
  },
  clearRowText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },

  showingText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 2,
  },

  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  typeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  daysText: { fontSize: 17, fontWeight: '800' },

  metaBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF0F4',
    gap: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: TEXT_SECONDARY, flexShrink: 1 },

  footerSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerSpinnerText: { fontSize: 12, color: TEXT_SECONDARY },
  footerEndText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
});