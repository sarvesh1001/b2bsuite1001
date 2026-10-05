// apps/prayantra-b2b/src/screens/hr/leave/admin/LeaveRequestAdminList.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  listLeaveRequests,
  getPendingLeaveRequests,
  getUserDisplayName,
  listLeaveTypes,
} from '@b2b/api-client';
import { LeaveRequest, LeaveRequestStatus } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestAdminList'>;

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  approved: '#10b981',
  rejected: '#ef4444',
  pending: '#f59e0b',
  cancelled: '#6b7280',
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface DisplayNameEntry {
  full_name?: string | null;
  username?: string;
}

export default function LeaveRequestAdminList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const [leaveTypeMap, setLeaveTypeMap] = useState<
    Record<string, { code: string; name: string }>
  >({});
  const [nameCache, setNameCache] = useState<Record<string, DisplayNameEntry>>({});

  const isUserMode = !!selectedUser?.user_id;

  // ---- Leave types (one-shot) --------------------------------------------
  useEffect(() => {
    if (!accessToken || !companyId || !deviceId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listLeaveTypes(companyId, deviceId, accessToken);
        if (cancelled) return;
        const map: Record<string, { code: string; name: string }> = {};
        for (const lt of data.leave_types) {
          map[lt.leave_type_id] = { code: lt.code, name: lt.name };
        }
        setLeaveTypeMap(map);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [accessToken, companyId, deviceId]);

  // ---- Fetch --------------------------------------------------------------
  //
  // Two modes:
  //   • No user picked → company-wide pending approvals (uses
  //     /leave/requests/pending which already filters status='pending'
  //     AND requires_approval=true server-side).
  //   • User picked    → that user's requests, with status pills.
  const fetchRequests = useCallback(
    async (showRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) return;

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (selectedUser?.user_id) {
          const params: any = {
            user_id: selectedUser.user_id,
            page: 1,
            page_size: 50,
          };
          if (statusFilter !== 'all') params.status = statusFilter;
          const data = await listLeaveRequests(companyId, deviceId, accessToken, params);
          setRequests(data.requests || []);
        } else {
          // Company-wide pending approvals
          const data = await getPendingLeaveRequests(companyId, deviceId, accessToken);
          setRequests(data.pending_requests || []);
        }
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load requests');
        setRequests([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, selectedUser?.user_id, statusFilter],
  );

  useFocusEffect(
    useCallback(() => { fetchRequests(); }, [fetchRequests]),
  );

  // ---- Resolve display names ---------------------------------------------
  //
  // Needed in both modes. In company-wide pending view every row is a
  // different user; in user mode it's just the picked user (cache hit).
  useEffect(() => {
    if (!accessToken || !companyId || !deviceId) return;

    const missing = Array.from(
      new Set(
        requests
          .map((r) => r.user_id)
          .filter((uid) => uid && !nameCache[uid]),
      ),
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (uid) => {
          try {
            const d = await getUserDisplayName(companyId, uid, deviceId, accessToken);
            return [uid, d ? { full_name: d.full_name, username: d.username } : {}] as const;
          } catch {
            return [uid, {}] as const;
          }
        }),
      );
      if (cancelled) return;
      setNameCache((prev) => {
        const next = { ...prev };
        for (const [uid, entry] of results) next[uid] = entry;
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [requests, accessToken, companyId, deviceId, nameCache]);

  const displayNameFor = useCallback(
    (userId: string): string => {
      const entry = nameCache[userId];
      if (!entry) return 'Loading…';
      if (entry.full_name?.trim()) return entry.full_name.trim();
      if (entry.username) return `@${entry.username}`;
      return userId;
    },
    [nameCache],
  );

  const handlePickUser = (u: PickedUser) => {
    // Seed the name cache so header chip renders instantly
    setNameCache((prev) => ({
      ...prev,
      [u.user_id]: { full_name: u.full_name ?? null, username: u.username },
    }));
    setSelectedUser(u);
    setStatusFilter('pending'); // reset filter for the per-user view
  };

  const clearUser = () => {
    setSelectedUser(null);
    setRequests([]);
    setStatusFilter('pending');
  };

  const getStatusColor = (s: LeaveRequestStatus) => STATUS_COLOR[s] ?? '#6b7280';

  const renderItem = ({ item }: { item: LeaveRequest }) => {
    const lt = leaveTypeMap[item.leave_type_id];
    const requester = displayNameFor(item.user_id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate({
            name: 'LeaveRequestDetail',
            params: { requestId: item.leave_request_id, mode: 'hr' },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(requester[0] || '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {requester}
              </Text>
              <Text style={styles.requestedAt}>
                Requested {new Date(item.requested_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.leaveTypeRow}>
          <Icon name="tag-outline" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.leaveTypeName} numberOfLines={1}>
            {lt ? lt.name : item.leave_type_id}
          </Text>
          {lt ? (
            <View style={styles.leaveTypeChip}>
              <Text style={styles.leaveTypeChipText}>{lt.code}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Icon name="calendar-range" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>
            {new Date(item.start_date).toLocaleDateString()} –{' '}
            {new Date(item.end_date).toLocaleDateString()}
          </Text>
          <Text style={styles.daysChip}>{item.total_days} day(s)</Text>
        </View>

        {/* Review CTA only when pending — other statuses aren't actionable */}
        {item.status === 'pending' ? (
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>Tap to review</Text>
            <Icon name="chevron-right" size={18} color={PRIMARY_COLOR} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all', label: 'All' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isUserMode ? 'User Requests' : 'Pending Approvals'}
        </Text>
        {!isUserMode && requests.length > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{requests.length}</Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Optional user filter — tap to scope to one user */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Icon
            name={selectedUser ? 'account-check' : 'account-search'}
            size={20}
            color={selectedUser ? PRIMARY_COLOR : TEXT_SECONDARY}
          />
          <Text
            style={[
              styles.pickerTriggerText,
              selectedUser && styles.pickerTriggerTextActive,
            ]}
            numberOfLines={1}
          >
            {selectedUser
              ? selectedUser.full_name || selectedUser.username || selectedUser.user_id
              : 'Filter by user (optional)…'}
          </Text>
          {selectedUser ? (
            <TouchableOpacity onPress={clearUser} style={styles.clearBtn}>
              <Icon name="close-circle" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
          )}
        </TouchableOpacity>
      </View>

      {/* Status pills — only in user mode */}
      {isUserMode ? (
        <View style={styles.pillsRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, statusFilter === f.key && styles.pillActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text
                style={[
                  styles.pillText,
                  statusFilter === f.key && styles.pillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <FlatList
        data={requests}
        keyExtractor={(item) => item.leave_request_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRequests(true)}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
          ) : isUserMode ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={60} color={TEXT_SECONDARY} />
              <Text style={styles.emptyTitle}>No {statusFilter} requests</Text>
              <Text style={styles.emptySubtitle}>Try a different filter</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="check-all" size={60} color="#10b981" />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySubtitle}>
                No pending requests need your approval.
              </Text>
            </View>
          )
        }
      />

      <UserSearchModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickUser}
        title="Filter by user"
      />
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
  backButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  pickerTriggerText: { flex: 1, fontSize: 14, color: TEXT_SECONDARY },
  pickerTriggerTextActive: { color: TEXT_PRIMARY, fontWeight: '600' },
  clearBtn: { padding: 2 },

  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  pillActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  pillText: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY },
  pillTextActive: { color: '#fff' },

  listContent: { padding: 16, flexGrow: 1 },

  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: PRIMARY_COLOR, fontWeight: '700', fontSize: 14 },
  userName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  requestedAt: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },

  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  leaveTypeName: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  leaveTypeChip: {
    backgroundColor: PRIMARY_COLOR + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaveTypeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: TEXT_SECONDARY, flex: 1 },
  daysChip: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 4,
  },
  ctaText: { fontSize: 12, fontWeight: '600', color: PRIMARY_COLOR },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});