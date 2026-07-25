import React, { useState, useCallback, useLayoutEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getRecentCompanies,
  searchCompanies,
  getCompaniesByStatus,
  getCompaniesByTier,
  Company,
} from '../../../services/admin';
import { useAuthStore } from '../../../store/authStore';

type FilterType = 'all' | 'active' | 'inactive';
type TierFilter = 'all' | 'basic' | 'premium' | 'enterprise';

export default function CompanyListScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: () => {
                    logout();
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'PhoneInput' }],
                      })
                    );
                  },
                },
              ]
            );
          }}
          style={{ marginRight: 16 }}
        >
          <Icon name="logout" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, logout]);

  const fetchCompanies = async () => {
    try {
      let result;
      if (searchTerm.trim()) {
        result = await searchCompanies(searchTerm);
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
    }, [searchTerm, statusFilter, tierFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleSearch = () => {
    setSearchTerm(searchQuery);
  };

  const handleTextChange = (text: string) => {
    setSearchQuery(text);
    if (text === '') {
      setSearchTerm('');
    }
  };

  const handleFilterPress = (status: FilterType, tier: TierFilter) => {
    setStatusFilter(status);
    setTierFilter(tier);
    setSearchQuery('');
    setSearchTerm('');
  };

  const handleCompanyPress = (companyId: string) => {
    (navigation as any).navigate('CompanyDetail', { companyId });
  };

  const formatTier = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const renderItem = ({ item }: { item: Company }) => (
    <TouchableOpacity onPress={() => handleCompanyPress(item.company_id)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.companyName} numberOfLines={1}>
              {item.company_name}
            </Text>
            <View style={styles.headerBadges}>
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
              <View style={styles.tierChipCustom}>
                <Text style={styles.tierText}>{formatTier(item.subscription_tier)}</Text>
              </View>
            </View>
          </View>

          <Text variant="bodySmall" style={styles.ownerText}>
            Owner: {item.owner_user_id}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="account-multiple" size={14} color="#888" />
              <Text variant="bodySmall" style={styles.metaText}>
                {item.max_employees}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={14} color="#888" />
              <Text variant="bodySmall" style={styles.metaText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00B4DB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Searchbar
        placeholder="Search companies..."
        onChangeText={handleTextChange}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#00B4DB"
        theme={{ colors: { primary: '#00B4DB' } }}
        onIconPress={handleSearch}
        onSubmitEditing={handleSearch}
      />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Chip
            selected={statusFilter === 'all' && tierFilter === 'all'}
            onPress={() => handleFilterPress('all', 'all')}
            style={[
              styles.filterChip,
              statusFilter === 'all' && tierFilter === 'all' && styles.activeChip,
            ]}
            textStyle={[
              styles.filterChipText,
              statusFilter === 'all' && tierFilter === 'all' && styles.activeChipText,
            ]}
          >
            All
          </Chip>
          <Chip
            selected={statusFilter === 'active'}
            onPress={() => handleFilterPress('active', 'all')}
            style={[styles.filterChip, statusFilter === 'active' && styles.activeChip]}
            textStyle={[
              styles.filterChipText,
              statusFilter === 'active' && styles.activeChipText,
            ]}
          >
            Active
          </Chip>
          <Chip
            selected={statusFilter === 'inactive'}
            onPress={() => handleFilterPress('inactive', 'all')}
            style={[styles.filterChip, statusFilter === 'inactive' && styles.activeChip]}
            textStyle={[
              styles.filterChipText,
              statusFilter === 'inactive' && styles.activeChipText,
            ]}
          >
            Inactive
          </Chip>
          <Chip
            selected={tierFilter === 'basic'}
            onPress={() => handleFilterPress('all', 'basic')}
            style={[styles.filterChip, tierFilter === 'basic' && styles.activeChip]}
            textStyle={[
              styles.filterChipText,
              tierFilter === 'basic' && styles.activeChipText,
            ]}
          >
            Basic
          </Chip>
          <Chip
            selected={tierFilter === 'premium'}
            onPress={() => handleFilterPress('all', 'premium')}
            style={[styles.filterChip, tierFilter === 'premium' && styles.activeChip]}
            textStyle={[
              styles.filterChipText,
              tierFilter === 'premium' && styles.activeChipText,
            ]}
          >
            Premium
          </Chip>
          <Chip
            selected={tierFilter === 'enterprise'}
            onPress={() => handleFilterPress('all', 'enterprise')}
            style={[styles.filterChip, tierFilter === 'enterprise' && styles.activeChip]}
            textStyle={[
              styles.filterChipText,
              tierFilter === 'enterprise' && styles.activeChipText,
            ]}
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
            colors={['#00B4DB']}
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
  searchBar: {
    marginHorizontal: 24,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  searchInput: { fontSize: 16 },
  filterRow: { paddingHorizontal: 24, marginVertical: 4 },
  filterScroll: { flexDirection: 'row' },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#d0d0d0', // darker gray for unselected
  },
  filterChipText: {
    color: '#333', // dark text for unselected
  },
  activeChip: {
    backgroundColor: '#00B4DB',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
    fontSize: 16,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierChipCustom: {
    backgroundColor: '#E8E0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  ownerText: {
    color: '#666',
    marginTop: 4,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
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