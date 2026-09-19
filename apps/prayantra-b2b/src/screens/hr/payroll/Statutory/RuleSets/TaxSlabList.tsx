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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listTaxSlabs, deleteTaxSlab } from '@b2b/api-client';
import { TaxSlab } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'TaxSlabList'>;
type RouteProps = RouteProp<RootStackParamList, 'TaxSlabList'>;

export default function TaxSlabList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCode, setFilterCode] = useState('');

  const fetchSlabs = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterCode) params.statutory_code = filterCode;
      const res = await listTaxSlabs(companyId, ruleSetId, deviceId, accessToken, params);
      setSlabs(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch tax slabs');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSlabs();
    }, [filterCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSlabs();
    setRefreshing(false);
  };

  const handleDelete = (slabId: string) => {
    Alert.alert(
      'Delete Slab',
      'Are you sure you want to delete this tax slab?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaxSlab(companyId!, ruleSetId, slabId, deviceId!, accessToken!);
              Alert.alert('Success', 'Slab deleted');
              fetchSlabs();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete slab');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: TaxSlab }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditTaxSlab', { ruleSetId, slabId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.code}>{item.statutory_code}</Text>
        <Text style={styles.order}>Order {item.slab_order}</Text>
      </View>
      <Text style={styles.range}>
        {item.min_amount} - {item.max_amount}
      </Text>
      <Text style={styles.rate}>
        Rate: {item.rate}{item.is_percentage ? '%' : ''}
      </Text>
      <Text style={styles.effective}>Effective: {new Date(item.effective_from).toLocaleDateString()}</Text>
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
        <Text style={styles.headerTitle}>Tax Slabs</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTaxSlab', { ruleSetId })}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Statutory Code"
          value={filterCode}
          onChangeText={setFilterCode}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={slabs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tax slabs found</Text>
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
    backgroundColor: '#fff',
  },
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
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  order: { fontSize: 12, color: TEXT_SECONDARY },
  range: { fontSize: 14, color: TEXT_PRIMARY, marginTop: 2 },
  rate: { fontSize: 13, color: TEXT_SECONDARY },
  effective: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});