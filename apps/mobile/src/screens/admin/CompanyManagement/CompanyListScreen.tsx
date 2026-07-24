// screens/admin/CompanyManagement/CompanyListScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Searchbar, Chip, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getRecentCompanies,
  searchCompanies,
  getCompaniesByStatus,
  getCompaniesByTier,
  Company,
} from '../../../services/admin';

type FilterType = 'all' | 'active' | 'inactive';
type TierFilter = 'all' | 'basic' | 'premium' | 'enterprise';

export default function CompanyListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const fetchCompanies = async () => {
    try {
      let result;
      if (searchQuery.trim()) {
        result = await searchCompanies(searchQuery);
        setCompanies(result.companies || []);
        return;
      }

      if (statusFilter !== 'all') {
        result = await getCompaniesByStatus(statusFilter);
        setCompanies(result.companies || []);
        return;
      }

      if (tierFilter !== 'all') {
        result = await getCompaniesByTier(tierFilter);
        setCompanies(result.companies || []);
        return;
      }

      result = await getRecentCompanies(50);
      setCompanies(result.companies || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
    }, [searchQuery, statusFilter, tierFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleCompanyPress = (companyId: string) => {
    (navigation as any).navigate('CompanyDetail', { companyId });
  };

  const renderItem = ({ item }: { item: Company }) => (
    <TouchableOpacity onPress={() => handleCompanyPress(item.company_id)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.companyName}>
              {item.company_name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_active ? '#2E7D32' : '#C62828' },
                ]}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" style={styles.ownerText}>
            Owner: {item.owner_user_id}
          </Text>
          <View style={styles.metaRow}>
            <Chip style={styles.tierChip} textStyle={{ fontSize: 11 }}>
              {item.subscription_tier}
            </Chip>
            <Text variant="bodySmall" style={styles.metaText}>
              Employees: {item.max_employees}
            </Text>
            <Text variant="bodySmall" style={styles.metaText}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00B4DB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <Searchbar
        placeholder="Search companies..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        // 🎨 Change search icon to blue
        iconColor="#00B4DB"
        theme={{ colors: { primary: '#00B4DB' } }}
      />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Chip
            selected={statusFilter === 'all' && tierFilter === 'all'}
            onPress={() => { setStatusFilter('all'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'all' && tierFilter === 'all' && styles.activeChip]}
            textStyle={statusFilter === 'all' && tierFilter === 'all' ? styles.activeChipText : {}}
          >
            All
          </Chip>
          <Chip
            selected={statusFilter === 'active'}
            onPress={() => { setStatusFilter('active'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'active' && styles.activeChip]}
            textStyle={statusFilter === 'active' ? styles.activeChipText : {}}
          >
            Active
          </Chip>
          <Chip
            selected={statusFilter === 'inactive'}
            onPress={() => { setStatusFilter('inactive'); setTierFilter('all'); }}
            style={[styles.filterChip, statusFilter === 'inactive' && styles.activeChip]}
            textStyle={statusFilter === 'inactive' ? styles.activeChipText : {}}
          >
            Inactive
          </Chip>
          <Chip
            selected={tierFilter === 'basic'}
            onPress={() => { setStatusFilter('all'); setTierFilter('basic'); }}
            style={[styles.filterChip, tierFilter === 'basic' && styles.activeChip]}
            textStyle={tierFilter === 'basic' ? styles.activeChipText : {}}
          >
            Basic
          </Chip>
          <Chip
            selected={tierFilter === 'premium'}
            onPress={() => { setStatusFilter('all'); setTierFilter('premium'); }}
            style={[styles.filterChip, tierFilter === 'premium' && styles.activeChip]}
            textStyle={tierFilter === 'premium' ? styles.activeChipText : {}}
          >
            Premium
          </Chip>
          <Chip
            selected={tierFilter === 'enterprise'}
            onPress={() => { setStatusFilter('all'); setTierFilter('enterprise'); }}
            style={[styles.filterChip, tierFilter === 'enterprise' && styles.activeChip]}
            textStyle={tierFilter === 'enterprise' ? styles.activeChipText : {}}
          >
            Enterprise
          </Chip>
        </ScrollView>
      </View>

      <FlatList
        data={companies}
        renderItem={renderItem}
        keyExtractor={(item) => item.company_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00B4DB']} // 🎨 blue
            tintColor="#00B4DB"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No companies found
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fabWrapper}
        onPress={() => (navigation as any).navigate('CompanyCreate')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#00B4DB', '#7B2FBE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon name="plus" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  filterRow: { paddingHorizontal: 24, marginVertical: 4 },
  filterScroll: { flexDirection: 'row' },
  filterChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  // 🎨 Active chip background – blue
  activeChip: { backgroundColor: '#00B4DB' },
  activeChipText: { color: 'white' },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyName: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  ownerText: { color: '#666', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  tierChip: { height: 24, backgroundColor: '#E8E0F0', marginRight: 8 },
  metaText: { color: '#888', fontSize: 12, marginRight: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
  // Custom FAB
  fabWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});