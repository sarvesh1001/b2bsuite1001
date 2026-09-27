// apps/prayantra-b2b/src/screens/module/administration/EditPositionScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';

import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
  TextInput,
  Switch,
} from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
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
  getPosition,
  updatePosition,
  getRootDepartments,
  listWorkCenters,
  listLocations,
} from '@b2b/api-client';

import {
  Job,
} from '@b2b/shared-types';

// 👇 Reusable job selector (same component used by CreatePositionScreen)
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
// TYPES
// =========================================================

type EditPositionRouteProp = RouteProp<
  RootStackParamList,
  'EditPosition'
>;

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'EditPosition'
  >;

// =========================================================
// FORM SCHEMA
//
// A position is now a SEAT. The role definition lives on the JOB.
// Editable:  job_id, title_override, department_id, location_id,
//            work_center_code, is_open
// NOT editable here: is_schedulable / attendance_required /
//                    overtime_allowed (they belong to the job)
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
    .optional(),

  location_id: z
    .string()
    .nullable()
    .optional(),

  work_center_code: z
    .string()
    .nullable()
    .optional(),

  is_open: z
    .boolean()
    .optional(),
});

type FormData = z.infer<typeof schema>;

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

// =========================================================
// COMPONENT
// =========================================================

export default function EditPositionScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const route =
    useRoute<EditPositionRouteProp>();

  const { positionId } = route.params;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // STATE
  // =======================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [departments, setDepartments] =
    useState<DepartmentItem[]>([]);

  const [workCenters, setWorkCenters] =
    useState<WorkCenterItem[]>([]);

  const [locations, setLocations] =
    useState<LocationItem[]>([]);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  // 👇 Selected job — kept separately so we can show its flags and
  //   feed the JobPicker component.
  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [modalType, setModalType] =
    useState<'department' | 'workCenter' | 'location'>(
      'department'
    );

  const [pickerSearch, setPickerSearch] =
    useState('');

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      job_id: '',
      title_override: null,
      department_id: '',
      location_id: null,
      work_center_code: null,
      is_open: false,
    },
  });

  const selectedDepartment =
    watch('department_id');

  const selectedWorkCenter =
    watch('work_center_code');

  const selectedLocation =
    watch('location_id');

  const watchedJobId =
    watch('job_id');

  const isOpen = watch('is_open');

  // =======================================================
  // FETCH DATA
  // =======================================================

  useEffect(() => {
    const fetchData = async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        setLoading(false);
        setLoadingOptions(false);
        return;
      }

      setLoading(true);
      setLoadingOptions(true);

      try {
        const [
          positionRes,
          deptRes,
          wcRes,
          locRes,
        ] = await Promise.all([
          getPosition(
            companyId,
            deviceId,
            positionId,
            accessToken
          ),

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

          // listLocations(companyId, page?, limit?)
          listLocations(companyId, 1, 200),
        ]);

        const position =
          positionRes.data;

        if (!position) {
          Alert.alert(
            'Position Not Found',
            'The position could not be found.',
            [
              {
                text: 'OK',
                onPress: () =>
                  navigation.goBack(),
              },
            ]
          );

          return;
        }

        setDepartments(
          deptRes.data || []
        );

        setWorkCenters(
          wcRes.data || []
        );

        const locData: any = locRes;
        setLocations(
          Array.isArray(locData)
            ? locData
            : locData?.locations ?? []
        );

        // Rebuild the selected job object from the joined view.
        // The API gives us `job_id`, plus `job_title` and `job_code`
        // via the PositionView projection.
        if (position.job_id) {
          setSelectedJob({
            job_id: position.job_id,
            company_id: position.company_id,
            job_code: position.job_code ?? '',
            job_title: position.job_title ?? '',
            description: null,
            is_schedulable:
              position.is_schedulable ?? false,
            attendance_required:
              position.attendance_required ?? false,
            overtime_allowed:
              position.overtime_allowed ?? false,
            is_active: true,
            created_at: position.created_at,
            updated_at: position.updated_at,
          });
        }

        reset({
          job_id: position.job_id || '',
          title_override:
            position.title_override ?? null,
          department_id:
            position.department_id || '',
          location_id:
            position.location_id ?? null,
          work_center_code:
            position.work_center_code ?? null,
          is_open: position.is_open ?? false,
        });
      } catch (error: any) {
        console.error(
          'Failed to load position:',
          error
        );

        Alert.alert(
          'Unable to Load',
          error?.message ||
            'Failed to load position details.',
          [
            {
              text: 'Go Back',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } finally {
        setLoading(false);
        setLoadingOptions(false);
      }
    };

    fetchData();
  }, [
    positionId,
    accessToken,
    companyId,
    deviceId,
    navigation,
    reset,
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
      return;
    }

    setSaving(true);

    try {
      const payload = {
        job_id: data.job_id,
        title_override:
          data.title_override &&
          data.title_override.trim()
            ? data.title_override.trim()
            : null,
        department_id: data.department_id,
        location_id: data.location_id ?? null,
        work_center_code:
          data.work_center_code ?? null,
        is_open: data.is_open ?? false,
      };

      await updatePosition(
        companyId,
        deviceId,
        positionId,
        payload,
        accessToken
      );

      Alert.alert(
        'Position Updated',
        'The position has been updated successfully.',
        [
          {
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Update position error:',
        error
      );

      Alert.alert(
        'Update Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to update the position.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // PICKER
  // =======================================================

  const openPicker = (
    type: 'department' | 'workCenter' | 'location'
  ) => {
    setModalType(type);
    setPickerSearch('');
    setModalVisible(true);
  };

  const closePicker = () => {
    setPickerSearch('');
    setModalVisible(false);
  };

  const selectItem = (value: string) => {
    if (modalType === 'department') {
      setValue('department_id', value, {
        shouldDirty: true,
      });
    } else if (modalType === 'workCenter') {
      setValue('work_center_code', value, {
        shouldDirty: true,
      });
    } else {
      setValue('location_id', value, {
        shouldDirty: true,
      });
    }

    closePicker();
  };

  const clearWorkCenter = () => {
    setValue('work_center_code', null, {
      shouldDirty: true,
    });
    closePicker();
  };

  const clearLocation = () => {
    setValue('location_id', null, {
      shouldDirty: true,
    });
    closePicker();
  };

  // =======================================================
  // LABELS
  // =======================================================

  const departmentLabel = useMemo(() => {
    const department = departments.find(
      (item) => item.department_id === selectedDepartment
    );
    return (
      department?.department_name || 'Select Department'
    );
  }, [departments, selectedDepartment]);

  const workCenterLabel = useMemo(() => {
    const workCenter = workCenters.find(
      (item) =>
        item.work_center_code === selectedWorkCenter
    );
    return workCenter?.name || 'Select Work Center';
  }, [workCenters, selectedWorkCenter]);

  const locationLabel = useMemo(() => {
    const location = locations.find(
      (item) => item.location_id === selectedLocation
    );
    return location?.location_name || 'Select Location';
  }, [locations, selectedLocation]);

  // =======================================================
  // FILTER PICKER
  // =======================================================

  const filteredDepartments = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((item) =>
      item.department_name.toLowerCase().includes(query)
    );
  }, [departments, pickerSearch]);

  const filteredWorkCenters = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return workCenters;
    return workCenters.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.work_center_code
          .toLowerCase()
          .includes(query)
    );
  }, [workCenters, pickerSearch]);

  const filteredLocations = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter(
      (item) =>
        item.location_name
          .toLowerCase()
          .includes(query) ||
        item.location_code
          .toLowerCase()
          .includes(query)
    );
  }, [locations, pickerSearch]);

  // =======================================================
  // LOADING
  // =======================================================

  if (loading || loadingOptions) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon
              name="briefcase-edit-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{ marginTop: 20 }}
          />

          <Text style={styles.loadingTitle}>
            Loading position
          </Text>

          <Text style={styles.loadingSubtitle}>
            Preparing position details...
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Icon
              name="arrow-left"
              size={21}
              color={TEXT_PRIMARY}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Edit Position
            </Text>
            <Text style={styles.headerSubtitle}>
              Update seat details
            </Text>
          </View>

          <View style={styles.headerStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOpen
                    ? '#22C55E'
                    : '#94A3B8',
                },
              ]}
            />
            <Text style={styles.statusText}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* =================================================
              POSITION HERO
          ================================================= */}

          <View style={styles.positionHero}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.heroGradient}
            >
              <View style={styles.heroIcon}>
                <Icon
                  name="briefcase-outline"
                  size={28}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.heroTextContainer}>
                <Text style={styles.heroEyebrow}>
                  POSITION
                </Text>

                <Text
                  numberOfLines={2}
                  style={styles.heroTitle}
                >
                  {selectedJob?.job_title ||
                    watch('title_override') ||
                    'Position'}
                </Text>

                <Text style={styles.heroSubtitle}>
                  Manage seat assignment and work settings
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <SectionHeader
            icon="information-outline"
            title="Basic Information"
            subtitle="Pick the job this seat implements"
          />

          <View style={styles.sectionCard}>
            {/* Job picker */}

            <View>
              <Text style={styles.fieldLabel}>
                Job
                <Text style={styles.requiredText}>
                  {' '}*
                </Text>
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
                        {
                          shouldValidate: true,
                          shouldDirty: true,
                        }
                      );
                    }}
                    placeholder="Select a job"
                    showInactive
                  />
                )}
              />

              {errors.job_id && (
                <Text style={styles.errorText}>
                  {errors.job_id.message}
                </Text>
              )}

              {/* Job flags preview — these live on the JOB, not the seat */}

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
                    active={
                      selectedJob.attendance_required
                    }
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
                  <TextInput
                    mode="outlined"
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
                    style={styles.textInput}
                    outlineColor={BORDER_COLOR}
                    activeOutlineColor={PRIMARY_COLOR}
                    textColor={TEXT_PRIMARY}
                    placeholderTextColor={TEXT_SECONDARY}
                    theme={{
                      colors: {
                        primary: PRIMARY_COLOR,
                      },
                    }}
                  />
                )}
              />

              <Text style={styles.helperText}>
                Shown to HR and the employee. Leave empty to
                use the job's title.
              </Text>
            </View>
          </View>

          {/* =================================================
              ASSIGNMENT
          ================================================= */}

          <SectionHeader
            icon="office-building-outline"
            title="Assignment"
            subtitle="Where this seat belongs"
          />

          <View style={styles.sectionCard}>
            {/* Department */}

            <PickerField
              icon="domain"
              label="Department"
              value={departmentLabel}
              placeholder={!selectedDepartment}
              onPress={() => openPicker('department')}
              accentColor={PRIMARY_COLOR}
            />

            <View style={styles.fieldDivider} />

            {/* Location */}

            <PickerField
              icon="map-marker-outline"
              label="Location"
              value={
                selectedLocation
                  ? locationLabel
                  : 'Select Location'
              }
              placeholder={!selectedLocation}
              optional
              onPress={() => openPicker('location')}
              accentColor={PRIMARY_COLOR}
            />

            {selectedLocation && (
              <TouchableOpacity
                style={styles.clearAssignment}
                onPress={clearLocation}
                activeOpacity={0.7}
              >
                <Icon
                  name="close-circle-outline"
                  size={15}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.clearAssignmentText}>
                  Remove location (company-wide seat)
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.fieldDivider} />

            {/* Work center */}

            <PickerField
              icon="factory"
              label="Work Center"
              value={
                selectedWorkCenter
                  ? workCenterLabel
                  : 'Select Work Center'
              }
              placeholder={!selectedWorkCenter}
              optional
              onPress={() => openPicker('workCenter')}
              accentColor={PRIMARY_COLOR}
            />

            {selectedWorkCenter && (
              <TouchableOpacity
                style={styles.clearAssignment}
                onPress={clearWorkCenter}
                activeOpacity={0.7}
              >
                <Icon
                  name="close-circle-outline"
                  size={15}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.clearAssignmentText}>
                  Remove work center
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* =================================================
              POSITION SETTINGS
          ================================================= */}

          <SectionHeader
            icon="tune-variant"
            title="Position Settings"
            subtitle="Only the seat-level toggle remains here"
          />

          <View style={styles.settingsCard}>
            <Controller
              control={control}
              name="is_open"
              render={({ field: { value } }) => (
                <SettingRow
                  icon="briefcase-open-outline"
                  title="Open Position"
                  description="Allow this position to be available for hiring"
                  value={value ?? false}
                  onChange={(next) =>
                    setValue('is_open', next, {
                      shouldDirty: true,
                    })
                  }
                  color="#22C55E"
                />
              )}
            />

            {/* Read-only summary of the flags inherited from the job */}

            {selectedJob && (
              <>
                <SettingDivider />

                <View style={styles.derivedRow}>
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

                  <View style={styles.settingContent}>
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
              Attendance, overtime, and scheduling are defined
              on the job. Edit the job to change them for every
              seat that uses it.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* =================================================
            SAVE BAR
        ================================================= */}

        <View style={styles.bottomAction}>
          <View style={styles.bottomActionInner}>
            <View style={styles.unsavedContainer}>
              <View
                style={[
                  styles.saveStatusDot,
                  {
                    backgroundColor: isDirty
                      ? '#F59E0B'
                      : '#22C55E',
                  },
                ]}
              />
              <Text style={styles.unsavedText}>
                {isDirty
                  ? 'Unsaved changes'
                  : 'All changes saved'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              activeOpacity={0.85}
              style={styles.saveButtonWrapper}
            >
              <LinearGradient
                colors={GRADIENT_COLORS}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Icon
                      name="content-save-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>
                      Save Changes
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  SELECT
                </Text>
                <Text style={styles.modalTitle}>
                  {modalType === 'department'
                    ? 'Department'
                    : modalType === 'location'
                    ? 'Location'
                    : 'Work Center'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closePicker}
                style={styles.modalClose}
                activeOpacity={0.7}
              >
                <Icon
                  name="close"
                  size={20}
                  color={TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearch}>
              <Icon
                name="magnify"
                size={19}
                color={TEXT_SECONDARY}
              />

              <RNTextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={
                  modalType === 'department'
                    ? 'Search departments...'
                    : modalType === 'location'
                    ? 'Search locations...'
                    : 'Search work centers...'
                }
                placeholderTextColor="#A0A9B5"
                style={styles.pickerSearchInput}
                autoCorrect={false}
              />

              {pickerSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPickerSearch('')}
                >
                  <Icon
                    name="close-circle"
                    size={17}
                    color={TEXT_SECONDARY}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Optional location clearing */}

            {modalType === 'location' &&
              selectedLocation && (
                <TouchableOpacity
                  style={styles.noneOption}
                  onPress={clearLocation}
                  activeOpacity={0.7}
                >
                  <View style={styles.noneOptionIcon}>
                    <Icon
                      name="close"
                      size={17}
                      color={TEXT_SECONDARY}
                    />
                  </View>

                  <View style={styles.noneOptionText}>
                    <Text style={styles.noneOptionTitle}>
                      No Location
                    </Text>
                    <Text style={styles.noneOptionSubtitle}>
                      Make this a company-wide seat
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

            {/* Optional work center clearing */}

            {modalType === 'workCenter' &&
              selectedWorkCenter && (
                <TouchableOpacity
                  style={styles.noneOption}
                  onPress={clearWorkCenter}
                  activeOpacity={0.7}
                >
                  <View style={styles.noneOptionIcon}>
                    <Icon
                      name="close"
                      size={17}
                      color={TEXT_SECONDARY}
                    />
                  </View>

                  <View style={styles.noneOptionText}>
                    <Text style={styles.noneOptionTitle}>
                      No Work Center
                    </Text>
                    <Text style={styles.noneOptionSubtitle}>
                      Leave this position unassigned
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

            {/* ---------- Department list ---------- */}

            {modalType === 'department' && (
              <FlatList
                data={filteredDepartments}
                keyExtractor={(item) => item.department_id}
                keyboardShouldPersistTaps="handled"
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
                              : TEXT_SECONDARY
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.modalItemText,
                          selected &&
                            styles.modalItemTextSelected,
                        ]}
                        numberOfLines={1}
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
                ListEmptyComponent={
                  <EmptyPickerState search={pickerSearch} />
                }
              />
            )}

            {/* ---------- Location list ---------- */}

            {modalType === 'location' && (
              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item.location_id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
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
                              : TEXT_SECONDARY
                          }
                        />
                      </View>

                      <View style={styles.workCenterText}>
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

                        <Text
                          style={styles.workCenterCode}
                          numberOfLines={1}
                        >
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
                ListEmptyComponent={
                  <EmptyPickerState search={pickerSearch} />
                }
              />
            )}

            {/* ---------- Work center list ---------- */}

            {modalType === 'workCenter' && (
              <FlatList
                data={filteredWorkCenters}
                keyExtractor={(item) => item.work_center_code}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => {
                  const selected =
                    selectedWorkCenter ===
                    item.work_center_code;

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
                              : TEXT_SECONDARY
                          }
                        />
                      </View>

                      <View style={styles.workCenterText}>
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

                        <Text
                          style={styles.workCenterCode}
                          numberOfLines={1}
                        >
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
                ListEmptyComponent={
                  <EmptyPickerState search={pickerSearch} />
                }
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
        active
          ? styles.jobFlagActive
          : styles.jobFlagInactive,
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
// SECTION HEADER
// =========================================================

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Icon
          name={icon}
          size={19}
          color={PRIMARY_COLOR}
        />
      </View>

      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionHeaderTitle}>
          {title}
        </Text>
        <Text style={styles.sectionHeaderSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

// =========================================================
// PICKER FIELD
// =========================================================

function PickerField({
  icon,
  label,
  value,
  placeholder,
  optional,
  onPress,
  accentColor,
}: {
  icon: string;
  label: string;
  value: string;
  placeholder?: boolean;
  optional?: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      style={styles.pickerField}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.pickerFieldIcon,
          { backgroundColor: `${accentColor}12` },
        ]}
      >
        <Icon name={icon} size={20} color={accentColor} />
      </View>

      <View style={styles.pickerFieldContent}>
        <View style={styles.pickerFieldLabelRow}>
          <Text style={styles.pickerFieldLabel}>
            {label}
          </Text>
          {optional && (
            <Text style={styles.optionalText}>
              OPTIONAL
            </Text>
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.pickerFieldValue,
            placeholder && styles.pickerFieldPlaceholder,
          ]}
        >
          {value}
        </Text>
      </View>

      <Icon
        name="chevron-right"
        size={21}
        color="#A0A9B5"
      />
    </TouchableOpacity>
  );
}

// =========================================================
// SETTING ROW
// =========================================================

function SettingRow({
  icon,
  title,
  description,
  value,
  onChange,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: `${color}12` },
        ]}
      >
        <Icon name={icon} size={20} color={color} />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>
        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        color={color}
      />
    </View>
  );
}

