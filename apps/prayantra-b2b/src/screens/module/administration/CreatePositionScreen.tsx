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
} from '@b2b/api-client';

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
  title: z
    .string()
    .min(1, 'Position title is required'),

  department_id: z
    .string()
    .min(1, 'Department is required'),

  work_center_code: z
    .string()
    .nullable()
    .optional(),

  is_open: z.boolean(),

  is_schedulable: z.boolean(),

  attendance_required: z.boolean(),

  overtime_allowed: z.boolean(),
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
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    modalType,
    setModalType,
  ] = useState<
    'department' | 'workCenter'
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
      title: '',

      department_id: '',

      work_center_code: null,

      is_open: true,

      is_schedulable: true,

      attendance_required: true,

      overtime_allowed: false,
    },
  });

  const selectedDepartment =
    watch('department_id');

  const selectedWorkCenter =
    watch('work_center_code');

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

          const [
            deptRes,
            wcRes,
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
          ]);

          setDepartments(
            deptRes.data || []
          );

          setWorkCenters(
            wcRes.data || []
          );
        } catch (error) {
          console.error(
            'Failed to load options:',
            error
          );

          Alert.alert(
            'Unable to load',
            'Departments and work centers could not be loaded.'
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
        ...data,

        company_id:
          companyId,

        work_center_code:
          data.work_center_code ??
          undefined,
      };

      await createPosition(
        companyId,
        deviceId,
        payload,
        accessToken
      );

      Alert.alert(
        'Position Created',
        `"${data.title}" has been created successfully.`,
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
        'Create position error:',
        error
      );

      const message =
        error?.response?.data
          ?.message ||
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
    type:
      | 'department'
      | 'workCenter'
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closePicker = () => {
    setModalVisible(false);
  };

  const selectItem = (
    value: string
  ) => {
    if (
      modalType ===
      'department'
    ) {
      setValue(
        'department_id',
        value,
        {
          shouldValidate: true,
        }
      );
    } else {
      setValue(
        'work_center_code',
        value,
        {
          shouldValidate: true,
        }
      );
    }

    closePicker();
  };

  // =======================================================
  // LABEL HELPERS
  // =======================================================

  const getDepartmentLabel = (
    id: string
  ) => {
    const department =
      departments.find(
        (item) =>
          item.department_id === id
      );

    return (
      department?.department_name ||
      'Select Department'
    );
  };

  const getWorkCenterLabel = (
    code: string | null
  ) => {
    if (!code) {
      return 'Select Work Center';
    }

    const workCenter =
      workCenters.find(
        (item) =>
          item.work_center_code ===
          code
      );

    return (
      workCenter?.name ||
      'Select Work Center'
    );
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loadingOptions) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>

          <View
            style={styles.loadingIcon}
          >
            <Icon
              name="briefcase-plus-outline"
              size={30}
              color={
                PRIMARY_COLOR
              }
            />
          </View>

          <ActivityIndicator
            size="small"
            color={
              PRIMARY_COLOR
            }
            style={
              styles.loadingSpinner
            }
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Preparing Position Form
          </Text>

          <Text
            style={
              styles.loadingSubtitle
            }
          >
            Loading departments and work centers...
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
      edges={[
        'top',
        'bottom',
      ]}
      style={styles.container}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <LinearGradient
        colors={
          GRADIENT_COLORS
        }
        start={
          GRADIENT_START
        }
        end={
          GRADIENT_END
        }
        style={[
          styles.header,
          {
            paddingTop:
              10,
          },
        ]}
      >

        <View
          style={
            styles.headerRow
          }
        >

          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.8}
          >
            <Icon
              name="arrow-left"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTitleContainer
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Create Position
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Add a new organizational position
            </Text>
          </View>

          <View
            style={
              styles.headerIcon
            }
          >
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
        style={
          styles.scrollView
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              insets.bottom +
              35,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionIcon
            }
          >
            <Icon
              name="information-outline"
              size={19}
              color={
                PRIMARY_COLOR
              }
            />
          </View>

          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Basic Information
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Define the position and where it belongs
            </Text>
          </View>
        </View>

        <View
          style={
            styles.formCard
          }
        >

          {/* Position title */}

          <Controller
            control={control}
            name="title"
            render={({
              field: {
                onChange,
                onBlur,
                value,
              },
            }) => (
              <View>
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Position Title
                  <Text
                    style={
                      styles.required
                    }
                  >
                    {' '}*
                  </Text>
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    errors.title &&
                      styles.inputError,
                  ]}
                >

                  <Icon
                    name="briefcase-outline"
                    size={20}
                    color={
                      errors.title
                        ? ERROR_COLOR
                        : TEXT_SECONDARY
                    }
                  />

                  <TextInput
                    value={value}
                    onChangeText={
                      onChange
                    }
                    onBlur={onBlur}
                    placeholder="e.g. Senior Software Engineer"
                    placeholderTextColor="#9AA4B2"
                    style={
                      styles.textInput
                    }
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    selectionColor={
                      PRIMARY_COLOR
                    }
                    autoCapitalize="words"
                  />

                </View>

                {errors.title && (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      errors.title
                        .message
                    }
                  </Text>
                )}
              </View>
            )}
          />

          {/* Department */}

          <View
            style={
              styles.fieldSpacing
            }
          >

            <Text
              style={
                styles.fieldLabel
              }
            >
              Department
              <Text
                style={
                  styles.required
                }
              >
                {' '}*
              </Text>
            </Text>

            <TouchableOpacity
              style={[
                styles.selectButton,
                errors.department_id &&
                  styles.selectError,
              ]}
              onPress={() =>
                openPicker(
                  'department'
                )
              }
              activeOpacity={0.8}
            >

              <View
                style={
                  styles.selectLeft
                }
              >

                <View
                  style={
                    styles.selectIcon
                  }
                >
                  <Icon
                    name="domain"
                    size={19}
                    color={
                      PRIMARY_COLOR
                    }
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.selectText,
                    !selectedDepartment &&
                      styles.placeholder,
                  ]}
                >
                  {selectedDepartment
                    ? getDepartmentLabel(
                        selectedDepartment
                      )
                    : 'Select Department'}
                </Text>

              </View>

              <Icon
                name="chevron-down"
                size={22}
                color={
                  TEXT_SECONDARY
                }
              />

            </TouchableOpacity>

            {errors.department_id && (
              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errors.department_id
                    .message
                }
              </Text>
            )}

          </View>

          {/* Work Center */}

          <View
            style={
              styles.fieldSpacing
            }
          >

            <View
              style={
                styles.labelRow
              }
            >

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Work Center
              </Text>

              <View
                style={
                  styles.optionalBadge
                }
              >
                <Text
                  style={
                    styles.optionalText
                  }
                >
                  OPTIONAL
                </Text>
              </View>

            </View>

            <TouchableOpacity
              style={
                styles.selectButton
              }
              onPress={() =>
                openPicker(
                  'workCenter'
                )
              }
              activeOpacity={0.8}
            >

              <View
                style={
                  styles.selectLeft
                }
              >

                <View
                  style={[
                    styles.selectIcon,
                    {
                      backgroundColor:
                        '#F1F5F9',
                    },
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
                    !selectedWorkCenter &&
                      styles.placeholder,
                  ]}
                >
                  {selectedWorkCenter
                    ? getWorkCenterLabel(
                        selectedWorkCenter
                      )
                    : 'Select Work Center'}
                </Text>

              </View>

              <Icon
                name="chevron-down"
                size={22}
                color={
                  TEXT_SECONDARY
                }
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
            {
              marginTop: 27,
            },
          ]}
        >

          <View
            style={
              styles.sectionIcon
            }
          >
            <Icon
              name="tune-variant"
              size={19}
              color={
                PRIMARY_COLOR
              }
            />
          </View>

          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Position Settings
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Configure how this position operates
            </Text>
          </View>

        </View>

        <View
          style={
            styles.settingsCard
          }
        >

          {/* Open Position */}

          <Controller
            control={control}
            name="is_open"
            render={({
              field: {
                onChange,
                value,
              },
            }) => (
              <SettingRow
                icon="briefcase-check-outline"
                title="Open Position"
                description="Allow this position to be filled"
                value={value}
                onChange={onChange}
              />
            )}
          />

          <View
            style={
              styles.settingDivider
            }
          />

          {/* Schedulable */}

          <Controller
            control={control}
            name="is_schedulable"
            render={({
              field: {
                onChange,
                value,
              },
            }) => (
              <SettingRow
                icon="calendar-clock-outline"
                title="Schedulable"
                description="Allow shifts and schedules to be assigned"
                value={value}
                onChange={onChange}
              />
            )}
          />

          <View
            style={
              styles.settingDivider
            }
          />

          {/* Attendance */}

          <Controller
            control={control}
            name="attendance_required"
            render={({
              field: {
                onChange,
                value,
              },
            }) => (
              <SettingRow
                icon="clock-check-outline"
                title="Attendance Required"
                description="Require attendance tracking for this position"
                value={value}
                onChange={onChange}
              />
            )}
          />

          <View
            style={
              styles.settingDivider
            }
          />

          {/* Overtime */}

          <Controller
            control={control}
            name="overtime_allowed"
            render={({
              field: {
                onChange,
                value,
              },
            }) => (
              <SettingRow
                icon="clock-plus-outline"
                title="Overtime Allowed"
                description="Allow overtime hours for this position"
                value={value}
                onChange={onChange}
              />
            )}
          />

        </View>

        {/* =================================================
            INFO
        ================================================= */}

        <View
          style={
            styles.infoBox
          }
        >

          <Icon
            name="information-outline"
            size={18}
            color={
              PRIMARY_COLOR
            }
          />

          <Text
            style={
              styles.infoText
            }
          >
            You can change these settings later from the
            position management screen.
          </Text>

        </View>

        {/* =================================================
            CREATE BUTTON
        ================================================= */}

        <TouchableOpacity
          onPress={handleSubmit(
            onSubmit
          )}
          disabled={loading}
          activeOpacity={0.85}
          style={
            styles.submitButtonWrapper
          }
        >

          <LinearGradient
            colors={
              GRADIENT_COLORS
            }
            start={
              GRADIENT_START
            }
            end={
              GRADIENT_END
            }
            style={
              styles.submitButton
            }
          >

            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
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

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
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
        onRequestClose={
          closePicker
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.modalContent
            }
          >

            {/* Handle */}

            <View
              style={
                styles.modalHandle
              }
            />

            {/* Header */}

            <View
              style={
                styles.modalHeader
              }
            >

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {modalType ===
                  'department'
                    ? 'Select Department'
                    : 'Select Work Center'}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Choose one option to continue
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  closePicker
                }
                style={
                  styles.modalClose
                }
              >
                <Icon
                  name="close"
                  size={20}
                  color={
                    TEXT_SECONDARY
                  }
                />
              </TouchableOpacity>

            </View>

            {/* List */}

            {modalType ===
            'department' ? (
              <FlatList
                data={
                  departments
                }
                keyExtractor={(
                  item
                ) =>
                  item.department_id
                }
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.modalList
                }
                renderItem={({
                  item,
                }) => {
                  const selected =
                    selectedDepartment ===
                    item.department_id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected &&
                          styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        selectItem(
                          item.department_id
                        )
                      }
                      activeOpacity={
                        0.75
                      }
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
                        {
                          item.department_name
                        }
                      </Text>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={21}
                          color={
                            PRIMARY_COLOR
                          }
                        />
                      )}

                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={
                  workCenters
                }
                keyExtractor={(
                  item
                ) =>
                  item.work_center_code
                }
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.modalList
                }
                renderItem={({
                  item,
                }) => {
                  const selected =
                    selectedWorkCenter ===
                    item.work_center_code;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selected &&
                          styles.modalItemSelected,
                      ]}
                      onPress={() =>
                        selectItem(
                          item.work_center_code
                        )
                      }
                      activeOpacity={
                        0.75
                      }
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

                      <View
                        style={
                          styles.modalItemInfo
                        }
                      >

                        <Text
                          style={[
                            styles.modalItemText,
                            selected &&
                              styles.modalItemTextSelected,
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {
                            item.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.modalItemCode
                          }
                        >
                          {
                            item.work_center_code
                          }
                        </Text>

                      </View>

                      {selected && (
                        <Icon
                          name="check-circle"
                          size={21}
                          color={
                            PRIMARY_COLOR
                          }
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
// SETTING ROW
// =========================================================

type SettingRowProps = {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (
    value: boolean
  ) => void;
};

function SettingRow({
  icon,
  title,
  description,
  value,
  onChange,
}: SettingRowProps) {
  return (
    <View
      style={
        styles.settingRow
      }
    >

      <View
        style={
          styles.settingLeft
        }
      >

        <View
          style={[
            styles.settingIcon,
            value &&
              styles.settingIconActive,
          ]}
        >
          <Icon
            name={icon}
            size={20}
            color={
              value
                ? PRIMARY_COLOR
                : '#64748B'
            }
          />
        </View>

        <View
          style={
            styles.settingText
          }
        >

          <Text
            style={
              styles.settingTitle
            }
          >
            {title}
          </Text>

          <Text
            style={
              styles.settingDescription
            }
          >
            {description}
          </Text>

        </View>

      </View>

      <Switch
        value={value}
        onValueChange={
          onChange
        }
        color={
          PRIMARY_COLOR
        }
        style={
          styles.switch
        }
      />

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    // =====================================================
    // PAGE
    // =====================================================

    container: {
      flex: 1,
      backgroundColor:
        BACKGROUND_COLOR,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },

    // =====================================================
    // HEADER
    // =====================================================

    header: {
      paddingHorizontal: 20,
      paddingBottom: 17,

      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

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

      backgroundColor:
        'rgba(255,255,255,0.14)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.18)',
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

      color:
        'rgba(255,255,255,0.68)',

      fontSize: 9,

      fontWeight: '500',
    },

    headerIcon: {
      width: 40,
      height: 40,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 11,

      backgroundColor:
        'rgba(255,255,255,0.12)',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.16)',
    },

    // =====================================================
    // SECTION
    // =====================================================

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

      backgroundColor:
        `${PRIMARY_COLOR}12`,
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

    // =====================================================
    // FORM CARD
    // =====================================================

    formCard: {
      padding: 16,

      borderRadius: 16,

      backgroundColor:
        CARD_BACKGROUND,

      borderWidth: 1,

      borderColor:
        '#E5EAF0',

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.035,

      shadowRadius: 7,

      elevation: 1,
    },

    // =====================================================
    // LABELS
    // =====================================================

    fieldLabel: {
      color: TEXT_PRIMARY,

      fontSize: 12,

      fontWeight: '600',

      marginBottom: 7,
    },

    required: {
      color: ERROR_COLOR,
    },

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

      backgroundColor:
        '#F1F5F9',
    },

    optionalText: {
      color: '#64748B',

      fontSize: 7,

      fontWeight: '700',

      letterSpacing: 0.4,
    },

    // =====================================================
    // TEXT INPUT
    // =====================================================

    inputContainer: {
      minHeight: 52,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 13,

      borderWidth: 1,

      borderColor:
        BORDER_COLOR,

      borderRadius: 11,

      backgroundColor:
        CARD_BACKGROUND,
    },

    inputError: {
      borderColor:
        ERROR_COLOR,
    },

    textInput: {
      flex: 1,

      height: 50,

      marginLeft: 9,

      paddingHorizontal: 0,

      backgroundColor:
        'transparent',

      color: TEXT_PRIMARY,

      fontSize: 14,
    },

    // =====================================================
    // SELECT
    // =====================================================

    fieldSpacing: {
      marginTop: 18,
    },

    selectButton: {
      minHeight: 54,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      paddingHorizontal: 11,

      borderWidth: 1,

      borderColor:
        BORDER_COLOR,

      borderRadius: 11,

      backgroundColor:
        CARD_BACKGROUND,
    },

    selectError: {
      borderColor:
        ERROR_COLOR,
    },

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

      backgroundColor:
        `${PRIMARY_COLOR}12`,
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

    // =====================================================
    // SETTINGS
    // =====================================================

    settingsCard: {
      paddingHorizontal: 15,

      borderRadius: 16,

      backgroundColor:
        CARD_BACKGROUND,

      borderWidth: 1,

      borderColor:
        '#E5EAF0',

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.035,

      shadowRadius: 7,

      elevation: 1,
    },

    settingRow: {
      minHeight: 76,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
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

      backgroundColor:
        '#F1F5F9',
    },

    settingIconActive: {
      backgroundColor:
        `${PRIMARY_COLOR}12`,
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

    switch: {
      marginLeft: 5,
    },

    settingDivider: {
      height: 1,

      backgroundColor:
        '#EDF0F4',
    },

    // =====================================================
    // INFO
    // =====================================================

    infoBox: {
      marginTop: 16,

      padding: 12,

      flexDirection: 'row',

      alignItems: 'flex-start',

      borderRadius: 11,

      backgroundColor:
        `${PRIMARY_COLOR}08`,

      borderWidth: 1,

      borderColor:
        `${PRIMARY_COLOR}18`,
    },

    infoText: {
      flex: 1,

      marginLeft: 8,

      color: '#64748B',

      fontSize: 9,

      lineHeight: 14,

      fontWeight: '500',
    },

    // =====================================================
    // SUBMIT
    // =====================================================

    submitButtonWrapper: {
      marginTop: 20,

      borderRadius: 13,

      overflow: 'hidden',

      shadowColor:
        PRIMARY_COLOR,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.2,

      shadowRadius: 10,

      elevation: 5,
    },

    submitButton: {
      minHeight: 55,

      paddingHorizontal: 17,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      gap: 9,

      borderRadius: 13,
    },

    submitButtonText: {
      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '700',
    },

    // =====================================================
    // LOADING
    // =====================================================

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

      backgroundColor:
        `${PRIMARY_COLOR}12`,
    },

    loadingSpinner: {
      marginTop: 20,
    },

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

    // =====================================================
    // MODAL
    // =====================================================

    modalOverlay: {
      flex: 1,

      justifyContent:
        'flex-end',

      backgroundColor:
        'rgba(15,23,42,0.45)',
    },

    modalContent: {
      maxHeight: '78%',

      backgroundColor:
        CARD_BACKGROUND,

      borderTopLeftRadius: 24,

      borderTopRightRadius: 24,

      paddingBottom: 15,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: -4,
      },

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

      backgroundColor:
        '#D7DCE3',
    },

    modalHeader: {
      paddingHorizontal: 20,
      paddingVertical: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      borderBottomWidth: 1,

      borderBottomColor:
        '#EDF0F4',
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

      backgroundColor:
        '#F1F5F9',
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
      backgroundColor:
        SELECTED_ITEM_BG ||
        `${PRIMARY_COLOR}10`,
    },

    modalItemIcon: {
      width: 38,
      height: 38,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,

      backgroundColor:
        '#F1F5F9',
    },

    modalItemIconSelected: {
      backgroundColor:
        `${PRIMARY_COLOR}12`,
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

    modalItemInfoText: {
      color: TEXT_PRIMARY,

      fontSize: 13,

      fontWeight: '500',
    },

    modalItemCode: {
      marginTop: 3,

      color: '#94A3B8',

      fontSize: 9,

      fontWeight: '500',
    },
  });