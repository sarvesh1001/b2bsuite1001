// apps/prayantra-b2b/src/screens/module/administration/WorkCentersListScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, ActivityIndicator, Searchbar, FAB } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listWorkCenters, searchWorkCenters, deleteWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// 👇 Import all shared constants
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  SUCCESS_COLOR,
  BORDER_COLOR,
  DISABLED_COLOR,
} from '../../../constants/colors';

type WorkCenter = {
  work_center_code: string;
  name: string;
  description?: string;
  is_active: boolean;
};

type NavigationProp = StackNavigationProp<any>;

export default function WorkCentersListScreen() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  // ---- Fetch all work centers ----
  const fetchWorkCenters = async () => {
    if (!accessToken || !companyId) {
      console.warn('⚠️ Missing token or companyId');
      return;
    }
    setLoading(true);
    try {
      const res = await listWorkCenters(
        companyId,
        deviceId!,
        { page: 1, page_size: 100 },
        accessToken
      );
      const data = res.data || [];
      setWorkCenters(data);
      setFilteredCenters(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load work centers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---- Search (fallback to local) ----
  const performSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCenters(workCenters);
      return;
    }
    setSearching(true);
    try {
      const res = await searchWorkCenters(
        companyId!,
        deviceId!,
        { name: query, page: 1, page_size: 100 },
        accessToken!
      );
      const data = res.data || [];
      setFilteredCenters(data);
    } catch (error: any) {
      // fallback to local filtering
      const filtered = workCenters.filter(
        (wc) =>
          wc.name.toLowerCase().includes(query.toLowerCase()) ||
          wc.work_center_code.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCenters(filtered);
    } finally {
      setSearching(false);
    }
  };

  // ---- Delete ----
  const handleDelete = (code: string) => {
    Alert.alert(
      'Delete Work Center',
      'Are you sure you want to delete this work center?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkCenter(companyId!, deviceId!, code, accessToken!);
              await fetchWorkCenters();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ---- Refresh on focus ----
  useFocusEffect(
    useCallback(() => {
      fetchWorkCenters();
    }, [accessToken, companyId])
  );

  // ---- Render item ----
  const renderItem = ({ item }: { item: WorkCenter }) => (
    <Card style={[styles.card, { backgroundColor: CARD_BACKGROUND }]}>
      <Card.Content>
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={[styles.name, { color: TEXT_PRIMARY }]}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={[styles.code, { color: TEXT_SECONDARY }]}>
              Code: {item.work_center_code}
            </Text>
            {item.description && (
              <Text variant="bodySmall" style={[styles.description, { color: TEXT_SECONDARY }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.statusBadge}>
              <Text
                style={[
                  styles.statusText,
                  item.is_active ? styles.active : styles.inactive,
                ]}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditWorkCenter', { code: item.work_center_code })
              }
              style={styles.actionButton}
            >
              <Icon name="pencil" size={24} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.work_center_code)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={24} color={ERROR_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  // ---- Loading ----
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      {/* 🔍 Search Bar */}
      <View style={[styles.searchWrapper, { paddingTop: insets.top || 8 }]}>
        <Searchbar
          placeholder="Search by name or code"
          onChangeText={performSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: CARD_BACKGROUND }]}
          loading={searching}
          clearIcon="close"
          onClearIconPress={() => performSearch('')}
          elevation={2}
          iconColor={TEXT_SECONDARY}
          placeholderTextColor={TEXT_SECONDARY}
          theme={{ colors: { primary: PRIMARY_COLOR } }}
        />
      </View>

      <FlatList
        data={filteredCenters}
        keyExtractor={(item) => item.work_center_code}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchWorkCenters} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="factory-off" size={64} color={DISABLED_COLOR} />
            <Text variant="bodyLarge" style={{ marginTop: 8, color: TEXT_PRIMARY }}>
              {searchQuery ? 'No matching work centers' : 'No work centers yet'}
            </Text>
            {!searchQuery && (
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                Tap the + button to create one
              </Text>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <FAB
        style={[styles.fab, { bottom: 16 + insets.bottom, backgroundColor: PRIMARY_COLOR }]}
        icon="plus"
        onPress={() => navigation.navigate('CreateWorkCenter')}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 8,
    elevation: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  code: {
    marginTop: 2,
  },
  description: {
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  active: {
    color: SUCCESS_COLOR,
    backgroundColor: '#D1FAE5', // light green – can be made a constant later
  },
  inactive: {
    color: ERROR_COLOR,
    backgroundColor: '#FEE2E2', // light red – can be made a constant later
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
  },
});