import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  logoutAllDevices,
  getUserDepartments,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../store/userAuthStore';

import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../../constants/colors';

// =========================================================
// MODULE CONFIGURATION
// =========================================================

const MODULE_CONFIG: Record<
  string,
  {
    icon: string;
    label: string;
    color: string;
  }
> = {
  administration: {
    icon: 'account-cog',
    label: 'Administration',
    color: PRIMARY_COLOR,
  },

  hr: {
    icon: 'account-group',
    label: 'HR',
    color: SECONDARY_COLOR,
  },

  attendance: {
    icon: 'calendar-clock',
    label: 'Attendance',
    color: '#F59E0B',
  },

  inventory: {
    icon: 'package-variant',
    label: 'Inventory',
    color: '#10B981',
  },

  payroll: {
    icon: 'cash-multiple',
    label: 'Payroll',
    color: '#EF4444',
  },

  sales: {
    icon: 'sale',
    label: 'Sales',
    color: '#8B5CF6',
  },

  procurement: {
    icon: 'truck-delivery',
    label: 'Procurement',
    color: '#F97316',
  },

  production: {
    icon: 'factory',
    label: 'Production',
    color: '#14B8A6',
  },

  logistics: {
    icon: 'map-marker-path',
    label: 'Logistics',
    color: '#3B82F6',
  },

  accounting: {
    icon: 'calculator',
    label: 'Accounting',
    color: '#6366F1',
  },

  finance: {
    icon: 'bank',
    label: 'Finance',
    color: '#8B5CF6',
  },

  it: {
    icon: 'laptop',
    label: 'IT',
    color: '#6B7280',
  },

  academics: {
    icon: 'school',
    label: 'Academics',
    color: '#EC4899',
  },

  marketing: {
    icon: 'bullhorn',
    label: 'Marketing',
    color: '#F59E0B',
  },

  transport: {
    icon: 'bus',
    label: 'Transport',
    color: '#14B8A6',
  },

  operations: {
    icon: 'clipboard-list',
    label: 'Operations',
    color: '#0EA5E9',
  },
};

// =========================================================
// DEPARTMENT → MODULE
// =========================================================

const DEPARTMENT_TO_MODULE_KEY: Record<string, string> = {
  Academics: 'academics',
  Accounting: 'accounting',
  Administration: 'administration',
  Attendance: 'attendance',
  Finance: 'finance',
  HR: 'hr',
  IT: 'it',
  Inventory: 'inventory',
  Logistics: 'logistics',
  Marketing: 'marketing',
  Operations: 'operations',
  Payroll: 'payroll',
  Procurement: 'procurement',
  Production: 'production',
  Sales: 'sales',
};

// =========================================================
// NAVIGATION
// =========================================================

type RootStackParamList = {
  ModuleDetail: {
    moduleName: string;
  };

  Chat: undefined;

  QRScanner: undefined;

  PhoneInput: undefined;
};

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ModuleDetail'
>;

// =========================================================
// HELPERS
// =========================================================

const getInitial = (name?: string | null) => {
  if (!name) return 'U';

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
};

// =========================================================
// SCREEN
// =========================================================

