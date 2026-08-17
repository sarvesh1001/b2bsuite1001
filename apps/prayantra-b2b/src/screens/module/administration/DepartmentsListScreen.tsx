// apps/prayantra-b2b/src/screens/module/administration/DepartmentsListScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listDepartments,
  deleteDepartment,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  Department,
} from '@b2b/shared-types';

import {
  RootStackParamList,
} from '../../../navigation';

import {
  PRIMARY_COLOR,
  ERROR_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
} from '../../../constants/colors';

// =========================================================
// NAVIGATION
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'DepartmentsList'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function DepartmentsListScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const insets = useSafeAreaInsets();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  // =======================================================
  // FETCH DEPARTMENTS
  // =======================================================

  const fetchDepartments = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const res =
          await listDepartments(
            companyId,
            deviceId,
            {
              page: 1,
              limit: 100,
            },
            accessToken
          );

        setDepartments(
          res.data || []
        );
      } catch (error: any) {
        console.error(
          'Failed to load departments:',
          error
        );

        Alert.alert(
          'Unable to load departments',
          error?.response?.data?.message ||
            error?.message ||
            'Something went wrong while loading departments.'
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
    ]
  );

  // =======================================================
  // REFRESH WHEN SCREEN FOCUSES
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      fetchDepartments();
    }, [fetchDepartments])
  );

  // =======================================================
  // FILTER
  // =======================================================

  const filteredDepartments =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return departments;
      }

      return departments.filter(
        (department) =>
          department.department_name
            ?.toLowerCase()
            .includes(query) ||
          department.module_code
            ?.toLowerCase()
            .includes(query) ||
          department.department_id
            ?.toLowerCase()
            .includes(query)
      );
    }, [
      departments,
      search,
    ]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = (
    department: Department
  ) => {
    if (deletingId) {
      return;
    }

    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${department.department_name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            if (
              !companyId ||
              !deviceId ||
              !accessToken
            ) {
              return;
            }

            try {
              setDeletingId(
                department.department_id
              );

              await deleteDepartment(
                companyId,
                deviceId,
                department.department_id,
                accessToken
              );

              setDepartments(
                (current) =>
                  current.filter(
                    (item) =>
                      item.department_id !==
                      department.department_id
                  )
              );

            } catch (error: any) {
              console.error(
                'Delete department error:',
                error
              );

              Alert.alert(
                'Unable to delete',
                error?.response?.data?.message ||
                  error?.message ||
                  'Failed to delete the department.'
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEdit = (
    department: Department
  ) => {
    navigation.navigate(
      'EditDepartment',
      {
        departmentId:
          department.department_id,
      }
    );
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>

          <View style={styles.loadingIcon}>
            <Icon
              name="office-building-outline"
              size={29}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>
            Loading departments
          </Text>

          <Text style={styles.loadingSubtitle}>
            Preparing your administration workspace...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // DEPARTMENT CARD
  // =======================================================

  const renderDepartment = ({
    item,
    index,
  }: {
    item: Department;
    index: number;
  }) => {
    const isDeleting =
      deletingId === item.department_id;

    return (
      <View style={styles.card}>

        {/* Accent */}

        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                item.is_active
                  ? PRIMARY_COLOR
                  : '#CBD5E1',
            },
          ]}
        />

        {/* Number */}

        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(
            2,
            '0'
          )}
        </Text>

        {/* Main row */}

        <View style={styles.cardTop}>

          {/* Department icon */}

          <View
            style={[
              styles.departmentIcon,
              {
                backgroundColor:
                  item.is_active
                    ? `${PRIMARY_COLOR}12`
                    : '#F1F5F9',
              },
            ]}
          >
            <Icon
              name="office-building-outline"
              size={25}
              color={
                item.is_active
                  ? PRIMARY_COLOR
                  : '#94A3B8'
              }
            />
          </View>

          {/* Info */}

          <View style={styles.departmentInfo}>

            <Text
              numberOfLines={1}
              style={styles.departmentName}
            >
              {item.department_name}
            </Text>

            {item.module_code ? (
              <View style={styles.moduleRow}>

                <Icon
                  name="view-grid-outline"
                  size={12}
                  color={TEXT_SECONDARY}
                />

                <Text
                  numberOfLines={1}
                  style={styles.moduleText}
                >
                  {item.module_code}
                </Text>

              </View>
            ) : (
              <Text
                style={styles.moduleText}
              >
                Department
              </Text>
            )}

          </View>

          {/* Status */}

          <View
            style={[
              styles.statusBadge,
              item.is_active
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    item.is_active
                      ? SUCCESS_COLOR
                      : ERROR_COLOR,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    item.is_active
                      ? SUCCESS_COLOR
                      : ERROR_COLOR,
                },
              ]}
            >
              {item.is_active
                ? 'Active'
                : 'Inactive'}
            </Text>
          </View>

        </View>

        {/* Divider */}

        <View style={styles.divider} />

        {/* Bottom row */}

        <View style={styles.cardBottom}>

          <View style={styles.idContainer}>

            <Text style={styles.idLabel}>
              Department ID
            </Text>

            <Text
              numberOfLines={1}
              style={styles.idValue}
            >
              {item.department_id}
            </Text>

          </View>

          {/* Actions */}

          <View style={styles.actions}>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={isDeleting}
              onPress={() =>
                handleEdit(item)
              }
              style={[
                styles.actionButton,
                styles.editButton,
              ]}
            >
              <Icon
                name="pencil-outline"
                size={17}
                color={PRIMARY_COLOR}
              />

              <Text
                style={[
                  styles.actionText,
                  {
                    color:
                      PRIMARY_COLOR,
                  },
                ]}
              >
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={isDeleting}
              onPress={() =>
                handleDelete(item)
              }
              style={[
                styles.actionButton,
                styles.deleteButton,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={ERROR_COLOR}
                />
              ) : (
                <>
                  <Icon
                    name="trash-can-outline"
                    size={17}
                    color={ERROR_COLOR}
                  />

                  <Text
                    style={[
                      styles.actionText,
                      {
                        color:
                          ERROR_COLOR,
                      },
                    ]}
                  >
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>

        </View>

      </View>
    );
  };

  // =======================================================
  // HEADER
  // =======================================================

  const ListHeader = () => (
    <>

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>

        <View style={styles.headerTop}>

          {/* Back */}

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              navigation.goBack()
            }
            style={styles.backButton}
          >
            <Icon
              name="arrow-left"
              size={20}
              color={TEXT_PRIMARY}
            />
          </TouchableOpacity>

          {/* Title */}

          <View style={styles.headerTitleContainer}>

            <Text style={styles.headerTitle}>
              Departments
            </Text>

            <Text style={styles.headerSubtitle}>
              Administration
            </Text>

          </View>

          {/* Add */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                'CreateDepartment'
              )
            }
            style={[
              styles.headerAddButton,
              {
                backgroundColor:
                  PRIMARY_COLOR,
              },
            ]}
          >
            <Icon
              name="plus"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>

        </View>

      </View>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <View style={styles.summaryCard}>

        <View style={styles.summaryIcon}>
          <Icon
            name="office-building-outline"
            size={22}
            color={PRIMARY_COLOR}
          />
        </View>

        <View style={styles.summaryInfo}>

          <Text style={styles.summaryTitle}>
            Department Directory
          </Text>

          <Text style={styles.summaryDescription}>
            Manage departments and their
            administration settings.
          </Text>

        </View>

        <View style={styles.countContainer}>

          <Text style={styles.countNumber}>
            {departments.length}
          </Text>

          <Text style={styles.countLabel}>
            Total
          </Text>

        </View>

      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      {departments.length > 0 && (
        <View style={styles.searchContainer}>

          <Icon
            name="magnify"
            size={20}
            color="#94A3B8"
          />

          <Text
            style={styles.searchPlaceholder}
          >
            {search
              ? search
              : 'Search departments...'}
          </Text>

          {search ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setSearch('')
              }
            >
              <Icon
                name="close-circle"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          ) : null}

        </View>
      )}

      {/* =================================================
          SECTION
      ================================================= */}

      <View style={styles.sectionHeader}>

        <View>

          <Text style={styles.sectionTitle}>
            All Departments
          </Text>

          <Text style={styles.sectionSubtitle}>
            {filteredDepartments.length}{' '}
            {filteredDepartments.length === 1
              ? 'department'
              : 'departments'}{' '}
            available
          </Text>

        </View>

        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>
            {departments.filter(
              (department) =>
                department.is_active
            ).length}{' '}
            active
          </Text>
        </View>

      </View>

    </>
  );

  // =======================================================
  // EMPTY SEARCH RESULT
  // =======================================================

  const EmptySearch = () => (
    <View style={styles.emptySearch}>

      <View style={styles.emptySearchIcon}>
        <Icon
          name="magnify"
          size={26}
          color={PRIMARY_COLOR}
        />
      </View>

      <Text style={styles.emptyTitle}>
        No departments found
      </Text>

      <Text style={styles.emptyDescription}>
        No departments match "{search}".
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          setSearch('')
        }
      >
        <Text style={styles.clearSearchText}>
          Clear search
        </Text>
      </TouchableOpacity>

    </View>
  );

  // =======================================================
  // EMPTY DATABASE
  // =======================================================

  const EmptyDepartments = () => (
    <View style={styles.empty}>

      <View style={styles.emptyIcon}>
        <Icon
          name="office-building-outline"
          size={32}
          color={PRIMARY_COLOR}
        />
      </View>

      <Text style={styles.emptyTitle}>
        No departments yet
      </Text>

      <Text style={styles.emptyDescription}>
        Create your first department to start
        organizing your organization.
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(
            'CreateDepartment'
          )
        }
        style={[
          styles.createButton,
          {
            backgroundColor:
              PRIMARY_COLOR,
          },
        ]}
      >
        <Icon
          name="plus"
          size={18}
          color="#FFFFFF"
        />

        <Text style={styles.createButtonText}>
          Create Department
        </Text>
      </TouchableOpacity>

    </View>
  );

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.container}
    >

      <FlatList
        data={filteredDepartments}
        keyExtractor={(item) =>
          item.department_id
        }
        renderItem={renderDepartment}
        ListHeaderComponent={
          <ListHeader />
        }
        ListEmptyComponent={
          search ? (
            <EmptySearch />
          ) : (
            <EmptyDepartments />
          )
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              100 + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchDepartments(true)
            }
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* =================================================
          FLOATING ADD BUTTON
      ================================================= */}

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate(
            'CreateDepartment'
          )
        }
        style={[
          styles.floatingButton,
          {
            bottom:
              20 + insets.bottom,
            backgroundColor:
              PRIMARY_COLOR,
          },
        ]}
      >
        <Icon
          name="plus"
          size={25}
          color="#FFFFFF"
        />
      </TouchableOpacity>

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

  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingTop: 8,
    paddingBottom: 18,
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
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: TEXT_PRIMARY,

    fontSize: 24,
    fontWeight: '700',

    letterSpacing: -0.3,
  },

  headerSubtitle: {
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 10,
    fontWeight: '600',
  },

  headerAddButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.2,
    shadowRadius: 7,

    elevation: 4,
  },

  // =======================================================
  // SUMMARY
  // =======================================================

  summaryCard: {
    minHeight: 82,

    flexDirection: 'row',
    alignItems: 'center',

    padding: 14,

    borderRadius: 16,

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

    shadowOpacity: 0.035,
    shadowRadius: 7,

    elevation: 1,
  },

  summaryIcon: {
    width: 46,
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  summaryInfo: {
    flex: 1,

    marginLeft: 11,
  },

  summaryTitle: {
    color: TEXT_PRIMARY,

    fontSize: 13,
    fontWeight: '700',
  },

  summaryDescription: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  countContainer: {
    minWidth: 50,

    alignItems: 'center',

    paddingLeft: 10,

    borderLeftWidth: 1,
    borderLeftColor:
      '#E8ECF1',
  },

  countNumber: {
    color: PRIMARY_COLOR,

    fontSize: 19,
    fontWeight: '800',
  },

  countLabel: {
    marginTop: 1,

    color: TEXT_SECONDARY,

    fontSize: 8,
    fontWeight: '600',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchContainer: {
    height: 45,

    marginTop: 15,

    paddingHorizontal: 13,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 11,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,
  },

  searchPlaceholder: {
    flex: 1,

    marginLeft: 8,

    color: '#64748B',

    fontSize: 11,

    fontWeight: '500',
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    marginTop: 23,
    marginBottom: 12,

    flexDirection: 'row',
    alignItems: 'flex-end',

    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: TEXT_PRIMARY,

    fontSize: 16,
    fontWeight: '700',
  },

  sectionSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,
    fontWeight: '500',
  },

  sectionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,

    borderRadius: 7,

    backgroundColor:
      '#ECFDF5',

    borderWidth: 1,
    borderColor:
      '#D1FAE5',
  },

  sectionBadgeText: {
    color: SUCCESS_COLOR,

    fontSize: 9,
    fontWeight: '700',
  },

  // =======================================================
  // DEPARTMENT CARD
  // =======================================================

  card: {
    position: 'relative',

    marginBottom: 12,

    padding: 16,

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 2,
  },

  cardAccent: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    height: 3,
  },

  cardNumber: {
    position: 'absolute',

    top: 13,
    right: 15,

    color: '#CBD5E1',

    fontSize: 9,
    fontWeight: '800',

    letterSpacing: 0.6,
  },

  // =======================================================
  // CARD TOP
  // =======================================================

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingRight: 25,
  },

  departmentIcon: {
    width: 49,
    height: 49,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,
  },

  departmentInfo: {
    flex: 1,

    marginLeft: 11,

    minWidth: 0,
  },

  departmentName: {
    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',

    lineHeight: 18,
  },

  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 4,
  },

  moduleText: {
    marginLeft: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 20,

    marginLeft: 7,
  },

  activeBadge: {
    backgroundColor:
      '#ECFDF5',
  },

  inactiveBadge: {
    backgroundColor:
      '#FEF2F2',
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 4,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '700',
  },

  // =======================================================
  // DIVIDER
  // =======================================================

  divider: {
    height: 1,

    marginTop: 15,

    backgroundColor:
      '#EEF1F5',
  },

  // =======================================================
  // CARD BOTTOM
  // =======================================================

  cardBottom: {
    marginTop: 11,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',
  },

  idContainer: {
    flex: 1,

    marginRight: 10,
  },

  idLabel: {
    color: '#94A3B8',

    fontSize: 7,

    fontWeight: '600',

    textTransform: 'uppercase',

    letterSpacing: 0.4,
  },

  idValue: {
    marginTop: 3,

    color: '#64748B',

    fontSize: 8,

    fontWeight: '600',
  },

  // =======================================================
  // ACTIONS
  // =======================================================

  actions: {
    flexDirection: 'row',

    gap: 7,
  },

  actionButton: {
    minHeight: 32,

    paddingHorizontal: 9,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 8,

    borderWidth: 1,
  },

  editButton: {
    backgroundColor:
      `${PRIMARY_COLOR}08`,

    borderColor:
      `${PRIMARY_COLOR}22`,
  },

  deleteButton: {
    backgroundColor:
      '#FEF2F2',

    borderColor:
      '#FECACA',
  },

  actionText: {
    marginLeft: 5,

    fontSize: 9,

    fontWeight: '700',
  },

  // =======================================================
  // EMPTY
  // =======================================================

  empty: {
    minHeight: 330,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,

    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor:
      '#DCE2EA',

    borderRadius: 16,

    backgroundColor:
      'rgba(255,255,255,0.65)',
  },

  emptyIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  emptyTitle: {
    marginTop: 17,

    color: TEXT_PRIMARY,

    fontSize: 18,
    fontWeight: '700',
  },

  emptyDescription: {
    marginTop: 6,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',

    maxWidth: 300,
  },

  createButton: {
    marginTop: 19,

    minHeight: 40,

    paddingHorizontal: 15,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 9,

    gap: 6,
  },

  createButtonText: {
    color: '#FFFFFF',

    fontSize: 11,
    fontWeight: '700',
  },

  // =======================================================
  // EMPTY SEARCH
  // =======================================================

  emptySearch: {
    minHeight: 260,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  emptySearchIcon: {
    width: 60,
    height: 60,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 17,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  clearSearchText: {
    marginTop: 14,

    color: PRIMARY_COLOR,

    fontSize: 11,
    fontWeight: '700',
  },

  // =======================================================
  // FLOATING BUTTON
  // =======================================================

  floatingButton: {
    position: 'absolute',

    right: 20,

    width: 54,
    height: 54,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 18,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.28,
    shadowRadius: 11,

    elevation: 7,
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
      `${PRIMARY_COLOR}12`,
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingTitle: {
    marginTop: 12,

    color: TEXT_PRIMARY,

    fontSize: 17,
    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 5,

    color: TEXT_SECONDARY,

    fontSize: 10,
    fontWeight: '500',

    textAlign: 'center',
  },
});