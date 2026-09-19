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
  Platform, // ✅ ADD THIS

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  getLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
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

// ✅ Correct route name (must match the one added to RootStackParamList)
type RouteProps = RouteProp<RootStackParamList, 'LeaveRequestDetail'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestDetail'>;

export default function LeaveDetail() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { requestId } = route.params; // now correctly typed

  const { accessToken, deviceId, companyId, user } = useUserAuthStore();
  // ✅ Fallback: if user exists and has 'id', use it; otherwise fallback to empty string
  const userId = user && typeof user === 'object' && 'id' in user ? (user as any).id : '';

  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId || !requestId) return;
    try {
      const res = await getLeaveRequest(companyId, requestId, deviceId, accessToken);
      setRequest(res.data);
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
    }, [fetchRequest, requestId])
  );

  const handleApprove = async () => {
    if (!accessToken || !companyId || !deviceId || !request || !requestId || !userId) return;
    setActionLoading(true);
    try {
      await approveLeaveRequest(companyId, requestId, deviceId, accessToken, {
        approved_by: userId,
        reason: 'Approved',
      });
      Alert.alert('Success', 'Leave request approved');
      fetchRequest();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Simplified rejection: uses Alert.alert with a text input on iOS (via Alert.prompt)
  // On Android, Alert.prompt falls back to Alert.alert (no input) – we'll keep it simple.
  const handleReject = () => {
    // For cross-platform, we can use Alert.prompt (iOS only) or a custom modal.
    // We'll use Alert.prompt – it works on iOS and does nothing extra on Android.
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reject Reason',
        'Please provide a reason:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            onPress: (reason?: string) => {
              if (!accessToken || !companyId || !deviceId || !request || !requestId || !userId) return;
              setActionLoading(true);
              (async () => {
                try {
                  await rejectLeaveRequest(companyId, requestId, deviceId, accessToken, {
                    approved_by: userId,
                    reason: reason || 'No reason provided',
                  });
                  Alert.alert('Success', 'Leave request rejected');
                  fetchRequest();
                } catch (error: any) {
                  Alert.alert('Error', error?.message || 'Rejection failed');
                } finally {
                  setActionLoading(false);
                }
              })();
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Android fallback: just ask for confirmation and reject without a reason
      Alert.alert(
        'Reject Request',
        'Are you sure you want to reject this request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              if (!accessToken || !companyId || !deviceId || !request || !requestId || !userId) return;
              setActionLoading(true);
              try {
                await rejectLeaveRequest(companyId, requestId, deviceId, accessToken, {
                  approved_by: userId,
                  reason: 'Rejected by approver',
                });
                Alert.alert('Success', 'Leave request rejected');
                fetchRequest();
              } catch (error: any) {
                Alert.alert('Error', error?.message || 'Rejection failed');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId || !request || !requestId) return;
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
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading request...</Text>
      </SafeAreaView>
    );
  }

  if (!request || !requestId) {
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
  const isApprover = true; // In real app, check if user is approver

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
            <Text
              style={{
                fontWeight: 'bold',
                color:
                  request.status === 'approved'
                    ? '#10b981'
                    : request.status === 'rejected'
                    ? '#ef4444'
                    : '#f59e0b',
              }}
            >
              {request.status.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.detail}>User ID: {request.user_id}</Text>
          <Text style={styles.detail}>Leave Type: {request.leave_type_id}</Text>
          <Text style={styles.detail}>
            Start Date: {new Date(request.start_date).toLocaleDateString()}
          </Text>
          <Text style={styles.detail}>
            End Date: {new Date(request.end_date).toLocaleDateString()}
          </Text>
          <Text style={styles.detail}>Total Days: {request.total_days}</Text>
          {request.approved_by && (
            <Text style={styles.detail}>Approved by: {request.approved_by}</Text>
          )}
          {request.rejection_reason && (
            <Text style={styles.detail}>Reason: {request.rejection_reason}</Text>
          )}
          <Text style={styles.detail}>
            Created: {new Date(request.created_at).toLocaleString()}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionContainer}>
            {isApprover && (
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
            )}
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
          </View>
        )}
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  content: { padding: 16 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  detail: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 },
  actionContainer: { marginTop: 20 },
  actionButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  approveButton: { backgroundColor: '#10b981' },
  rejectButton: { backgroundColor: '#ef4444' },
  cancelButton: { backgroundColor: '#6b7280' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, textAlign: 'center' },
});