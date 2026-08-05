import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { addEmployee, addManager, listRoles, listPositions } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role, Position } from '@b2b/shared-types';
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

// ---- Zod schema ----
const schema = z.object({
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  username: z.string().optional(),
  full_name: z.string().optional(),
  employee_id: z.string().optional(),
  role_id: z.string().min(1, 'Role is required'),
  reports_to: z.string().optional(),
  position_id: z.string().optional(),
  is_manager: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ---- Navigation type ----
type NavigationProp = StackNavigationProp<RootStackParamList, 'AddEmployee'>;

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Dropdown modals
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [positionModalVisible, setPositionModalVisible] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: '',
      role_id: '',
      position_id: '',   // <-- added to make it always defined
      is_manager: false,
    },
  });

  const selectedRoleId = watch('role_id');
  const selectedPositionId = watch('position_id');
  const isManager = watch('is_manager');

  // ---- Fetch options ----
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingOptions(false);
        return;
      }
      try {
        const [rolesRes, positionsRes] = await Promise.all([
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          listPositions(companyId, deviceId, { limit: 100, offset: 0 }, accessToken),
        ]);
        setRoles(rolesRes.data?.roles || []);
        setPositions(positionsRes.data?.positions || []);
      } catch (error: any) {
        Alert.alert('Error', 'Failed to load options');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  // ---- Submit ----
  const onSubmit = async (data: FormData) => {
    // Guard – ensure we have all required credentials
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    // Assign to local constants so TypeScript treats them as strings
    const token = accessToken;
    const compId = companyId;
    const devId = deviceId;

    // Clean phone: remove spaces and trim
    const cleanPhone = data.phone.trim().replace(/\s/g, '');

    setLoading(true);
    try {
      const payload = {
        phone: cleanPhone,
        username: data.username,
        full_name: data.full_name,
        employee_id: data.employee_id,
        role_id: data.role_id,
        reports_to: data.reports_to,
        position_id: data.position_id,
      };
      if (data.is_manager) {
        await addManager(compId, devId, payload, token);
      } else {
        await addEmployee(compId, devId, payload, token);
      }
      Alert.alert('Success', `${data.is_manager ? 'Manager' : 'Employee'} added`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Render dropdown helper ----
  // Allow value to be string | undefined
  const renderDropdown = (
    label: string,
    value: string | undefined,
    onPress: () => void,
    placeholder: string,
    error?: any
  ) => {
    const displayText = value
      ? roles.find(r => r.role_id === value)?.role_name ||
        positions.find(p => p.position_id === value)?.title ||
        placeholder
      : placeholder;

    return (
      <View style={styles.dropdownWrapper}>
        <Text style={styles.dropdownLabel}>{label} *</Text>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            { borderColor: error ? ERROR_COLOR : BORDER_COLOR },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
            {displayText}
          </Text>
          <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error.message}</Text>}
      </View>
    );
  };

  // ---- Loading state ----
  if (loadingOptions) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  // ---- Main render ----
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Manager toggle */}
        <Controller
          control={control}
          name="is_manager"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Add as Manager</Text>
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
              />
            </View>
          )}
        />

        {/* Phone */}
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Phone *"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              error={!!errors.phone}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

        {/* Username */}
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Username (optional)"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Full Name */}
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Full Name (optional)"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Employee ID */}
        <Controller
          control={control}
          name="employee_id"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Employee ID (optional)"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Role dropdown */}
        {renderDropdown(
          'Role',
          selectedRoleId,
          () => setRoleModalVisible(true),
          'Select a role',
          errors.role_id
        )}

        {/* Position dropdown */}
        {renderDropdown(
          'Position',
          selectedPositionId,
          () => setPositionModalVisible(true),
          'Select a position (optional)',
          errors.position_id
        )}

        {/* Reports To (optional) */}
        <Controller
          control={control}
          name="reports_to"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Reports To (User ID) – optional"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Submit button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  Add {isManager ? 'Manager' : 'Employee'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ---- Role Modal ---- */}
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
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={roles}
              keyExtractor={(item) => item.role_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedRoleId === item.role_id && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setValue('role_id', item.role_id);
                    setRoleModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedRoleId === item.role_id && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.role_name} (Level {item.role_level})
                  </Text>
                  {selectedRoleId === item.role_id && (
                    <Icon name="check" size={20} color={PRIMARY_COLOR} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* ---- Position Modal ---- */}
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
              <TouchableOpacity onPress={() => setPositionModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={positions}
              keyExtractor={(item) => item.position_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedPositionId === item.position_id && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setValue('position_id', item.position_id);
                    setPositionModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedPositionId === item.position_id && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {selectedPositionId === item.position_id && (
                    <Icon name="check" size={20} color={PRIMARY_COLOR} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  input: {
    marginTop: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  dropdownWrapper: {
    marginTop: 12,
  },
  dropdownLabel: {
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
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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