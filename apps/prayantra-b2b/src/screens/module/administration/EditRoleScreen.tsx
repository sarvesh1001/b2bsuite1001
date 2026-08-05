// apps/prayantra-b2b/src/screens/module/administration/EditRoleScreen.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Checkbox, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getRole,
  updateRole,
  getRootDepartments,
  getRolePermissionsDetailed,
  getRoleDepartments,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
  SELECTED_ITEM_BG,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type EditRoleRouteProp = RouteProp<RootStackParamList, 'EditRole'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'EditRole'>;

// ---------- Zod schema ----------
const schema = z.object({
  role_name: z.string().min(1, 'Role name is required').optional(),
  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000')
    .optional(),
  description: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;
type DepartmentItem = { department_id: string; department_name: string; module_code?: string };
type PermissionItem = { permission_name: string; description: string; module: string };

export default function EditRoleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditRoleRouteProp>();
  const { roleId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  // All departments (for modal lists)
  const [allDepartments, setAllDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Original fetched state (for delta computation)
  const [originalDepartmentIds, setOriginalDepartmentIds] = useState<string[]>([]);
  const [originalPermissionNames, setOriginalPermissionNames] = useState<string[]>([]);

  // Current selection state (editable)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  // Permission cache (module -> PermissionItem[])
  const [permissionCache, setPermissionCache] = useState<Record<string, PermissionItem[]>>({});

  // ---------- Department modal state ----------
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [tempDeptIds, setTempDeptIds] = useState<string[]>([]);

  // ---------- Permission modal state ----------
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [tempPermsForModule, setTempPermsForModule] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // ---------- Form ----------
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_name: '',
      role_level: 100,
      description: '',
    },
  });

  // ---------- Fetch data ----------
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId) {
        Alert.alert('Error', 'Missing authentication');
        navigation.goBack();
        return;
      }
      setLoading(true);
      setLoadingDepartments(true);
      try {
        const [roleRes, deptRes, permRes, roleDeptRes] = await Promise.all([
          getRole(companyId, deviceId!, roleId, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
          getRolePermissionsDetailed(companyId, deviceId!, roleId, accessToken),
          getRoleDepartments(companyId, deviceId!, roleId, accessToken),
        ]);

        const role = roleRes.data;
        if (!role) {
          Alert.alert('Not Found', 'Role not found');
          navigation.goBack();
          return;
        }

        setIsSystemRole(role.is_system_role);
        setAllDepartments(deptRes.data || []);

        // Original department IDs
        const deptIds = (roleDeptRes.data || []).map(d => d.department_id);
        setOriginalDepartmentIds(deptIds);
        setSelectedDepartmentIds(deptIds);

        // Original permissions: group by module
        const perms = permRes.data || [];
        const permNames = perms.map(p => p.permission_name);
        setOriginalPermissionNames(permNames);
        const grouped: Record<string, string[]> = {};
        perms.forEach(p => {
          const mod = p.module || 'other';
          if (!grouped[mod]) grouped[mod] = [];
          grouped[mod].push(p.permission_name);
        });
        setSelectedPermissions(grouped);

        // Cache permissions for modules
        const cache: Record<string, PermissionItem[]> = {};
        perms.forEach(p => {
          const mod = p.module || 'other';
          if (!cache[mod]) cache[mod] = [];
          cache[mod].push(p);
        });
        setPermissionCache(cache);

        reset({
          role_name: role.role_name,
          role_level: role.role_level,
          description: role.description || '',
        });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load role');
        navigation.goBack();
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };
    fetchData();
  }, [roleId]);

  // ---------- Helper: fetch permissions for a module (if not cached) ----------
  const fetchPermissionsForModule = useCallback(
    async (moduleCode: string): Promise<PermissionItem[]> => {
      if (permissionCache[moduleCode]) {
        return permissionCache[moduleCode];
      }
      if (!accessToken || !companyId) return [];
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Device-ID': deviceId!,
              'X-Company-ID': companyId,
            },
          }
        );
        const json = await response.json();
        const data = json.data || [];
        setPermissionCache(prev => ({ ...prev, [moduleCode]: data }));
        return data;
      } catch (error) {
        console.error('Failed to fetch permissions', error);
        Alert.alert('Error', 'Could not load permissions');
        return [];
      }
    },
    [accessToken, companyId, deviceId, permissionCache]
  );

  // ---------- Department modal handlers ----------
  const openDeptModal = () => {
    setTempDeptIds([...selectedDepartmentIds]);
    setDeptModalVisible(true);
  };

  const toggleTempDept = (id: string) => {
    setTempDeptIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleAllTempDepts = () => {
    if (tempDeptIds.length === allDepartments.length) {
      setTempDeptIds([]);
    } else {
      setTempDeptIds(allDepartments.map(d => d.department_id));
    }
  };

  const confirmDepartments = () => {
    setSelectedDepartmentIds(tempDeptIds);
    setDeptModalVisible(false);
  };

  // ---------- Permission modal handlers ----------
  const openPermissionModal = () => {
    if (selectedDepartmentIds.length === 0) {
      Alert.alert('No departments', 'Please select at least one department first.');
      return;
    }
    setPermModalVisible(true);
    setCurrentModule(null);
  };

  const closePermissionModal = () => {
    setPermModalVisible(false);
    setCurrentModule(null);
  };

  // When a department is tapped in the department list (inside permission modal)
  const handleDepartmentSelect = async (dept: DepartmentItem) => {
    if (!dept.module_code) {
      Alert.alert('No module', 'This department does not have a module assigned.');
      return;
    }
    setCurrentModule(dept.module_code);
    setLoadingPermissions(true);
    // Ensure we have the permissions list in cache
    await fetchPermissionsForModule(dept.module_code);
    // Load existing selections for this module
    setTempPermsForModule(selectedPermissions[dept.module_code] || []);
    setLoadingPermissions(false);
  };

  const toggleTempPermission = (permName: string) => {
    setTempPermsForModule(prev =>
      prev.includes(permName) ? prev.filter(p => p !== permName) : [...prev, permName]
    );
  };

  const toggleAllTempPermissions = () => {
    if (!currentModule) return;
    const perms = permissionCache[currentModule] || [];
    const allPermNames = perms.map(p => p.permission_name);
    const allSelected = allPermNames.every(p => tempPermsForModule.includes(p));
    if (allSelected) {
      setTempPermsForModule([]);
    } else {
      setTempPermsForModule(allPermNames);
    }
  };

  const saveModulePermissions = () => {
    if (!currentModule) return;
    setSelectedPermissions(prev => ({
      ...prev,
      [currentModule]: tempPermsForModule,
    }));
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const cancelDepartmentPermissions = () => {
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const confirmAllPermissions = () => {
    setPermModalVisible(false);
    setCurrentModule(null);
  };

  // ---------- Submit ----------
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) return;
    setSaving(true);
    try {
      // Compute add/remove department IDs
      const addDeptIds = selectedDepartmentIds.filter(id => !originalDepartmentIds.includes(id));
      const removeDeptIds = originalDepartmentIds.filter(id => !selectedDepartmentIds.includes(id));

      // 🔥 Map IDs to names (backend expects department names)
      const addDeptNames = addDeptIds.map(id => {
        const dept = allDepartments.find(d => d.department_id === id);
        return dept ? dept.department_name : id; // fallback to ID if not found (shouldn't happen)
      });
      const removeDeptNames = removeDeptIds.map(id => {
        const dept = allDepartments.find(d => d.department_id === id);
        return dept ? dept.department_name : id;
      });

      // Compute add/remove permissions (already names)
      const allSelectedPerms = Object.values(selectedPermissions).flat();
      const addPerms = allSelectedPerms.filter(p => !originalPermissionNames.includes(p));
      const removePerms = originalPermissionNames.filter(p => !allSelectedPerms.includes(p));

      const payload: any = {
        role_name: data.role_name,
        description: data.description,
        add_departments: addDeptNames,      // names, not IDs
        remove_departments: removeDeptNames,
        add_permissions: addPerms,
        remove_permissions: removePerms,
      };
      if (data.role_level !== undefined) payload.role_level = data.role_level;

      await updateRole(companyId, deviceId!, roleId, payload, accessToken);
      Alert.alert('Success', 'Role updated successfully');
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Loading screen ----------
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  // ---------- Render ----------
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top || 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* System role warning */}
        {isSystemRole && (
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>
              ⚠️ This is a system role. You can update its name, level, and description, but it cannot be deleted.
            </Text>
          </View>
        )}

        {/* Role Name */}
        <Controller
          control={control}
          name="role_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Role Name *"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              error={!!errors.role_name}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.role_name && <Text style={styles.error}>{errors.role_name.message}</Text>}

        {/* Role Level */}
        <Controller
          control={control}
          name="role_level"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Role Level * (1-1000)"
              mode="outlined"
              value={String(value || '')}
              onChangeText={(text) => {
                const num = Number(text);
                if (text === '' || isNaN(num)) {
                  onChange(undefined);
                } else {
                  onChange(Math.min(Math.max(1, num), 1000));
                }
              }}
              onBlur={onBlur}
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.role_level}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.role_level && <Text style={styles.error}>{errors.role_level.message}</Text>}

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Description (optional)"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* ---------- Department Selection ---------- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              Departments ({selectedDepartmentIds.length} selected)
            </Text>
            <TouchableOpacity style={styles.selectButton} onPress={openDeptModal}>
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
          {selectedDepartmentIds.length === 0 ? (
            <Text style={styles.emptyText}>No departments selected.</Text>
          ) : (
            <View style={styles.summaryChips}>
              {selectedDepartmentIds.slice(0, 5).map(id => {
                const dept = allDepartments.find(d => d.department_id === id);
                return dept ? (
                  <Chip key={id} style={styles.summaryChip} textStyle={styles.summaryChipText}>
                    {dept.department_name}
                  </Chip>
                ) : null;
              })}
              {selectedDepartmentIds.length > 5 && (
                <Chip style={styles.summaryChip} textStyle={styles.summaryChipText}>
                  +{selectedDepartmentIds.length - 5} more
                </Chip>
              )}
            </View>
          )}
        </View>

        {/* ---------- Permission Selection ---------- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              Permissions ({Object.values(selectedPermissions).flat().length} selected)
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={openPermissionModal}
              disabled={selectedDepartmentIds.length === 0}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
          {Object.keys(selectedPermissions).length === 0 ? (
            <Text style={styles.emptyText}>No permissions selected.</Text>
          ) : (
            <View style={styles.summaryChips}>
              {Object.entries(selectedPermissions).slice(0, 5).map(([module, perms]) => (
                <Chip key={module} style={styles.summaryChip} textStyle={styles.summaryChipText}>
                  {module}: {perms.length}
                </Chip>
              ))}
              {Object.keys(selectedPermissions).length > 5 && (
                <Chip style={styles.summaryChip} textStyle={styles.summaryChipText}>
                  +{Object.keys(selectedPermissions).length - 5} more modules
                </Chip>
              )}
            </View>
          )}
        </View>

        {/* Update Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.8}
            style={styles.gradientButton}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradient}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Update Role</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ---------- DEPARTMENT SELECTION MODAL ---------- */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.deptModalContent]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Departments
              </Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectAllRow}>
              <TouchableOpacity style={styles.selectAllButton} onPress={toggleAllTempDepts}>
                <Checkbox
                  status={
                    tempDeptIds.length === allDepartments.length && allDepartments.length > 0
                      ? 'checked'
                      : 'unchecked'
                  }
                  onPress={toggleAllTempDepts}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.selectAllLabel}>Select All</Text>
              </TouchableOpacity>
            </View>

            {loadingDepartments ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={allDepartments}
                keyExtractor={(item) => item.department_id}
                renderItem={({ item }) => {
                  const checked = tempDeptIds.includes(item.department_id);
                  return (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => toggleTempDept(item.department_id)}
                    >
                      <View style={styles.modalItemRow}>
                        <Checkbox
                          status={checked ? 'checked' : 'unchecked'}
                          onPress={() => toggleTempDept(item.department_id)}
                          color={PRIMARY_COLOR}
                        />
                        <Text style={styles.modalItemText}>{item.department_name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.modalList}
              />
            )}

            <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmDepartments}>
              <Text style={styles.modalConfirmText}>
                Confirm ({tempDeptIds.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---------- PERMISSION SELECTION MODAL ---------- */}
      <Modal
        visible={permModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePermissionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.permissionModalContent]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                {currentModule
                  ? `Permissions for ${allDepartments.find(d => d.module_code === currentModule)?.department_name || currentModule}`
                  : 'Select Permissions by Department'}
              </Text>
              <TouchableOpacity onPress={closePermissionModal}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            {currentModule === null ? (
              // ---------- DEPARTMENT LIST (to choose module) ----------
              <>
                <View style={styles.moduleListContainer}>
                  <Text style={styles.subLabel}>
                    Choose a department to assign permissions:
                  </Text>
                  {selectedDepartmentIds.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyText}>No departments selected.</Text>
                      <TouchableOpacity
                        style={styles.goToDepartmentButton}
                        onPress={() => {
                          setPermModalVisible(false);
                          openDeptModal();
                        }}
                      >
                        <Text style={styles.goToDepartmentButtonText}>Select Departments</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <FlatList
                      data={allDepartments.filter(d => selectedDepartmentIds.includes(d.department_id))}
                      keyExtractor={(item) => item.department_id}
                      renderItem={({ item }) => {
                        const moduleCode = item.module_code;
                        const count = moduleCode ? (selectedPermissions[moduleCode] || []).length : 0;
                        return (
                          <TouchableOpacity
                            style={styles.moduleListItem}
                            onPress={() => handleDepartmentSelect(item)}
                            disabled={!item.module_code}
                          >
                            <View style={styles.moduleListItemContent}>
                              <Text style={styles.moduleListName}>{item.department_name}</Text>
                              <View style={styles.moduleListBadge}>
                                <Text style={styles.moduleListBadgeText}>{count}</Text>
                              </View>
                            </View>
                            <Icon name="chevron-right" size={24} color={TEXT_SECONDARY} />
                          </TouchableOpacity>
                        );
                      }}
                      contentContainerStyle={styles.moduleList}
                    />
                  )}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.cancelButton]}
                    onPress={closePermissionModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.confirmButton]}
                    onPress={confirmAllPermissions}
                  >
                    <Text style={styles.confirmButtonText}>
                      Done ({Object.values(selectedPermissions).flat().length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // ---------- PERMISSION LIST FOR A MODULE ----------
              <>
                <View style={styles.permissionViewHeader}>
                  <TouchableOpacity onPress={cancelDepartmentPermissions} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={PRIMARY_COLOR} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={toggleAllTempPermissions}>
                    <Text style={styles.selectAllText}>
                      {tempPermsForModule.length === (permissionCache[currentModule] || []).length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingPermissions ? (
                  <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={permissionCache[currentModule] || []}
                    keyExtractor={(item) => item.permission_name}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    renderItem={({ item }) => {
                      const isChecked = tempPermsForModule.includes(item.permission_name);
                      return (
                        <TouchableOpacity
                          style={styles.gridItem}
                          onPress={() => toggleTempPermission(item.permission_name)}
                        >
                          <View style={styles.gridCheckbox}>
                            <Checkbox
                              status={isChecked ? 'checked' : 'unchecked'}
                              onPress={() => toggleTempPermission(item.permission_name)}
                              color={PRIMARY_COLOR}
                            />
                            <Text style={styles.gridItemText} numberOfLines={2}>
                              {item.permission_name}
                            </Text>
                          </View>
                          {item.description && (
                            <Text style={styles.gridItemDesc} numberOfLines={1}>
                              {item.description}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    contentContainerStyle={styles.gridList}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No permissions for this module.</Text>
                    }
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.cancelButton]}
                    onPress={cancelDepartmentPermissions}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.confirmButton]}
                    onPress={saveModulePermissions}
                  >
                    <Text style={styles.confirmButtonText}>
                      Save ({tempPermsForModule.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  systemInfo: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  systemInfoText: {
    color: '#E65100',
    fontSize: 14,
  },
  input: {
    marginTop: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  textArea: {
    minHeight: 80,
  },
  error: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  selectButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryChip: {
    margin: 2,
    backgroundColor: SELECTED_ITEM_BG,
  },
  summaryChipText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
  },
  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  goToDepartmentButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
  },
  goToDepartmentButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
  },
  gradient: {
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
    letterSpacing: 0.5,
  },
  // ---- Modal styles (shared with CreateRoleScreen) ----
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
    maxHeight: '80%',
    flex: 1,
  },
  deptModalContent: {
    maxHeight: '80%',
    flex: 1,
  },
  permissionModalContent: {
    maxHeight: '85%',
    flex: 1,
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
  selectAllRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginLeft: 8,
  },
  modalConfirmButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // Permission modal specific
  moduleListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  moduleList: {
    paddingBottom: 12,
  },
  moduleListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  moduleListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleListName: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  moduleListBadge: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  moduleListBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  permissionViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: PRIMARY_COLOR,
    marginLeft: 4,
    fontSize: 14,
  },
  selectAllText: {
    color: PRIMARY_COLOR,
    fontWeight: '500',
    fontSize: 12,
  },
  gridList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  gridCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridItemText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginLeft: 4,
    flex: 1,
  },
  gridItemDesc: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
});