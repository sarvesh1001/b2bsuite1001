// apps/prayantra-b2b/src/screens/hr/org-unit/OrgUnitList.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { listOrgUnits, deleteOrgUnit } from '@b2b/api-client';
import { OrgUnit } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';
import { RootStackParamList } from '../../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'OrgUnitList'>;

export default function OrgUnitList() {
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [filtered, setFiltered] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrgUnits = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await listOrgUnits(companyId, deviceId, accessToken, {
        page: 1,
        page_size: 100,
        is_active: true,
      });
      const data = res.data?.org_units || [];
      setOrgUnits(data);
      setFiltered(data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load org units');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrgUnits();
    }, [fetchOrgUnits])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFiltered(orgUnits);
      return;
    }
    const lower = query.toLowerCase();
    const filteredData = orgUnits.filter(
      (unit) =>
        unit.name.toLowerCase().includes(lower) ||
        unit.org_unit_type.toLowerCase().includes(lower) ||
        unit.description?.toLowerCase().includes(lower)
    );
    setFiltered(filteredData);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFiltered(orgUnits);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Org Unit',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setDeletingId(id);
            try {
              await deleteOrgUnit(companyId, id, deviceId, accessToken);
              setOrgUnits((prev) => prev.filter((u) => u.id !== id));
              setFiltered((prev) => prev.filter((u) => u.id !== id));
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Delete failed');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: OrgUnit }) => {
    const isDeleting = deletingId === item.id;
    const statusColor = item.is_active ? '#10b981' : '#ef4444';
    const statusLabel = item.is_active ? 'Active' : 'Inactive';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('OrgUnitDetail', { orgUnitId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Icon name="office-building" size={24} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.unitName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.unitType}>{item.org_unit_type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('OrgUnitForm', { orgUnitId: item.id })}
          >
            <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.name)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Icon name="delete" size={18} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading org units...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Org Units</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('OrgUnitForm', {})}   // ✅ fixed
          >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={TEXT_SECONDARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search org units..."
          placeholderTextColor={TEXT_SECONDARY}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Icon name="close" size={18} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrgUnits(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="office-building-outline" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching org units' : 'No org units yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first org unit by tapping the + button'}
            </Text>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: TEXT_PRIMARY, paddingVertical: 0 },
  clearButton: { padding: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  unitName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  unitType: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 9, fontWeight: '700' },
  description: { marginTop: 6, fontSize: 12, color: TEXT_SECONDARY },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  editButton: { padding: 6, marginRight: 10 },
  deleteButton: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
});