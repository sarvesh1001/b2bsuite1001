import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
} from 'react-native-paper';

import {
  useRoute,
  RouteProp,
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  useQuery,
} from '@tanstack/react-query';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getEmployeeDetails,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  UserAvatar,
} from '../../../components/UserAvatar';

import {
  useAvatar,
} from '../../../hooks/useAvatar';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

import {
  RootStackParamList,
} from '../../../navigation';

// =========================================================
// TYPES
// =========================================================

type EmployeeDetailRouteProp = RouteProp<
  RootStackParamList,
  'EmployeeDetail'
>;

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmployeeDetail'
>;

// =========================================================
// HELPERS
// =========================================================

const formatDate = (
  value?: string | null
) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
};

// =========================================================
// DETAIL ROW
// =========================================================

const DetailRow = ({
  icon,
  label,
  value,
  accent = PRIMARY_COLOR,
  last = false,
}: {
  icon: string;
  label: string;
  value?: string | null;
  accent?: string;
  last?: boolean;
}) => {
  const displayValue =
    value && value.trim()
      ? value
      : '-';

  return (
    <View
      style={[
        styles.detailRow,
        !last && styles.detailRowBorder,
      ]}
    >
      {/* Icon */}

      <View
        style={[
          styles.detailIcon,
          {
            backgroundColor:
              `${accent}12`,
          },
        ]}
      >
        <Icon
          name={icon}
          size={18}
          color={accent}
        />
      </View>

      {/* Text */}

      <View style={styles.detailTextContainer}>

        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          selectable
          style={[
            styles.detailValue,
            displayValue === '-' &&
              styles.emptyValue,
          ]}
        >
          {displayValue}
        </Text>

      </View>
    </View>
  );
};

// =========================================================
// SECTION
// =========================================================

const InfoSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) => {
  return (
    <View style={styles.section}>

      <View style={styles.sectionHeader}>

        <View style={styles.sectionHeaderIcon}>
          <Icon
            name={icon}
            size={17}
            color={PRIMARY_COLOR}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>

      </View>

      <View style={styles.sectionCard}>
        {children}
      </View>

    </View>
  );
};

// =========================================================
// SCREEN
// =========================================================

