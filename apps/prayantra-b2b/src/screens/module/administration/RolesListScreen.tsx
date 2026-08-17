// apps/prayantra-b2b/src/screens/module/administration/RolesListScreen.tsx

import React, {
  useCallback,
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
  TextInput,
} from 'react-native';

import {
  SafeAreaView,
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
  listRoles,
  deleteRole,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  Role,
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
    'RolesList'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function RolesListScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState('');

  // =======================================================
  // FETCH ROLES
  // =======================================================

  const fetchRoles = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !companyId) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          await listRoles(
            companyId,
            deviceId!,
            {
              page: 1,
              limit: 50,
            },
            accessToken
          );

        setRoles(
          response.data?.roles || []
        );
      } catch (error: any) {
        console.error(
          'Failed to load roles:',
          error
        );

        Alert.alert(
          'Unable to Load Roles',
          error?.response?.data?.message ||
            error?.message ||
            'Failed to load roles.'
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
      fetchRoles();
    }, [fetchRoles])
  );

  // =======================================================
  // FILTER
  // =======================================================

  const filteredRoles = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter((role) => {
      const name =
        role.role_name
          ?.toLowerCase() || '';

      const description =
        role.description
          ?.toLowerCase() || '';

      return (
        name.includes(query) ||
        description.includes(query)
      );
    });
  }, [roles, search]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = (
    role: Role
  ) => {
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.role_name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await deleteRole(
                companyId!,
                deviceId!,
                role.role_id,
                accessToken!
              );

              await fetchRoles(true);
            } catch (error: any) {
              console.error(
                'Delete role error:',
                error
              );

              Alert.alert(
                'Delete Failed',
                error?.response?.data
                  ?.message ||
                  error?.message ||
                  'Unable to delete this role.'
              );
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // CREATE
  // =======================================================

  const handleCreateRole = () => {
    navigation.navigate(
      'CreateRole'
    );
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEditRole = (
    roleId: string
  ) => {
    navigation.navigate(
      'EditRole',
      {
        roleId,
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
              name="account-key-outline"
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
            Loading roles
          </Text>

          <Text style={styles.loadingSubtitle}>
            Please wait...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // ROLE CARD
  // =======================================================

  const renderRoleItem = ({
    item,
    index,
  }: {
    item: Role;
    index: number;
  }) => {
    const isSystemRole =
      item.is_system_role;

    return (
      <View style={styles.roleCard}>

        {/* Accent */}

        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                isSystemRole
                  ? PRIMARY_COLOR
                  : SUCCESS_COLOR,
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

        <View style={styles.roleTopRow}>

          {/* Role icon */}

          <View
            style={[
              styles.roleIcon,
              {
                backgroundColor:
                  isSystemRole
                    ? `${PRIMARY_COLOR}12`
                    : `${SUCCESS_COLOR}12`,
              },
            ]}
          >
            <Icon
              name={
                isSystemRole
                  ? 'shield-account-outline'
                  : 'account-key-outline'
              }
              size={25}
              color={
                isSystemRole
                  ? PRIMARY_COLOR
                  : SUCCESS_COLOR
              }
            />
          </View>

          {/* Name */}

          <View style={styles.roleIdentity}>

            <Text
              numberOfLines={1}
              style={styles.roleName}
            >
              {item.role_name}
            </Text>

            <Text style={styles.roleLevel}>
              Level {item.role_level}
            </Text>

          </View>

        </View>

        {/* Description */}

        {item.description ? (
          <Text
            numberOfLines={2}
            style={styles.description}
          >
            {item.description}
          </Text>
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.description,
              styles.noDescription,
            ]}
          >
            No description provided
          </Text>
        )}

        {/* Bottom row */}

        <View style={styles.cardBottomRow}>

          {/* Badge */}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  isSystemRole
                    ? `${PRIMARY_COLOR}12`
                    : `${SUCCESS_COLOR}12`,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    isSystemRole
                      ? PRIMARY_COLOR
                      : SUCCESS_COLOR,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    isSystemRole
                      ? PRIMARY_COLOR
                      : SUCCESS_COLOR,
                },
              ]}
            >
              {isSystemRole
                ? 'System Role'
                : 'Custom Role'}
            </Text>
          </View>

          {/* Actions */}

          <View style={styles.actions}>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                handleEditRole(
                  item.role_id
                )
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
            </TouchableOpacity>

            {!isSystemRole && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  handleDelete(item)
                }
                style={[
                  styles.actionButton,
                  styles.deleteButton,
                ]}
              >
                <Icon
                  name="delete-outline"
                  size={17}
                  color={ERROR_COLOR}
                />
              </TouchableOpacity>
            )}

          </View>

        </View>

      </View>
    );
  };

  // =======================================================
  // EMPTY SEARCH
  // =======================================================

  const renderEmpty = () => {
    if (search.trim()) {
      return (
        <View style={styles.emptyContainer}>

          <View
            style={[
              styles.emptyIcon,
              styles.searchEmptyIcon,
            ]}
          >
            <Icon
              name="magnify-close"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <Text style={styles.emptyTitle}>
            No roles found
          </Text>

          <Text style={styles.emptyDescription}>
            No roles match "{search}".
          </Text>

          <TouchableOpacity
            onPress={() => setSearch('')}
            style={styles.clearSearchButton}
          >
            <Text
              style={styles.clearSearchText}
            >
              Clear Search
            </Text>
          </TouchableOpacity>

        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>

        <View style={styles.emptyIcon}>
          <Icon
            name="account-key-outline"
            size={32}
            color={PRIMARY_COLOR}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No Roles Yet
        </Text>

        <Text style={styles.emptyDescription}>
          Create your first role to start
          managing permissions and access.
        </Text>

        <TouchableOpacity
          onPress={handleCreateRole}
          style={styles.createEmptyButton}
          activeOpacity={0.85}
        >
          <Icon
            name="plus"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={styles.createEmptyButtonText}
          >
            Create Role
          </Text>
        </TouchableOpacity>

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
            size={21}
            color={TEXT_PRIMARY}
          />
        </TouchableOpacity>

        {/* Title */}

        <View style={styles.headerTitleContainer}>

          <Text style={styles.eyebrow}>
            ADMINISTRATION
          </Text>

          <Text style={styles.headerTitle}>
            Roles
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage roles and access levels
          </Text>

        </View>

        {/* Create */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCreateRole}
          style={styles.headerAddButton}
        >
          <Icon
            name="plus"
            size={21}
            color="#FFFFFF"
          />
        </TouchableOpacity>

      </View>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <View style={styles.summaryCard}>

        <View style={styles.summaryIcon}>
          <Icon
            name="account-key-outline"
            size={22}
            color={PRIMARY_COLOR}
          />
        </View>

        <View style={styles.summaryText}>

          <Text style={styles.summaryTitle}>
            {roles.length}{' '}
            {roles.length === 1
              ? 'Role'
              : 'Roles'}
          </Text>

          <Text style={styles.summarySubtitle}>
            {roles.filter(
              (role) =>
                role.is_system_role
            ).length}{' '}
            system ·{' '}
            {roles.filter(
              (role) =>
                !role.is_system_role
            ).length}{' '}
            custom
          </Text>

        </View>

        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />

          <Text style={styles.activeText}>
            Active
          </Text>
        </View>

      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      {roles.length > 0 && (
        <View style={styles.searchContainer}>

          <Icon
            name="magnify"
            size={20}
            color="#94A3B8"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search roles..."
            placeholderTextColor="#A0AAB7"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setSearch('')
              }
              style={styles.clearButton}
            >
              <Icon
                name="close-circle"
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}

        </View>
      )}

      {/* =================================================
          SECTION
      ================================================= */}

      {roles.length > 0 && (
        <View style={styles.sectionHeader}>

          <View>

            <Text style={styles.sectionTitle}>
              All Roles
            </Text>

            <Text style={styles.sectionSubtitle}>
              Select a role to edit or manage
            </Text>

          </View>

          <View style={styles.countBadge}>

            <Text style={styles.countBadgeText}>
              {filteredRoles.length}
            </Text>

          </View>

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
        data={filteredRoles}
        keyExtractor={(item) =>
          item.role_id
        }
        renderItem={renderRoleItem}
        ListHeaderComponent={
          <ListHeader />
        }
        ListEmptyComponent={
          renderEmpty()
        }
        contentContainerStyle={[
          styles.list,
          filteredRoles.length === 0 &&
            styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchRoles(true)
            }
            tintColor={PRIMARY_COLOR}
            colors={[
              PRIMARY_COLOR,
            ]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* =================================================
          FLOATING CREATE BUTTON
      ================================================= */}

      {roles.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCreateRole}
          style={styles.fab}
        >
          <View style={styles.fabIcon}>
            <Icon
              name="plus"
              size={22}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.fabText}>
            Create Role
          </Text>

        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // CONTAINER
  // =======================================================

  container: {
    flex: 1,

    backgroundColor:
      BACKGROUND_COLOR,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 105,
  },

  emptyList: {
    flexGrow: 1,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    minHeight: 78,

    flexDirection: 'row',
    alignItems: 'center',

    paddingTop: 8,
    paddingBottom: 13,
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

    marginRight: 12,
  },

  headerTitleContainer: {
    flex: 1,
  },

  eyebrow: {
    color: PRIMARY_COLOR,

    fontSize: 8,

    fontWeight: '800',

    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,

    color: TEXT_PRIMARY,

    fontSize: 25,

    lineHeight: 30,

    fontWeight: '700',
  },

  headerSubtitle: {
    marginTop: 1,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  headerAddButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      PRIMARY_COLOR,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.2,

    shadowRadius: 8,

    elevation: 4,
  },

  // =======================================================
  // SUMMARY
  // =======================================================

  summaryCard: {
    minHeight: 72,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 13,

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

  summaryIcon: {
    width: 43,
    height: 43,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  summaryText: {
    flex: 1,

    marginLeft: 11,
  },

  summaryTitle: {
    color: TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  summarySubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: 20,

    backgroundColor:
      `${SUCCESS_COLOR}12`,
  },

  activeDot: {
    width: 6,
    height: 6,

    marginRight: 5,

    borderRadius: 3,

    backgroundColor:
      SUCCESS_COLOR,
  },

  activeText: {
    color: SUCCESS_COLOR,

    fontSize: 9,

    fontWeight: '700',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchContainer: {
    height: 46,

    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 15,

    paddingHorizontal: 13,

    borderRadius: 12,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,
  },

  searchInput: {
    flex: 1,

    height: 44,

    marginLeft: 8,

    paddingVertical: 0,

    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '500',
  },

  clearButton: {
    padding: 4,
  },

  // =======================================================
  // SECTION HEADER
  // =======================================================

  sectionHeader: {
    marginTop: 23,
    marginBottom: 12,

    flexDirection: 'row',
    alignItems: 'center',

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

  countBadge: {
    minWidth: 28,
    height: 28,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 8,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,
  },

  countBadgeText: {
    color: PRIMARY_COLOR,

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // ROLE CARD
  // =======================================================

  roleCard: {
    position: 'relative',

    marginBottom: 12,

    padding: 16,

    borderRadius: 15,

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

    top: 14,
    right: 15,

    color: '#CBD5E1',

    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // =======================================================
  // ROLE TOP
  // =======================================================

  roleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingRight: 28,
  },

  roleIcon: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,
  },

  roleIdentity: {
    flex: 1,

    marginLeft: 12,
  },

  roleName: {
    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',

    lineHeight: 19,
  },

  roleLevel: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // DESCRIPTION
  // =======================================================

  description: {
    marginTop: 14,

    color: TEXT_SECONDARY,

    fontSize: 10,

    lineHeight: 15,

    fontWeight: '500',
  },

  noDescription: {
    color: '#A8B0BC',

    fontStyle: 'italic',
  },

  // =======================================================
  // BOTTOM
  // =======================================================

  cardBottomRow: {
    marginTop: 14,

    paddingTop: 11,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',

    borderTopWidth: 1,

    borderTopColor:
      '#EEF1F5',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: 7,
  },

  statusDot: {
    width: 6,
    height: 6,

    marginRight: 5,

    borderRadius: 3,
  },

  statusText: {
    fontSize: 9,

    fontWeight: '700',
  },

  // =======================================================
  // ACTIONS
  // =======================================================

  actions: {
    flexDirection: 'row',

    gap: 7,
  },

  actionButton: {
    width: 34,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,
  },

  editButton: {
    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  deleteButton: {
    backgroundColor:
      `${ERROR_COLOR}10`,
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 40,

    paddingVertical: 70,
  },

  emptyIcon: {
    width: 70,
    height: 70,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  searchEmptyIcon: {
    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  emptyTitle: {
    marginTop: 18,

    color: TEXT_PRIMARY,

    fontSize: 19,

    fontWeight: '700',
  },

  emptyDescription: {
    maxWidth: 300,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',
  },

  createEmptyButton: {
    marginTop: 21,

    minHeight: 42,

    paddingHorizontal: 16,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,
  },

  createEmptyButtonText: {
    color: '#FFFFFF',

    fontSize: 11,

    fontWeight: '700',
  },

  clearSearchButton: {
    marginTop: 18,

    paddingHorizontal: 13,
    paddingVertical: 9,

    borderRadius: 8,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  clearSearchText: {
    color: PRIMARY_COLOR,

    fontSize: 10,

    fontWeight: '700',
  },

  // =======================================================
  // FAB
  // =======================================================

  fab: {
    position: 'absolute',

    right: 20,
    bottom: 18,

    height: 52,

    paddingHorizontal: 7,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 27,

    backgroundColor:
      PRIMARY_COLOR,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.28,

    shadowRadius: 12,

    elevation: 7,
  },

  fabIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  fabText: {
    marginHorizontal: 10,

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
    marginTop: 19,
  },

  loadingTitle: {
    marginTop: 13,

    color: TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },
});