// apps/prayantra-b2b/src/screens/hr/leave/user/LeaveRequestList.tsx
import React, { useState, useCallback } from 'react';
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
import { listLeaveRequests, listLeaveTypes } from '@b2b/api-client';
import { LeaveRequest, LeaveRequestStatus } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestList'>;

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  approved: '#10b981',
  rejected: '#ef4444',
  pending: '#f59e0b',
  cancelled: '#6b7280',
};

export default function LeaveRequestList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId, user } = useUserAuthStore();

  const currentUserId =
    user && typeof user === 'object' && 'user_id' in user
      ? String((user as any).user_id)
      : '';

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveTypeMap, setLeaveTypeMap] = useState<
    Record<string, { code: string; name: string }>
  >({});

  // ---- One-shot leave type fetch -----------------------------------------
  React.useEffect(() => {
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

  // ---- Fetch only MY requests --------------------------------------------
  //
  // ⚠️ FIX: pass user_id so the server filters to the caller. Also apply a
  // client-side belt-and-suspenders filter in case the server returns more.
  const fetchRequests = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) return;
    if (!currentUserId) { setRequests([]); setLoading(false); return; }

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await listLeaveRequests(companyId, deviceId, accessToken, {
        user_id: currentUserId,
        page: 1,
        page_size: 50,
      } as any);

      const mine = (data.requests || []).filter(
        (r) => r.user_id === currentUserId,
      );
      setRequests(mine);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, currentUserId]);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const getStatusColor = (status: LeaveRequestStatus) =>
    STATUS_COLOR[status] ?? '#6b7280';

  const renderItem = ({ item }: { item: LeaveRequest }) => {
    const lt = leaveTypeMap[item.leave_type_id];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate({
            name: 'LeaveRequestDetail',
            params: { requestId: item.leave_request_id, mode: 'self' },
          })
        }
      >
        <View style={styles.cardHeader}>
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

        <Text style={styles.detail}>
          Dates: {new Date(item.start_date).toLocaleDateString()} –{' '}
          {new Date(item.end_date).toLocaleDateString()}
        </Text>
        <Text style={styles.detail}>Total Days: {item.total_days}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Leave Requests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('LeaveRequestForm', {})}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.leave_request_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Leave Requests</Text>
            <Text style={styles.emptySubtitle}>
              Submit a leave request to get started
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  addButton: { backgroundColor: PRIMARY_COLOR, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  leaveTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  leaveTypeName: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, flexShrink: 1 },
  leaveTypeChip: { backgroundColor: PRIMARY_COLOR + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  leaveTypeChipText: { fontSize: 10, fontWeight: '700', color: PRIMARY_COLOR, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detail: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
});