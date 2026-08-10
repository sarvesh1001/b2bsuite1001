// apps/prayantra-b2b/src/screens/module/administration/EditEmployeeScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Switch, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getEmployeeDetails,
  updateEmployee,
  getCompanyEmployees,
  listRoles,
  listPositions,
  findEmployeeByUsername,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import { UserAvatar } from '../../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
  ERROR_COLOR,
  SELECTED_ITEM_BG,
} from '../../../constants/colors';
import { Role, Position, CompanyEmployee } from '@b2b/shared-types';

type EditEmployeeRouteProp = RouteProp<RootStackParamList, 'EditEmployee'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'EditEmployee'>;

export default function EditEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditEmployeeRouteProp>();
  const { userId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [reportsTo, setReportsTo] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Dropdown options
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<CompanyEmployee[]>([]);

  // Reports To modal state
  const [reportsToModalVisible, setReportsToModalVisible] = useState(false);
  const [reportsToSearchTerm, setReportsToSearchTerm] = useState('');
  const [reportsToSearchQuery, setReportsToSearchQuery] = useState('');
  const [reportsToResults, setReportsToResults] = useState<CompanyEmployee[]>([]);
  const [reportsToLoading, setReportsToLoading] = useState(false);

  // Role modal state
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  // Position modal state
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [positionSearchTerm, setPositionSearchTerm] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // ─── Load managers (initial list for reports-to modal) ────────────────────
  const loadManagers = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getCompanyEmployees(companyId, deviceId, accessToken);
      const allEmployees = res.data?.employees || [];
      const filtered = allEmployees.filter(emp => emp.user_id !== userId);
      setManagers(filtered);
      setReportsToResults(filtered);
    } catch (error) {
      console.error('Failed to load managers', error);
    }
  }, [accessToken, companyId, deviceId, userId]);

  // ─── Search managers using exact username API (on submit) ────────────────
  const searchManagers = useCallback(async (query: string) => {
    // Guard: ensure all auth values are present
    if (!accessToken || !companyId || !deviceId) {
      setReportsToResults(managers);
      return;
    }
    // Guard against empty query
    if (!query || !query.trim()) {
      setReportsToResults(managers);
      return;
    }
    setReportsToLoading(true);
    try {
      const res = await findEmployeeByUsername(
        companyId,
        deviceId,
        query.trim(),
        accessToken
      );
      const employee = (res.data as any)?.employee || null;
      setReportsToResults(employee ? [employee] : []);
    } catch (error) {
      setReportsToResults([]);
    } finally {
      setReportsToLoading(false);
    }
  }, [companyId, deviceId, accessToken, managers]);

  // ─── Handle submit in reports-to search ────────────────────────────────────
  const handleReportsToSubmit = () => {
    setReportsToSearchQuery(reportsToSearchTerm);
    searchManagers(reportsToSearchTerm);
  };

  // ─── Clear reports-to search ──────────────────────────────────────────────
  const clearReportsToSearch = () => {
    setReportsToSearchTerm('');
    setReportsToSearchQuery('');
    setReportsToResults(managers);
    setReportsToLoading(false);
  };

  // ─── Load employee data on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Error', 'Missing authentication');
        navigation.goBack();
        return;
      }

      setLoading(true);
      try {
        const [employeeRaw, rolesRes, positionsRes] = await Promise.all([
          getEmployeeDetails(companyId, userId, deviceId, accessToken),
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          listPositions(companyId, deviceId, { offset: 0, limit: 100 }, accessToken),
        ]);

        const employee = employeeRaw as any;

        if (!employee) throw new Error('Employee data not found');

        setEmployeeId(employee.employee_id || '');
        setRoleId(employee.role_id || '');
        setPositionId(employee.position_id || '');
        setReportsTo(employee.reports_to ?? null);
        setIsActive(employee.is_active ?? true);

        setRoles(rolesRes.data?.roles || []);
        setPositions(positionsRes.data?.positions || []);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load data');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, accessToken, companyId, deviceId, navigation]);

  // ─── Load managers on mount ───────────────────────────────────────────────
  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  // ─── When reports-to modal opens, reset to full list ──────────────────────
  useEffect(() => {
    if (reportsToModalVisible) {
      setReportsToResults(managers);
      setReportsToSearchTerm('');
      setReportsToSearchQuery('');
      setReportsToLoading(false);
    }
  }, [reportsToModalVisible, managers]);

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!roleId) newErrors.roleId = 'Please select a role';
    if (!positionId) newErrors.positionId = 'Please select a position';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit update ──────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!validate()) return;
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employee_id: employeeId.trim(),
        role_id: roleId,
        position_id: positionId,
        reports_to: reportsTo || null,
        is_active: isActive,
      };

      await updateEmployee(companyId, userId, deviceId, accessToken, payload);
      Alert.alert('Success', 'Employee updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers for modals ───────────────────────────────────────────────────
  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(roleSearchTerm.toLowerCase())
  );

  const filteredPositions = positions.filter(pos =>
    pos.title.toLowerCase().includes(positionSearchTerm.toLowerCase())
  );

  const selectedRole = roles.find(r => r.role_id === roleId);
  const selectedPosition = positions.find(p => p.position_id === positionId);
  const selectedManager = managers.find(m => m.user_id === reportsTo);

  const selectedRoleName = selectedRole?.role_name || 'Select a role';
  const selectedPositionName = selectedPosition?.title || 'Select a position';
  const selectedManagerName = selectedManager
    ? selectedManager.full_name || selectedManager.username || selectedManager.user_id
    : 'None';

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.card}>
          {/* Employee ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={[styles.input, errors.employeeId && styles.inputError]}
              value={employeeId}
              onChangeText={setEmployeeId}
              placeholder="EMP-2024-001"
              placeholderTextColor={TEXT_SECONDARY}
              editable={false}
            />
            {errors.employeeId && <HelperText type="error">{errors.employeeId}</HelperText>}
          </View>

          {/* Role */}
          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <TouchableOpacity
              style={[styles.selector, errors.roleId && styles.inputError]}
              onPress={() => setRoleModalVisible(true)}
            >
              <Text style={styles.selectorText}>{selectedRoleName}</Text>
              <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
            {errors.roleId && <HelperText type="error">{errors.roleId}</HelperText>}
          </View>

          {/* Position */}
          <View style={styles.field}>
            <Text style={styles.label}>Position</Text>
            <TouchableOpacity
              style={[styles.selector, errors.positionId && styles.inputError]}
              onPress={() => setPositionModalVisible(true)}
            >
              <Text style={styles.selectorText}>{selectedPositionName}</Text>
              <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
            {errors.positionId && <HelperText type="error">{errors.positionId}</HelperText>}
          </View>

          {/* Reports To */}
          <View style={styles.field}>
            <Text style={styles.label}>Reports To</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setReportsToModalVisible(true)}
            >
              <Text style={styles.selectorText}>{selectedManagerName}</Text>
              <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Active Switch */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
              thumbColor={isActive ? PRIMARY_COLOR : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity onPress={handleUpdate} activeOpacity={0.8} disabled={saving}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>
                {saving ? 'Updating...' : 'Update Employee'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ====== ROLE MODAL (unchanged) ====== */}
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
                Select Role
              </Text>
              <View style={styles.modalHeaderActions}>
                {roleId && (
                  <TouchableOpacity
                    onPress={() => {
                      setRoleId('');
                      setRoleModalVisible(false);
                      setRoleSearchTerm('');
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                  <Icon name="close" size={24} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={24} color={TEXT_SECONDARY} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search roles..."
                placeholderTextColor={TEXT_SECONDARY}
                value={roleSearchTerm}
                onChangeText={setRoleSearchTerm}
              />
              {roleSearchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setRoleSearchTerm('')}>
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredRoles}
              keyExtractor={(item) => item.role_id}
              renderItem={({ item }) => {
                const isSelected = roleId === item.role_id;
                return (
                  <TouchableOpacity
                    style={[styles.managerItem, isSelected && styles.managerItemSelected]}
                    onPress={() => {
                      setRoleId(item.role_id);
                      setRoleModalVisible(false);
                      setRoleSearchTerm('');
                    }}
                  >
                    <View style={styles.managerItemContent}>
                      <Text style={styles.managerName}>{item.role_name}</Text>
                      {isSelected && (
                        <Icon name="check" size={20} color={PRIMARY_COLOR} style={styles.checkIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No roles found</Text>
                </View>
              }
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* ====== POSITION MODAL (unchanged) ====== */}
      <Modal
        visible={positionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPositionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Position
              </Text>
              <View style={styles.modalHeaderActions}>
                {positionId && (
                  <TouchableOpacity
                    onPress={() => {
                      setPositionId('');
                      setPositionModalVisible(false);
                      setPositionSearchTerm('');
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setPositionModalVisible(false)}>
                  <Icon name="close" size={24} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={24} color={TEXT_SECONDARY} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search positions..."
                placeholderTextColor={TEXT_SECONDARY}
                value={positionSearchTerm}
                onChangeText={setPositionSearchTerm}
              />
              {positionSearchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setPositionSearchTerm('')}>
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredPositions}
              keyExtractor={(item) => item.position_id}
              renderItem={({ item }) => {
                const isSelected = positionId === item.position_id;
                return (
                  <TouchableOpacity
                    style={[styles.managerItem, isSelected && styles.managerItemSelected]}
                    onPress={() => {
                      setPositionId(item.position_id);
                      setPositionModalVisible(false);
                      setPositionSearchTerm('');
                    }}
                  >
                    <View style={styles.managerItemContent}>
                      <Text style={styles.managerName}>{item.title}</Text>
                      {isSelected && (
                        <Icon name="check" size={20} color={PRIMARY_COLOR} style={styles.checkIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No positions found</Text>
                </View>
              }
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* ====== REPORTS TO MODAL (fixed) ====== */}
      <Modal
        visible={reportsToModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportsToModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Manager
              </Text>
              <View style={styles.modalHeaderActions}>
                {reportsTo && (
                  <TouchableOpacity
                    onPress={() => {
                      setReportsTo(null);
                      setReportsToModalVisible(false);
                      clearReportsToSearch();
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setReportsToModalVisible(false)}>
                  <Icon name="close" size={24} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar with submit */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={24} color={TEXT_SECONDARY} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by exact username"
                placeholderTextColor={TEXT_SECONDARY}
                value={reportsToSearchTerm}
                onChangeText={setReportsToSearchTerm}
                returnKeyType="search"
                onSubmitEditing={handleReportsToSubmit}
              />
              {reportsToSearchTerm.length > 0 && (
                <TouchableOpacity onPress={clearReportsToSearch}>
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleReportsToSubmit}
              style={styles.searchSubmitButton}
            >
              <Text style={styles.searchSubmitText}>Search</Text>
            </TouchableOpacity>

            {reportsToLoading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={reportsToResults}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => {
                  const isSelected = reportsTo === item.user_id;
                  const displayName = item.full_name || item.username || 'Unnamed';
                  return (
                    <TouchableOpacity
                      style={[styles.managerItem, isSelected && styles.managerItemSelected]}
                      onPress={() => {
                        setReportsTo(item.user_id);
                        setReportsToModalVisible(false);
                        clearReportsToSearch();
                      }}
                    >
                      <View style={styles.managerItemContent}>
                        <UserAvatar
                          userId={item.user_id}
                          username={item.username}
                          fullName={item.full_name}
                          size={44}
                          style={styles.avatar}
                        />
                        <View style={styles.managerInfo}>
                          <Text style={styles.managerName} numberOfLines={1}>
                            {displayName}
                          </Text>
                          {item.username && (
                            <Text style={styles.managerUsername} numberOfLines={1}>
                              @{item.username}
                            </Text>
                          )}
                          <Text style={styles.managerEmployeeId} numberOfLines={1}>
                            ID: {item.employee_id || 'N/A'}
                          </Text>
                        </View>
                        {isSelected && (
                          <Icon name="check" size={20} color={PRIMARY_COLOR} style={styles.checkIcon} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="account-off" size={40} color={TEXT_SECONDARY} />
                    <Text style={styles.emptyText}>
                      {reportsToSearchQuery ? 'No employee found' : 'No employees available'}
                    </Text>
                  </View>
                }
                contentContainerStyle={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: ERROR_COLOR,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  buttonWrapper: {
    marginTop: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 16,
  },
  clearButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: '500',
    fontSize: 14,
  },
  modalTitle: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  searchSubmitButton: {
    alignSelf: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 8,
  },
  searchSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  managerItem: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  managerItemSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: SELECTED_ITEM_BG,
  },
  managerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  avatar: {
    marginRight: 12,
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  managerUsername: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
  managerEmployeeId: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
});