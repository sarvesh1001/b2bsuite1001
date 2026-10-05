// apps/prayantra-b2b/src/screens/hr/leave/user/LeaveDetail.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  getLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getUserDisplayName,
  listLeaveTypes,
} from '@b2b/api-client';
import { LeaveRequest } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'LeaveRequestDetail'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestDetail'>;

export default function LeaveDetail() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { requestId, mode = 'self' } = route.params;

  const { accessToken, deviceId, companyId, user } = useUserAuthStore();
  // ⚠️ store exposes user_id, not id
  const currentUserId =
    user && typeof user === 'object' && 'user_id' in user
      ? String((user as any).user_id)
      : '';

  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // resolve user name + leave type name for display
  const [requesterName, setRequesterName] = useState<string | null>(null);
  const [leaveTypeName, setLeaveTypeName] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId || !requestId) return;
    try {
      const data = await getLeaveRequest(companyId, requestId, deviceId, accessToken);
      setRequest(data);

      // best-effort resolve names — failures are non-fatal
      if (data.user_id) {
        try {
          const d = await getUserDisplayName(companyId, data.user_id, deviceId, accessToken);
          setRequesterName(d?.full_name || d?.username || null);
        } catch { /* silent */ }
      }
      if (data.leave_type_id) {
        try {
          const lt = await listLeaveTypes(companyId, deviceId, accessToken);
          const hit = lt.leave_types.find((t) => t.leave_type_id === data.leave_type_id);
          if (hit) setLeaveTypeName(`${hit.name} (${hit.code})`);
        } catch { /* silent */ }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load request');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, requestId, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (requestId) fetchRequest();
      else setLoading(false);
    }, [fetchRequest, requestId]),
  );

  const handleApprove = async () => {
    if (!accessToken || !companyId || !deviceId || !requestId) return;
    setActionLoading(true);
    try {
      await approveLeaveRequest(companyId, requestId, deviceId, accessToken, {});
      Alert.alert('Success', 'Leave request approved');
      fetchRequest();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const doReject = async (reason: string) => {
    if (!accessToken || !companyId || !deviceId || !requestId) return;
    setActionLoading(true);
    try {
      await rejectLeaveRequest(companyId, requestId, deviceId, accessToken, { reason });
      Alert.alert('Success', 'Leave request rejected');
      fetchRequest();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject Reason',
        'Please provide a reason:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: (reason?: string) => doReject(reason || 'No reason provided'),
          },
        ],
        'plain-text',
      );
    } else {
      Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => doReject('Rejected by approver') },
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this leave request?', [
      { text: 'Keep Request', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken || !companyId || !deviceId || !requestId) return;
          setActionLoading(true);
          try {
            await cancelLeaveRequest(companyId, requestId, deviceId, accessToken);
            Alert.alert('Success', 'Leave request cancelled');
            fetchRequest();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Cancellation failed');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading request...</Text>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="calendar-blank" size={60} color={TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>No Request</Text>
          <Text style={styles.emptySubtitle}>The leave request could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isCancelled = request.status === 'cancelled';

  // Self-service: cancel allowed only for pending OR approved-but-not-yet-started
  // (server enforces the "not yet started" rule — see CancelLeaveRequest)
  const canSelfCancel = mode === 'self' && (isPending || isApproved);

  // HR: approve/reject only pending, cancel pending/approved
  const canHrApproveReject = mode === 'hr' && isPending;
  const canHrCancel = mode === 'hr' && (isPending || isApproved);

  const statusColor = isApproved
    ? '#10b981'
    : isRejected
    ? '#ef4444'
    : isCancelled
    ? '#6b7280'
    : '#f59e0b';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Request Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>
            Status:{' '}
            <Text style={{ fontWeight: 'bold', color: statusColor }}>
              {request.status.toUpperCase()}
            </Text>
          </Text>

          <View style={styles.row}>
            <Icon name="account-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.detail}>
              {requesterName || request.user_id}
            </Text>
          </View>

          <View style={styles.row}>
            <Icon name="tag-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.detail}>
              {leaveTypeName || request.leave_type_id}
            </Text>
          </View>

          <Text style={styles.detail}>
            Start: {new Date(request.start_date).toLocaleDateString()}
          </Text>
          <Text style={styles.detail}>
            End: {new Date(request.end_date).toLocaleDateString()}
          </Text>
          <Text style={styles.detail}>Total Days: {request.total_days}</Text>

          {request.approved_by ? (
            <Text style={styles.detail}>Actioned by: {request.approved_by}</Text>
          ) : null}
          <Text style={styles.detail}>
            Requested: {new Date(request.requested_at).toLocaleString()}
          </Text>
          {request.approved_at ? (
            <Text style={styles.detail}>
              Actioned At: {new Date(request.approved_at).toLocaleString()}
            </Text>
          ) : null}
        </View>

        {(canHrApproveReject || canHrCancel || canSelfCancel) ? (
          <View style={styles.actionContainer}>
            {canHrApproveReject ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionText}>Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {canHrCancel || canSelfCancel ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionText}>Cancel Request</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.closedNote}>
            <Icon name="information-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.closedNoteText}>
              This request is {request.status} — no actions available.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  content: { padding: 16 },
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER_COLOR },
  label: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detail: { fontSize: 14, color: TEXT_SECONDARY },
  actionContainer: { marginTop: 20 },
  actionButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  approveButton: { backgroundColor: '#10b981' },
  rejectButton: { backgroundColor: '#ef4444' },
  cancelButton: { backgroundColor: '#6b7280' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  closedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingHorizontal: 4 },
  closedNoteText: { fontSize: 12, color: TEXT_SECONDARY },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, textAlign: 'center' },
});