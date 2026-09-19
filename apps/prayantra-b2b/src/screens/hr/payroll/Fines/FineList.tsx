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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listFines, deleteFine, getFineById } from '@b2b/api-client';
import { Fine } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'FineList'>;

export default function FineList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    is_processed: false,
    from_date: '',
    to_date: '',
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fetchFines = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.is_processed !== undefined) params.is_processed = filters.is_processed;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      const res = await listFines(companyId, deviceId, accessToken, params);
      setFines(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch fines');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFines();
    }, [filters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFines();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Fine',
      'Are you sure you want to delete this fine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFine(companyId!, id, deviceId!, accessToken!);
              Alert.alert('Success', 'Fine deleted');
              fetchFines();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete fine');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Fine }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditFine', { fineId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.userId}>User: {item.user_id}</Text>
        <Text style={[styles.status, item.is_processed ? styles.processed : styles.unprocessed]}>
          {item.is_processed ? 'Processed' : 'Unprocessed'}
        </Text>
      </View>
      <Text style={styles.amount}>Amount: ₹{item.fine_amount}</Text>
      <Text style={styles.reason}>Reason: {item.reason}</Text>
      <Text style={styles.date}>Date: {new Date(item.fine_date).toLocaleDateString()}</Text>
      {item.category && <Text style={styles.category}>Category: {item.category}</Text>}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDelete(item.id);
        }}
      >
        <Icon name="delete" size={20} color={ERROR_COLOR} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fines</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFine')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="User ID"
          value={filters.user_id}
          onChangeText={(text) => setFilters({ ...filters, user_id: text })}
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.dateText}>
              {filters.from_date ? new Date(filters.from_date).toLocaleDateString() : 'From'}
            </Text>
            <Icon name="calendar" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.dateText}>
              {filters.to_date ? new Date(filters.to_date).toLocaleDateString() : 'To'}
            </Text>
            <Icon name="calendar" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Processed</Text>
          <Switch
            value={filters.is_processed}
            onValueChange={(value) => setFilters({ ...filters, is_processed: value })}
            trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={fines}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No fines found</Text>
            </View>
          }
        />
      )}

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={filters.from_date ? new Date(filters.from_date) : new Date()}
        onConfirm={(date) => {
          setShowFromPicker(false);
          setFilters({ ...filters, from_date: date.toISOString().split('T')[0] });
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={filters.to_date ? new Date(filters.to_date) : new Date()}
        onConfirm={(date) => {
          setShowToPicker(false);
          setFilters({ ...filters, to_date: date.toISOString().split('T')[0] });
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  addButton: { padding: 4 },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    flex: 0.48,
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 13, color: TEXT_PRIMARY },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  switchLabel: { fontSize: 13, color: TEXT_PRIMARY },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userId: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  status: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  processed: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  unprocessed: { backgroundColor: '#FFF3E0', color: '#E65100' },
  amount: { fontSize: 14, color: TEXT_PRIMARY, marginTop: 2 },
  reason: { fontSize: 13, color: TEXT_SECONDARY },
  date: { fontSize: 12, color: TEXT_SECONDARY },
  category: { fontSize: 12, color: TEXT_SECONDARY },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});