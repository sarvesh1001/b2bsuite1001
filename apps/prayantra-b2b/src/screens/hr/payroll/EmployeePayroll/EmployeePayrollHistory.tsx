import React, { useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getEmployeePayrollHistory } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EmployeePayrollHistory'>;
type RouteProps = RouteProp<RootStackParamList, 'EmployeePayrollHistory'>;

export default function EmployeePayrollHistory() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fetchHistory = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from = fromDate.toISOString().split('T')[0];
      if (toDate) params.to = toDate.toISOString().split('T')[0];
      const res = await getEmployeePayrollHistory(companyId, userId, deviceId, accessToken, params);
      setHistory(res.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fromDate, toDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => date.toLocaleDateString();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.period}>
          {item.period_start ? new Date(item.period_start).toLocaleDateString() : 'N/A'}
          {item.period_end && ` - ${new Date(item.period_end).toLocaleDateString()}`}
        </Text>
        <Text style={styles.status}>{item.status || 'Completed'}</Text>
      </View>
      {item.total_net && <Text style={styles.amount}>Net: ₹{item.total_net.toLocaleString()}</Text>}
      {item.run_id && <Text style={styles.runId}>Run ID: {item.run_id}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payroll History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFromPicker(true)}>
          <Text style={styles.filterLabel}>From:</Text>
          <Text style={styles.filterValue}>{fromDate ? formatDate(fromDate) : 'Any'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowToPicker(true)}>
          <Text style={styles.filterLabel}>To:</Text>
          <Text style={styles.filterValue}>{toDate ? formatDate(toDate) : 'Any'}</Text>
        </TouchableOpacity>
        {(fromDate || toDate) && (
          <TouchableOpacity onPress={() => { setFromDate(null); setToDate(null); }} style={styles.clearFilter}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No history</Text></View>}
        />
      )}

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={fromDate || new Date()}
        onConfirm={(date) => { setShowFromPicker(false); setFromDate(date); }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={toDate || new Date()}
        onConfirm={(date) => { setShowToPicker(false); setToDate(date); }}
        onCancel={() => setShowToPicker(false)}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterLabel: { fontSize: 12, color: TEXT_SECONDARY, marginRight: 4 },
  filterValue: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY },
  clearFilter: { justifyContent: 'center' },
  clearText: { fontSize: 12, color: PRIMARY_COLOR },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  status: { fontSize: 12, color: '#4CAF50' },
  amount: { fontSize: 14, color: TEXT_PRIMARY, marginTop: 4 },
  runId: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});