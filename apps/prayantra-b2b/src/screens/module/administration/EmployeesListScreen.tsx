// apps/prayantra-b2b/src/screens/module/administration/EmployeesListScreen.tsx

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  View,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Text,
  ActivityIndicator,
  Searchbar,
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
  getCompanyEmployees,
  findEmployeeByUsername,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  CompanyEmployee,
} from '@b2b/shared-types';

import {
  RootStackParamList,
} from '../../../navigation';

import {
  UserAvatar,
} from '../../../components/UserAvatar';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

// =========================================================
// NAVIGATION
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'EmployeesList'
  >;

// =========================================================
// COMPONENT
// =========================================================

export default function EmployeesListScreen() {
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

  const [employees, setEmployees] =
    useState<CompanyEmployee[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [searchQuery, setSearchQuery] =
    useState('');

  // =======================================================
  // FETCH EMPLOYEES
  // =======================================================

  const fetchEmployees = useCallback(
    async (
      query?: string,
      isRefresh = false
    ) => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        let employeesData: CompanyEmployee[] =
          [];

        const trimmedQuery =
          query?.trim() || '';

        // -------------------------------------------------
        // SEARCH
        // -------------------------------------------------

        if (trimmedQuery) {
          try {
            const response =
              await findEmployeeByUsername(
                companyId,
                deviceId,
                trimmedQuery,
                accessToken
              );

            const employee =
              (response.data as any)
                ?.employee || null;

            employeesData = employee
              ? [employee]
              : [];
          } catch {
            // Exact username not found
            employeesData = [];
          }
        }

        // -------------------------------------------------
        // ALL EMPLOYEES
        // -------------------------------------------------

        else {
          const response =
            await getCompanyEmployees(
              companyId,
              deviceId,
              accessToken
            );

          employeesData =
            response.data?.employees || [];
        }

        setEmployees(employeesData);
      } catch (error: any) {
        console.error(
          'Failed to load employees:',
          error
        );

        Alert.alert(
          'Unable to Load Employees',
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
    ]
  );

  // =======================================================
  // REFRESH WHEN SCREEN FOCUSES
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      fetchEmployees(searchQuery);
    }, [
      fetchEmployees,
      searchQuery,
    ])
  );

  // =======================================================
  // SEARCH
  // =======================================================

  const handleSearchSubmit =
    () => {
      setSearchQuery(
        searchTerm.trim()
      );
    };

  const handleClearSearch =
    () => {
      setSearchTerm('');
      setSearchQuery('');
    };

  // =======================================================
  // ADD EMPLOYEE
  // =======================================================

  const handleAddEmployee =
    () => {
      navigation.navigate(
        'AddEmployee'
      );
    };

  // =======================================================
  // EDIT EMPLOYEE
  // =======================================================

  const handleEditEmployee =
    (userId: string) => {
      navigation.navigate(
        'EditEmployee',
        {
          userId,
        }
      );
    };

  // =======================================================
  // EMPLOYEE ITEM
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

    const username =
      item.username ||
      'No username';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() =>
          handleEditEmployee(
            item.user_id
          )
        }
        style={styles.employeeCard}
      >
        {/* -----------------------------------------------
            Accent
        ----------------------------------------------- */}

        <View
          style={styles.cardAccent}
        />

        {/* -----------------------------------------------
            Number
        ----------------------------------------------- */}

        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(
            2,
            '0'
          )}
        </Text>

        {/* -----------------------------------------------
            Avatar
        ----------------------------------------------- */}

        <View style={styles.avatarWrapper}>
          <UserAvatar
            userId={item.user_id}
            username={item.username}
            fullName={item.full_name}
            size={52}
            style={styles.avatar}
          />

          <View
            style={styles.onlineDot}
          />
        </View>

        {/* -----------------------------------------------
            Employee information
        ----------------------------------------------- */}

        <View
          style={styles.employeeInfo}
        >
          <Text
            numberOfLines={1}
            style={styles.employeeName}
          >
            {displayName}
          </Text>

          <View
            style={styles.usernameRow}
          >
            <Icon
              name="account-outline"
              size={13}
              color={TEXT_SECONDARY}
            />

            <Text
              numberOfLines={1}
              style={styles.username}
            >
              {username}
            </Text>
          </View>

          <View
            style={styles.employeeIdRow}
          >
            <Icon
              name="card-account-details-outline"
              size={13}
              color="#A0AAB8"
            />

            <Text
              numberOfLines={1}
              style={styles.employeeId}
            >
              ID: {item.employee_id || 'N/A'}
            </Text>
          </View>
        </View>

        {/* -----------------------------------------------
            Edit
        ----------------------------------------------- */}

        <View
          style={styles.editButton}
        >
          <Icon
            name="chevron-right"
            size={20}
            color={PRIMARY_COLOR}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (
    loading &&
    !refreshing &&
    employees.length === 0
  ) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View
          style={styles.loadingScreen}
        >
          <View
            style={styles.loadingIcon}
          >
            <Icon
              name="account-group-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={
              styles.loadingSpinner
            }
          />

          <Text
            style={styles.loadingTitle}
          >
            Loading employees
          </Text>

          <Text
            style={
              styles.loadingSubtitle
            }
          >
            Preparing your employee directory...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // EMPTY STATE
  // =======================================================

  const renderEmpty = () => {
    const isSearching =
      Boolean(searchQuery);

    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIcon,
            isSearching &&
              styles.searchEmptyIcon,
          ]}
        >
          <Icon
            name={
              isSearching
                ? 'account-search-outline'
                : 'account-group-outline'
            }
            size={32}
            color={
              isSearching
                ? PRIMARY_COLOR
                : '#94A3B8'
            }
          />
        </View>

        <Text
          style={styles.emptyTitle}
        >
          {isSearching
            ? 'No employee found'
            : 'No employees yet'}
        </Text>

        <Text
          style={styles.emptyDescription}
        >
          {isSearching
            ? `No employee matches the username "${searchQuery}".`
            : 'Your employee directory is currently empty. Add your first employee to get started.'}
        </Text>

        {isSearching ? (
          <TouchableOpacity
            onPress={
              handleClearSearch
            }
            style={
              styles.emptyAction
            }
            activeOpacity={0.85}
          >
            <Icon
              name="close"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.emptyActionText
              }
            >
              Clear Search
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={
              handleAddEmployee
            }
            style={
              styles.emptyAction
            }
            activeOpacity={0.85}
          >
            <Icon
              name="plus"
              size={18}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.emptyActionText
              }
            >
              Add Employee
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // =======================================================
  // HEADER
  // =======================================================

  const ListHeader = () => (
    <>
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              Math.max(
                insets.top,
                10
              ),
          },
        ]}
      >
        {/* -----------------------------------------------
            Top row
        ----------------------------------------------- */}

        <View
          style={styles.headerTop}
        >
          <View
            style={
              styles.headerTitleGroup
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
                size={20}
                color={TEXT_PRIMARY}
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
                style={styles.headerTitle}
              >
                Employees
              </Text>
            </View>
          </View>

          {/* Add */}

          <TouchableOpacity
            style={
              styles.headerAddButton
            }
            onPress={
              handleAddEmployee
            }
            activeOpacity={0.85}
          >
            <Icon
              name="plus"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.headerAddText
              }
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {/* -----------------------------------------------
            Description
        ----------------------------------------------- */}

        <Text
          style={styles.headerDescription}
        >
          Manage employees and their
          company accounts.
        </Text>

        {/* -----------------------------------------------
            Stats
        ----------------------------------------------- */}

        <View
          style={styles.statsRow}
        >
          <View
            style={styles.statBox}
          >
            <View
              style={styles.statIcon}
            >
              <Icon
                name="account-group-outline"
                size={18}
                color={PRIMARY_COLOR}
              />
            </View>

            <View>
              <Text
                style={
                  styles.statNumber
                }
              >
                {employees.length}
              </Text>

              <Text
                style={styles.statLabel}
              >
                {employees.length === 1
                  ? 'Employee'
                  : 'Employees'}
              </Text>
            </View>
          </View>

          <View
            style={styles.activeBadge}
          >
            <View
              style={styles.activeDot}
            />

            <Text
              style={
                styles.activeBadgeText
              }
            >
              Directory active
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
          style={styles.searchLabelRow}
        >
          <View>
            <Text
              style={
                styles.searchTitle
              }
            >
              Employee Directory
            </Text>

            <Text
              style={
                styles.searchSubtitle
              }
            >
              Search by exact username
            </Text>
          </View>

          {searchQuery ? (
            <TouchableOpacity
              onPress={
                handleClearSearch
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.clearText
                }
              >
                Clear
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Searchbar
          placeholder="Enter username..."
          value={searchTerm}
          onChangeText={
            setSearchTerm
          }
          onSubmitEditing={
            handleSearchSubmit
          }
          onIconPress={
            handleSearchSubmit
          }
          onClearIconPress={
            handleClearSearch
          }
          clearIcon="close"
          icon="magnify"
          loading={
            loading &&
            Boolean(searchQuery)
          }
          style={styles.searchBar}
          inputStyle={
            styles.searchInput
          }
          iconColor={
            TEXT_SECONDARY
          }
          placeholderTextColor={
            '#94A3B8'
          }
          theme={{
            colors: {
              primary:
                PRIMARY_COLOR,
            },
          }}
        />

        {searchQuery ? (
          <View
            style={
              styles.searchActive
            }
          >
            <Icon
              name="filter-outline"
              size={13}
              color={PRIMARY_COLOR}
            />

            <Text
              style={
                styles.searchActiveText
              }
            >
              Showing results for "
              {searchQuery}"
            </Text>
          </View>
        ) : null}
      </View>

      {/* =================================================
          LIST LABEL
      ================================================= */}

      {employees.length > 0 && (
        <View
          style={
            styles.listHeader
          }
        >
          <Text
            style={styles.listTitle}
          >
            Employees
          </Text>

          <Text
            style={styles.listCount}
          >
            {employees.length}{' '}
            {employees.length === 1
              ? 'result'
              : 'results'}
          </Text>
        </View>
      )}
    </>
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
        data={employees}
        keyExtractor={(item) =>
          item.user_id
        }
        renderItem={
          renderEmployee
        }
        ListHeaderComponent={
          <ListHeader />
        }
        ListEmptyComponent={
          renderEmpty
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchEmployees(
                searchQuery,
                true
              )
            }
            tintColor={
              PRIMARY_COLOR
            }
            colors={[
              PRIMARY_COLOR,
            ]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              100 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      />

      {/* =================================================
          FLOATING ADD BUTTON
      ================================================= */}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={
          handleAddEmployee
        }
        style={[
          styles.fab,
          {
            bottom:
              18 +
              insets.bottom,
          },
        ]}
      >
        <View
          style={styles.fabIcon}
        >
          <Icon
            name="account-plus-outline"
            size={21}
            color="#FFFFFF"
          />
        </View>

        <Text
          style={styles.fabText}
        >
          Add Employee
        </Text>
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

  listContent: {
    paddingBottom: 100,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingBottom: 19,

    backgroundColor:
      CARD_BACKGROUND,

    borderBottomWidth: 1,
    borderBottomColor:
      '#E7EBF1',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      '#F5F7FA',

    borderWidth: 1,
    borderColor:
      '#E2E8F0',
  },

  headerTitleContainer: {
    marginLeft: 11,
  },

  headerEyebrow: {
    color: PRIMARY_COLOR,

    fontSize: 8,

    lineHeight: 10,

    fontWeight: '800',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,

    color: TEXT_PRIMARY,

    fontSize: 23,

    lineHeight: 28,

    fontWeight: '700',

    letterSpacing: -0.3,
  },

  headerAddButton: {
    minHeight: 38,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 5,

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.18,
    shadowRadius: 7,

    elevation: 3,
  },

  headerAddText: {
    color: '#FFFFFF',

    fontSize: 11,

    fontWeight: '700',
  },

  headerDescription: {
    marginTop: 12,

    maxWidth: 300,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 16,

    fontWeight: '500',
  },

  // =======================================================
  // STATS
  // =======================================================

  statsRow: {
    marginTop: 16,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  statBox: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 7,
    paddingHorizontal: 9,

    borderRadius: 11,

    backgroundColor:
      '#F8FAFC',

    borderWidth: 1,
    borderColor:
      '#E7EBF1',
  },

  statIcon: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  statNumber: {
    marginLeft: 8,

    color: TEXT_PRIMARY,

    fontSize: 16,

    lineHeight: 17,

    fontWeight: '700',
  },

  statLabel: {
    marginLeft: 8,
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 8,

    fontWeight: '600',
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 7,

    borderRadius: 20,

    backgroundColor:
      '#F0FDF4',

    borderWidth: 1,
    borderColor:
      '#DCFCE7',
  },

  activeDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,

    backgroundColor:
      '#22C55E',
  },

  activeBadgeText: {
    color: '#15803D',

    fontSize: 8,

    fontWeight: '600',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },

  searchLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent:
      'space-between',

    marginBottom: 9,
  },

  searchTitle: {
    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  searchSubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  clearText: {
    color: PRIMARY_COLOR,

    fontSize: 10,

    fontWeight: '700',
  },

  searchBar: {
    height: 47,

    borderRadius: 12,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      '#E1E7EF',

    elevation: 0,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.025,

    shadowRadius: 5,
  },

  searchInput: {
    minHeight: 0,

    fontSize: 12,

    color: TEXT_PRIMARY,
  },

  searchActive: {
    marginTop: 8,

    flexDirection: 'row',
    alignItems: 'center',

    alignSelf: 'flex-start',

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 7,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  searchActiveText: {
    marginLeft: 5,

    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '600',
  },

  // =======================================================
  // LIST HEADER
  // =======================================================

  listHeader: {
    marginHorizontal: 20,

    marginTop: 20,
    marginBottom: 10,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  listTitle: {
    color: TEXT_PRIMARY,

    fontSize: 16,

    fontWeight: '700',
  },

  listCount: {
    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // EMPLOYEE CARD
  // =======================================================

  employeeCard: {
    position: 'relative',

    marginHorizontal: 20,
    marginBottom: 11,

    minHeight: 86,

    paddingLeft: 15,
    paddingRight: 10,
    paddingVertical: 15,

    flexDirection: 'row',
    alignItems: 'center',

    overflow: 'hidden',

    borderRadius: 15,

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

  cardAccent: {
    position: 'absolute',

    top: 0,
    bottom: 0,
    left: 0,

    width: 3,

    backgroundColor:
      PRIMARY_COLOR,
  },

  cardNumber: {
    position: 'absolute',

    top: 10,
    right: 10,

    color: '#CBD5E1',

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // =======================================================
  // AVATAR
  // =======================================================

  avatarWrapper: {
    position: 'relative',

    marginLeft: 4,
    marginRight: 12,
  },

  avatar: {
    margin: 0,
  },

  onlineDot: {
    position: 'absolute',

    right: -1,
    bottom: 1,

    width: 10,
    height: 10,

    borderRadius: 5,

    backgroundColor:
      '#22C55E',

    borderWidth: 2,

    borderColor:
      CARD_BACKGROUND,
  },

  // =======================================================
  // EMPLOYEE INFO
  // =======================================================

  employeeInfo: {
    flex: 1,

    minWidth: 0,

    paddingRight: 25,
  },

  employeeName: {
    color: TEXT_PRIMARY,

    fontSize: 14,

    lineHeight: 18,

    fontWeight: '700',
  },

  usernameRow: {
    marginTop: 4,

    flexDirection: 'row',
    alignItems: 'center',
  },

  username: {
    flex: 1,

    marginLeft: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  employeeIdRow: {
    marginTop: 3,

    flexDirection: 'row',
    alignItems: 'center',
  },

  employeeId: {
    flex: 1,

    marginLeft: 4,

    color: '#A0AAB8',

    fontSize: 8,

    fontWeight: '500',
  },

  // =======================================================
  // EDIT / ARROW
  // =======================================================

  editButton: {
    width: 32,
    height: 32,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyState: {
    marginHorizontal: 20,

    marginTop: 30,

    minHeight: 300,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,

    borderRadius: 16,

    borderWidth: 1,

    borderStyle: 'dashed',

    borderColor:
      '#DCE3EC',

    backgroundColor:
      'rgba(255,255,255,0.55)',
  },

  emptyIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      '#F1F5F9',
  },

  searchEmptyIcon: {
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
    maxWidth: 310,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 10,

    lineHeight: 17,

    textAlign: 'center',
  },

  emptyAction: {
    marginTop: 19,

    minHeight: 40,

    paddingHorizontal: 15,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,
  },

  emptyActionText: {
    color: '#FFFFFF',

    fontSize: 10,

    fontWeight: '700',
  },

  // =======================================================
  // FLOATING ADD BUTTON
  // =======================================================

  fab: {
    position: 'absolute',

    right: 18,

    minHeight: 48,

    paddingLeft: 7,
    paddingRight: 14,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 25,

    backgroundColor:
      PRIMARY_COLOR,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.27,

    shadowRadius: 11,

    elevation: 7,
  },

  fabIcon: {
    width: 36,
    height: 36,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 18,

    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  fabText: {
    marginLeft: 7,

    color: '#FFFFFF',

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
  },
});