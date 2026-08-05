// apps/prayantra-b2b/src/screens/module/administration/EmployeesListScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, ActivityIndicator, FAB, Searchbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getCompanyEmployees, searchEmployees } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee } from '@b2b/shared-types';
import { RootStackParamList } from '../../../navigation';
import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
  ERROR_COLOR,
} from '../../../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EmployeesList'>;

export default function EmployeesListScreen() {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const fetchEmployees = async (query?: string) => {
    if (!accessToken || !companyId) return;
    setLoading(true);
    try {
      let res;
      if (query && query.trim()) {
        res = await searchEmployees(
          companyId,
          deviceId!,
          { search_term: query, limit: 100, offset: 0 },
          accessToken
        );
      } else {
        res = await getCompanyEmployees(companyId, deviceId!, accessToken);
      }
      setEmployees(res.data?.employees || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [accessToken, companyId])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchEmployees(text);
  };

  const renderItem = ({ item }: { item: CompanyEmployee }) => (
    <Card style={[styles.card, { backgroundColor: CARD_BACKGROUND }]}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text variant="titleMedium" style={[styles.name, { color: TEXT_PRIMARY }]}>
              {item.full_name || item.username || 'Unnamed'}
            </Text>
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              ID: {item.employee_id}
            </Text>
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              Role: {item.role_id}
            </Text>
            {item.phone && (
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                Phone: {item.phone}
              </Text>
            )}
            <Text style={[styles.status, item.is_active ? styles.active : styles.inactive]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EditEmployee', { userId: item.user_id })
            }
            style={styles.editButton}
          >
            <Icon name="pencil" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

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
      <View style={[styles.searchWrapper, { paddingTop: insets.top || 8 }]}>
        <Searchbar
          placeholder="Search employees by name, phone, ID"
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: CARD_BACKGROUND }]}
          loading={loading}
          clearIcon="close"
          onClearIconPress={() => handleSearch('')}
          elevation={2}
          iconColor={TEXT_SECONDARY}
          placeholderTextColor={TEXT_SECONDARY}
          theme={{ colors: { primary: PRIMARY_COLOR } }}
        />
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchEmployees()} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="account-off" size={64} color="#ccc" />
            <Text variant="bodyLarge" style={{ marginTop: 8, color: TEXT_PRIMARY }}>
              {searchQuery ? 'No matching employees' : 'No employees yet'}
            </Text>
            {!searchQuery && (
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                Tap the + button to add one
              </Text>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        icon="plus"
        onPress={() => navigation.navigate('AddEmployee')}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  active: {
    color: SUCCESS_COLOR,
    backgroundColor: '#D1FAE5',
  },
  inactive: {
    color: ERROR_COLOR,
    backgroundColor: '#FEE2E2',
  },
  editButton: {
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
    backgroundColor: PRIMARY_COLOR,
  },
});