// =========================================================
// SETTING DIVIDER
// =========================================================

function SettingDivider() {
  return <View style={styles.settingDivider} />;
}

// =========================================================
// EMPTY PICKER
// =========================================================

function EmptyPickerState({
  search,
}: {
  search: string;
}) {
  return (
    <View style={styles.emptyPicker}>
      <View style={styles.emptyPickerIcon}>
        <Icon
          name="magnify-close"
          size={25}
          color={TEXT_SECONDARY}
        />
      </View>

      <Text style={styles.emptyPickerTitle}>
        No results found
      </Text>

      <Text style={styles.emptyPickerText}>
        {search
          ? `Nothing matches "${search}".`
          : 'There are no items available.'}
      </Text>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  // GENERAL
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  // HEADER
  header: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#F4F6F9',
  },
  headerText: { flex: 1, marginLeft: 11 },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5EAF0',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '600',
  },

  // SCROLL
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },

  // HERO
  positionHero: {
    overflow: 'hidden',
    borderRadius: 18,
    marginBottom: 25,
    shadowColor: '#5B2A97',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.13,
    shadowRadius: 13,
    elevation: 4,
  },
  heroGradient: {
    minHeight: 125,
    padding: 19,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTextContainer: { flex: 1, marginLeft: 14 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  sectionHeaderIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  sectionHeaderText: { marginLeft: 10 },
  sectionHeaderTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderSubtitle: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  // SECTION CARD
  sectionCard: {
    padding: 15,
    marginBottom: 25,
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

  // FIELD LABELS (used for job picker + title override)
  fieldLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  requiredText: { color: ERROR_COLOR },
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
  fieldSpacing: { marginTop: 18 },

  // INPUT
  textInput: {
    backgroundColor: CARD_BACKGROUND,
    fontSize: 14,
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
  jobFlagText: { fontSize: 9, fontWeight: '600' },
  jobFlagTextActive: { color: PRIMARY_COLOR },
  jobFlagTextInactive: { color: '#94A3B8' },

  // PICKER FIELD
  pickerField: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerFieldIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  pickerFieldContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },
  pickerFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerFieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickerFieldValue: {
    marginTop: 5,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerFieldPlaceholder: {
    color: '#A0A9B5',
    fontWeight: '500',
  },
  fieldDivider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: '#EDF0F4',
  },
  clearAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 3,
    marginLeft: 53,
    paddingVertical: 5,
  },
  clearAssignmentText: {
    marginLeft: 5,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  // SETTINGS
  settingsCard: {
    paddingHorizontal: 15,
    marginBottom: 22,
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
    minHeight: 77,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 41,
    height: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  settingContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
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
  settingDivider: {
    height: 1,
    backgroundColor: '#EDF0F4',
  },
  derivedRow: {
    minHeight: 77,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // INFO BOX
  infoBox: {
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

  // BOTTOM SAVE BAR
  bottomAction: {
    paddingHorizontal: 15,
    paddingTop: 9,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#E5EAF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  unsavedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  unsavedText: {
    color: TEXT_SECONDARY,
    fontSize: 8,
    fontWeight: '600',
  },
  saveButtonWrapper: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  saveButton: {
    minHeight: 45,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  modalContainer: {
    maxHeight: '82%',
    minHeight: '50%',
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginTop: 9,
    borderRadius: 4,
    backgroundColor: '#D7DCE3',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalEyebrow: {
    color: PRIMARY_COLOR,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    marginTop: 3,
    color: TEXT_PRIMARY,
    fontSize: 19,
    fontWeight: '700',
  },
  modalClose: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#F4F6F9',
  },
  pickerSearch: {
    height: 46,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    color: TEXT_PRIMARY,
    fontSize: 12,
  },
  noneOption: {
    marginHorizontal: 16,
    marginBottom: 7,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },
  noneOptionIcon: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#EEF1F5',
  },
  noneOptionText: { marginLeft: 9 },
  noneOptionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  noneOptionSubtitle: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 8,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 25,
  },
  modalItem: {
    minHeight: 58,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    marginBottom: 3,
  },
  modalItemSelected: {
    backgroundColor:
      SELECTED_ITEM_BG || `${PRIMARY_COLOR}10`,
  },
  modalItemIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F4F6F9',
  },
  modalItemIconSelected: {
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalItemText: {
    flex: 1,
    marginLeft: 10,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  workCenterText: { flex: 1, marginLeft: 10 },
  workCenterCode: {
    marginTop: 2,
    color: '#A0A9B5',
    fontSize: 8,
    fontWeight: '500',
  },
  emptyPicker: {
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 25,
  },
  emptyPickerIcon: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#F3F5F8',
  },
  emptyPickerTitle: {
    marginTop: 13,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyPickerText: {
    marginTop: 4,
    color: TEXT_SECONDARY,
    fontSize: 10,
    textAlign: 'center',
  },

  // LOADING
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  loadingTitle: {
    marginTop: 14,
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  loadingSubtitle: {
    marginTop: 5,
    color: TEXT_SECONDARY,
    fontSize: 10,
  },
});