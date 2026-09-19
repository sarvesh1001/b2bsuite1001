import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  useFocusEffect,
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
  getEmployeeLocations,
  listLocations,
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

import type {
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
} from '@b2b/shared-types';

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

// Shape returned by the normalized getEmployeeLocations helper in the
// api-client. Kept local so this screen compiles regardless of whether
// the type is exported from @b2b/shared-types.
type NormalizedEmployeeLocations = {
  primary_location_id: string | null;
  location_access_scope: LocationAccessScope | null;
  selected_locations: Array<{
    location_id: string;
    access_level: LocationAccessLevel;
  }>;
};

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

const SCOPE_LABEL: Record<LocationAccessScope, string> = {
  PRIMARY: 'Primary only',
  SELECTED: 'Selected',
  ALL: 'All locations',
};

const SCOPE_ICON: Record<LocationAccessScope, string> = {
  PRIMARY: 'home-circle-outline',
  SELECTED: 'checkbox-multiple-marked-outline',
  ALL: 'earth',
};

const SCOPE_COLOR: Record<LocationAccessScope, string> = {
  PRIMARY: '#0EA5E9',
  SELECTED: '#7C3AED',
  ALL: '#10B981',
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
  // LOCATION STATE
  // =======================================================

  const [locations, setLocations] =
    useState<AccessibleLocation[]>([]);

  const [locationAccess, setLocationAccess] =
    useState<NormalizedEmployeeLocations | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

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
  // LOAD LOCATION ACCESS
  // =======================================================

  const loadLocationAccess = useCallback(
    async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId ||
        !userId
      ) {
        return;
      }

      setLocationLoading(true);

      try {
        const [locRes, empRes] = await Promise.all([
          listLocations(companyId, 1, 100),
          getEmployeeLocations(companyId, userId),
        ]);

        // listLocations now always returns { locations: [...] } thanks
        // to the api-client normalizer.
        const list: AccessibleLocation[] =
          (locRes as any)?.locations ?? [];

        setLocations(list);

        // getEmployeeLocations now always returns the wrapper shape
        // (or null when nothing is configured).
        setLocationAccess(empRes as NormalizedEmployeeLocations | null);

        console.log(
          '[EmployeeDetail/loadLocationAccess] applied:',
          {
            locationsCount: list.length,
            locationAccess: empRes,
            resolvedPrimaryId:
              (empRes as any)?.primary_location_id ?? null,
            resolvedScope:
              (empRes as any)?.location_access_scope ?? null,
            selectedCount:
              (empRes as any)?.selected_locations?.length ?? 0,
          },
        );
      } catch (error) {
        console.error(
          '[EmployeeDetail/loadLocationAccess] FAILED:',
          error,
        );
        setLocationAccess(null);
      } finally {
        setLocationLoading(false);
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      userId,
    ]
  );

  useEffect(() => {
    loadLocationAccess();
  }, [loadLocationAccess]);

  // Refetch when the screen refocuses (e.g. after the user saves on
  // EmployeeLocationAccessScreen and pops back).
  useFocusEffect(
    useCallback(() => {
      loadLocationAccess();
    }, [loadLocationAccess])
  );

  // =======================================================
  // LOCATION DERIVED VALUES
  // =======================================================

  const currentScope: LocationAccessScope =
    (locationAccess?.location_access_scope as LocationAccessScope) ||
    'PRIMARY';

  const currentPrimaryId: string | null =
    locationAccess?.primary_location_id ?? null;

  const currentPrimaryLocation = useMemo(
    () =>
      locations.find(
        (loc) =>
          loc.location_id === currentPrimaryId
      ) || null,
    [locations, currentPrimaryId]
  );

  const selectedLocationCount =
    locationAccess?.selected_locations?.length ?? 0;

  const scopeColor = SCOPE_COLOR[currentScope];
  const scopeIcon = SCOPE_ICON[currentScope];
  const scopeLabel = SCOPE_LABEL[currentScope];

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
          <View
            style={[
              styles.profileAccent,
              {
                backgroundColor:
                  PRIMARY_COLOR,
              },
            ]}
          />

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

          <Text
            numberOfLines={2}
            style={styles.fullName}
          >
            {fullName}
          </Text>

          {username ? (
            <Text
              numberOfLines={1}
              style={styles.username}
            >
              @{username}
            </Text>
          ) : null}

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
            value={employee.employee_id}
          />

          <DetailRow
            icon="account-tie-outline"
            label="Role"
            value={employee.role_name}
            accent="#7C3AED"
          />

          <DetailRow
            icon="card-account-details-outline"
            label="Position"
            value={employee.position_title}
            accent="#0EA5E9"
          />

          <DetailRow
            icon="office-building-outline"
            label="Department"
            value={employee.department_name}
            accent="#10B981"
          />

          <DetailRow
            icon="phone-outline"
            label="Phone"
            value={employee.phone}
            accent="#F97316"
          />

          <DetailRow
            icon="calendar-month-outline"
            label="Hire Date"
            value={formatDate(employee.hire_date)}
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
            value={employee.company_id}
            accent="#6366F1"
            last
          />
        </InfoSection>

        {/* =================================================
            LOCATION ACCESS (summary + edit entry)
        ================================================= */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Icon
                name="map-marker-multiple-outline"
                size={17}
                color={PRIMARY_COLOR}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Location Access
            </Text>
          </View>

          <View style={styles.locationCard}>
            {locationLoading ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator
                  size="small"
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.locationLoadingText}>
                  Loading location access...
                </Text>
              </View>
            ) : locationAccess ? (
              <>
                {/* Scope row */}

                <View style={styles.locationRow}>
                  <View
                    style={[
                      styles.locationRowIcon,
                      {
                        backgroundColor:
                          `${scopeColor}14`,
                      },
                    ]}
                  >
                    <Icon
                      name={scopeIcon}
                      size={19}
                      color={scopeColor}
                    />
                  </View>

                  <View style={styles.locationRowText}>
                    <Text style={styles.locationRowLabel}>
                      Access Scope
                    </Text>
                    <Text style={styles.locationRowValue}>
                      {scopeLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.scopePill,
                      {
                        backgroundColor:
                          `${scopeColor}14`,
                        borderColor:
                          `${scopeColor}30`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopePillText,
                        { color: scopeColor },
                      ]}
                    >
                      {currentScope}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationDivider} />

                {/* Primary location row */}

                <View style={styles.locationRow}>
                  <View
                    style={[
                      styles.locationRowIcon,
                      {
                        backgroundColor:
                          '#F59E0B14',
                      },
                    ]}
                  >
                    <Icon
                      name="star-outline"
                      size={19}
                      color="#F59E0B"
                    />
                  </View>

                  <View style={styles.locationRowText}>
                    <Text style={styles.locationRowLabel}>
                      Primary Location
                    </Text>
                    <Text style={styles.locationRowValue}>
                      {currentPrimaryLocation?.location_name ||
                        (currentPrimaryId
                          ? 'Unknown location'
                          : 'Not set')}
                    </Text>
                    {currentPrimaryLocation?.location_code ? (
                      <Text style={styles.locationRowSub}>
                        {currentPrimaryLocation.location_code}
                        {currentPrimaryLocation.city
                          ? ` • ${currentPrimaryLocation.city}`
                          : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Selected locations row — only when scope is SELECTED */}

                {currentScope === 'SELECTED' && (
                  <>
                    <View style={styles.locationDivider} />

                    <View style={styles.locationRow}>
                      <View
                        style={[
                          styles.locationRowIcon,
                          {
                            backgroundColor:
                              '#7C3AED14',
                          },
                        ]}
                      >
                        <Icon
                          name="checkbox-multiple-marked-outline"
                          size={19}
                          color="#7C3AED"
                        />
                      </View>

                      <View style={styles.locationRowText}>
                        <Text style={styles.locationRowLabel}>
                          Selected Locations
                        </Text>
                        <Text style={styles.locationRowValue}>
                          {selectedLocationCount === 0
                            ? 'None selected'
                            : `${selectedLocationCount} location${
                                selectedLocationCount === 1
                                  ? ''
                                  : 's'
                              }`}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Edit button */}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate(
                      'EmployeeLocationAccess',
                      {
                        employeeUserId: userId,
                        employeeName: fullName,
                      },
                    )
                  }
                  style={styles.editAccessButton}
                >
                  <Icon
                    name="pencil-outline"
                    size={17}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.editAccessText}>
                    Edit location access
                  </Text>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.locationEmpty}>
                <View
                  style={[
                    styles.locationRowIcon,
                    {
                      backgroundColor:
                        '#F1F5F914',
                    },
                  ]}
                >
                  <Icon
                    name="map-marker-off-outline"
                    size={19}
                    color={TEXT_SECONDARY}
                  />
                </View>

                <View style={styles.locationRowText}>
                  <Text style={styles.locationRowLabel}>
                    Location Access
                  </Text>
                  <Text style={styles.locationRowValue}>
                    Not configured
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate(
                      'EmployeeLocationAccess',
                      {
                        employeeUserId: userId,
                        employeeName: fullName,
                      },
                    )
                  }
                  style={styles.editAccessButtonSmall}
                >
                  <Text style={styles.editAccessTextSmall}>
                    Configure
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

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
  // LOCATION ACCESS CARD
  // =======================================================

  locationCard: {
    padding: 14,

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

  locationLoading: {
    paddingVertical: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },

  locationLoadingText: {
    marginTop: 8,

    color: TEXT_SECONDARY,

    fontSize: 10,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationRowIcon: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,
  },

  locationRowText: {
    flex: 1,

    marginLeft: 12,

    minWidth: 0,
  },

  locationRowLabel: {
    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '600',

    textTransform: 'uppercase',

    letterSpacing: 0.45,
  },

  locationRowValue: {
    marginTop: 3,

    color: TEXT_PRIMARY,

    fontSize: 13,

    fontWeight: '700',
  },

  locationRowSub: {
    marginTop: 2,

    color: TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  locationDivider: {
    marginVertical: 12,

    height: 1,

    backgroundColor:
      '#EDF0F4',
  },

  scopePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 8,

    borderWidth: 1,
  },

  scopePillText: {
    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.4,
  },

  editAccessButton: {
    marginTop: 14,

    minHeight: 42,

    paddingHorizontal: 12,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 11,

    backgroundColor:
      `${PRIMARY_COLOR}10`,

    borderWidth: 1,
    borderColor:
      `${PRIMARY_COLOR}25`,
  },

  editAccessText: {
    flex: 1,

    color: PRIMARY_COLOR,

    fontSize: 12,

    fontWeight: '700',
  },

  editAccessButtonSmall: {
    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  editAccessTextSmall: {
    color: PRIMARY_COLOR,

    fontSize: 10,

    fontWeight: '700',
  },

  locationEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
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