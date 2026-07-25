import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator, Card, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import {
  advancedUserSearch,
  searchUsersByUsername,
  searchUsersByFullName,
  getUsersByKycStatus,
  getBannedUsers,
  User,
} from '../../../services/admin';
// ❌ Removed unused import: useIdempotency

type SearchType = 'advanced' | 'username' | 'fullname' | 'kyc' | 'banned';

export default function UserSearchScreen() {
  const navigation = useNavigation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('advanced');
  const [filters, setFilters] = useState({
    username: '',
    full_name: '',
    kyc_status: '',
    is_active: true,
  });
  const [usernameSearch, setUsernameSearch] = useState('');
  const [fullNameSearch, setFullNameSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  const [total, setTotal] = useState(0);

  const performSearch = async () => {
    setLoading(true);
    try {
      let result;
      switch (searchType) {
        case 'advanced':
          result = await advancedUserSearch(filters);
          break;
        case 'username':
          result = await searchUsersByUsername(usernameSearch);
          break;
        case 'fullname':
          result = await searchUsersByFullName(fullNameSearch);
          break;
        case 'kyc':
          result = await getUsersByKycStatus(kycStatus);
          break;
        case 'banned':
          result = await getBannedUsers();
          break;
      }
      setUsers(result.users || []);
      setTotal(result.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Search failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    performSearch();
  };

  const renderUserCard = (item: User) => (
    <TouchableOpacity
      key={item.user_id}
      onPress={() => (navigation as any).navigate('UserDetail', { userId: item.user_id })}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.row}>
            <Text variant="titleSmall" style={styles.username}>
              {item.username}
            </Text>
            {item.is_active !== undefined && (
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
                ]}
                textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={styles.fullName}>
            {item.full_name}
          </Text>
          {item.role && <Text variant="bodySmall" style={styles.role}>Role: {item.role}</Text>}
          {item.kyc_status && (
            <Chip style={styles.kycChip} textStyle={{ fontSize: 11 }}>
              KYC: {item.kyc_status}
            </Chip>
          )}
          {item.created_at && (
            <Text variant="bodySmall" style={styles.createdAt}>
              Joined: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderSearchControls = () => {
    switch (searchType) {
      case 'advanced':
        return (
          <View style={styles.filterGroup}>
            <TextInput
              mode="outlined"
              label="Username"
              value={filters.username}
              onChangeText={(text) => setFilters({ ...filters, username: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="Full Name"
              value={filters.full_name}
              onChangeText={(text) => setFilters({ ...filters, full_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={filters.kyc_status}
              onChangeText={(text) => setFilters({ ...filters, kyc_status: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
          </View>
        );
      case 'username':
        return (
          <TextInput
            mode="outlined"
            label="Username"
            value={usernameSearch}
            onChangeText={setUsernameSearch}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        );
      case 'fullname':
        return (
          <TextInput
            mode="outlined"
            label="Full Name"
            value={fullNameSearch}
            onChangeText={setFullNameSearch}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        );
      case 'kyc':
        return (
          <View style={styles.filterGroup}>
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={kycStatus}
              onChangeText={setKycStatus}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
          </View>
        );
      case 'banned':
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          User Search
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} users found
        </Text>
      </View>

      <View style={styles.typeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['advanced', 'username', 'fullname', 'kyc', 'banned'] as SearchType[]).map((type) => (
            <Chip
              key={type}
              selected={searchType === type}
              onPress={() => setSearchType(type)}
              style={[styles.typeChip, searchType === type && styles.activeChip]}
              textStyle={searchType === type ? styles.activeChipText : {}}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {renderSearchControls()}

        <TouchableOpacity
          onPress={performSearch}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGradient, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {users.map(renderUserCard)}
        {users.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No users found
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  typeSelector: { paddingHorizontal: 24, marginVertical: 8 },
  typeChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  activeChip: { backgroundColor: '#7B2FBE' },
  activeChipText: { color: 'white' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, backgroundColor: '#FFFFFF' },
  filterGroup: { marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  buttonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusChip: { marginLeft: 8 },
  fullName: { color: '#666', marginTop: 2 },
  role: { color: '#7B2FBE', marginTop: 2, fontSize: 12 },
  kycChip: { backgroundColor: '#E8E0F0', alignSelf: 'flex-start', marginTop: 4 },
  createdAt: { color: '#888', marginTop: 4, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});