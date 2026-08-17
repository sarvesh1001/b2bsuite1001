// apps/prayantra-b2b/src/screens/module/administration/EmployeeSearchScreen.tsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput,
  Alert,
  Keyboard,
  Pressable,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
} from 'react-native-paper';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  axiosInstance,
  listRoles,
  getRootDepartments,
  findEmployeeByUsername,
  advancedSearchEmployees,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  CompanyEmployee,
  Role,
  Department,
} from '@b2b/shared-types';

import {
  RootStackParamList,
} from '../../../navigation';

import {
  UserAvatar,
} from '../../../components/UserAvatar';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SELECTED_ITEM_BG,
} from '../../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'EmployeeSearch'
  >;

// =========================================================
// CONSTANTS
// =========================================================

const LIMIT = 20;

// =========================================================
// REQUEST HEADERS
// =========================================================

const getBaseHeaders = (
  companyId: string,
  deviceId: string,
  accessToken: string
) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

// =========================================================
// SCREEN
// =========================================================

export default function EmployeeSearchScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // SEARCH
  // =======================================================

  const [searchTerm, setSearchTerm] =
    useState('');

  const [searchQuery, setSearchQuery] =
    useState('');

  // =======================================================
  // EMPLOYEES
  // =======================================================

  const [employees, setEmployees] =
    useState<CompanyEmployee[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(true);

  const [offset, setOffset] =
    useState(0);

  // =======================================================
  // FILTERS
  // =======================================================

  const [selectedRoleId, setSelectedRoleId] =
    useState<string | undefined>();

  const [selectedDeptId, setSelectedDeptId] =
    useState<string | undefined>();

  // =======================================================
  // FILTER DATA
  // =======================================================

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loadingFilters, setLoadingFilters] =
    useState(true);

  // =======================================================
  // MODALS
  // =======================================================

  const [roleModalVisible, setRoleModalVisible] =
    useState(false);

  const [deptModalVisible, setDeptModalVisible] =
    useState(false);

  // =======================================================
  // FETCH FILTERS
  // =======================================================

  useEffect(() => {
    const fetchFilters = async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        setLoadingFilters(false);
        return;
      }

      try {
        const [
          rolesRes,
          departmentsRes,
        ] = await Promise.all([
          listRoles(
            companyId,
            deviceId,
            {
              page: 1,
              limit: 100,
            },
            accessToken
          ),

          getRootDepartments(
            companyId,
            deviceId,
            accessToken
          ),
        ]);

        setRoles(
          rolesRes.data?.roles || []
        );

        setDepartments(
          departmentsRes.data || []
        );
      } catch (error) {
        console.error(
          'Failed to load filters:',
          error
        );

        Alert.alert(
          'Unable to load filters',
          'Department and role filters could not be loaded.'
        );
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchFilters();
  }, [
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // SELECTED FILTER LABELS
  // =======================================================

  const selectedRoleName =
    useMemo(() => {
      if (!selectedRoleId) {
        return 'All Roles';
      }

      return (
        roles.find(
          role =>
            role.role_id ===
            selectedRoleId
        )?.role_name ||
        'Role'
      );
    }, [
      roles,
      selectedRoleId,
    ]);

  const selectedDepartmentName =
    useMemo(() => {
      if (!selectedDeptId) {
        return 'All Departments';
      }

      return (
        departments.find(
          department =>
            department.department_id ===
            selectedDeptId
        )?.department_name ||
        'Department'
      );
    }, [
      departments,
      selectedDeptId,
    ]);

  // =======================================================
  // FILTER ACTIVE
  // =======================================================

  const hasActiveFilters =
    !!selectedRoleId ||
    !!selectedDeptId ||
    !!searchQuery.trim();

  // =======================================================
  // LOAD EMPLOYEES
  // =======================================================

  const loadEmployees = useCallback(
    async (
      reset = true
    ) => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      const currentOffset =
        reset ? 0 : offset;

      setLoading(true);

      try {
        // =================================================
        // EXACT USERNAME SEARCH
        // =================================================

        if (searchQuery.trim()) {
          try {
            const response =
              await findEmployeeByUsername(
                companyId,
                deviceId,
                searchQuery.trim(),
                accessToken
              );

            const employee =
              (response.data as any)
                ?.employee || null;

            setEmployees(
              employee
                ? [employee]
                : []
            );

            setOffset(
              employee ? 1 : 0
            );

            setHasMore(false);

            return;
          } catch {
            setEmployees([]);
            setOffset(0);
            setHasMore(false);

            return;
          }
        }

        // =================================================
        // ADVANCED SEARCH
        // =================================================

        if (
          selectedRoleId ||
          selectedDeptId
        ) {
          const params: any = {
            limit: LIMIT,
            offset: currentOffset,
          };

          if (selectedRoleId) {
            params.role_id =
              selectedRoleId;
          }

          if (selectedDeptId) {
            params.department_id =
              selectedDeptId;
          }

          const response =
            await advancedSearchEmployees(
              companyId,
              deviceId,
              params,
              accessToken
            );

          const data =
            response.data?.employees ||
            [];

          if (reset) {
            setEmployees(data);
            setOffset(data.length);
          } else {
            setEmployees(prev => [
              ...prev,
              ...data,
            ]);

            setOffset(
              prev =>
                prev + data.length
            );
          }

          setHasMore(
            data.length === LIMIT
          );

          return;
        }

        // =================================================
        // NORMAL EMPLOYEE LIST
        // =================================================

        const url =
          `/companies/${companyId}/getemployees`;

        const headers =
          getBaseHeaders(
            companyId,
            deviceId,
            accessToken
          );

        const response =
          await axiosInstance.get(
            url,
            {
              headers,
              params: {
                limit: LIMIT,
                offset: currentOffset,
              },
            }
          );

        const data =
          response.data?.data
            ?.employees || [];

        if (reset) {
          setEmployees(data);
          setOffset(data.length);
        } else {
          setEmployees(prev => [
            ...prev,
            ...data,
          ]);

          setOffset(
            prev =>
              prev + data.length
          );
        }

        setHasMore(
          data.length === LIMIT
        );
      } catch (error: any) {
        console.error(
          'Failed to load employees:',
          error
        );

        Alert.alert(
          'Unable to load employees',
          error?.message ||
            'Something went wrong while loading employees.'
        );
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
    ]
  );

  // =======================================================
  // INITIAL / FILTER LOAD
  // =======================================================

  useEffect(() => {
    setOffset(0);

    loadEmployees(true);

    // Intentional:
    // search/filter changes should trigger a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    selectedRoleId,
    selectedDeptId,
  ]);

  // =======================================================
  // SEARCH
  // =======================================================

  const performSearch = () => {
    Keyboard.dismiss();

    setSearchQuery(
      searchTerm.trim()
    );
  };

  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  const clearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    Keyboard.dismiss();
  };

  // =======================================================
  // CLEAR ALL
  // =======================================================

  const clearFilters = () => {
    setSelectedRoleId(undefined);
    setSelectedDeptId(undefined);
    setSearchTerm('');
    setSearchQuery('');

    Keyboard.dismiss();
  };

  // =======================================================
  // REFRESH
  // =======================================================

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);

    loadEmployees(true);
  };

  // =======================================================
  // PAGINATION
  // =======================================================

  const loadMore = () => {
    if (
      loading ||
      refreshing ||
      !hasMore ||
      searchQuery.trim()
    ) {
      return;
    }

    loadEmployees(false);
  };

  // =======================================================
  // EMPLOYEE CARD
  // =======================================================

  const renderEmployee = ({
    item,
    index,
  }: {
    item: CompanyEmployee;
    index: number;
  }) => {
    const displayName =
      item.full_name ||
      item.username ||
      'Unnamed Employee';

    const employeeId =
      item.employee_id ||
      'N/A';

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() =>
          navigation.navigate(
            'EmployeeDetail',
            {
              userId:
                item.user_id,
            }
          )
        }
        style={styles.employeeCard}
      >
        {/* Accent */}

        <View
          style={styles.employeeCardAccent}
        />

        {/* Number */}

        <Text style={styles.employeeNumber}>
          {String(index + 1).padStart(
            2,
            '0'
          )}
        </Text>

        {/* Avatar */}

        <UserAvatar
          userId={item.user_id}
          username={item.username}
          fullName={item.full_name}
          size={50}
          style={styles.avatar}
        />

        {/* Information */}

        <View style={styles.employeeInfo}>
          <Text
            numberOfLines={1}
            style={styles.employeeName}
          >
            {displayName}
          </Text>

          {item.username ? (
            <View
              style={styles.usernameRow}
            >
              <Icon
                name="at"
                size={12}
                color={TEXT_SECONDARY}
              />

              <Text
                numberOfLines={1}
                style={
                  styles.employeeUsername
                }
              >
                {item.username}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.employeeIdRow}
          >
            <Icon
              name="badge-account-outline"
              size={12}
              color={TEXT_SECONDARY}
            />

            <Text
              numberOfLines={1}
              style={
                styles.employeeId
              }
            >
              {employeeId}
            </Text>
          </View>
        </View>

        {/* Arrow */}

        <View style={styles.employeeArrow}>
          <Icon
            name="chevron-right"
            size={19}
            color={PRIMARY_COLOR}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // =======================================================
  // EMPTY STATE
  // =======================================================

  const renderEmptyState = () => {
    const isFiltered =
      hasActiveFilters;

    return (
      <View style={styles.emptyState}>
        <View
          style={styles.emptyIcon}
        >
          <Icon
            name={
              isFiltered
                ? 'account-search-outline'
                : 'account-group-outline'
            }
            size={31}
            color={PRIMARY_COLOR}
          />
        </View>

        <Text style={styles.emptyTitle}>
          {isFiltered
            ? 'No employees found'
            : 'Find an employee'}
        </Text>

        <Text
          style={styles.emptyDescription}
        >
          {isFiltered
            ? 'Try changing your search or filters to find another employee.'
            : 'Search using an exact username or use the filters below.'}
        </Text>

        {isFiltered ? (
          <TouchableOpacity
            style={
              styles.emptyClearButton
            }
            onPress={
              clearFilters
            }
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.emptyClearButtonText
              }
            >
              Clear filters
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // =======================================================
  // FILTER MODAL
  // =======================================================

  const renderRoleModal = () => (
    <Modal
      visible={roleModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() =>
        setRoleModalVisible(false)
      }
    >
      <View
        style={styles.modalOverlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() =>
            setRoleModalVisible(false)
          }
        />

        <View
          style={styles.modalSheet}
        >
          <View
            style={styles.modalHandle}
          />

          <View
            style={styles.modalHeader}
          >
            <View>
              <Text
                style={
                  styles.modalEyebrow
                }
              >
                FILTER
              </Text>

              <Text
                style={
                  styles.modalTitle
                }
              >
                Select Role
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() =>
                setRoleModalVisible(
                  false
                )
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

          <FlatList
            data={[
              {
                role_id: '',
                role_name:
                  'All Roles',
              },
              ...roles,
            ]}
            keyExtractor={item =>
              item.role_id ||
              'all-roles'
            }
            renderItem={({
              item,
            }) => {
              const selected =
                selectedRoleId ===
                item.role_id;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.modalOption,
                    selected &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedRoleId(
                      item.role_id ||
                        undefined
                    );

                    setRoleModalVisible(
                      false
                    );
                  }}
                >
                  <View
                    style={
                      styles.modalOptionLeft
                    }
                  >
                    <View
                      style={[
                        styles.modalOptionIcon,
                        selected && {
                          backgroundColor:
                            `${PRIMARY_COLOR}12`,
                        },
                      ]}
                    >
                      <Icon
                        name="account-tie-outline"
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
                        styles.modalOptionText,
                        selected &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {item.role_name}
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
            contentContainerStyle={
              styles.modalList
            }
            showsVerticalScrollIndicator={
              false
            }
          />
        </View>
      </View>
    </Modal>
  );

  // =======================================================
  // DEPARTMENT MODAL
  // =======================================================

  const renderDepartmentModal =
    () => (
      <Modal
        visible={
          deptModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDeptModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={
              StyleSheet.absoluteFill
            }
            onPress={() =>
              setDeptModalVisible(
                false
              )
            }
          />

          <View
            style={
              styles.modalSheet
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  FILTER
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Department
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.modalClose
                }
                onPress={() =>
                  setDeptModalVisible(
                    false
                  )
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

            <FlatList
              data={[
                {
                  department_id:
                    '',
                  department_name:
                    'All Departments',
                },
                ...departments,
              ]}
              keyExtractor={item =>
                item.department_id ||
                'all-departments'
              }
              renderItem={({
                item,
              }) => {
                const selected =
                  selectedDeptId ===
                  item.department_id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.modalOption,
                      selected &&
                        styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDeptId(
                        item.department_id ||
                          undefined
                      );

                      setDeptModalVisible(
                        false
                      );
                    }}
                  >
                    <View
                      style={
                        styles.modalOptionLeft
                      }
                    >
                      <View
                        style={[
                          styles.modalOptionIcon,
                          selected && {
                            backgroundColor:
                              `${PRIMARY_COLOR}12`,
                          },
                        ]}
                      >
                        <Icon
                          name="office-building-outline"
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
                          styles.modalOptionText,
                          selected &&
                            styles.modalOptionTextSelected,
                        ]}
                      >
                        {
                          item.department_name
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
              contentContainerStyle={
                styles.modalList
              }
              showsVerticalScrollIndicator={
                false
              }
            />
          </View>
        </View>
      </Modal>
    );

  // =======================================================
  // FILTER CHIPS
  // =======================================================

  const renderFilters = () => (
    <View
      style={styles.filterSection}
    >
      <View
        style={styles.filterHeader}
      >
        <View>
          <Text
            style={
              styles.filterTitle
            }
          >
            Filters
          </Text>

          <Text
            style={
              styles.filterSubtitle
            }
          >
            Narrow down employees
          </Text>
        </View>

        {hasActiveFilters && (
          <TouchableOpacity
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <Text
              style={
                styles.clearAllText
              }
            >
              Clear all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={styles.filterChips}
      >
        {/* Role */}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.filterChip,
            selectedRoleId &&
              styles.filterChipActive,
          ]}
          onPress={() =>
            setRoleModalVisible(
              true
            )
          }
        >
          <Icon
            name="account-tie-outline"
            size={16}
            color={
              selectedRoleId
                ? PRIMARY_COLOR
                : TEXT_SECONDARY
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.filterChipText,
              selectedRoleId &&
                styles.filterChipTextActive,
            ]}
          >
            {selectedRoleId
              ? selectedRoleName
              : 'All Roles'}
          </Text>

          <Icon
            name="chevron-down"
            size={16}
            color={
              selectedRoleId
                ? PRIMARY_COLOR
                : TEXT_SECONDARY
            }
          />
        </TouchableOpacity>

        {/* Department */}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.filterChip,
            selectedDeptId &&
              styles.filterChipActive,
          ]}
          onPress={() =>
            setDeptModalVisible(
              true
            )
          }
        >
          <Icon
            name="office-building-outline"
            size={16}
            color={
              selectedDeptId
                ? PRIMARY_COLOR
                : TEXT_SECONDARY
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.filterChipText,
              selectedDeptId &&
                styles.filterChipTextActive,
            ]}
          >
            {selectedDeptId
              ? selectedDepartmentName
              : 'All Departments'}
          </Text>

          <Icon
            name="chevron-down"
            size={16}
            color={
              selectedDeptId
                ? PRIMARY_COLOR
                : TEXT_SECONDARY
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // =======================================================
  // FILTER LOADING
  // =======================================================

  if (loadingFilters) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loadingScreen
          }
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <Icon
              name="account-search-outline"
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
            Preparing Employee Search
          </Text>

          <Text
            style={
              styles.loadingSubtitle
            }
          >
            Loading roles and departments...
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
      style={
        styles.container
      }
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={styles.header}
      >
        <View
          style={styles.headerTop}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
          >
            <Icon
              name="arrow-left"
              size={20}
              color={
                TEXT_PRIMARY
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTitleContainer
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              ADMINISTRATION
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Employee Search
            </Text>
          </View>

          <View
            style={
              styles.headerCount
            }
          >
            <Icon
              name="account-group-outline"
              size={17}
              color={
                PRIMARY_COLOR
              }
            />

            <Text
              style={
                styles.headerCountText
              }
            >
              {employees.length}
            </Text>
          </View>
        </View>
      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      <View
        style={styles.searchSection}
      >
        <View
          style={[
            styles.searchContainer,
            searchTerm.length > 0 &&
              styles.searchContainerActive,
          ]}
        >
          <Icon
            name="magnify"
            size={21}
            color={
              searchTerm
                ? PRIMARY_COLOR
                : TEXT_SECONDARY
            }
          />

          <RNTextInput
            style={
              styles.searchInput
            }
            placeholder="Search exact username"
            placeholderTextColor={
              '#9AA4B2'
            }
            value={searchTerm}
            onChangeText={
              setSearchTerm
            }
            returnKeyType="search"
            onSubmitEditing={
              performSearch
            }
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searchTerm.length >
          0 ? (
            <TouchableOpacity
              style={
                styles.clearSearchButton
              }
              onPress={
                clearSearch
              }
            >
              <Icon
                name="close"
                size={18}
                color={
                  TEXT_SECONDARY
                }
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search hint */}

        <View
          style={
            styles.searchHint
          }
        >
          <Icon
            name="information-outline"
            size={12}
            color={
              TEXT_SECONDARY
            }
          />

          <Text
            style={
              styles.searchHintText
            }
          >
            Press search on your keyboard to find an exact username
          </Text>
        </View>
      </View>

      {/* =================================================
          FILTERS
      ================================================= */}

      {renderFilters()}

      {/* =================================================
          RESULTS HEADER
      ================================================= */}

      <View
        style={
          styles.resultsHeader
        }
      >
        <View>
          <Text
            style={
              styles.resultsTitle
            }
          >
            Employees
          </Text>

          <Text
            style={
              styles.resultsSubtitle
            }
          >
            {employees.length > 0
              ? `${employees.length} employee${
                  employees.length ===
                  1
                    ? ''
                    : 's'
                } shown`
              : 'Employee directory'}
          </Text>
        </View>

        {loading &&
          employees.length >
            0 && (
            <ActivityIndicator
              size="small"
              color={
                PRIMARY_COLOR
              }
            />
          )}
      </View>

      {/* =================================================
          RESULTS
      ================================================= */}

      <FlatList
        data={employees}
        keyExtractor={item =>
          item.user_id
        }
        renderItem={
          renderEmployee
        }
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        onRefresh={
          onRefresh
        }
        refreshing={
          refreshing
        }
        onEndReached={
          loadMore
        }
        onEndReachedThreshold={
          0.35
        }
        ListEmptyComponent={
          !loading
            ? renderEmptyState()
            : null
        }
        ListFooterComponent={
          loading &&
          employees.length >
            0 ? (
            <View
              style={
                styles.footerLoader
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  PRIMARY_COLOR
                }
              />

              <Text
                style={
                  styles.footerText
                }
              >
                Loading more employees...
              </Text>
            </View>
          ) : null
        }
      />

      {/* =================================================
          MODALS
      ================================================= */}

      {renderRoleModal()}

      {renderDepartmentModal()}
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // PAGE
  // =======================================================

  container: {
    flex: 1,

    backgroundColor:
      BACKGROUND_COLOR,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,

    backgroundColor:
      CARD_BACKGROUND,

    borderBottomWidth: 1,
    borderBottomColor:
      BORDER_COLOR,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 6,

    elevation: 2,
  },

  headerTop: {
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
      '#F4F6F9',

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,
  },

  headerTitleContainer: {
    flex: 1,

    marginLeft: 12,
  },

  headerEyebrow: {
    color:
      PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 3,

    color:
      TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',

    letterSpacing: -0.2,
  },

  headerCount: {
    minWidth: 44,
    height: 38,

    paddingHorizontal: 9,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 5,

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,

    borderWidth: 1,

    borderColor:
      `${PRIMARY_COLOR}20`,
  },

  headerCountText: {
    color:
      PRIMARY_COLOR,

    fontSize: 13,

    fontWeight: '700',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchSection: {
    paddingHorizontal: 20,

    paddingTop: 16,
  },

  searchContainer: {
    minHeight: 50,

    paddingHorizontal: 13,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 13,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.025,

    shadowRadius: 5,

    elevation: 1,
  },

  searchContainerActive: {
    borderColor:
      `${PRIMARY_COLOR}55`,

    shadowColor:
      PRIMARY_COLOR,

    shadowOpacity: 0.08,

    shadowRadius: 7,
  },

  searchInput: {
    flex: 1,

    height: 48,

    marginLeft: 9,

    paddingVertical: 0,

    color:
      TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '500',
  },

  clearSearchButton: {
    width: 30,
    height: 30,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 8,

    backgroundColor:
      '#F1F4F7',
  },

  searchHint: {
    marginTop: 7,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 2,
  },

  searchHintText: {
    marginLeft: 4,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // FILTERS
  // =======================================================

  filterSection: {
    marginTop: 18,

    paddingHorizontal: 20,
  },

  filterHeader: {
    flexDirection: 'row',

    alignItems: 'flex-end',

    justifyContent:
      'space-between',

    marginBottom: 9,
  },

  filterTitle: {
    color:
      TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '700',
  },

  filterSubtitle: {
    marginTop: 2,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  clearAllText: {
    color:
      PRIMARY_COLOR,

    fontSize: 10,

    fontWeight: '700',
  },

  filterChips: {
    flexDirection: 'row',

    gap: 8,
  },

  filterChip: {
    flex: 1,

    minHeight: 40,

    paddingHorizontal: 10,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 11,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,
  },

  filterChipActive: {
    backgroundColor:
      `${PRIMARY_COLOR}08`,

    borderColor:
      `${PRIMARY_COLOR}35`,
  },

  filterChipText: {
    flex: 1,

    marginHorizontal: 6,

    color:
      TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '600',
  },

  filterChipTextActive: {
    color:
      PRIMARY_COLOR,

    fontWeight: '700',
  },

  // =======================================================
  // RESULTS HEADER
  // =======================================================

  resultsHeader: {
    marginTop: 22,

    paddingHorizontal: 20,

    paddingBottom: 10,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  resultsTitle: {
    color:
      TEXT_PRIMARY,

    fontSize: 16,

    fontWeight: '700',
  },

  resultsSubtitle: {
    marginTop: 2,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // LIST
  // =======================================================

  listContent: {
    paddingHorizontal: 20,

    paddingBottom: 30,

    flexGrow: 1,
  },

  // =======================================================
  // EMPLOYEE CARD
  // =======================================================

  employeeCard: {
    position: 'relative',

    minHeight: 82,

    marginBottom: 10,

    paddingHorizontal: 14,
    paddingVertical: 13,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 14,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 6,

    elevation: 1,
  },

  employeeCardAccent: {
    position: 'absolute',

    left: 0,
    top: 0,
    bottom: 0,

    width: 3,

    backgroundColor:
      PRIMARY_COLOR,
  },

  employeeNumber: {
    position: 'absolute',

    top: 9,
    right: 11,

    color:
      '#D2D8E0',

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  avatar: {
    marginLeft: 3,

    marginRight: 12,
  },

  employeeInfo: {
    flex: 1,

    paddingRight: 22,
  },

  employeeName: {
    color:
      TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',

    lineHeight: 18,
  },

  usernameRow: {
    marginTop: 3,

    flexDirection: 'row',

    alignItems: 'center',
  },

  employeeUsername: {
    flex: 1,

    marginLeft: 3,

    color:
      TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  employeeIdRow: {
    marginTop: 3,

    flexDirection: 'row',

    alignItems: 'center',
  },

  employeeId: {
    marginLeft: 4,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  employeeArrow: {
    position: 'absolute',

    right: 12,

    bottom: 12,

    width: 27,
    height: 27,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 8,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyState: {
    flex: 1,

    minHeight: 300,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  emptyTitle: {
    marginTop: 17,

    color:
      TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',

    textAlign: 'center',
  },

  emptyDescription: {
    maxWidth: 310,

    marginTop: 7,

    color:
      TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',
  },

  emptyClearButton: {
    marginTop: 17,

    paddingHorizontal: 15,
    paddingVertical: 9,

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  emptyClearButtonText: {
    color:
      PRIMARY_COLOR,

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  loadingSpinner: {
    marginTop: 20,
  },

  loadingTitle: {
    marginTop: 13,

    color:
      TEXT_PRIMARY,

    fontSize: 16,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 5,

    color:
      TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // FOOTER LOADER
  // =======================================================

  footerLoader: {
    paddingVertical: 18,

    alignItems: 'center',

    justifyContent: 'center',
  },

  footerText: {
    marginTop: 5,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // MODAL
  // =======================================================

  modalOverlay: {
    flex: 1,

    justifyContent:
      'flex-end',

    backgroundColor:
      'rgba(15,23,42,0.42)',
  },

  modalSheet: {
    maxHeight: '76%',

    paddingTop: 9,
    paddingBottom: 20,

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    backgroundColor:
      CARD_BACKGROUND,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -4,
    },

    shadowOpacity: 0.1,

    shadowRadius: 15,

    elevation: 10,
  },

  modalHandle: {
    alignSelf: 'center',

    width: 38,
    height: 4,

    marginBottom: 9,

    borderRadius: 3,

    backgroundColor:
      '#D8DEE6',
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 11,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    borderBottomWidth: 1,

    borderBottomColor:
      BORDER_COLOR,
  },

  modalEyebrow: {
    color:
      PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 1,
  },

  modalTitle: {
    marginTop: 3,

    color:
      TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',
  },

  modalClose: {
    width: 36,
    height: 36,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      '#F3F5F8',
  },

  modalList: {
    paddingHorizontal: 14,

    paddingTop: 7,

    paddingBottom: 15,
  },

  modalOption: {
    minHeight: 58,

    paddingHorizontal: 8,
    paddingVertical: 7,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    borderRadius: 11,

    marginBottom: 3,
  },

  modalOptionSelected: {
    backgroundColor:
      SELECTED_ITEM_BG,
  },

  modalOptionLeft: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',
  },

  modalOptionIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      '#F3F5F8',
  },

  modalOptionText: {
    flex: 1,

    marginLeft: 11,

    color:
      TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '500',
  },

  modalOptionTextSelected: {
    color:
      PRIMARY_COLOR,

    fontWeight: '700',
  },
});