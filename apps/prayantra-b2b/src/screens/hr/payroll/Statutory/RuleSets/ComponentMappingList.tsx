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
import { listComponentMappings, deleteComponentMapping } from '@b2b/api-client';
import { ComponentMapping } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'ComponentMappingList'>;
type RouteProps = RouteProp<RootStackParamList, 'ComponentMappingList'>;

export default function ComponentMappingList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [mappings, setMappings] = useState<ComponentMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCode, setFilterCode] = useState('');

  const fetchMappings = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterCode) params.statutory_code = filterCode;
      const res = await listComponentMappings(companyId, ruleSetId, deviceId, accessToken, params);
      setMappings(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch component mappings');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMappings();
    }, [filterCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMappings();
    setRefreshing(false);
  };

  const handleDelete = (mappingId: string) => {
    Alert.alert(
      'Delete Mapping',
      'Are you sure you want to delete this component mapping?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComponentMapping(companyId!, ruleSetId, mappingId, deviceId!, accessToken!);
              Alert.alert('Success', 'Mapping deleted');
              fetchMappings();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete mapping');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ComponentMapping }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EditComponentMapping', { ruleSetId, mappingId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.statutory}>{item.statutory_code}</Text>
        <Text style={styles.component}>→ {item.component_code}</Text>
      </View>
      <Text style={styles.effective}>Effective: {new Date(item.effective_from).toLocaleDateString()}</Text>
      {item.version && <Text style={styles.version}>Version: {item.version}</Text>}
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
        <Text style={styles.headerTitle}>Component Mappings</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateComponentMapping', { ruleSetId })}
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
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => navigation.navigate('BulkCreateComponentMapping', { ruleSetId })}
        >
          <Icon name="playlist-plus" size={20} color={PRIMARY_COLOR} />
          <Text style={styles.bulkText}>Bulk</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={mappings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No mappings found</Text>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  bulkText: { fontSize: 13, color: PRIMARY_COLOR, marginLeft: 4 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  statutory: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  component: { fontSize: 14, color: PRIMARY_COLOR, marginLeft: 8 },
  effective: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  version: { fontSize: 12, color: TEXT_SECONDARY },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});