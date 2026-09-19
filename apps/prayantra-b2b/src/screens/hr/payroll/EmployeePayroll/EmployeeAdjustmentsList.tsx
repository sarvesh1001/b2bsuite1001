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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getEmployeeAdjustmentsForPeriod } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EmployeeAdjustmentsList'>;
type RouteProps = RouteProp<RootStackParamList, 'EmployeeAdjustmentsList'>;

export default function EmployeeAdjustmentsList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fetchAdjustments = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from = fromDate.toISOString().split('T')[0];
      if (toDate) params.to = toDate.toISOString().split('T')[0];
      const res = await getEmployeeAdjustmentsForPeriod(companyId, userId, deviceId, accessToken, params);
      setAdjustments(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdjustments();
    }, [fromDate, toDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdjustments();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => date.toLocaleDateString();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.component}>{item.component_code}</Text>
        <Text style={[styles.amount, item.amount >= 0 ? styles.positive : styles.negative]}>
          {item.amount >= 0 ? '+' : ''}{item.amount}
        </Text>
      </View>
      <Text style={styles.type}>Type: {item.adjustment_type}</Text>
      <Text style={styles.month}>Month: {item.applicable_month}</Text>
      {item.reason && <Text style={styles.reason}>Reason: {item.reason}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adjustments</Text>
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
          <TouchableOpacity
            onPress={() => { setFromDate(null); setToDate(null); }}
            style={styles.clearFilter}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={adjustments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No adjustments</Text></View>}
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
  component: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  amount: { fontSize: 16, fontWeight: '700' },
  positive: { color: '#4CAF50' },
  negative: { color: '#F44336' },
  type: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  month: { fontSize: 13, color: TEXT_SECONDARY },
  reason: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});