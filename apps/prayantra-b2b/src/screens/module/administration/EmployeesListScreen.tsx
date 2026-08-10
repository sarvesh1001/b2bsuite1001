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

import {
  getCompanyEmployees,
  findEmployeeByUsername,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee } from '@b2b/shared-types';
import { RootStackParamList } from '../../../navigation';
import { UserAvatar } from '../../../components/UserAvatar';
import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EmployeesList'>;

export default function EmployeesListScreen() {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');      // input value
  const [searchQuery, setSearchQuery] = useState('');    // actual query used for API
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  // ---- Core fetch function ----
  const fetchEmployees = useCallback(
    async (query?: string) => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoading(true);
      try {
        let employeesData: CompanyEmployee[] = [];

        if (query && query.trim()) {
          // Search mode: exact username lookup
          try {
            const res = await findEmployeeByUsername(
              companyId,
              deviceId,
              query.trim(),
              accessToken
            );
            const employee = (res.data as any)?.employee || null;
            employeesData = employee ? [employee] : [];
          } catch (err: any) {
            employeesData = [];
          }
        } else {
          // No search: get all employees
          const res = await getCompanyEmployees(companyId, deviceId, accessToken);
          employeesData = res.data?.employees || [];
        }

        setEmployees(employeesData);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load employees');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId]
  );

  // ---- Trigger fetch on focus or when searchQuery changes ----
  useFocusEffect(
    useCallback(() => {
      fetchEmployees(searchQuery);
    }, [fetchEmployees, searchQuery])
  );

  // ---- Submit search (called on Enter or icon press) ----
  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
  };

  // ---- Clear search ----
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  // ---- Render item ----
  const renderItem = ({ item }: { item: CompanyEmployee }) => {
    const displayName = item.full_name || item.username || 'Unnamed';

    return (
      <Card style={[styles.card, { backgroundColor: CARD_BACKGROUND }]}>
        <Card.Content>
          <View style={styles.cardContent}>
            <UserAvatar
              userId={item.user_id}
              username={item.username}
              fullName={item.full_name}
              size={48}
              style={styles.avatar}
            />

            <View style={styles.info}>
              <Text variant="titleMedium" style={[styles.name, { color: TEXT_PRIMARY }]}>
                {displayName}
              </Text>
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                ID: {item.employee_id}
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
  };

  // ---- Loading state ----
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Main render ----
  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <View style={[styles.searchWrapper, { paddingTop: insets.top || 8 }]}>
        <Searchbar
          placeholder="Search by exact username"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearchSubmit}   // Trigger on Enter
          onIconPress={handleSearchSubmit}       // Trigger on search icon tap
          onClearIconPress={handleClearSearch}   // Clear all
          style={[styles.searchBar, { backgroundColor: CARD_BACKGROUND }]}
          loading={loading}
          clearIcon="close"
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEmployees(searchQuery)}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="account-off" size={64} color="#ccc" />
            <Text variant="bodyLarge" style={{ marginTop: 8, color: TEXT_PRIMARY }}>
              {searchQuery ? 'No matching employee' : 'No employees yet'}
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
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