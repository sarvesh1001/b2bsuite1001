import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
} from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
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
// FEATURE CONFIGURATION
// =========================================================

const FEATURES_CONFIG: Record<
  string,
  Array<{
    key: string;
    label: string;
    icon: string;
    screen: string;
  }>
> = {
  administration: [
    {
      key: 'workCenters',
      label: 'Work Centers',
      icon: 'factory',
      screen: 'WorkCentersList',
    },

    {
      key: 'departments',
      label: 'Departments',
      icon: 'office-building',
      screen: 'DepartmentsList',
    },

    {
      key: 'roles',
      label: 'Roles',
      icon: 'account-key',
      screen: 'RolesList',
    },

    {
      key: 'positions',
      label: 'Positions',
      icon: 'badge-account',
      screen: 'PositionsList',
    },

    {
      key: 'employees',
      label: 'Employees',
      icon: 'account-multiple',
      screen: 'EmployeesList',
    },

    {
      key: 'employeeSearch',
      label: 'Employee Search',
      icon: 'account-search',
      screen: 'EmployeeSearch',
    },

    {
      key: 'avatars',
      label: 'My Avatars',
      icon: 'account-circle',
      screen: 'AvatarManagement',
    },

    {
      key: 'userPhone',
      label: 'User Phone',
      icon: 'phone',
      screen: 'UserPhone',
    },
  ],

  // Add other modules here
  //
  // hr: [
  //   ...
  // ],
};

// =========================================================
// NAVIGATION
// =========================================================

type ModuleDetailRouteProp = RouteProp<
  {
    params: {
      moduleName: string;
    };
  },
  'params'
>;

type NavigationProp =
  StackNavigationProp<any>;

// =========================================================
// SCREEN
// =========================================================

