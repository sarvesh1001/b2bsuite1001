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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listLeaveRequests } from '@b2b/api-client';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestList'>;

export default function LeaveRequestList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await listLeaveRequests(companyId, deviceId, accessToken, params);
      setRequests(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, statusFilter]);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }: { item: LeaveRequest }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate({
          name: 'LeaveRequestForm',
          params: { requestId: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.userId}>User: {item.user_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.detail}>Leave Type: {item.leave_type_id}</Text>
      <Text style={styles.detail}>Dates: {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</Text>
      <Text style={styles.detail}>Total Days: {item.total_days}</Text>
    </TouchableOpacity>
  );

  if (loading) return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>Loading requests...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Requests</Text>
        <TouchableOpacity
          style={styles.addButton}
          // ✅ Pass empty params object to satisfy TypeScript
          onPress={() => navigation.navigate('LeaveRequestForm', {})}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Icon name="filter" size={20} color={TEXT_SECONDARY} style={styles.filterIcon} />
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by status (pending, approved, rejected)"
          value={statusFilter}
          onChangeText={setStatusFilter}
          onSubmitEditing={() => fetchRequests()}
        />
        <TouchableOpacity onPress={() => { setStatusFilter(''); fetchRequests(); }} style={styles.clearButton}>
          <Icon name="close" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Leave Requests</Text>
            <Text style={styles.emptySubtitle}>Create a leave request to get started</Text>
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
  filterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BACKGROUND, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER_COLOR, height: 44 },
  filterIcon: { marginRight: 8 },
  filterInput: { flex: 1, height: '100%', fontSize: 14, color: TEXT_PRIMARY },
  clearButton: { padding: 4 },
  listContent: { padding: 16 },
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userId: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detail: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
});