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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listLocks, deleteLock } from '@b2b/api-client';
import { PayrollLock } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LockList'>;

export default function LockList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [locks, setLocks] = useState<PayrollLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fetchLocks = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from = fromDate.toISOString();
      if (toDate) params.to = toDate.toISOString();
      const res = await listLocks(companyId, deviceId, accessToken, params);
      setLocks(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch locks');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLocks();
    }, [fromDate, toDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocks();
    setRefreshing(false);
  };

  const handleDelete = (lock: PayrollLock) => {
    Alert.alert(
      'Delete Lock',
      `Are you sure you want to delete the lock for ${new Date(lock.period_start).toLocaleDateString()} - ${new Date(lock.period_end).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLock(
                companyId!,
                deviceId!,
                accessToken!,
                lock.period_start,
                lock.period_end
              );
              Alert.alert('Success', 'Lock deleted');
              fetchLocks();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete lock');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PayrollLock }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>From:</Text>
          <Text style={styles.dateValue}>
            {new Date(item.period_start).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>To:</Text>
          <Text style={styles.dateValue}>
            {new Date(item.period_end).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.reason}>{item.reason}</Text>
        <Text style={styles.meta}>Created: {new Date(item.created_at).toLocaleString()}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Icon name="delete" size={22} color={ERROR_COLOR} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payroll Locks</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateLock')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFromPicker(true)}
        >
          <Text style={styles.filterText}>
            {fromDate ? fromDate.toLocaleDateString() : 'From'}
          </Text>
          <Icon name="calendar" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowToPicker(true)}
        >
          <Text style={styles.filterText}>
            {toDate ? toDate.toLocaleDateString() : 'To'}
          </Text>
          <Icon name="calendar" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        {(fromDate || toDate) && (
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => {
              setFromDate(null);
              setToDate(null);
            }}
          >
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={locks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No locks found</Text>
            </View>
          }
        />
      )}

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={fromDate || new Date()}
        onConfirm={(date) => {
          setShowFromPicker(false);
          setFromDate(date);
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={toDate || new Date()}
        onConfirm={(date) => {
          setShowToPicker(false);
          setToDate(date);
        }}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  addButton: { padding: 4 },
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterText: { fontSize: 13, color: TEXT_PRIMARY, marginRight: 4 },
  clearFilter: { justifyContent: 'center' },
  clearFilterText: { fontSize: 13, color: PRIMARY_COLOR },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  dateContainer: { flexDirection: 'row', marginBottom: 2 },
  dateLabel: { fontSize: 13, color: TEXT_SECONDARY, width: 50 },
  dateValue: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  reason: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 4 },
  meta: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 },
  deleteButton: { padding: 8 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});