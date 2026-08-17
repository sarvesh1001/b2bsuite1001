import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Checkbox } from 'react-native-paper';
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
  createRole,
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
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type EditRoleRouteProp = RouteProp<RootStackParamList, 'EditRole'> & {
  params?: { roleId?: string };
};
type NavigationProp = StackNavigationProp<RootStackParamList, 'EditRole'>;

// Role level as string while editing
const schema = z.object({
  role_name: z.string().min(1, 'Role name is required'),
  role_level: z
    .string()
    .min(1, 'Role level is required')
    .refine(
      (value) => {
        const num = Number(value);
        return Number.isInteger(num) && num >= 1 && num <= 1000;
      },
      { message: 'Level must be between 1 and 1000' }
    ),
  description: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;
type DepartmentItem = { department_id: string; department_name: string; module_code?: string };
type PermissionItem = { permission_name: string; description: string; module: string };

export default function EditRoleScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditRoleRouteProp>();
  const roleId = route.params?.roleId;
  const isCreateMode = !roleId || roleId === 'new';

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  const [allDepartments, setAllDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [originalDepartmentIds, setOriginalDepartmentIds] = useState<string[]>([]);
  const [originalPermissionNames, setOriginalPermissionNames] = useState<string[]>([]);

  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
  const [permissionCache, setPermissionCache] = useState<Record<string, PermissionItem[]>>({});

  // Department modal
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [tempDeptIds, setTempDeptIds] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Permission modal
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [tempPermsForModule, setTempPermsForModule] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role_name: '', role_level: '100', description: '' },
  });

  const fetchedRef = useRef(false);
  const permissionsLoadedRef = useRef<Record<string, boolean>>({});

  // ---- Load all module permissions once ----
  const loadAllModulePermissions = useCallback(
    async (departments: DepartmentItem[]) => {
      if (!accessToken || !companyId || !deviceId) return;

      const moduleCodes = [
        ...new Set(
          departments
            .map((dept) => dept.module_code)
            .filter((code): code is string => !!code)
        ),
      ];

      const modulesToLoad = moduleCodes.filter(
        (moduleCode) => !permissionsLoadedRef.current[moduleCode]
      );

      if (modulesToLoad.length === 0) return;

      try {
        const results = await Promise.all(
          modulesToLoad.map(async (moduleCode) => {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'X-Device-ID': deviceId,
                  'X-Company-ID': companyId,
                },
              }
            );
            if (!response.ok) {
              throw new Error(`Failed to load permissions for ${moduleCode}`);
            }
            const json = await response.json();
            return { moduleCode, permissions: json.data || [] };
          })
        );

        setPermissionCache((prev) => {
          const next = { ...prev };
          results.forEach(({ moduleCode, permissions }) => {
            next[moduleCode] = permissions;
            permissionsLoadedRef.current[moduleCode] = true;
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load module permissions:', error);
        Alert.alert('Unable to Load Permissions', 'Could not load all permissions. Some may be missing.');
      }
    },
    [accessToken, companyId, deviceId]
  );

  // ---- Initial data fetch ----
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Authentication Required', 'Your authentication session is missing.');
        navigation.goBack();
        return;
      }

      setLoading(true);
      setLoadingDepartments(true);

      try {
        // 1) Load departments
        const deptRes = await getRootDepartments(companyId, deviceId, accessToken);
        const departments = deptRes.data || [];
        setAllDepartments(departments);

        // 2) Load all module permissions once (cached)
        await loadAllModulePermissions(departments);

        // 3) If create mode, set defaults and finish
        if (isCreateMode) {
          reset({
            role_name: '',
            role_level: '100',
            description: '',
          });
          setSelectedDepartmentIds([]);
          setSelectedPermissions({});
          setOriginalDepartmentIds([]);
          setOriginalPermissionNames([]);
          setIsSystemRole(false);
          setLoading(false);
          setLoadingDepartments(false);
          fetchedRef.current = true;
          return;
        }

        // 4) Edit mode: load role, permissions, departments
        const [roleRes, permRes, roleDeptRes] = await Promise.all([
          getRole(companyId, deviceId, roleId!, accessToken),
          getRolePermissionsDetailed(companyId, deviceId, roleId!, accessToken),
          getRoleDepartments(companyId, deviceId, roleId!, accessToken),
        ]);

        const role = roleRes.data;
        if (!role) {
          Alert.alert('Role Not Found', 'The requested role could not be found.');
          navigation.goBack();
          return;
        }

        setIsSystemRole(role.is_system_role);

        const deptIds = (roleDeptRes.data || []).map((d) => d.department_id);
        setOriginalDepartmentIds(deptIds);
        setSelectedDepartmentIds(deptIds);

        const perms = permRes.data || [];
        const permNames = perms.map((p) => p.permission_name);
        setOriginalPermissionNames(permNames);

        const grouped: Record<string, string[]> = {};
        perms.forEach((p) => {
          const mod = p.module || 'other';
          if (!grouped[mod]) grouped[mod] = [];
          grouped[mod].push(p.permission_name);
        });
        setSelectedPermissions(grouped);

        reset({
          role_name: role.role_name,
          role_level: String(role.role_level ?? ''),
          description: role.description || '',
        });

        fetchedRef.current = true;
      } catch (error: any) {
        console.error('Failed to load data:', error);
        Alert.alert('Unable to Load', error?.message || 'Something went wrong while loading.');
        navigation.goBack();
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };

    if (!fetchedRef.current) {
      fetchData();
    }
  }, [roleId, accessToken, companyId, deviceId, navigation, reset, isCreateMode, loadAllModulePermissions]);

  // ---- Memoized selections ----
  const selectedDepartments = useMemo(
    () => allDepartments.filter((dept) => selectedDepartmentIds.includes(dept.department_id)),
    [allDepartments, selectedDepartmentIds]
  );

  const filteredDepartments = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();
    if (!query) return allDepartments;
    return allDepartments.filter((dept) =>
      dept.department_name.toLowerCase().includes(query)
    );
  }, [allDepartments, departmentSearch]);

  const totalPermissionCount = useMemo(
    () =>
      Object.values(selectedPermissions).reduce(
        (total, permissions) => total + permissions.length,
        0
      ),
    [selectedPermissions]
  );

  // ---- Department modal handlers ----
  const openDeptModal = () => {
    setTempDeptIds([...selectedDepartmentIds]);
    setDepartmentSearch('');
    setDeptModalVisible(true);
  };

  const toggleTempDept = (id: string) => {
    setTempDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleAllTempDepts = () => {
    if (tempDeptIds.length === allDepartments.length) {
      setTempDeptIds([]);
    } else {
      setTempDeptIds(allDepartments.map((d) => d.department_id));
    }
  };

  const confirmDepartments = () => {
    setSelectedDepartmentIds(tempDeptIds);
    setDeptModalVisible(false);
  };

  // ---- Permission modal handlers ----
  const openPermissionModal = () => {
    if (selectedDepartmentIds.length === 0) {
      Alert.alert(
        'Select Department First',
        'Please select at least one department before assigning permissions.'
      );
      return;
    }
    setPermissionSearch('');
    setCurrentModule(null);
    setPermModalVisible(true);
  };

  const closePermissionModal = () => {
    setPermModalVisible(false);
    setCurrentModule(null);
    setPermissionSearch('');
  };

  // No API call – all permissions already cached
  const handleDepartmentSelect = (dept: DepartmentItem) => {
    if (!dept.module_code) {
      Alert.alert('Module Not Assigned', 'This department does not have a module assigned.');
      return;
    }
    const moduleCode = dept.module_code;
    setCurrentModule(moduleCode);
    setPermissionSearch('');
    setTempPermsForModule(selectedPermissions[moduleCode] || []);
  };

  const toggleTempPermission = (permissionName: string) => {
    setTempPermsForModule((prev) =>
      prev.includes(permissionName)
        ? prev.filter((p) => p !== permissionName)
        : [...prev, permissionName]
    );
  };

  const toggleAllTempPermissions = () => {
    if (!currentModule) return;
    const permissions = permissionCache[currentModule] || [];
    const names = permissions.map((p) => p.permission_name);
    const allSelected = names.length > 0 && names.every((name) => tempPermsForModule.includes(name));
    setTempPermsForModule(allSelected ? [] : names);
  };

  const saveModulePermissions = () => {
    if (!currentModule) return;
    const module = currentModule;
    const permissions = [...tempPermsForModule];
    setSelectedPermissions((prev) => ({
      ...prev,
      [module]: permissions,
    }));
    setCurrentModule(null);
    setTempPermsForModule([]);
    setPermissionSearch('');
  };

  const cancelDepartmentPermissions = () => {
    setCurrentModule(null);
    setTempPermsForModule([]);
    setPermissionSearch('');
  };

  const confirmAllPermissions = () => {
    setPermModalVisible(false);
    setCurrentModule(null);
    setPermissionSearch('');
  };

  const currentPermissions = currentModule ? permissionCache[currentModule] || [] : [];
  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return currentPermissions;
    return currentPermissions.filter(
      (permission) =>
        permission.permission_name.toLowerCase().includes(query) ||
        permission.description?.toLowerCase().includes(query)
    );
  }, [currentPermissions, permissionSearch]);

  // ---- SUBMIT (fixed for create vs update) ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Authentication Required', 'Your session has expired.');
      return;
    }
  
    setSaving(true);
  
    try {
      // Compute selected permissions (only for departments that are currently selected)
      const selectedModuleCodes = new Set(
        allDepartments
          .filter((dept) => selectedDepartmentIds.includes(dept.department_id))
          .map((dept) => dept.module_code)
          .filter((code): code is string => !!code)
      );
  
      const allSelectedPerms = Object.entries(selectedPermissions)
        .filter(([moduleCode]) => selectedModuleCodes.has(moduleCode))
        .flatMap(([, permissions]) => permissions);
  
      if (isCreateMode) {
        // ---- CREATE: uses department_ids and permission_names ----
        const payload = {
          role_name: data.role_name,
          role_level: Number(data.role_level), // ✅ always a number
          description: data.description || '',
          department_ids: selectedDepartmentIds,
          permission_names: allSelectedPerms,
        };
  
        await createRole(companyId, deviceId, payload, accessToken);
  
        Alert.alert(
          'Role Created',
          'The new role has been created successfully.',
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
        return;
      }
  
      // ---- UPDATE: uses add/remove with names ----
      const deptIdToName = Object.fromEntries(
        allDepartments.map((d) => [d.department_id, d.department_name])
      );
  
      const addDeptIds = selectedDepartmentIds.filter((id) => !originalDepartmentIds.includes(id));
      const removeDeptIds = originalDepartmentIds.filter((id) => !selectedDepartmentIds.includes(id));
  
      const addDeptNames = addDeptIds.map((id) => deptIdToName[id]).filter(Boolean);
      const removeDeptNames = removeDeptIds.map((id) => deptIdToName[id]).filter(Boolean);
  
      const addPerms = allSelectedPerms.filter(
        (permission) => !originalPermissionNames.includes(permission)
      );
      const removePerms = originalPermissionNames.filter(
        (permission) => !allSelectedPerms.includes(permission)
      );
  
      const payload = {
        role_name: data.role_name,
        role_level: Number(data.role_level), // ✅ always a number
        description: data.description || '',
        add_departments: addDeptNames,
        remove_departments: removeDeptNames,
        add_permissions: addPerms,
        remove_permissions: removePerms,
      };
  
      await updateRole(companyId, deviceId, roleId!, payload, accessToken);
  
      Alert.alert(
        'Role Updated',
        'The role has been updated successfully.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
  
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to save the role.';
      Alert.alert('Save Failed', message);
    } finally {
      setSaving(false);
    }
  };
  // ---- Loading screen ----
  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon name="account-edit-outline" size={30} color={PRIMARY_COLOR} />
          </View>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginTop: 18 }} />
          <Text style={styles.loadingTitle}>
            {isCreateMode ? 'Preparing new role' : 'Loading role'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {isCreateMode ? 'Loading departments...' : 'Preparing role settings...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Main render (unchanged except for the submit) ----
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      {/* HEADER */}
      <LinearGradient colors={GRADIENT_COLORS} start={GRADIENT_START} end={GRADIENT_END} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerEyebrow}>ADMINISTRATION</Text>
            <Text style={styles.headerTitle}>{isCreateMode ? 'Create Role' : 'Edit Role'}</Text>
          </View>
          <View style={styles.headerRoleIcon}>
            <Icon name="shield-account-outline" size={22} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* System role notice */}
        {!isCreateMode && isSystemRole && (
          <View style={styles.systemNotice}>
            <View style={styles.systemNoticeIcon}>
              <Icon name="shield-alert-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.systemNoticeContent}>
              <Text style={styles.systemNoticeTitle}>System Role</Text>
              <Text style={styles.systemNoticeText}>
                This role is protected by the system. You can modify its information and permissions,
                but it cannot be deleted.
              </Text>
            </View>
          </View>
        )}

        {/* ROLE INFORMATION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="account-edit-outline" size={20} color={PRIMARY_COLOR} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Role Information</Text>
              <Text style={styles.sectionSubtitle}>Basic details about this role</Text>
            </View>
          </View>

          {/* Role Name */}
          <Controller
            control={control}
            name="role_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Role Name"
                mode="outlined"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                error={!!errors.role_name}
                activeOutlineColor={PRIMARY_COLOR}
                outlineColor="#D9DEE7"
                textColor={TEXT_PRIMARY}
                theme={{ roundness: 12 }}
              />
            )}
          />
          {errors.role_name && <Text style={styles.errorText}>{errors.role_name.message}</Text>}

          {/* Role Level – string handling */}
          <Controller
            control={control}
            name="role_level"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Role Level"
                mode="outlined"
                value={value ?? ''}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '');
                  onChange(numericText);
                }}
                onBlur={onBlur}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
                error={!!errors.role_level}
                activeOutlineColor={PRIMARY_COLOR}
                outlineColor="#D9DEE7"
                textColor={TEXT_PRIMARY}
                right={<TextInput.Affix text="/ 1000" />}
                theme={{ roundness: 12 }}
              />
            )}
          />
          {errors.role_level && <Text style={styles.errorText}>{errors.role_level.message}</Text>}

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Description"
                mode="outlined"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.descriptionInput]}
                activeOutlineColor={PRIMARY_COLOR}
                outlineColor="#D9DEE7"
                textColor={TEXT_PRIMARY}
                theme={{ roundness: 12 }}
              />
            )}
          />
        </View>

        {/* DEPARTMENTS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="office-building-outline" size={20} color={PRIMARY_COLOR} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Departments</Text>
              <Text style={styles.sectionSubtitle}>Choose departments this role can access</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{selectedDepartmentIds.length}</Text>
            </View>
          </View>

          {selectedDepartments.length > 0 ? (
            <View style={styles.selectedItems}>
              {selectedDepartments.slice(0, 6).map((dept) => (
                <View key={dept.department_id} style={styles.selectedChip}>
                  <Icon name="office-building-outline" size={14} color={PRIMARY_COLOR} />
                  <Text numberOfLines={1} style={styles.selectedChipText}>
                    {dept.department_name}
                  </Text>
                </View>
              ))}
              {selectedDepartments.length > 6 && (
                <View style={styles.moreChip}>
                  <Text style={styles.moreChipText}>+{selectedDepartments.length - 6} more</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptySelection}>
              <Icon name="office-building-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptySelectionText}>No departments selected</Text>
            </View>
          )}

          <TouchableOpacity style={styles.outlineAction} onPress={openDeptModal} activeOpacity={0.8}>
            <Icon name={selectedDepartments.length > 0 ? 'pencil-outline' : 'plus'} size={17} color={PRIMARY_COLOR} />
            <Text style={styles.outlineActionText}>
              {selectedDepartments.length > 0 ? 'Change Departments' : 'Select Departments'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PERMISSIONS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="shield-key-outline" size={20} color={PRIMARY_COLOR} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <Text style={styles.sectionSubtitle}>Control what this role can do</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalPermissionCount}</Text>
            </View>
          </View>

          {Object.keys(selectedPermissions).length > 0 ? (
            <View style={styles.permissionSummary}>
              {Object.entries(selectedPermissions)
                .filter(([, perms]) => perms.length > 0)
                .slice(0, 6)
                .map(([module, perms]) => (
                  <View key={module} style={styles.permissionRow}>
                    <View style={styles.permissionModuleIcon}>
                      <Icon name="shield-outline" size={15} color={PRIMARY_COLOR} />
                    </View>
                    <Text style={styles.permissionModuleName}>{module}</Text>
                    <View style={styles.permissionCount}>
                      <Text style={styles.permissionCountText}>{perms.length}</Text>
                    </View>
                  </View>
                ))}
              {Object.keys(selectedPermissions).filter(
                (module) => (selectedPermissions[module] || []).length > 0
              ).length > 6 && (
                <Text style={styles.morePermissions}>More permission modules selected</Text>
              )}
            </View>
          ) : (
            <View style={styles.emptySelection}>
              <Icon name="shield-off-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptySelectionText}>No permissions selected</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.outlineAction, selectedDepartmentIds.length === 0 && styles.disabledAction]}
            onPress={openPermissionModal}
            disabled={selectedDepartmentIds.length === 0}
            activeOpacity={0.8}
          >
            <Icon
              name="shield-key-outline"
              size={17}
              color={selectedDepartmentIds.length === 0 ? '#94A3B8' : PRIMARY_COLOR}
            />
            <Text style={[styles.outlineActionText, selectedDepartmentIds.length === 0 && styles.disabledActionText]}>
              Manage Permissions
            </Text>
          </TouchableOpacity>
          {selectedDepartmentIds.length === 0 && (
            <Text style={styles.helperText}>Select at least one department before assigning permissions.</Text>
          )}
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
          activeOpacity={0.88}
          style={styles.updateButtonWrapper}
        >
          <LinearGradient colors={GRADIENT_COLORS} start={GRADIENT_START} end={GRADIENT_END} style={styles.updateButton}>
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Icon name="content-save-outline" size={19} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>{isCreateMode ? 'Create Role' : 'Save Changes'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.bottomHint}>Changes will be applied to this role immediately.</Text>
      </ScrollView>

      {/* DEPARTMENT MODAL */}
      <Modal
        visible={deptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.departmentSheet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Departments</Text>
                <Text style={styles.modalSubtitle}>{tempDeptIds.length} selected</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setDeptModalVisible(false)}>
                <Icon name="close" size={21} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Icon name="magnify" size={19} color="#94A3B8" />
              <RNTextInput
                value={departmentSearch}
                onChangeText={setDepartmentSearch}
                placeholder="Search departments..."
                placeholderTextColor="#A1AAB7"
                style={styles.modalSearchInput}
              />
              {departmentSearch ? (
                <TouchableOpacity onPress={() => setDepartmentSearch('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity style={styles.selectAllCard} onPress={toggleAllTempDepts} activeOpacity={0.8}>
              <View style={styles.selectAllIcon}>
                <Icon name="select-all" size={19} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.selectAllTextContainer}>
                <Text style={styles.selectAllTitle}>Select All</Text>
                <Text style={styles.selectAllSubtitle}>{allDepartments.length} departments available</Text>
              </View>
              <Checkbox
                status={
                  tempDeptIds.length === allDepartments.length && allDepartments.length > 0 ? 'checked' : 'unchecked'
                }
                onPress={toggleAllTempDepts}
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>

            {loadingDepartments ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={styles.modalLoadingText}>Loading departments...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDepartments}
                keyExtractor={(item) => item.department_id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => {
                  const checked = tempDeptIds.includes(item.department_id);
                  return (
                    <TouchableOpacity
                      style={[styles.departmentItem, checked && styles.departmentItemSelected]}
                      onPress={() => toggleTempDept(item.department_id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.departmentItemIcon, checked && styles.departmentItemIconSelected]}>
                        <Icon name="office-building-outline" size={18} color={checked ? PRIMARY_COLOR : '#64748B'} />
                      </View>
                      <Text style={styles.departmentItemText} numberOfLines={1}>
                        {item.department_name}
                      </Text>
                      <Checkbox
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => toggleTempDept(item.department_id)}
                        color={PRIMARY_COLOR}
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Icon name="magnify-close" size={30} color="#94A3B8" />
                    <Text style={styles.modalEmptyTitle}>No departments found</Text>
                    <Text style={styles.modalEmptyText}>Try a different search.</Text>
                  </View>
                }
              />
            )}

            <SafeAreaView edges={['bottom']} style={{ marginTop: 'auto' }}>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={confirmDepartments} activeOpacity={0.85}>
                <Text style={styles.modalPrimaryButtonText}>Confirm Selection</Text>
                <View style={styles.modalButtonCount}>
                  <Text style={styles.modalButtonCountText}>{tempDeptIds.length}</Text>
                </View>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* PERMISSION MODAL */}
      <Modal
        visible={permModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePermissionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.permissionSheet]}>
            <View style={styles.modalHeader}>
              <View style={styles.permissionHeaderLeft}>
                {currentModule && (
                  <TouchableOpacity style={styles.modalBackButton} onPress={cancelDepartmentPermissions}>
                    <Icon name="arrow-left" size={20} color={PRIMARY_COLOR} />
                  </TouchableOpacity>
                )}
                <View>
                  <Text style={styles.modalTitle}>
                    {currentModule
                      ? allDepartments.find((d) => d.module_code === currentModule)?.department_name || currentModule
                      : 'Permissions'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {currentModule
                      ? `${tempPermsForModule.length} selected`
                      : 'Choose a department'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closePermissionModal}>
                <Icon name="close" size={21} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            {!currentModule ? (
              <>
                <View style={styles.permissionIntro}>
                  <View style={styles.permissionIntroIcon}>
                    <Icon name="shield-key-outline" size={22} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.permissionIntroText}>
                    <Text style={styles.permissionIntroTitle}>Choose a department</Text>
                    <Text style={styles.permissionIntroSubtitle}>
                      Select a department to manage its permissions.
                    </Text>
                  </View>
                </View>

                <FlatList
                  data={allDepartments.filter((d) => selectedDepartmentIds.includes(d.department_id))}
                  keyExtractor={(item) => item.department_id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.moduleList}
                  renderItem={({ item }) => {
                    const moduleCode = item.module_code;
                    const count = moduleCode ? (selectedPermissions[moduleCode] || []).length : 0;
                    return (
                      <TouchableOpacity
                        style={[styles.modulePermissionItem, !moduleCode && styles.disabledModuleItem]}
                        onPress={() => handleDepartmentSelect(item)}
                        disabled={!moduleCode}
                        activeOpacity={0.8}
                      >
                        <View style={styles.modulePermissionIcon}>
                          <Icon
                            name={moduleCode ? 'shield-account-outline' : 'shield-off-outline'}
                            size={21}
                            color={moduleCode ? PRIMARY_COLOR : '#94A3B8'}
                          />
                        </View>
                        <View style={styles.modulePermissionContent}>
                          <Text style={styles.modulePermissionName}>{item.department_name}</Text>
                          <Text style={styles.modulePermissionSubtitle}>
                            {moduleCode ? `${count} permissions selected` : 'No module assigned'}
                          </Text>
                        </View>
                        {moduleCode ? (
                          <View style={styles.permissionNumber}>
                            <Text style={styles.permissionNumberText}>{count}</Text>
                          </View>
                        ) : null}
                        <Icon name="chevron-right" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Icon name="office-building-remove-outline" size={32} color="#94A3B8" />
                      <Text style={styles.modalEmptyTitle}>No departments selected</Text>
                      <Text style={styles.modalEmptyText}>Select departments first.</Text>
                    </View>
                  }
                />

                <TouchableOpacity style={styles.modalPrimaryButton} onPress={confirmAllPermissions}>
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                  <View style={styles.modalButtonCount}>
                    <Text style={styles.modalButtonCountText}>{totalPermissionCount}</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modalSearch}>
                  <Icon name="magnify" size={19} color="#94A3B8" />
                  <RNTextInput
                    value={permissionSearch}
                    onChangeText={setPermissionSearch}
                    placeholder="Search permissions..."
                    placeholderTextColor="#A1AAB7"
                    style={styles.modalSearchInput}
                  />
                  {permissionSearch ? (
                    <TouchableOpacity onPress={() => setPermissionSearch('')}>
                      <Icon name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.permissionToolbar}>
                  <Text style={styles.permissionToolbarText}>{filteredPermissions.length} permissions</Text>
                  <TouchableOpacity onPress={toggleAllTempPermissions}>
                    <Text style={styles.selectAllText}>
                      {tempPermsForModule.length === currentPermissions.length && currentPermissions.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={filteredPermissions}
                  keyExtractor={(item) => item.permission_name}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.permissionList}
                  renderItem={({ item }) => {
                    const checked = tempPermsForModule.includes(item.permission_name);
                    return (
                      <TouchableOpacity
                        style={[styles.permissionItem, checked && styles.permissionItemSelected]}
                        onPress={() => toggleTempPermission(item.permission_name)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.permissionCheck, checked && styles.permissionCheckSelected]}>
                          <Checkbox
                            status={checked ? 'checked' : 'unchecked'}
                            onPress={() => toggleTempPermission(item.permission_name)}
                            color={PRIMARY_COLOR}
                          />
                        </View>
                        <View style={styles.permissionItemContent}>
                          <Text style={styles.permissionName} numberOfLines={2}>
                            {item.permission_name}
                          </Text>
                          {!!item.description && (
                            <Text style={styles.permissionDescription} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Icon name="shield-search-outline" size={32} color="#94A3B8" />
                      <Text style={styles.modalEmptyTitle}>No permissions found</Text>
                      <Text style={styles.modalEmptyText}>Try another search.</Text>
                    </View>
                  }
                />

                <TouchableOpacity style={styles.modalPrimaryButton} onPress={saveModulePermissions}>
                  <Text style={styles.modalPrimaryButtonText}>Save Permissions</Text>
                  <View style={styles.modalButtonCount}>
                    <Text style={styles.modalButtonCountText}>{tempPermsForModule.length}</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================== STYLES ==============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 45 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerEyebrow: { color: 'rgba(255,255,255,0.65)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { marginTop: 3, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerRoleIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  systemNotice: {
    flexDirection: 'row',
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  systemNoticeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  systemNoticeContent: { flex: 1, marginLeft: 10 },
  systemNoticeTitle: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  systemNoticeText: { marginTop: 4, color: '#A16207', fontSize: 10, lineHeight: 15, fontWeight: '500' },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  sectionHeaderText: { flex: 1, marginLeft: 10 },
  sectionTitle: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 9, fontWeight: '500' },
  countBadge: {
    minWidth: 30,
    height: 27,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  countBadgeText: { color: PRIMARY_COLOR, fontSize: 11, fontWeight: '800' },
  input: { marginTop: 11, backgroundColor: CARD_BACKGROUND },
  descriptionInput: { minHeight: 105, textAlignVertical: 'top' },
  errorText: { marginTop: 4, marginLeft: 4, color: ERROR_COLOR, fontSize: 10, fontWeight: '500' },
  selectedItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  selectedChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: `${PRIMARY_COLOR}0D`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}20`,
  },
  selectedChipText: { maxWidth: 150, marginLeft: 5, color: PRIMARY_COLOR, fontSize: 9, fontWeight: '600' },
  moreChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#F1F5F9' },
  moreChipText: { color: '#64748B', fontSize: 9, fontWeight: '600' },
  emptySelection: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DCE2EA',
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    marginBottom: 11,
  },
  emptySelectionText: { marginTop: 5, color: '#94A3B8', fontSize: 10, fontWeight: '500' },
  outlineAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}35`,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  outlineActionText: { marginLeft: 7, color: PRIMARY_COLOR, fontSize: 11, fontWeight: '700' },
  disabledAction: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  disabledActionText: { color: '#94A3B8' },
  helperText: { marginTop: 7, color: '#94A3B8', fontSize: 9, textAlign: 'center' },
  permissionSummary: { marginBottom: 11 },
  permissionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permissionModuleIcon: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}0C`,
  },
  permissionModuleName: { flex: 1, marginLeft: 8, color: TEXT_PRIMARY, fontSize: 11, fontWeight: '600' },
  permissionCount: {
    minWidth: 25,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  permissionCountText: { color: PRIMARY_COLOR, fontSize: 9, fontWeight: '700' },
  morePermissions: { marginTop: 8, color: TEXT_SECONDARY, fontSize: 9, fontWeight: '500', textAlign: 'center' },
  updateButtonWrapper: {
    marginTop: 7,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#5B2A97',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  updateButton: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  updateButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bottomHint: { marginTop: 10, color: '#94A3B8', fontSize: 9, fontWeight: '500', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
  modalSheet: { backgroundColor: CARD_BACKGROUND, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  departmentSheet: { height: '88%' },
  permissionSheet: { height: '91%' },
  modalHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF2',
  },
  permissionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  modalTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  modalSubtitle: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 9, fontWeight: '500' },
  closeButton: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalBackButton: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },
  modalSearch: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 13,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSearchInput: { flex: 1, marginLeft: 8, paddingVertical: 0, color: TEXT_PRIMARY, fontSize: 12 },
  selectAllCard: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}18`,
  },
  selectAllIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  selectAllTextContainer: { flex: 1, marginLeft: 9 },
  selectAllTitle: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '700' },
  selectAllSubtitle: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 8 },
  modalList: { paddingHorizontal: 16, paddingBottom: 12 },
  departmentItem: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  departmentItemSelected: { backgroundColor: `${PRIMARY_COLOR}08`, borderColor: `${PRIMARY_COLOR}25` },
  departmentItemIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
  },
  departmentItemIconSelected: { backgroundColor: `${PRIMARY_COLOR}12` },
  departmentItemText: { flex: 1, marginLeft: 9, color: TEXT_PRIMARY, fontSize: 11, fontWeight: '600' },
  modalLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalLoadingText: { marginTop: 10, color: TEXT_SECONDARY, fontSize: 10 },
  modalEmpty: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  modalEmptyTitle: { marginTop: 12, color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  modalEmptyText: { marginTop: 4, color: TEXT_SECONDARY, fontSize: 10 },
  modalPrimaryButton: {
    minHeight: 50,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  modalPrimaryButtonText: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center', marginLeft: 25 },
  modalButtonCount: {
    minWidth: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  modalButtonCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  permissionIntro: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}15`,
  },
  permissionIntroIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  permissionIntroText: { flex: 1, marginLeft: 9 },
  permissionIntroTitle: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '700' },
  permissionIntroSubtitle: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 9, lineHeight: 13 },
  moduleList: { paddingHorizontal: 16, paddingBottom: 10 },
  modulePermissionItem: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF0',
  },
  disabledModuleItem: { opacity: 0.55 },
  modulePermissionIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },
  modulePermissionContent: { flex: 1, marginLeft: 10 },
  modulePermissionName: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700' },
  modulePermissionSubtitle: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 8, fontWeight: '500' },
  permissionNumber: {
    minWidth: 27,
    height: 27,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  permissionNumberText: { color: PRIMARY_COLOR, fontSize: 9, fontWeight: '800' },
  permissionToolbar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },
  permissionToolbarText: { color: TEXT_SECONDARY, fontSize: 9, fontWeight: '600' },
  selectAllText: { color: PRIMARY_COLOR, fontSize: 10, fontWeight: '700' },
  permissionList: { paddingHorizontal: 16, paddingBottom: 10 },
  permissionItem: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF0',
  },
  permissionItemSelected: { backgroundColor: `${PRIMARY_COLOR}08`, borderColor: `${PRIMARY_COLOR}25` },
  permissionCheck: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
  },
  permissionCheckSelected: { backgroundColor: `${PRIMARY_COLOR}12` },
  permissionItemContent: { flex: 1, marginLeft: 8 },
  permissionName: { color: TEXT_PRIMARY, fontSize: 10, fontWeight: '700', lineHeight: 14 },
  permissionDescription: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 8, lineHeight: 12 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  loadingIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  loadingTitle: { marginTop: 13, color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  loadingSubtitle: { marginTop: 5, color: TEXT_SECONDARY, fontSize: 10 },
});