export default function ModuleGridScreen() {
  const navigation = useNavigation<NavigationProp>();

  const insets = useSafeAreaInsets();

  const {
    user,
    isAuthenticated,
    accessToken,
    deviceId,
    companyId,
    logout,
  } = useUserAuthStore();

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [moduleKeys, setModuleKeys] = useState<string[]>(
    []
  );

  // =======================================================
  // FETCH MODULES
  // =======================================================

  const fetchDepartments = useCallback(
    async (isRefresh = false) => {
      if (
        !isAuthenticated ||
        !user?.user_id ||
        !companyId ||
        !deviceId ||
        !accessToken
      ) {
        setLoading(false);

        setError(
          'Your authentication session is incomplete. Please log in again.'
        );

        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await getUserDepartments(
          companyId,
          user.user_id,
          deviceId,
          accessToken
        );

        const depts = response.data || [];

        const keys = depts
          .map(
            (dept) =>
              DEPARTMENT_TO_MODULE_KEY[
                dept.department_name
              ]
          )
          .filter(
            (key): key is string =>
              key !== undefined
          );

        setModuleKeys(
          Array.from(new Set(keys))
        );
      } catch (err) {
        console.error(
          'Failed to fetch user departments:',
          err
        );

        setError(
          'Unable to load your modules. Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      isAuthenticated,
      user?.user_id,
      companyId,
      deviceId,
      accessToken,
    ]
  );

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // =======================================================
  // LOGOUT
  // =======================================================

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out from all devices?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Log out',
          style: 'destructive',

          onPress: async () => {
            try {
              const userId = user?.user_id;

              if (
                accessToken &&
                deviceId &&
                companyId &&
                userId
              ) {
                await logoutAllDevices(
                  companyId,
                  deviceId,
                  userId,
                  accessToken
                );
              }
            } catch (err) {
              console.error(
                'Logout error:',
                err
              );
            } finally {
              logout();

              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'PhoneInput',
                  },
                ],
              });
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // QR
  // =======================================================

  const handleQRScan = () => {
    navigation.navigate('QRScanner');
  };

  // =======================================================
  // MODULE PRESS
  // =======================================================

  const handleModulePress = (
    moduleName: string
  ) => {
    navigation.navigate('ModuleDetail', {
      moduleName,
    });
  };

  // =======================================================
  // USER NAME
  // =======================================================

  const userName =
    user?.full_name ||
    user?.username ||
    user?.phone ||
    'User';

  const firstName =
    userName.split(' ')[0] || 'User';

  const userInitial = getInitial(
    user?.full_name ||
      user?.username ||
      user?.phone
  );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              BACKGROUND_COLOR,
          },
        ]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Icon
              name="view-grid-outline"
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
            Loading your workspace
          </Text>

          <Text style={styles.loadingSubtitle}>
            Preparing your modules...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (error) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              BACKGROUND_COLOR,
          },
        ]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View style={styles.stateContainer}>
          <View
            style={[
              styles.stateIcon,
              styles.errorStateIcon,
            ]}
          >
            <Icon
              name="alert-circle-outline"
              size={30}
              color="#EF4444"
            />
          </View>

          <Text style={styles.stateTitle}>
            Something went wrong
          </Text>

          <Text style={styles.stateMessage}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => fetchDepartments()}
            activeOpacity={0.8}
          >
            <Icon
              name="refresh"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // NO MODULES
  // =======================================================

  if (moduleKeys.length === 0) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              BACKGROUND_COLOR,
          },
        ]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View style={styles.stateContainer}>
          <View
            style={[
              styles.stateIcon,
              styles.emptyStateIcon,
            ]}
          >
            <Icon
              name="view-grid-off-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <Text style={styles.stateTitle}>
            No Modules Available
          </Text>

          <Text style={styles.stateMessage}>
            You don't currently have access to any
            modules through your departments.
            {'\n'}
            Please contact your administrator.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon
              name="logout"
              size={17}
              color={TEXT_PRIMARY}
            />

            <Text style={styles.secondaryButtonText}>
              Log out
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MODULE CARD
  // =======================================================

  const renderModuleItem = ({
    item,
    index,
  }: {
    item: string;
    index: number;
  }) => {
    const config = MODULE_CONFIG[item];

    if (!config) return null;

    return (
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() =>
          handleModulePress(item)
        }
        activeOpacity={0.88}
      >
        <View
          style={[
            styles.moduleCard,
            {
              borderColor:
                `${config.color}20`,
            },
          ]}
        >
          {/* Top accent */}

          <View
            style={[
              styles.cardAccent,
              {
                backgroundColor:
                  config.color,
              },
            ]}
          />

          {/* Number */}

          <Text style={styles.cardNumber}>
            {String(index + 1).padStart(2, '0')}
          </Text>

          {/* Icon */}

          <View
            style={[
              styles.moduleIcon,
              {
                backgroundColor:
                  `${config.color}12`,
              },
            ]}
          >
            <Icon
              name={config.icon}
              size={28}
              color={config.color}
            />
          </View>

          {/* Name */}

          <Text
            style={styles.moduleLabel}
            numberOfLines={1}
          >
            {config.label}
          </Text>

          <Text
            style={styles.moduleDescription}
            numberOfLines={1}
          >
            Open {config.label.toLowerCase()}
          </Text>

          {/* Arrow */}

          <View
            style={[
              styles.moduleArrow,
              {
                backgroundColor:
                  `${config.color}10`,
              },
            ]}
          >
            <Icon
              name="arrow-right"
              size={15}
              color={config.color}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            BACKGROUND_COLOR,
        },
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View style={styles.headerInner}>

          {/* Brand */}

          <View style={styles.brand}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoText}>
                P
              </Text>
            </View>

            <View style={styles.brandText}>
              <Text style={styles.brandName}>
                Prayantra
              </Text>

              <Text style={styles.brandSubtitle}>
                Business Management
              </Text>
            </View>
          </View>

          {/* Actions */}

          <View style={styles.headerActions}>

            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleQRScan}
              activeOpacity={0.75}
            >
              <Icon
                name="qrcode-scan"
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <Icon
                name="logout"
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>

          </View>

        </View>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <FlatList
        data={moduleKeys}
        keyExtractor={(item) => item}
        numColumns={2}
        renderItem={renderModuleItem}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              105 + insets.bottom,
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
        ListHeaderComponent={
          <>
            {/* =================================================
                WELCOME
            ================================================= */}

            <View style={styles.welcomeSection}>

              <View style={styles.welcomeText}>

                <Text style={styles.eyebrow}>
                  WORKSPACE
                </Text>

                <Text
                  style={styles.welcomeTitle}
                  numberOfLines={2}
                >
                  Welcome back,{' '}
                  <Text style={styles.welcomeName}>
                    {firstName}
                  </Text>
                </Text>

                <Text style={styles.welcomeSubtitle}>
                  Everything you need to manage your
                  work in one place.
                </Text>

              </View>

              {/* User avatar */}

              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {userInitial}
                </Text>
              </View>

            </View>

            {/* =================================================
                MODULE SUMMARY
            ================================================= */}

            <View style={styles.summaryRow}>

              <View style={styles.summaryLeft}>

                <View style={styles.summaryIcon}>
                  <Icon
                    name="view-grid-outline"
                    size={19}
                    color={PRIMARY_COLOR}
                  />
                </View>

                <View>
                  <Text style={styles.summaryTitle}>
                    Your Modules
                  </Text>

                  <Text style={styles.summarySubtitle}>
                    Select a module to continue
                  </Text>
                </View>

              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>
                  {moduleKeys.length}
                </Text>

                <Text style={styles.countLabel}>
                  {moduleKeys.length === 1
                    ? 'MODULE'
                    : 'MODULES'}
                </Text>
              </View>

            </View>
          </>
        }
      />

      {/* =================================================
          PRAYANTRA ASSISTANT
      ================================================= */}

      <TouchableOpacity
        style={[
          styles.chatButton,
          {
            bottom:
              Math.max(insets.bottom, 10) +
              10,
          },
        ]}
        onPress={() =>
          navigation.navigate('Chat')
        }
        activeOpacity={0.88}
      >
        <View style={styles.chatIcon}>
          <Icon
            name="robot-outline"
            size={20}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.chatText}>
          <Text style={styles.chatTitle}>
            Prayantra Assistant
          </Text>

          <Text style={styles.chatSubtitle}>
            How can I help you?
          </Text>
        </View>

        <Icon
          name="arrow-right"
          size={18}
          color="rgba(255,255,255,0.75)"
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
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    backgroundColor: '#FFFFFF',

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: '#E5EAF1',

    shadowColor: '#0F172A',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.035,

    shadowRadius: 7,

    elevation: 2,
  },

  headerInner: {
    minHeight: 68,

    paddingHorizontal: 18,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  // =======================================================
  // BRAND
  // =======================================================

  brand: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  brandLogo: {
    width: 39,
    height: 39,

    borderRadius: 11,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: PRIMARY_COLOR,

    shadowColor: PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.18,

    shadowRadius: 8,

    elevation: 3,
  },

  brandLogoText: {
    color: '#FFFFFF',

    fontSize: 19,

    fontWeight: '800',
  },

  brandText: {
    marginLeft: 10,
  },

  brandName: {
    color: TEXT_PRIMARY,

    fontSize: 16,

    lineHeight: 18,

    fontWeight: '700',
  },

  brandSubtitle: {
    marginTop: 2,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 11,

    fontWeight: '600',
  },

  // =======================================================
  // HEADER ACTIONS
  // =======================================================

  headerActions: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,
  },

  headerAction: {
    width: 38,
    height: 38,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#E2E8F0',

    borderRadius: 10,

    backgroundColor: '#FFFFFF',
  },

  // =======================================================
  // LIST
  // =======================================================

  listContent: {
    paddingHorizontal: 16,

    paddingTop: 4,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  // =======================================================
  // WELCOME
  // =======================================================

  welcomeSection: {
    paddingTop: 25,

    paddingBottom: 22,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  welcomeText: {
    flex: 1,

    paddingRight: 15,
  },

  eyebrow: {
    marginBottom: 6,

    color: PRIMARY_COLOR,

    fontSize: 9,

    lineHeight: 11,

    fontWeight: '800',

    letterSpacing: 1.1,
  },

  welcomeTitle: {
    color: TEXT_PRIMARY,

    fontSize: 27,

    lineHeight: 32,

    fontWeight: '700',

    letterSpacing: -0.5,
  },

  welcomeName: {
    color: PRIMARY_COLOR,

    fontWeight: '700',
  },

  welcomeSubtitle: {
    maxWidth: 310,

    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 18,

    fontWeight: '500',
  },

  // =======================================================
  // USER AVATAR
  // =======================================================

  userAvatar: {
    width: 51,
    height: 51,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 16,

    backgroundColor: `${PRIMARY_COLOR}12`,

    borderWidth: 1,

    borderColor: `${PRIMARY_COLOR}22`,
  },

  userAvatarText: {
    color: PRIMARY_COLOR,

    fontSize: 18,

    fontWeight: '700',
  },

  // =======================================================
  // SUMMARY
  // =======================================================

  summaryRow: {
    minHeight: 68,

    marginBottom: 17,

    paddingHorizontal: 13,

    paddingVertical: 11,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    borderWidth: 1,

    borderColor: '#E5EAF1',

    borderRadius: 14,

    backgroundColor: '#FFFFFF',

    shadowColor: '#0F172A',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.025,

    shadowRadius: 6,

    elevation: 1,
  },

  summaryLeft: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  summaryIcon: {
    width: 42,
    height: 42,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor: `${PRIMARY_COLOR}12`,
  },

  summaryTitle: {
    marginLeft: 10,

    color: '#1E293B',

    fontSize: 13,

    fontWeight: '700',
  },

  summarySubtitle: {
    marginLeft: 10,

    marginTop: 3,

    color: '#94A3B8',

    fontSize: 9,

    fontWeight: '500',
  },

  countBadge: {
    minWidth: 45,

    paddingHorizontal: 8,

    paddingVertical: 7,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor: '#F8FAFC',
  },

  countNumber: {
    color: PRIMARY_COLOR,

    fontSize: 16,

    lineHeight: 17,

    fontWeight: '700',
  },

  countLabel: {
    marginTop: 2,

    color: '#94A3B8',

    fontSize: 7,

    lineHeight: 8,

    fontWeight: '700',

    letterSpacing: 0.4,
  },

  // =======================================================
  // MODULE CARD
  // =======================================================

  cardWrapper: {
    width: '48.3%',

    marginBottom: 13,
  },

  moduleCard: {
    position: 'relative',

    minHeight: 163,

    padding: 17,

    overflow: 'hidden',

    borderWidth: 1,

    borderRadius: 15,

    backgroundColor: CARD_BACKGROUND,

    shadowColor: '#0F172A',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.045,

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

    top: 15,

    right: 16,

    color: '#CBD5E1',

    fontSize: 9,

    lineHeight: 11,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // =======================================================
  // MODULE ICON
  // =======================================================

  moduleIcon: {
    width: 47,
    height: 47,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 13,
  },

  // =======================================================
  // MODULE TEXT
  // =======================================================

  moduleLabel: {
    marginTop: 14,

    paddingRight: 24,

    color: TEXT_PRIMARY,

    fontSize: 14,

    lineHeight: 18,

    fontWeight: '700',
  },

  moduleDescription: {
    marginTop: 4,

    paddingRight: 24,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 12,

    fontWeight: '500',
  },

  // =======================================================
  // MODULE ARROW
  // =======================================================

  moduleArrow: {
    position: 'absolute',

    right: 13,

    bottom: 13,

    width: 27,
    height: 27,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 8,
  },

  // =======================================================
  // CHAT BUTTON
  // =======================================================

  chatButton: {
    position: 'absolute',

    left: 18,

    right: 18,

    minHeight: 57,

    paddingHorizontal: 12,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 16,

    backgroundColor: PRIMARY_COLOR,

    shadowColor: PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.25,

    shadowRadius: 14,

    elevation: 8,
  },

  chatIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.15)',
  },

  chatText: {
    flex: 1,

    marginLeft: 10,
  },

  chatTitle: {
    color: '#FFFFFF',

    fontSize: 12,

    lineHeight: 15,

    fontWeight: '700',
  },

  chatSubtitle: {
    marginTop: 2,

    color: 'rgba(255,255,255,0.68)',

    fontSize: 9,

    lineHeight: 12,

    fontWeight: '500',
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 18,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingTitle: {
    marginTop: 13,

    color: TEXT_PRIMARY,

    fontSize: 16,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 5,

    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '500',
  },

  // =======================================================
  // ERROR / EMPTY
  // =======================================================

  stateContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  stateIcon: {
    width: 70,
    height: 70,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 19,
  },

  errorStateIcon: {
    backgroundColor: '#FEF2F2',
  },

  emptyStateIcon: {
    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  stateTitle: {
    marginTop: 19,

    color: TEXT_PRIMARY,

    fontSize: 20,

    fontWeight: '700',

    textAlign: 'center',
  },

  stateMessage: {
    maxWidth: 330,

    marginTop: 8,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 19,

    textAlign: 'center',
  },

  primaryButton: {
    marginTop: 23,

    paddingHorizontal: 17,

    paddingVertical: 11,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,

    borderRadius: 10,

    backgroundColor: PRIMARY_COLOR,
  },

  primaryButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  secondaryButton: {
    marginTop: 23,

    paddingHorizontal: 17,

    paddingVertical: 11,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,

    borderWidth: 1,

    borderColor: '#E2E8F0',

    borderRadius: 10,

    backgroundColor: '#FFFFFF',
  },

  secondaryButtonText: {
    color: TEXT_PRIMARY,

    fontSize: 12,

    fontWeight: '600',
  },
});