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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  listStructures,
  publishStructure,
  deactivateStructure,
} from '@b2b/api-client';
import { SalaryStructure } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'StructureList'>;

export default function StructureList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const fetchStructures = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listStructures(companyId, deviceId, accessToken, {
        include_inactive: includeInactive,
      });
      setStructures(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch structures');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStructures();
    }, [includeInactive])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStructures();
    setRefreshing(false);
  };

  const handlePublish = async (id: string) => {
    Alert.alert(
      'Publish Structure',
      'Are you sure you want to publish this structure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              await publishStructure(companyId!, id, deviceId!, accessToken!);
              Alert.alert('Success', 'Structure published');
              fetchStructures();
            } catch (error) {
              Alert.alert('Error', 'Failed to publish');
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = async (id: string) => {
    Alert.alert(
      'Deactivate Structure',
      'Are you sure you want to deactivate this structure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateStructure(companyId!, id, deviceId!, accessToken!);
              Alert.alert('Success', 'Structure deactivated');
              fetchStructures();
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SalaryStructure }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('StructureDetail', { structureId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.structure_name}</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.is_published ? SUCCESS_COLOR : '#FFA500' },
            ]}
          />
          <Text style={styles.statusText}>
            {item.is_published ? 'Published' : 'Draft'}
          </Text>
        </View>
      </View>

      <Text style={styles.currency}>Currency: {item.currency_code}</Text>
      <Text style={styles.meta}>
        {item.is_active ? 'Active' : 'Inactive'} ·{' '}
        {new Date(item.created_at).toLocaleDateString()}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditStructure', { structureId: item.id })}
        >
          <Icon name="pencil" size={20} color={TEXT_SECONDARY} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CloneStructure', { structureId: item.id })}
        >
          <Icon name="content-copy" size={20} color={TEXT_SECONDARY} />
        </TouchableOpacity>

        {!item.is_published && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePublish(item.id)}
          >
            <Icon name="check-circle" size={20} color={SUCCESS_COLOR} />
          </TouchableOpacity>
        )}

        {item.is_active && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeactivate(item.id)}
          >
            <Icon name="archive" size={20} color={ERROR_COLOR} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary Structures</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateStructure')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, includeInactive && styles.filterActive]}
          onPress={() => setIncludeInactive(!includeInactive)}
        >
          <Text style={styles.filterText}>
            {includeInactive ? 'Showing All' : 'Active Only'}
          </Text>
          <Icon
            name={includeInactive ? 'eye' : 'eye-off'}
            size={18}
            color={TEXT_SECONDARY}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={structures}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No structures found</Text>
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
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignSelf: 'flex-start',
  },
  filterActive: { backgroundColor: PRIMARY_COLOR + '15' },
  filterText: { fontSize: 13, color: TEXT_PRIMARY, marginRight: 4 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: { fontSize: 12, color: TEXT_SECONDARY },
  currency: { fontSize: 14, color: TEXT_SECONDARY },
  meta: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
  },
  actionButton: { paddingHorizontal: 10, paddingVertical: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});