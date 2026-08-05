// apps/prayantra-b2b/src/screens/module/administration/CreatePositionScreen.tsx

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
import { StackNavigationProp } from '@react-navigation/stack'; // ✅ correct import
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { createPosition, getRootDepartments, listWorkCenters } from '@b2b/api-client';
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

// ----- Zod schema (booleans are required, no .default()) -----
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  department_id: z.string().min(1, 'Department is required'),
  work_center_code: z.string().nullable().optional(),
  is_open: z.boolean(),
  is_schedulable: z.boolean(),
  attendance_required: z.boolean(),
  overtime_allowed: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type DepartmentItem = { department_id: string; department_name: string };
type WorkCenterItem = { work_center_code: string; name: string };

type NavigationProp = StackNavigationProp<RootStackParamList, 'CreatePosition'>;

export default function CreatePositionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenterItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'department' | 'workCenter'>('department');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      department_id: '',
      work_center_code: null,
      is_open: true,
      is_schedulable: true,
      attendance_required: true,
      overtime_allowed: false,
    },
  });

  const selectedDepartment = watch('department_id');
  const selectedWorkCenter = watch('work_center_code');

  // Fetch options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId) return;
      setLoadingOptions(true);
      try {
        const [deptRes, wcRes] = await Promise.all([
          getRootDepartments(companyId, deviceId!, accessToken),
          listWorkCenters(companyId, deviceId!, { page: 1, page_size: 100 }, accessToken),
        ]);
        setDepartments(deptRes.data || []);
        setWorkCenters(wcRes.data || []);
      } catch (error) {
        console.error('Failed to load options', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...data,
        company_id: companyId,
        work_center_code: data.work_center_code ?? undefined,
      };
      await createPosition(companyId, deviceId!, payload, accessToken);
      Alert.alert('Success', 'Position created');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (type: 'department' | 'workCenter') => {
    setModalType(type);
    setModalVisible(true);
  };

  const selectItem = (value: string) => {
    if (modalType === 'department') {
      setValue('department_id', value);
    } else {
      setValue('work_center_code', value);
    }
    setModalVisible(false);
  };

  const getDepartmentLabel = (id: string) => {
    const dept = departments.find(d => d.department_id === id);
    return dept ? dept.department_name : 'Select Department';
  };

  const getWorkCenterLabel = (code: string) => {
    const wc = workCenters.find(w => w.work_center_code === code);
    return wc ? wc.name : 'Select Work Center (optional)';
  };

  if (loadingOptions) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Position Title *"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.title}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}

        {/* Department */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Department *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => openPicker('department')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !selectedDepartment && styles.placeholderText]}>
              {selectedDepartment ? getDepartmentLabel(selectedDepartment) : 'Select Department'}
            </Text>
            <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          {errors.department_id && <Text style={styles.errorText}>{errors.department_id.message}</Text>}
        </View>

        {/* Work Center */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Work Center (optional)</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => openPicker('workCenter')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !selectedWorkCenter && styles.placeholderText]}>
              {selectedWorkCenter ? getWorkCenterLabel(selectedWorkCenter) : 'Select Work Center (optional)'}
            </Text>
            <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* Switches */}
        <View style={styles.switchesContainer}>
          <Controller
            control={control}
            name="is_open"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Open Position</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                  thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="is_schedulable"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Schedulable</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                  thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="attendance_required"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Attendance Required</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                  thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="overtime_allowed"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Overtime Allowed</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                  thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
                />
              </View>
            )}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitWrapper}>
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
                <Text style={styles.buttonText}>Create Position</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                {modalType === 'department' ? 'Select Department' : 'Select Work Center'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            {modalType === 'department' ? (
              <FlatList
                data={departments}
                keyExtractor={(item) => item.department_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedDepartment === item.department_id && styles.modalItemSelected,
                    ]}
                    onPress={() => selectItem(item.department_id)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedDepartment === item.department_id && styles.modalItemTextSelected,
                      ]}
                    >
                      {item.department_name}
                    </Text>
                    {selectedDepartment === item.department_id && (
                      <Icon name="check" size={20} color={PRIMARY_COLOR} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalList}
              />
            ) : (
              <FlatList
                data={workCenters}
                keyExtractor={(item) => item.work_center_code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedWorkCenter === item.work_center_code && styles.modalItemSelected,
                    ]}
                    onPress={() => selectItem(item.work_center_code)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedWorkCenter === item.work_center_code && styles.modalItemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedWorkCenter === item.work_center_code && (
                      <Icon name="check" size={20} color={PRIMARY_COLOR} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  input: {
    marginTop: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginLeft: 4,
    marginTop: 4,
  },
  dropdownWrapper: {
    marginTop: 16,
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
  switchesContainer: {
    marginTop: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  submitWrapper: {
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