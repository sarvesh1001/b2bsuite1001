import React, { useEffect, useState, useMemo } from 'react';
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

// Zod schema – arrays are required
const schema = z.object({
  role_name: z.string().min(1, 'Role name is required').optional(),
  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000')
    .optional(),
  description: z.string().nullable().optional(),
  add_departments: z.array(z.string()),
  remove_departments: z.array(z.string()),
  add_permissions: z.array(z.string()),
  remove_permissions: z.array(z.string()),
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

  // Current state fetched from API
  const [currentPermissions, setCurrentPermissions] = useState<PermissionItem[]>([]);
  const [currentDepartments, setCurrentDepartments] = useState<DepartmentItem[]>([]);

  // Permission picker state for ADD
  const [addModule, setAddModule] = useState<string>('');
  const [addPermissionsList, setAddPermissionsList] = useState<PermissionItem[]>([]);
  const [loadingAddPermissions, setLoadingAddPermissions] = useState(false);
  const [addPermissionModalVisible, setAddPermissionModalVisible] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [tempAddPermissions, setTempAddPermissions] = useState<string[]>([]);

  // Permission picker state for REMOVE
  const [removeModule, setRemoveModule] = useState<string>('');
  const [removePermissionsList, setRemovePermissionsList] = useState<PermissionItem[]>([]);
  const [loadingRemovePermissions, setLoadingRemovePermissions] = useState(false);
  const [removePermissionModalVisible, setRemovePermissionModalVisible] = useState(false);
  const [removeSearchQuery, setRemoveSearchQuery] = useState('');
  const [tempRemovePermissions, setTempRemovePermissions] = useState<string[]>([]);

  // Department modals
  const [addDeptModalVisible, setAddDeptModalVisible] = useState(false);
  const [removeDeptModalVisible, setRemoveDeptModalVisible] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      add_departments: [],
      remove_departments: [],
      add_permissions: [],
      remove_permissions: [],
    },
  });

  const addDeptIds = watch('add_departments') || [];
  const removeDeptIds = watch('remove_departments') || [];
  const addPermissions = watch('add_permissions') || [];
  const removePermissions = watch('remove_permissions') || [];

  // Get unique modules from departments (for module dropdown)
  const modules = useMemo(
    () => Array.from(new Set(allDepartments.map(d => d.module_code).filter(Boolean) as string[])),
    [allDepartments]
  );

  // Fetch role, permissions, and departments
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
        setCurrentPermissions(permRes.data || []);
        setCurrentDepartments(roleDeptRes.data || []);

        reset({
          role_name: role.role_name,
          role_level: role.role_level,
          description: role.description || '',
          add_departments: [],
          remove_departments: [],
          add_permissions: [],
          remove_permissions: [],
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

  // Fetch permissions for ADD
  const fetchAddPermissions = async (moduleCode: string) => {
    if (!accessToken || !companyId) return;
    setLoadingAddPermissions(true);
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
      setAddPermissionsList(json.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      Alert.alert('Error', 'Could not load permissions');
    } finally {
      setLoadingAddPermissions(false);
    }
  };

  // Fetch permissions for REMOVE
  const fetchRemovePermissions = async (moduleCode: string) => {
    if (!accessToken || !companyId) return;
    setLoadingRemovePermissions(true);
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
      setRemovePermissionsList(json.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      Alert.alert('Error', 'Could not load permissions');
    } finally {
      setLoadingRemovePermissions(false);
    }
  };

  // ---- HANDLERS FOR ADD PERMISSIONS ----
  const openAddPermissionPicker = () => {
    if (!addModule) {
      Alert.alert('Please select a module first');
      return;
    }
    setTempAddPermissions([...addPermissions]);
    setAddPermissionModalVisible(true);
  };

  const toggleTempAddPermission = (perm: string) => {
    setTempAddPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const confirmAddPermissions = () => {
    setValue('add_permissions', tempAddPermissions);
    setAddPermissionModalVisible(false);
  };

  const removeAddPermission = (perm: string) => {
    setValue('add_permissions', addPermissions.filter(p => p !== perm));
  };

  // ---- HANDLERS FOR REMOVE PERMISSIONS ----
  const openRemovePermissionPicker = () => {
    if (!removeModule) {
      Alert.alert('Please select a module first');
      return;
    }
    setTempRemovePermissions([...removePermissions]);
    setRemovePermissionModalVisible(true);
  };

  const toggleTempRemovePermission = (perm: string) => {
    setTempRemovePermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const confirmRemovePermissions = () => {
    setValue('remove_permissions', tempRemovePermissions);
    setRemovePermissionModalVisible(false);
  };

  const removeRemovePermission = (perm: string) => {
    setValue('remove_permissions', removePermissions.filter(p => p !== perm));
  };

  // ---- DEPARTMENT TOGGLE (for modals) ----
  const toggleDepartment = (id: string, list: 'add' | 'remove') => {
    const current = list === 'add' ? addDeptIds : removeDeptIds;
    if (current.includes(id)) {
      setValue(list === 'add' ? 'add_departments' : 'remove_departments', current.filter(d => d !== id));
    } else {
      setValue(list === 'add' ? 'add_departments' : 'remove_departments', [...current, id]);
    }
  };

  // ---- Toggle removal of a current department (chip close) ----
  const toggleRemoveCurrentDepartment = (deptId: string) => {
    const currentRemove = removeDeptIds;
    if (currentRemove.includes(deptId)) {
      // If already in remove list, remove it (undo)
      setValue('remove_departments', currentRemove.filter(id => id !== deptId));
    } else {
      setValue('remove_departments', [...currentRemove, deptId]);
    }
  };

  // ---- Toggle removal of a current permission (chip close) ----
  const toggleRemoveCurrentPermission = (permName: string) => {
    const currentRemove = removePermissions;
    if (currentRemove.includes(permName)) {
      setValue('remove_permissions', currentRemove.filter(p => p !== permName));
    } else {
      setValue('remove_permissions', [...currentRemove, permName]);
    }
  };

  // ---- SUBMIT ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) return;
    setSaving(true);
    try {
      const payload: any = {
        role_name: data.role_name,
        description: data.description,
        add_departments: data.add_departments,
        remove_departments: data.remove_departments,
        add_permissions: data.add_permissions,
        remove_permissions: data.remove_permissions,
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

  // ---- LOADING ----
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

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

        {/* ============ CURRENT PERMISSIONS ============ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current Permissions ({currentPermissions.length})</Text>
          {currentPermissions.length === 0 ? (
            <Text style={styles.emptyText}>No permissions currently assigned.</Text>
          ) : (
            <View style={styles.selectedPermissionsContainer}>
              {currentPermissions.map(perm => {
                const isBeingRemoved = removePermissions.includes(perm.permission_name);
                return (
                  <Chip
                    key={perm.permission_name}
                    onClose={() => toggleRemoveCurrentPermission(perm.permission_name)}
                    style={[styles.chip, isBeingRemoved && styles.chipRemoved]}
                    textStyle={[styles.chipText, isBeingRemoved && styles.chipRemovedText]}
                    closeIcon={isBeingRemoved ? 'undo' : 'close'}
                  >
                    {perm.permission_name}
                    {isBeingRemoved && ' (removing)'}
                  </Chip>
                );
              })}
            </View>
          )}
        </View>

        {/* ============ CURRENT DEPARTMENTS ============ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current Departments ({currentDepartments.length})</Text>
          {currentDepartments.length === 0 ? (
            <Text style={styles.emptyText}>No departments currently assigned.</Text>
          ) : (
            <View style={styles.selectedPermissionsContainer}>
              {currentDepartments.map(dept => {
                const isBeingRemoved = removeDeptIds.includes(dept.department_id);
                return (
                  <Chip
                    key={dept.department_id}
                    onClose={() => toggleRemoveCurrentDepartment(dept.department_id)}
                    style={[styles.chip, isBeingRemoved && styles.chipRemoved]}
                    textStyle={[styles.chipText, isBeingRemoved && styles.chipRemovedText]}
                    closeIcon={isBeingRemoved ? 'undo' : 'close'}
                  >
                    {dept.department_name}
                    {isBeingRemoved && ' (removing)'}
                  </Chip>
                );
              })}
            </View>
          )}
        </View>

        {/* ----- ADD DEPARTMENTS ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add More Departments</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setAddDeptModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {addDeptIds.length ? `${addDeptIds.length} selected` : 'Select departments to add'}
            </Text>
            <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* ----- REMOVE DEPARTMENTS (manual selection) ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Remove Departments (additional)</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setRemoveDeptModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {removeDeptIds.length ? `${removeDeptIds.length} selected` : 'Select departments to remove'}
            </Text>
            <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* ----- ADD PERMISSIONS ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add Permissions</Text>
          <View style={styles.moduleRow}>
            <View style={styles.moduleDropdownWrapper}>
              <TouchableOpacity
                style={[styles.dropdownButton, styles.moduleDropdown]}
                onPress={() => {
                  if (modules.length === 0) {
                    Alert.alert('No modules', 'Please select a department first');
                    return;
                  }
                  Alert.alert(
                    'Select Module',
                    'Choose a module to load permissions to add',
                    modules.map(m => ({
                      text: m,
                      onPress: () => {
                        setAddModule(m);
                        fetchAddPermissions(m);
                      },
                    }))
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownText, !addModule && styles.placeholderText]}>
                  {addModule || 'Select module'}
                </Text>
                <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.addPermissionButton}
              onPress={openAddPermissionPicker}
              disabled={!addModule}
            >
              <Icon name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {loadingAddPermissions && <ActivityIndicator size="small" color={PRIMARY_COLOR} />}
          {addPermissions.length > 0 && (
            <View style={styles.selectedPermissionsContainer}>
              {addPermissions.map(perm => (
                <Chip
                  key={perm}
                  onClose={() => removeAddPermission(perm)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {perm}
                </Chip>
              ))}
            </View>
          )}
        </View>

        {/* ----- REMOVE PERMISSIONS (manual selection) ----- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Remove Permissions (additional)</Text>
          <View style={styles.moduleRow}>
            <View style={styles.moduleDropdownWrapper}>
              <TouchableOpacity
                style={[styles.dropdownButton, styles.moduleDropdown]}
                onPress={() => {
                  if (modules.length === 0) {
                    Alert.alert('No modules', 'Please select a department first');
                    return;
                  }
                  Alert.alert(
                    'Select Module',
                    'Choose a module to load permissions to remove',
                    modules.map(m => ({
                      text: m,
                      onPress: () => {
                        setRemoveModule(m);
                        fetchRemovePermissions(m);
                      },
                    }))
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownText, !removeModule && styles.placeholderText]}>
                  {removeModule || 'Select module'}
                </Text>
                <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.addPermissionButton}
              onPress={openRemovePermissionPicker}
              disabled={!removeModule}
            >
              <Icon name="minus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {loadingRemovePermissions && <ActivityIndicator size="small" color={PRIMARY_COLOR} />}
          {removePermissions.length > 0 && (
            <View style={styles.selectedPermissionsContainer}>
              {removePermissions.map(perm => (
                <Chip
                  key={perm}
                  onClose={() => removeRemovePermission(perm)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {perm}
                </Chip>
              ))}
            </View>
          )}
        </View>

        {/* ----- UPDATE BUTTON ----- */}
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

      {/* ========== MODALS ========== */}

      {/* ADD DEPARTMENT MODAL */}
      <Modal
        visible={addDeptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Departments to Add
              </Text>
              <TouchableOpacity onPress={() => setAddDeptModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            {loadingDepartments ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={allDepartments}
                keyExtractor={(item) => item.department_id}
                renderItem={({ item }) => {
                  const isChecked = addDeptIds.includes(item.department_id);
                  return (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => toggleDepartment(item.department_id, 'add')}
                    >
                      <View style={styles.modalItemRow}>
                        <Checkbox
                          status={isChecked ? 'checked' : 'unchecked'}
                          onPress={() => toggleDepartment(item.department_id, 'add')}
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
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setAddDeptModalVisible(false)}
            >
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REMOVE DEPARTMENT MODAL */}
      <Modal
        visible={removeDeptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRemoveDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Departments to Remove
              </Text>
              <TouchableOpacity onPress={() => setRemoveDeptModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            {loadingDepartments ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={allDepartments}
                keyExtractor={(item) => item.department_id}
                renderItem={({ item }) => {
                  const isChecked = removeDeptIds.includes(item.department_id);
                  return (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => toggleDepartment(item.department_id, 'remove')}
                    >
                      <View style={styles.modalItemRow}>
                        <Checkbox
                          status={isChecked ? 'checked' : 'unchecked'}
                          onPress={() => toggleDepartment(item.department_id, 'remove')}
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
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setRemoveDeptModalVisible(false)}
            >
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD PERMISSIONS MODAL */}
      <Modal
        visible={addPermissionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPermissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.permissionModal]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Add Permissions for {addModule}
              </Text>
              <TouchableOpacity onPress={() => setAddPermissionModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={TEXT_SECONDARY} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search permissions"
                placeholderTextColor={TEXT_SECONDARY}
                value={addSearchQuery}
                onChangeText={setAddSearchQuery}
              />
              {addSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setAddSearchQuery('')}>
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
            {loadingAddPermissions ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={addPermissionsList.filter(p =>
                  p.permission_name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
                  p.description?.toLowerCase().includes(addSearchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.permission_name}
                renderItem={({ item }) => {
                  const isChecked = tempAddPermissions.includes(item.permission_name);
                  return (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => toggleTempAddPermission(item.permission_name)}
                    >
                      <View style={styles.modalItemRow}>
                        <Checkbox
                          status={isChecked ? 'checked' : 'unchecked'}
                          onPress={() => toggleTempAddPermission(item.permission_name)}
                          color={PRIMARY_COLOR}
                        />
                        <View style={styles.permissionInfo}>
                          <Text style={styles.modalItemText}>{item.permission_name}</Text>
                          {item.description && (
                            <Text style={styles.permissionDesc}>{item.description}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.modalList}
                ListEmptyComponent={<Text style={styles.emptyText}>No permissions found</Text>}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setAddPermissionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.confirmButton]}
                onPress={confirmAddPermissions}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm ({tempAddPermissions.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REMOVE PERMISSIONS MODAL */}
      <Modal
        visible={removePermissionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRemovePermissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.permissionModal]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Remove Permissions for {removeModule}
              </Text>
              <TouchableOpacity onPress={() => setRemovePermissionModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={TEXT_SECONDARY} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search permissions"
                placeholderTextColor={TEXT_SECONDARY}
                value={removeSearchQuery}
                onChangeText={setRemoveSearchQuery}
              />
              {removeSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setRemoveSearchQuery('')}>
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
            {loadingRemovePermissions ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={removePermissionsList.filter(p =>
                  p.permission_name.toLowerCase().includes(removeSearchQuery.toLowerCase()) ||
                  p.description?.toLowerCase().includes(removeSearchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.permission_name}
                renderItem={({ item }) => {
                  const isChecked = tempRemovePermissions.includes(item.permission_name);
                  return (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => toggleTempRemovePermission(item.permission_name)}
                    >
                      <View style={styles.modalItemRow}>
                        <Checkbox
                          status={isChecked ? 'checked' : 'unchecked'}
                          onPress={() => toggleTempRemovePermission(item.permission_name)}
                          color={PRIMARY_COLOR}
                        />
                        <View style={styles.permissionInfo}>
                          <Text style={styles.modalItemText}>{item.permission_name}</Text>
                          {item.description && (
                            <Text style={styles.permissionDesc}>{item.description}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.modalList}
                ListEmptyComponent={<Text style={styles.emptyText}>No permissions found</Text>}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setRemovePermissionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.confirmButton]}
                onPress={confirmRemovePermissions}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm ({tempRemovePermissions.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ======================= STYLES =======================
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  placeholderText: {
    color: TEXT_SECONDARY,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleDropdownWrapper: {
    flex: 1,
    marginRight: 8,
  },
  moduleDropdown: {
    minHeight: 48,
  },
  addPermissionButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  selectedPermissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    margin: 4,
    backgroundColor: SELECTED_ITEM_BG,
  },
  chipText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  chipRemoved: {
    backgroundColor: '#FFCDD2',
  },
  chipRemovedText: {
    color: '#C62828',
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 4,
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

  // ---- Modal shared styles ----
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
  permissionModal: {
    maxHeight: '85%',
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
    flex: 1,
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 8,
  },
  permissionDesc: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 16,
    color: TEXT_PRIMARY,
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
});