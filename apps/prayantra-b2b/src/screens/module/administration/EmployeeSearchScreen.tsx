// apps/prayantra-b2b/src/screens/module/administration/EmployeeSearchScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  axiosInstance,
  listRoles,
  getRootDepartments,
  findEmployeeByUsername,
  advancedSearchEmployees,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee, Role, Department } from '@b2b/shared-types';
import { RootStackParamList } from '../../../navigation';
import { UserAvatar } from '../../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SELECTED_ITEM_BG,
} from '../../../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EmployeeSearch'>;

// Helper to build required headers
const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

export default function EmployeeSearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // ---- Search state ----
  const [searchTerm, setSearchTerm] = useState('');           // input value
  const [searchQuery, setSearchQuery] = useState('');         // actual term to search (only updated on submit)
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // ---- Filter state ----
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);

  // ---- Dropdown data ----
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // ---- Modal visibility ----
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  // ---- Fetch filters (roles + departments) ----
  useEffect(() => {
    const fetchFilters = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingFilters(false);
        return;
      }
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
        ]);
        setRoles(rolesRes.data?.roles || []);
        setDepartments(deptsRes.data || []);
      } catch (error) {
        console.error('Failed to load filters', error);
        Alert.alert('Error', 'Could not load department/role options');
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, [accessToken, companyId, deviceId]);

  // ---- Core data loading function ----
  const loadEmployees = useCallback(
    async (reset = true, loadMore = false) => {
      if (!accessToken || !companyId || !deviceId) return;

      const currentOffset = reset ? 0 : offset;
      setLoading(true);

      try {
        const hasSearch = searchQuery.trim().length > 0;
        const hasFilters = !!(selectedRoleId || selectedDeptId);

        // ----- Case 1: Search bar active -> exact username lookup -----
        if (hasSearch) {
          try {
            const res = await findEmployeeByUsername(
              companyId,
              deviceId,
              searchQuery.trim(),
              accessToken
            );
            // ✅ API returns { success, data: { employee: {...} } }
            const employee = (res.data as any)?.employee || null;
            setEmployees(employee ? [employee] : []);
            setOffset(1);
            setHasMore(false);
            setLoading(false);
            setRefreshing(false);
            return;
          } catch (err: any) {
            // Username not found -> show empty list
            setEmployees([]);
            setOffset(0);
            setHasMore(false);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }

        // ----- Case 2: No search, but filters selected -> advanced search -----
        if (hasFilters) {
          const params: any = {
            limit,
            offset: currentOffset,
          };
          if (selectedRoleId) params.role_id = selectedRoleId;
          if (selectedDeptId) params.department_id = selectedDeptId;

          const res = await advancedSearchEmployees(
            companyId,
            deviceId,
            params,
            accessToken
          );
          const data = res.data?.employees || [];
          if (reset) {
            setEmployees(data);
            setOffset(data.length);
            setHasMore(data.length === limit);
          } else {
            setEmployees(prev => [...prev, ...data]);
            setOffset(prev => prev + data.length);
            setHasMore(data.length === limit);
          }
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // ----- Case 3: No search, no filters -> get paginated employees -----
        const url = `/companies/${companyId}/getemployees`;
        const headers = getBaseHeaders(companyId, deviceId, accessToken);
        const response = await axiosInstance.get(url, {
          headers,
          params: { limit, offset: currentOffset },
        });
        const data = response.data?.data?.employees || [];
        if (reset) {
          setEmployees(data);
          setOffset(data.length);
          setHasMore(data.length === limit);
        } else {
          setEmployees(prev => [...prev, ...data]);
          setOffset(prev => prev + data.length);
          setHasMore(data.length === limit);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load employees');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      searchQuery,
      selectedRoleId,
      selectedDeptId,
      offset,
      limit,
    ]
  );

  // ---- Trigger loading when search query or filters change (reset) ----
  useEffect(() => {
    setOffset(0); // reset pagination
    loadEmployees(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedRoleId, selectedDeptId]);

  // ---- Refresh / pull-to-refresh ----
  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    loadEmployees(true);
  };

  // ---- Load more (pagination) ----
  const loadMore = () => {
    if (!loading && hasMore && !refreshing) {
      // If we are in "search" mode (username lookup), there is no pagination
      if (searchQuery.trim().length > 0) return;
      loadEmployees(false, true);
    }
  };

  // ---- Clear all filters and search ----
  const clearFilters = () => {
    setSelectedRoleId(undefined);
    setSelectedDeptId(undefined);
    setSearchTerm('');
    setSearchQuery('');
  };

  // ---- Perform search (called on return key) ----
  const performSearch = () => {
    setSearchQuery(searchTerm);
  };

  // ---- Render employee item ----
  const renderItem = ({ item }: { item: CompanyEmployee }) => {
    const displayName = item.full_name || item.username || 'Unnamed';
    const employeeId = item.employee_id || 'N/A';

    const handlePress = () => {
      navigation.navigate('EmployeeDetail', { userId: item.user_id });
    };

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Card style={styles.card} elevation={2}>
          <Card.Content style={styles.cardContent}>
            <UserAvatar
              userId={item.user_id}
              username={item.username}
              fullName={item.full_name}
              size={48}
              style={styles.avatar}
            />
            <View style={styles.infoContainer}>
              <Text variant="titleMedium" style={styles.employeeName} numberOfLines={1}>
                {displayName}
              </Text>
              {item.username && (
                <Text variant="bodySmall" style={styles.employeeUsername} numberOfLines={1}>
                  @{item.username}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.employeeIdText} numberOfLines={1}>
                ID: {employeeId}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={TEXT_SECONDARY} style={styles.chevron} />
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // ---- Loading state for filters ----
  if (loadingFilters) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  // ---- Main render ----
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color={TEXT_SECONDARY} style={styles.searchIcon} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Search by exact username"
          placeholderTextColor={TEXT_SECONDARY}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          onSubmitEditing={performSearch}
          clearButtonMode="never"  // we handle clear ourselves
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              setSearchQuery('');  // <-- FIX: also clear the actual search query
            }}
            style={styles.clearIcon}
          >
            <Icon name="close" size={20} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setRoleModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>
            {selectedRoleId
              ? roles.find(r => r.role_id === selectedRoleId)?.role_name || 'Role'
              : 'All Roles'}
          </Text>
          <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setDeptModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>
            {selectedDeptId
              ? departments.find(d => d.department_id === selectedDeptId)?.department_name || 'Department'
              : 'All Departments'}
          </Text>
          <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
        </TouchableOpacity>

        {(selectedRoleId || selectedDeptId || searchQuery) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading && employees.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-search" size={64} color={TEXT_SECONDARY} />
              <Text style={styles.emptyText}>
                {searchQuery || selectedRoleId || selectedDeptId
                  ? 'No employees found matching your criteria'
                  : 'Search for an employee by exact username'}
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && employees.length > 0 ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      {/* Role Filter Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Filter by Role
              </Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ role_id: '', role_name: 'All Roles' }, ...roles]}
              keyExtractor={(item) => item.role_id || 'all'}
              renderItem={({ item }) => {
                const isSelected = selectedRoleId === item.role_id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedRoleId(item.role_id || undefined);
                      setRoleModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.role_name}
                    </Text>
                    {isSelected && <Icon name="check" size={20} color={PRIMARY_COLOR} />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Department Filter Modal */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Filter by Department
              </Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ department_id: '', department_name: 'All Departments' }, ...departments]}
              keyExtractor={(item) => item.department_id || 'all'}
              renderItem={({ item }) => {
                const isSelected = selectedDeptId === item.department_id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedDeptId(item.department_id || undefined);
                      setDeptModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item.department_name}
                    </Text>
                    {isSelected && <Icon name="check" size={20} color={PRIMARY_COLOR} />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---- Styles (unchanged) ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  clearIcon: {
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginRight: 4,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  avatar: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
    fontSize: 16,
  },
  employeeUsername: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 1,
  },
  employeeIdText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: SELECTED_ITEM_BG,
  },
  modalItemText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  modalItemTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});