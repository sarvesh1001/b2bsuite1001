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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listAdjustments, deleteAdjustment } from '@b2b/api-client';
import { Adjustment } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'AdjustmentList'>;

export default function AdjustmentList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    component_code: '',
    adjustment_type: '',
    from_month: '',
    to_month: '',
  });

  const fetchAdjustments = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = { ...filters };
      if (!params.user_id) delete params.user_id;
      if (!params.component_code) delete params.component_code;
      if (!params.adjustment_type) delete params.adjustment_type;
      if (!params.from_month) delete params.from_month;
      if (!params.to_month) delete params.to_month;
      const res = await listAdjustments(companyId, deviceId, accessToken, params);
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
    }, [filters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdjustments();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Adjustment',
      'Are you sure you want to delete this adjustment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdjustment(companyId!, id, deviceId!, accessToken!);
              Alert.alert('Success', 'Adjustment deleted');
              fetchAdjustments();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete adjustment');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Adjustment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditAdjustment', { adjustmentId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.componentCode}>{item.component_code}</Text>
        <Text style={[styles.amount, item.amount >= 0 ? styles.positive : styles.negative]}>
          {item.amount >= 0 ? '+' : ''}{item.amount}
        </Text>
      </View>
      <Text style={styles.userId}>User: {item.user_id}</Text>
      <Text style={styles.type}>Type: {item.adjustment_type}</Text>
      <Text style={styles.month}>Month: {item.applicable_month}</Text>
      {item.reason && <Text style={styles.reason}>Reason: {item.reason}</Text>}
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
        <Text style={styles.headerTitle}>Adjustments</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateAdjustment')}
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
        <TextInput
          style={styles.filterInput}
          placeholder="Component Code"
          value={filters.component_code}
          onChangeText={(text) => setFilters({ ...filters, component_code: text })}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Type"
          value={filters.adjustment_type}
          onChangeText={(text) => setFilters({ ...filters, adjustment_type: text })}
        />
        <View style={styles.filterRow}>
          <TextInput
            style={[styles.filterInput, styles.monthInput]}
            placeholder="From (YYYY-MM)"
            value={filters.from_month}
            onChangeText={(text) => setFilters({ ...filters, from_month: text })}
          />
          <TextInput
            style={[styles.filterInput, styles.monthInput]}
            placeholder="To (YYYY-MM)"
            value={filters.to_month}
            onChangeText={(text) => setFilters({ ...filters, to_month: text })}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={adjustments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No adjustments found</Text>
            </View>
          }
        />
      )}
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
  filterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monthInput: { flex: 1, marginRight: 4 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentCode: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  amount: { fontSize: 16, fontWeight: '700' },
  positive: { color: '#4CAF50' },
  negative: { color: ERROR_COLOR },
  userId: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  type: { fontSize: 13, color: TEXT_SECONDARY },
  month: { fontSize: 13, color: TEXT_SECONDARY },
  reason: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 2 },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});