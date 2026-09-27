// apps/prayantra-b2b/src/screens/module/administration/CreatePositionScreen.tsx

import React, { useEffect, useState } from 'react';

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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Text,
  TextInput,
  Switch,
} from 'react-native-paper';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  useForm,
  Controller,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  z,
} from 'zod';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  createPosition,
  getRootDepartments,
  listWorkCenters,
  listLocations,
} from '@b2b/api-client';

import {
  Job,
} from '@b2b/shared-types';

// 👇 Reusable job selector
import JobPicker from '../../../components/JobPicker';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  RootStackParamList,
} from '../../../navigation';

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

// =========================================================
// FORM SCHEMA
// =========================================================

const schema = z.object({
  job_id: z
    .string()
    .min(1, 'Job is required'),

  title_override: z
    .string()
    .nullable()
    .optional(),

  department_id: z
    .string()
    .min(1, 'Department is required'),

  location_id: z
    .string()
    .nullable()
    .optional(),

  work_center_code: z
    .string()
    .nullable()
    .optional(),

  is_open: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// TYPES
// =========================================================

type DepartmentItem = {
  department_id: string;
  department_name: string;
};

type WorkCenterItem = {
  work_center_code: string;
  name: string;
};

type LocationItem = {
  location_id: string;
  location_code: string;
  location_name: string;
};

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'CreatePosition'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function CreatePositionScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const insets =
    useSafeAreaInsets();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // STATE
  // =======================================================

  const [loading, setLoading] =
    useState(false);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true);

  const [
    departments,
    setDepartments,
  ] = useState<DepartmentItem[]>([]);

  const [
    workCenters,
    setWorkCenters,
  ] = useState<WorkCenterItem[]>([]);

  const [
    locations,
    setLocations,
  ] = useState<LocationItem[]>([]);

  const [
    selectedJob,
    setSelectedJob,
  ] = useState<Job | null>(null);

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    modalType,
    setModalType,
  ] = useState<
    'department' | 'workCenter' | 'location'
  >('department');

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors,
    },
  } = useForm<FormData>({
    resolver:
      zodResolver(schema),

    defaultValues: {
      job_id: '',

      title_override: null,

      department_id: '',

      location_id: null,

      work_center_code: null,

      is_open: true,
    },
  });

  const selectedDepartment =
    watch('department_id');

  const selectedWorkCenter =
    watch('work_center_code');

  const selectedLocation =
    watch('location_id');

  // =======================================================
  // FETCH OPTIONS
  // =======================================================

  useEffect(() => {
    const fetchOptions =
      async () => {
        if (
          !accessToken ||
          !companyId ||
          !deviceId
        ) {
          setLoadingOptions(false);
          return;
        }

        try {
          setLoadingOptions(true);

          // listLocations has signature (companyId, page?, limit?)
          // — NOT (companyId, deviceId, accessToken).
          // It reads the auth context internally via axiosInstance
          // interceptors.
          const [
            deptRes,
            wcRes,
            locRes,
          ] = await Promise.all([
            getRootDepartments(
              companyId,
              deviceId,
              accessToken
            ),

            listWorkCenters(
              companyId,
              deviceId,
              {
                page: 1,
                page_size: 100,
              },
              accessToken
            ),

            listLocations(companyId, 1, 200),
          ]);

          setDepartments(
            deptRes.data || []
          );

          setWorkCenters(
            wcRes.data || []
          );

          // listLocations returns the UNWRAPPED payload. It may be
          // an array directly, or an object with a `locations` key.
          const locData: any = locRes;
          setLocations(
            Array.isArray(locData)
              ? locData
              : locData?.locations ?? []
          );
        } catch (error) {
          console.error(
            'Failed to load options:',
            error
          );

          Alert.alert(
            'Unable to load',
            'Departments, work centers, and locations could not be loaded.'
          );
        } finally {
          setLoadingOptions(false);
        }
      };

    fetchOptions();
  }, [
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (
    data: FormData
  ) => {
    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      Alert.alert(
        'Authentication Error',
        'Your session information is missing. Please log in again.'
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        department_id: data.department_id,
        job_id: data.job_id,
        location_id: data.location_id ?? undefined,
        title_override:
          data.title_override &&
          data.title_override.trim()
            ? data.title_override.trim()
            : undefined,
        is_open: data.is_open,
        work_center_code:
          data.work_center_code ?? undefined,
      };

      await createPosition(
        companyId,
        deviceId,
        payload,
        accessToken
      );

      const displayName =
        data.title_override &&
        data.title_override.trim()
          ? data.title_override.trim()
          : selectedJob?.job_title ?? 'New position';

      Alert.alert(
        'Position Created',
        `"${displayName}" has been created successfully.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Create position error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create the position. Please try again.';

      Alert.alert(
        'Unable to Create Position',
        message
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // PICKER
  // =======================================================

  const openPicker = (
    type: 'department' | 'workCenter' | 'location'
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closePicker = () => {
    setModalVisible(false);
  };

  const selectItem = (value: string) => {
    if (modalType === 'department') {
      setValue('department_id', value, {
        shouldValidate: true,
      });
    } else if (modalType === 'workCenter') {
      setValue('work_center_code', value, {
        shouldValidate: true,
      });
    } else {
      setValue('location_id', value, {
        shouldValidate: true,
      });
    }

    closePicker();
  };

  // =======================================================
  // LABEL HELPERS
  // =======================================================

  const getDepartmentLabel = (id: string) => {
    const department = departments.find(
      (item) => item.department_id === id
    );
    return (
      department?.department_name ||
      'Select Department'
    );
  };

  const getWorkCenterLabel = (code: string | null) => {
    if (!code) return 'Select Work Center';
    const workCenter = workCenters.find(
      (item) => item.work_center_code === code
    );
    return workCenter?.name || 'Select Work Center';
  };

  const getLocationLabel = (id: string | null) => {
    if (!id) return 'Select Location';
    const location = locations.find(
      (item) => item.location_id === id
    );
    return location?.location_name || 'Select Location';
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loadingOptions) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon
              name="briefcase-plus-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>
            Preparing Position Form
          </Text>

          <Text style={styles.loadingSubtitle}>
            Loading departments, locations, and work centers...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.container}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.header, { paddingTop: 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              Create Position
            </Text>
            <Text style={styles.headerSubtitle}>
              Add a new seat from a job
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Icon
              name="briefcase-plus-outline"
              size={22}
              color="#FFFFFF"
            />
          </View>
        </View>
      </LinearGradient>

      {/* =================================================
          FORM
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 35 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon
              name="information-outline"
              size={19}
              color={PRIMARY_COLOR}
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Basic Information
            </Text>
            <Text style={styles.sectionSubtitle}>
              Pick the job this seat implements
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {/* Job picker */}

          <View>
            <Text style={styles.fieldLabel}>
              Job
              <Text style={styles.required}> *</Text>
            </Text>

            <Controller
              control={control}
              name="job_id"
              render={({ field: { value } }) => (
                <JobPicker
                  companyId={companyId!}
                  deviceId={deviceId!}
                  accessToken={accessToken!}
                  value={value || null}
                  onChange={(job: Job | null) => {
                    setSelectedJob(job);
                    setValue(
                      'job_id',
                      job?.job_id ?? '',
                      { shouldValidate: true }
                    );
                  }}
                  placeholder="Select a job"
                />
              )}
            />

            {errors.job_id && (
              <Text style={styles.errorText}>
                {errors.job_id.message}
              </Text>
            )}

            {selectedJob && (
              <View style={styles.jobFlags}>
                <JobFlag
                  icon="calendar-check-outline"
                  label="Schedulable"
                  active={selectedJob.is_schedulable}
                />
                <JobFlag
                  icon="clock-check-outline"
                  label="Attendance"
                  active={selectedJob.attendance_required}
                />
                <JobFlag
                  icon="clock-plus-outline"
                  label="Overtime"
                  active={selectedJob.overtime_allowed}
                />
              </View>
            )}
          </View>

          {/* Title override */}

          <View style={styles.fieldSpacing}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Title Override
              </Text>

              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>
                  OPTIONAL
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="title_override"
              render={({
                field: { onChange, onBlur, value },
              }) => (
                <View style={styles.inputContainer}>
                  <Icon
                    name="tag-outline"
                    size={20}
                    color={TEXT_SECONDARY}
                  />

                  <TextInput
                    value={value ?? ''}
                    onChangeText={(t) =>
                      onChange(t || null)
                    }
                    onBlur={onBlur}
                    placeholder={
                      selectedJob
                        ? `Defaults to: ${selectedJob.job_title}`
                        : 'Leave blank to use the job title'
                    }
                    placeholderTextColor="#9AA4B2"
                    style={styles.textInput}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    selectionColor={PRIMARY_COLOR}
                    autoCapitalize="words"
                  />
                </View>
              )}
            />

            <Text style={styles.helperText}>
              Shown to HR and the employee. Leave empty to use
              the job's title.
            </Text>
          </View>

          {/* Department */}

          <View style={styles.fieldSpacing}>
            <Text style={styles.fieldLabel}>
              Department
              <Text style={styles.required}> *</Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.department_id &&
                  styles.selectError,
              ]}
              onPress={() => openPicker('department')}
              activeOpacity={0.8}
            >
              <View style={styles.selectLeft}>
                <View style={styles.selectIcon}>
                  <Icon
                    name="domain"
                    size={19}
                    color={PRIMARY_COLOR}
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.selectText,
                    !selectedDepartment && styles.placeholder,
                  ]}
                >
                  {selectedDepartment
                    ? getDepartmentLabel(selectedDepartment)
                    : 'Select Department'}
                </Text>
              </View>

              <Icon
                name="chevron-down"
                size={22}
                color={TEXT_SECONDARY}
              />
            </TouchableOpacity>

            {errors.department_id && (
              <Text style={styles.errorText}>
                {errors.department_id.message}
              </Text>
            )}
          </View>

          {/* Location */}

          <View style={styles.fieldSpacing}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Location
              </Text>

              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>
                  OPTIONAL
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openPicker('location')}
              activeOpacity={0.8}
            >
              <View style={styles.selectLeft}>
                <View
                  style={[
                    styles.selectIcon,
                    { backgroundColor: '#F1F5F9' },
                  ]}
                >
                  <Icon
                    name="map-marker-outline"
                    size={19}
                    color="#64748B"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.selectText,
                    !selectedLocation && styles.placeholder,
                  ]}
                >
                  {selectedLocation
                    ? getLocationLabel(selectedLocation)
                    : 'Select Location'}
                </Text>
              </View>

              <Icon
                name="chevron-down"
                size={22}
                color={TEXT_SECONDARY}
              />
            </TouchableOpacity>

            <Text style={styles.helperText}>
              The site this seat belongs to. Leave empty for a
              company-wide seat.
            </Text>
          </View>

          {/* Work Center */}

          <View style={styles.fieldSpacing}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                Work Center
              </Text>

              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>
                  OPTIONAL
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => openPicker('workCenter')}
              activeOpacity={0.8}
            >
              <View style={styles.selectLeft}>
                <View
                  style={[
                    styles.selectIcon,
                    { backgroundColor: '#F1F5F9' },
                  ]}
                >
                  <Icon
                    name="factory"
                    size={19}
                    color="#64748B"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.selectText,
                    !selectedWorkCenter && styles.placeholder,
                  ]}
                >
                  {selectedWorkCenter
                    ? getWorkCenterLabel(selectedWorkCenter)
                    : 'Select Work Center'}
                </Text>
              </View>

              <Icon
                name="chevron-down"
                size={22}
                color={TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            POSITION SETTINGS
        ================================================= */}

        <View
          style={[
            styles.sectionHeader,
            { marginTop: 27 },
          ]}
        >
          <View style={styles.sectionIcon}>
            <Icon
              name="tune-variant"
              size={19}
              color={PRIMARY_COLOR}
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>
              Position Settings
            </Text>
            <Text style={styles.sectionSubtitle}>
              Only the seat-level toggle remains here
            </Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Controller
            control={control}
            name="is_open"
            render={({ field: { onChange, value } }) => (
              <SettingRow
                icon="briefcase-check-outline"
                title="Open Position"
                description="Allow this position to be filled"
                value={value}
                onChange={onChange}
              />
            )}
          />

          {selectedJob && (
            <>
              <View style={styles.settingDivider} />

              <View style={styles.derivedRow}>
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIcon,
                      { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    <Icon
                      name="information-outline"
                      size={18}
                      color="#64748B"
                    />
                  </View>

                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>
                      Inherited from "{selectedJob.job_title}"
                    </Text>

                    <Text style={styles.settingDescription}>
                      {[
                        selectedJob.is_schedulable
                          ? 'Schedulable'
                          : 'Not schedulable',
                        selectedJob.attendance_required
                          ? 'Attendance required'
                          : 'No attendance',
                        selectedJob.overtime_allowed
                          ? 'Overtime allowed'
                          : 'No overtime',
                      ].join(' · ')}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* =================================================
            INFO
        ================================================= */}

        <View style={styles.infoBox}>
          <Icon
            name="information-outline"
            size={18}
            color={PRIMARY_COLOR}
          />

          <Text style={styles.infoText}>
            Attendance, overtime, and scheduling are defined on
            the job. Edit the job to change them for every seat
            that uses it.
          </Text>
        </View>

        {/* =================================================
            CREATE BUTTON
        ================================================= */}

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.submitButtonWrapper}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.submitButton}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
                <Text style={styles.submitButtonText}>
                  Creating Position...
                </Text>
              </>
            ) : (
              <>
                <Icon
                  name="plus-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />
                <Text style={styles.submitButtonText}>
                  Create Position
                </Text>
                <Icon
                  name="arrow-right"
                  size={19}
                  color="rgba(255,255,255,0.75)"
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* =================================================
          PICKER MODAL
      ================================================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalType === 'department'
                    ? 'Select Department'
                    : modalType === 'location'
                    ? 'Select Location'
                    : 'Select Work Center'}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Choose one option to continue
                </Text>
              </View>

              <TouchableOpacity
                onPress={closePicker}
                style={styles.modalClose}
              >
                <Icon
                  name="close"
                  size={20}
                  color={TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            {/* Department list */}
            {modalType === 'department' && (
              <FlatList
                data={departments}
                keyExtractor={(item) => item.department_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => {
                  const selected =
                    selectedDepartment === item.department_id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        selectItem(item.department_id)
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.modalItemIcon,
                          selected &&
                            styles.modalItemIconSelected,
                        ]}
                      >
                        <Icon
                          name="domain"
                          size={18}
                          color={
                            selected
                              ? PRIMARY_COLOR
                              : '#64748B'
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.modalItemText,
                          selected &&
                            styles.modalItemTextSelected,
                        ]}
                      >
                        {item.department_name}
                      </Text>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={21}
                          color={PRIMARY_COLOR}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Location list */}
            {modalType === 'location' && (
              <FlatList
                data={locations}
                keyExtractor={(item) => item.location_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Icon
                      name="map-marker-off-outline"
                      size={28}
                      color="#CBD5E1"
                    />
                    <Text style={styles.modalEmptyText}>
                      No locations available
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const selected =
                    selectedLocation === item.location_id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        selectItem(item.location_id)
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.modalItemIcon,
                          selected &&
                            styles.modalItemIconSelected,
                        ]}
                      >
                        <Icon
                          name="map-marker-outline"
                          size={18}
                          color={
                            selected
                              ? PRIMARY_COLOR
                              : '#64748B'
                          }
                        />
                      </View>

                      <View style={styles.modalItemInfo}>
                        <Text
                          style={[
                            styles.modalItemText,
                            selected &&
                              styles.modalItemTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.location_name}
                        </Text>

                        <Text style={styles.modalItemCode}>
                          {item.location_code}
                        </Text>
                      </View>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={21}
                          color={PRIMARY_COLOR}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Work center list */}
            {modalType === 'workCenter' && (
              <FlatList
                data={workCenters}
                keyExtractor={(item) => item.work_center_code}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => {
                  const selected =
                    selectedWorkCenter === item.work_center_code;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        selectItem(item.work_center_code)
                      }
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.modalItemIcon,
                          selected &&
                            styles.modalItemIconSelected,
                        ]}
                      >
                        <Icon
                          name="factory"
                          size={18}
                          color={
                            selected
                              ? PRIMARY_COLOR
                              : '#64748B'
                          }
                        />
                      </View>

                      <View style={styles.modalItemInfo}>
                        <Text
                          style={[
                            styles.modalItemText,
                            selected &&
                              styles.modalItemTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <Text style={styles.modalItemCode}>
                          {item.work_center_code}
                        </Text>
                      </View>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={21}
                          color={PRIMARY_COLOR}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================================================
// JOB FLAG CHIP
// =========================================================

function JobFlag({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <View
      style={[
        styles.jobFlag,
        active ? styles.jobFlagActive : styles.jobFlagInactive,
      ]}
    >
      <Icon
        name={icon}
        size={11}
        color={active ? PRIMARY_COLOR : '#94A3B8'}
      />
      <Text
        style={[
          styles.jobFlagText,
          active
            ? styles.jobFlagTextActive
            : styles.jobFlagTextInactive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// =========================================================
// SETTING ROW
// =========================================================

type SettingRowProps = {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function SettingRow({
  icon,
  title,
  description,
  value,
  onChange,
}: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            value && styles.settingIconActive,
          ]}
        >
          <Icon
            name={icon}
            size={20}
            color={value ? PRIMARY_COLOR : '#64748B'}
          />
        </View>

        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>
            {title}
          </Text>
          <Text style={styles.settingDescription}>
            {description}
          </Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        color={PRIMARY_COLOR}
        style={styles.switch}
      />
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  scrollView: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // HEADER
  header: {
    paddingHorizontal: 20,
    paddingBottom: 17,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    fontWeight: '500',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  // SECTION
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  sectionTitle: {
    marginLeft: 10,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    marginLeft: 10,
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  // FORM CARD
  formCard: {
    padding: 16,
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

  // LABELS
  fieldLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  required: { color: ERROR_COLOR },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  optionalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  optionalText: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // TEXT INPUT
  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 11,
    backgroundColor: CARD_BACKGROUND,
  },
  inputError: { borderColor: ERROR_COLOR },
  textInput: {
    flex: 1,
    height: 50,
    marginLeft: 9,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    color: TEXT_PRIMARY,
    fontSize: 14,
  },

  // SELECT
  fieldSpacing: { marginTop: 18 },
  selectButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 11,
    backgroundColor: CARD_BACKGROUND,
  },
  selectError: { borderColor: ERROR_COLOR },
  selectLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  selectIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  selectText: {
    flex: 1,
    marginLeft: 10,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholder: {
    color: '#9AA4B2',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 5,
    marginLeft: 3,
    color: ERROR_COLOR,
    fontSize: 10,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 5,
    marginLeft: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },

  // JOB FLAGS PREVIEW
  jobFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  jobFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  jobFlagActive: {
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  jobFlagInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  jobFlagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  jobFlagTextActive: { color: PRIMARY_COLOR },
  jobFlagTextInactive: { color: '#94A3B8' },

  // SETTINGS
  settingsCard: {
    paddingHorizontal: 15,
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
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
  },
  settingIconActive: {
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  settingText: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },
  settingTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  settingDescription: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  switch: { marginLeft: 5 },
  settingDivider: {
    height: 1,
    backgroundColor: '#EDF0F4',
  },
  derivedRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // INFO
  infoBox: {
    marginTop: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}18`,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#64748B',
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '500',
  },

  // SUBMIT
  submitButtonWrapper: {
    marginTop: 20,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButton: {
    minHeight: 55,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 13,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // LOADING
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  loadingSpinner: { marginTop: 20 },
  loadingTitle: {
    marginTop: 13,
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  loadingSubtitle: {
    marginTop: 5,
    color: TEXT_SECONDARY,
    fontSize: 10,
    textAlign: 'center',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalContent: {
    maxHeight: '78%',
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
  },
  modalHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: '#D7DCE3',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F4',
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },
  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalList: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 15,
  },
  modalItem: {
    minHeight: 58,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    marginBottom: 5,
  },
  modalItemSelected: {
    backgroundColor: SELECTED_ITEM_BG || `${PRIMARY_COLOR}10`,
  },
  modalItemIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalItemIconSelected: {
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalItemText: {
    flex: 1,
    marginLeft: 10,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  modalItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  modalItemCode: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '500',
  },
  modalEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  modalEmptyText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
  },
});