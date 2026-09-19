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
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listProfiles, deactivateProfile } from '@b2b/api-client';
import { StatutoryProfile } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'ProfileList'>;

export default function ProfileList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [profiles, setProfiles] = useState<StatutoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    statutory_code: '',
    active_on: '',
  });

  const fetchProfiles = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.statutory_code) params.statutory_code = filters.statutory_code;
      if (filters.active_on) params.active_on = filters.active_on;
      const res = await listProfiles(companyId, deviceId, accessToken, params);
      setProfiles(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [filters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  };

  const handleDeactivate = (profile: StatutoryProfile) => {
    Alert.alert(
      'Deactivate Profile',
      `Are you sure you want to deactivate ${profile.statutory_code} profile for user ${profile.user_id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateProfile(companyId!, profile.id, deviceId!, accessToken!);
              Alert.alert('Success', 'Profile deactivated');
              fetchProfiles();
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate profile');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: StatutoryProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EditProfile', { profileId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.userId}>User: {item.user_id}</Text>
        <View style={[styles.statusBadge, item.opt_in ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>{item.opt_in ? 'Opted In' : 'Opted Out'}</Text>
        </View>
      </View>
      <Text style={styles.code}>Statutory: {item.statutory_code}</Text>
      <Text style={styles.effective}>
        Effective: {new Date(item.effective_from).toLocaleDateString()}
        {item.effective_to && ` → ${new Date(item.effective_to).toLocaleDateString()}`}
      </Text>
      {item.effective_to && (
        <Text style={styles.inactiveText}>Inactive since {new Date(item.effective_to).toLocaleDateString()}</Text>
      )}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDeactivate(item);
        }}
      >
        <Icon name="close-circle" size={24} color={ERROR_COLOR} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statutory Profiles</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateProfile')}
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
          placeholder="Statutory Code"
          value={filters.statutory_code}
          onChangeText={(text) => setFilters({ ...filters, statutory_code: text })}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Active On (YYYY-MM-DD)"
          value={filters.active_on}
          onChangeText={(text) => setFilters({ ...filters, active_on: text })}
        />
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => navigation.navigate('BulkUpsertProfiles')}
        >
          <Icon name="playlist-plus" size={20} color={PRIMARY_COLOR} />
          <Text style={styles.bulkText}>Bulk Upsert</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No profiles found</Text>
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
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userId: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadge: { backgroundColor: SUCCESS_COLOR + '20' },
  inactiveBadge: { backgroundColor: ERROR_COLOR + '20' },
  statusText: { fontSize: 12, fontWeight: '600' },
  code: { fontSize: 13, color: TEXT_SECONDARY },
  effective: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  inactiveText: { fontSize: 12, color: ERROR_COLOR, marginTop: 2 },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});