export default function EmployeeDetailScreen() {
  const route =
    useRoute<EmployeeDetailRouteProp>();

  const navigation =
    useNavigation<NavigationProp>();

  const userId =
    route.params?.userId;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // INVALID USER
  // =======================================================

  if (!userId) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}
      >
        <View style={styles.stateContainer}>

          <View
            style={[
              styles.stateIcon,
              {
                backgroundColor:
                  `${PRIMARY_COLOR}12`,
              },
            ]}
          >
            <Icon
              name="account-alert-outline"
              size={32}
              color={PRIMARY_COLOR}
            />
          </View>

          <Text style={styles.stateTitle}>
            Invalid Employee
          </Text>

          <Text style={styles.stateDescription}>
            The employee information could not
            be identified.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.85}
          >
            <Icon
              name="arrow-left"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // QUERY
  // =======================================================

  const {
    data: employee,
    isLoading: employeeLoading,
    isError,
  } = useQuery({
    queryKey: [
      'employee',
      userId,
    ],

    queryFn: () =>
      getEmployeeDetails(
        companyId!,
        userId,
        deviceId!,
        accessToken!
      ),

    enabled:
      !!userId &&
      !!accessToken &&
      !!companyId &&
      !!deviceId,
  });

  // =======================================================
  // AVATAR
  // =======================================================

  const {
    avatarUrl,
    isLoading: avatarLoading,
  } = useAvatar(userId);

  // =======================================================
  // LOADING
  // =======================================================

  if (employeeLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}
      >
        <View style={styles.loadingContainer}>

          <View style={styles.loadingIcon}>
            <Icon
              name="account-search-outline"
              size={28}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />

          <Text style={styles.loadingTitle}>
            Loading employee
          </Text>

          <Text style={styles.loadingSubtitle}>
            Fetching employee information...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (isError || !employee) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom']}
      >
        <View style={styles.stateContainer}>

          <View style={styles.errorIcon}>
            <Icon
              name="account-alert-outline"
              size={32}
              color="#EF4444"
            />
          </View>

          <Text style={styles.stateTitle}>
            Unable to Load Employee
          </Text>

          <Text style={styles.stateDescription}>
            We couldn't retrieve this employee's
            information. Please try again.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.85}
          >
            <Icon
              name="arrow-left"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // EMPLOYEE DATA
  // =======================================================

  const fullName =
    employee.full_name ||
    'Unnamed Employee';

  const username =
    employee.username;

  const isActive =
    employee.is_active;

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part: string) =>
          part.charAt(0).toUpperCase()
      )
      .join('');

  // =======================================================
  // MAIN
  // =======================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================================
            TOP BAR
        ================================================= */}

        <View style={styles.topBar}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
            accessibilityLabel="Go back"
          >
            <Icon
              name="arrow-left"
              size={21}
              color={TEXT_PRIMARY}
            />
          </TouchableOpacity>

          <View style={styles.topBarTitleContainer}>

            <Text style={styles.topBarTitle}>
              Employee
            </Text>

            <Text style={styles.topBarSubtitle}>
              Employee Details
            </Text>

          </View>

          <View style={styles.topBarSpacer} />

        </View>

        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <View style={styles.profileHero}>

          {/* Decorative accent */}

          <View
            style={[
              styles.profileAccent,
              {
                backgroundColor:
                  PRIMARY_COLOR,
              },
            ]}
          />

          {/* Avatar */}

          <View style={styles.avatarWrapper}>

            <UserAvatar
              userId={userId}
              username={employee.username}
              fullName={employee.full_name}
              avatarUrl={avatarUrl}
              loading={avatarLoading}
              size={92}
            />

            <View
              style={[
                styles.avatarStatus,
                {
                  backgroundColor:
                    isActive
                      ? '#22C55E'
                      : '#94A3B8',
                },
              ]}
            />

          </View>

          {/* Name */}

          <Text
            numberOfLines={2}
            style={styles.fullName}
          >
            {fullName}
          </Text>

          {/* Username */}

          {username ? (
            <Text
              numberOfLines={1}
              style={styles.username}
            >
              @{username}
            </Text>
          ) : null}

          {/* Status */}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  isActive
                    ? '#ECFDF3'
                    : '#F1F5F9',
              },
            ]}
          >

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    isActive
                      ? '#22C55E'
                      : '#94A3B8',
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    isActive
                      ? '#15803D'
                      : '#64748B',
                },
              ]}
            >
              {isActive
                ? 'Active Employee'
                : 'Inactive Employee'}
            </Text>

          </View>

          {/* Employee ID */}

          {employee.employee_id ? (
            <View style={styles.employeeIdBadge}>

              <Icon
                name="badge-account-outline"
                size={14}
                color={TEXT_SECONDARY}
              />

              <Text
                style={styles.employeeIdText}
              >
                ID: {employee.employee_id}
              </Text>

            </View>
          ) : null}

        </View>

        {/* =================================================
            EMPLOYMENT INFORMATION
        ================================================= */}

        <InfoSection
          title="Employment"
          icon="briefcase-outline"
        >

          <DetailRow
            icon="badge-account-outline"
            label="Employee ID"
            value={
              employee.employee_id
            }
          />

          <DetailRow
            icon="account-tie-outline"
            label="Role"
            value={
              employee.role_name
            }
            accent="#7C3AED"
          />

          <DetailRow
            icon="card-account-details-outline"
            label="Position"
            value={
              employee.position_title
            }
            accent="#0EA5E9"
          />

          <DetailRow
            icon="office-building-outline"
            label="Department"
            value={
              employee.department_name
            }
            accent="#10B981"
          />

          <DetailRow
            icon="factory"
            label="Work Center"
            value={
              employee.work_center_code
            }
            accent="#F97316"
          />

          <DetailRow
            icon="calendar-month-outline"
            label="Hire Date"
            value={
              formatDate(
                employee.hire_date
              )
            }
            accent="#F59E0B"
            last
          />

        </InfoSection>

        {/* =================================================
            COMPANY INFORMATION
        ================================================= */}

        <InfoSection
          title="Company"
          icon="domain"
        >

          <DetailRow
            icon="domain"
            label="Company ID"
            value={
              employee.company_id
            }
            accent="#6366F1"
            last
          />

        </InfoSection>

        {/* =================================================
            FOOTER
        ================================================= */}

        <View style={styles.footer}>

          <Icon
            name="shield-check-outline"
            size={15}
            color="#94A3B8"
          />

          <Text style={styles.footerText}>
            Employee information is managed by
            your organization.
          </Text>

        </View>

      </ScrollView>

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

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  // =======================================================
  // TOP BAR
  // =======================================================

  topBar: {
    minHeight: 58,

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 10,
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

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,

    elevation: 1,
  },

  topBarTitleContainer: {
    flex: 1,

    marginLeft: 12,
  },

  topBarTitle: {
    color: TEXT_PRIMARY,

    fontSize: 16,
    fontWeight: '700',
  },

  topBarSubtitle: {
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,
    fontWeight: '500',
  },

  topBarSpacer: {
    width: 40,
  },

  // =======================================================
  // PROFILE HERO
  // =======================================================

  profileHero: {
    position: 'relative',

    alignItems: 'center',

    paddingTop: 28,
    paddingBottom: 24,

    paddingHorizontal: 18,

    borderRadius: 20,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,
    borderColor:
      BORDER_COLOR,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.045,
    shadowRadius: 10,

    elevation: 2,
  },

  profileAccent: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    height: 4,
  },

  avatarWrapper: {
    position: 'relative',

    marginBottom: 13,
  },

  avatarStatus: {
    position: 'absolute',

    right: 2,
    bottom: 4,

    width: 17,
    height: 17,

    borderRadius: 9,

    borderWidth: 3,
    borderColor:
      CARD_BACKGROUND,
  },

  fullName: {
    maxWidth: '90%',

    color: TEXT_PRIMARY,

    fontSize: 22,

    lineHeight: 28,

    fontWeight: '700',

    textAlign: 'center',

    letterSpacing: -0.3,
  },

  username: {
    maxWidth: '80%',

    marginTop: 4,

    color: TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '500',
  },

  // =======================================================
  // STATUS
  // =======================================================

  statusBadge: {
    marginTop: 12,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 6,

    borderRadius: 20,
  },

  statusDot: {
    width: 6,
    height: 6,

    marginRight: 6,

    borderRadius: 3,
  },

  statusText: {
    fontSize: 9,

    fontWeight: '700',
  },

  // =======================================================
  // EMPLOYEE ID
  // =======================================================

  employeeIdBadge: {
    marginTop: 11,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 7,

    backgroundColor:
      '#F8FAFC',

    borderWidth: 1,
    borderColor:
      '#E8ECF1',
  },

  employeeIdText: {
    marginLeft: 5,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // SECTION
  // =======================================================

  section: {
    marginTop: 23,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 10,

    paddingHorizontal: 2,
  },

  sectionHeaderIcon: {
    width: 31,
    height: 31,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  sectionTitle: {
    marginLeft: 9,

    color: TEXT_PRIMARY,

    fontSize: 15,

    fontWeight: '700',
  },

  // =======================================================
  // SECTION CARD
  // =======================================================

  sectionCard: {
    paddingHorizontal: 14,

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

  // =======================================================
  // DETAIL ROW
  // =======================================================

  detailRow: {
    minHeight: 70,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 10,
  },

  detailRowBorder: {
    borderBottomWidth: 1,

    borderBottomColor:
      BORDER_COLOR,
  },

  detailIcon: {
    width: 38,
    height: 38,

    flexShrink: 0,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  detailTextContainer: {
    flex: 1,

    marginLeft: 12,

    minWidth: 0,
  },

  detailLabel: {
    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',

    textTransform: 'uppercase',

    letterSpacing: 0.45,
  },

  detailValue: {
    marginTop: 4,

    color: TEXT_PRIMARY,

    fontSize: 13,

    lineHeight: 18,

    fontWeight: '600',
  },

  emptyValue: {
    color: '#A8B2BF',

    fontWeight: '500',
  },

  // =======================================================
  // FOOTER
  // =======================================================

  footer: {
    marginTop: 25,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 20,
  },

  footerText: {
    marginLeft: 6,

    color: '#94A3B8',

    fontSize: 9,

    lineHeight: 14,

    textAlign: 'center',
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
    width: 65,
    height: 65,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 18,

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

    fontSize: 11,
  },

  // =======================================================
  // ERROR / INVALID
  // =======================================================

  stateContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  stateIcon: {
    width: 72,
    height: 72,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,
  },

  errorIcon: {
    width: 72,
    height: 72,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,

    backgroundColor:
      '#FEF2F2',
  },

  stateTitle: {
    marginTop: 20,

    color: TEXT_PRIMARY,

    fontSize: 21,

    fontWeight: '700',

    textAlign: 'center',
  },

  stateDescription: {
    maxWidth: 330,

    marginTop: 8,

    color: TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 19,

    textAlign: 'center',
  },

  // =======================================================
  // BUTTON
  // =======================================================

  primaryButton: {
    marginTop: 23,

    minHeight: 42,

    paddingHorizontal: 17,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,
  },

  primaryButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },
});