export default function ModuleDetailScreen() {
  const route =
    useRoute<ModuleDetailRouteProp>();

  const navigation =
    useNavigation<NavigationProp>();

  const { width } =
    useWindowDimensions();

  const {
    moduleName,
  } = route.params as {
    moduleName: string;
  };

  // =======================================================
  // MODULE DATA
  // =======================================================

  const features =
    FEATURES_CONFIG[moduleName] || [];

  const moduleConfig =
    MODULE_CONFIG[moduleName];

  const accentColor =
    moduleConfig?.color ||
    PRIMARY_COLOR;

  const moduleLabel =
    moduleConfig?.label ||
    moduleName
      .charAt(0)
      .toUpperCase() +
      moduleName.slice(1);

  // =======================================================
  // RESPONSIVE CARD WIDTH
  // =======================================================

  const cardWidth = useMemo(() => {
    const horizontalPadding = 20;

    const gap = 12;

    return (
      (width -
        horizontalPadding * 2 -
        gap) /
      2
    );
  }, [width]);

  // =======================================================
  // EMPTY MODULE
  // =======================================================

  if (features.length === 0) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.emptyScreen}>

          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor:
                  `${accentColor}12`,
              },
            ]}
          >
            <Icon
              name="view-grid-off-outline"
              size={32}
              color={accentColor}
            />
          </View>

          <Text style={styles.emptyTitle}>
            No Features Yet
          </Text>

          <Text style={styles.emptyDescription}>
            There are currently no features available
            inside the {moduleLabel} module.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.goBack()
            }
            style={[
              styles.backButton,
              {
                backgroundColor:
                  accentColor,
              },
            ]}
          >
            <Icon
              name="arrow-left"
              size={17}
              color="#FFFFFF"
            />

            <Text style={styles.backButtonText}>
              Back to Modules
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // FEATURE CARD
  // =======================================================

  const renderFeature = ({
    item,
    index,
  }: {
    item: (typeof features)[number];
    index: number;
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate(
            item.screen
          )
        }
        style={[
          styles.featureCard,
          {
            width: cardWidth,
          },
        ]}
      >

        {/* Accent */}

        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                accentColor,
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

        {/* Icon */}

        <View
          style={[
            styles.featureIcon,
            {
              backgroundColor:
                `${accentColor}12`,
            },
          ]}
        >
          <Icon
            name={item.icon}
            size={26}
            color={accentColor}
          />
        </View>

        {/* Text */}

        <View style={styles.featureContent}>

          <Text
            numberOfLines={1}
            style={styles.featureLabel}
          >
            {item.label}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.featureDescription}
          >
            Open {item.label.toLowerCase()}
          </Text>

        </View>

        {/* Arrow */}

        <View
          style={[
            styles.featureArrow,
            {
              backgroundColor:
                `${accentColor}10`,
            },
          ]}
        >
          <Icon
            name="arrow-right"
            size={15}
            color={accentColor}
          />
        </View>

      </TouchableOpacity>
    );
  };

  // =======================================================
  // HEADER
  // =======================================================

  const ListHeader = () => (
    <>
      {/* =================================================
          TOP HEADER
      ================================================= */}

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.header}
      >

        {/* Navigation row */}

        <View style={styles.headerTop}>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.goBack()
            }
            style={styles.backIconButton}
          >
            <Icon
              name="arrow-left"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerBreadcrumb}>

            <Text style={styles.headerSmallText}>
              MODULE
            </Text>

            <Text
              numberOfLines={1}
              style={styles.headerBreadcrumbTitle}
            >
              {moduleLabel}
            </Text>

          </View>

          <View style={styles.headerGridButton}>
            <Icon
              name="view-grid-outline"
              size={20}
              color="#FFFFFF"
            />
          </View>

        </View>

        {/* Module identity */}

        <View style={styles.moduleHero}>

          <View
            style={[
              styles.moduleHeroIcon,
              {
                backgroundColor:
                  'rgba(255,255,255,0.16)',
              },
            ]}
          >
            <Text style={styles.moduleEmoji}>
              {moduleConfig?.icon
                ? ''
                : '📦'}
            </Text>

            <Icon
              name={
                moduleConfig?.icon ||
                'view-grid'
              }
              size={30}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.moduleHeroText}>

            <Text style={styles.moduleHeroTitle}>
              {moduleLabel}
            </Text>

            <Text style={styles.moduleHeroSubtitle}>
              Manage your {moduleLabel.toLowerCase()}{' '}
              workspace
            </Text>

          </View>

        </View>

      </LinearGradient>

      {/* =================================================
          FEATURE SUMMARY
      ================================================= */}

      <View style={styles.summaryRow}>

        <View style={styles.summaryText}>

          <Text style={styles.summaryTitle}>
            Features
          </Text>

          <Text style={styles.summarySubtitle}>
            Select a feature to continue
          </Text>

        </View>

        <View
          style={[
            styles.countBadge,
            {
              backgroundColor:
                `${accentColor}10`,
              borderColor:
                `${accentColor}25`,
            },
          ]}
        >
          <Text
            style={[
              styles.countNumber,
              {
                color:
                  accentColor,
              },
            ]}
          >
            {features.length}
          </Text>

          <Text
            style={[
              styles.countLabel,
              {
                color:
                  accentColor,
              },
            ]}
          >
            {features.length === 1
              ? 'available'
              : 'available'}
          </Text>

        </View>

      </View>

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
        data={features}
        keyExtractor={(item) =>
          item.key
        }
        renderItem={renderFeature}
        numColumns={2}
        ListHeaderComponent={
          <ListHeader />
        }
        columnWrapperStyle={
          styles.columnWrapper
        }
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />

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
    paddingBottom: 35,
  },

  columnWrapper: {
    paddingHorizontal: 20,

    justifyContent:
      'space-between',

    marginBottom: 12,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,

    paddingTop: 10,
    paddingBottom: 24,

    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.12,

    shadowRadius: 12,

    elevation: 5,
  },

  headerTop: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  backIconButton: {
    width: 39,
    height: 39,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  headerBreadcrumb: {
    flex: 1,

    marginLeft: 11,
  },

  headerSmallText: {
    color:
      'rgba(255,255,255,0.60)',

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 1,
  },

  headerBreadcrumbTitle: {
    marginTop: 2,

    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '600',
  },

  headerGridButton: {
    width: 39,
    height: 39,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 11,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  // =======================================================
  // MODULE HERO
  // =======================================================

  moduleHero: {
    marginTop: 23,

    flexDirection: 'row',

    alignItems: 'center',
  },

  moduleHeroIcon: {
    width: 66,
    height: 66,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 18,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.20)',
  },

  moduleEmoji: {
    position: 'absolute',

    fontSize: 0,
  },

  moduleHeroText: {
    flex: 1,

    marginLeft: 15,
  },

  moduleHeroTitle: {
    color: '#FFFFFF',

    fontSize: 25,

    lineHeight: 30,

    fontWeight: '700',

    letterSpacing: -0.3,
  },

  moduleHeroSubtitle: {
    marginTop: 5,

    color:
      'rgba(255,255,255,0.70)',

    fontSize: 10,

    lineHeight: 15,

    fontWeight: '500',
  },

  // =======================================================
  // SUMMARY
  // =======================================================

  summaryRow: {
    marginHorizontal: 20,

    marginTop: 22,

    marginBottom: 14,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  summaryText: {
    flex: 1,
  },

  summaryTitle: {
    color: TEXT_PRIMARY,

    fontSize: 18,

    fontWeight: '700',
  },

  summarySubtitle: {
    marginTop: 3,

    color: TEXT_SECONDARY,

    fontSize: 10,

    fontWeight: '500',
  },

  countBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 10,

    paddingVertical: 7,

    borderRadius: 9,

    borderWidth: 1,
  },

  countNumber: {
    fontSize: 14,

    fontWeight: '700',
  },

  countLabel: {
    marginLeft: 4,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // FEATURE CARD
  // =======================================================

  featureCard: {
    minHeight: 157,

    padding: 17,

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',

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

  // =======================================================
  // NUMBER
  // =======================================================

  cardNumber: {
    position: 'absolute',

    top: 15,

    right: 15,

    color: '#CBD5E1',

    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // =======================================================
  // ICON
  // =======================================================

  featureIcon: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 13,
  },

  // =======================================================
  // CONTENT
  // =======================================================

  featureContent: {
    marginTop: 15,

    paddingRight: 28,
  },

  featureLabel: {
    color: TEXT_PRIMARY,

    fontSize: 14,

    lineHeight: 18,

    fontWeight: '700',
  },

  featureDescription: {
    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 9,

    lineHeight: 13,

    fontWeight: '500',
  },

  // =======================================================
  // ARROW
  // =======================================================

  featureArrow: {
    position: 'absolute',

    right: 14,

    bottom: 14,

    width: 28,
    height: 28,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 8,
  },

  // =======================================================
  // EMPTY STATE
  // =======================================================

  emptyScreen: {
    flex: 1,

    alignItems: 'center',

    justifyContent:
      'center',

    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,

    alignItems: 'center',
    justifyContent:
      'center',

    borderRadius: 20,
  },

  emptyTitle: {
    marginTop: 20,

    color: TEXT_PRIMARY,

    fontSize: 21,

    fontWeight: '700',
  },

  emptyDescription: {
    maxWidth: 330,

    marginTop: 8,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 19,

    textAlign: 'center',
  },

  backButton: {
    marginTop: 23,

    minHeight: 42,

    paddingHorizontal: 17,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'center',

    borderRadius: 10,

    gap: 7,
  },

  backButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },
});