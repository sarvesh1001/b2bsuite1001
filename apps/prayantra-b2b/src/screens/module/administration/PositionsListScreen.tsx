// apps/prayantra-b2b/src/screens/module/administration/PositionsListScreen.tsx

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  View,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
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
  listPositions,
  deletePosition,
} from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  Position,
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
// TYPES
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'PositionsList'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function PositionsListScreen() {
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

  const [
    positions,
    setPositions,
  ] = useState<Position[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  // =======================================================
  // FETCH
  // =======================================================

  const fetchPositions =
    useCallback(
      async (
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
          const res =
            await listPositions(
              companyId,
              deviceId,
              {
                limit: 100,
                offset: 0,
              },
              accessToken
            );

          setPositions(
            res.data?.positions || []
          );
        } catch (error: any) {
          console.error(
            'Failed to load positions:',
            error
          );

          Alert.alert(
            'Unable to load',
            error?.message ||
              'Failed to load positions. Please try again.'
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
  // REFRESH ON SCREEN FOCUS
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      fetchPositions();

      return undefined;
    }, [fetchPositions])
  );

  // =======================================================
  // SEARCH
  // =======================================================

  const filteredPositions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return positions;
      }

      return positions.filter(
        (position) => {
          const title =
            position.title
              ?.toLowerCase() || '';

          const department =
            String(
              position.department_id || ''
            ).toLowerCase();

          const workCenter =
            String(
              position.work_center_code || ''
            ).toLowerCase();

          return (
            title.includes(query) ||
            department.includes(query) ||
            workCenter.includes(query)
          );
        }
      );
    }, [
      positions,
      search,
    ]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete =
    (position: Position) => {
      Alert.alert(
        'Delete Position',
        `Are you sure you want to delete "${position.title}"?`,
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
                  position.position_id
                );

                await deletePosition(
                  companyId,
                  deviceId,
                  position.position_id,
                  accessToken
                );

                setPositions(
                  (current) =>
                    current.filter(
                      (item) =>
                        item.position_id !==
                        position.position_id
                    )
                );
              } catch (error: any) {
                console.error(
                  'Delete position error:',
                  error
                );

                Alert.alert(
                  'Delete Failed',
                  error?.message ||
                    'Unable to delete this position.'
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
  // POSITION CARD
  // =======================================================

  const renderItem = ({
    item,
    index,
  }: {
    item: Position;
    index: number;
  }) => {
    const isDeleting =
      deletingId ===
      item.position_id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={isDeleting}
        style={styles.positionCard}
      >
        {/* Accent */}

        <View
          style={styles.cardAccent}
        />

        {/* Number */}

        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(
            2,
            '0'
          )}
        </Text>

        {/* Top row */}

        <View style={styles.cardTopRow}>

          {/* Icon */}

          <View style={styles.positionIcon}>
            <Icon
              name="briefcase-outline"
              size={25}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Main information */}

          <View style={styles.positionInfo}>

            <Text
              numberOfLines={1}
              style={styles.positionTitle}
            >
              {item.title}
            </Text>

            <View
              style={
                styles.positionMeta
              }
            >
              <Icon
                name="domain"
                size={13}
                color={TEXT_SECONDARY}
              />

              <Text
                numberOfLines={1}
                style={
                  styles.positionMetaText
                }
              >
                Department
              </Text>
            </View>

          </View>

          {/* Actions */}

          <View
            style={styles.actions}
          >

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate(
                  'EditPosition',
                  {
                    positionId:
                      item.position_id,
                  }
                )
              }
              style={[
                styles.actionButton,
                styles.editButton,
              ]}
            >
              <Icon
                name="pencil-outline"
                size={18}
                color={PRIMARY_COLOR}
              />
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
                  size={16}
                  color={ERROR_COLOR}
                />
              ) : (
                <Icon
                  name="delete-outline"
                  size={18}
                  color={ERROR_COLOR}
                />
              )}
            </TouchableOpacity>

          </View>

        </View>

        {/* Details */}

        <View style={styles.detailsRow}>

          <View
            style={styles.detailItem}
          >
            <Icon
              name="office-building-outline"
              size={14}
              color="#94A3B8"
            />

            <Text
              numberOfLines={1}
              style={styles.detailText}
            >
              {item.department_id}
            </Text>
          </View>

          {item.work_center_code ? (
            <View
              style={styles.detailItem}
            >
              <Icon
                name="factory"
                size={14}
                color="#94A3B8"
              />

              <Text
                numberOfLines={1}
                style={styles.detailText}
              >
                {item.work_center_code}
              </Text>
            </View>
          ) : null}

        </View>

        {/* Status */}

        <View
          style={styles.statusRow}
        >

          <StatusBadge
            label={
              item.is_open
                ? 'Open'
                : 'Closed'
            }
            type={
              item.is_open
                ? 'success'
                : 'error'
            }
          />

          <StatusBadge
            label={
              item.is_schedulable
                ? 'Schedulable'
                : 'Not Schedulable'
            }
            type={
              item.is_schedulable
                ? 'success'
                : 'neutral'
            }
          />

          <StatusBadge
            label={
              item.attendance_required
                ? 'Attendance Required'
                : 'No Attendance'
            }
            type={
              item.attendance_required
                ? 'success'
                : 'neutral'
            }
          />

        </View>

      </TouchableOpacity>
    );
  };

  // =======================================================
  // HEADER
  // =======================================================

  const ListHeader =
    () => (
      <>
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={styles.header}
        >

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

          <View
            style={styles.headerTitleContainer}
          >
            <Text
              style={styles.eyebrow}
            >
              ADMINISTRATION
            </Text>

            <Text
              style={styles.headerTitle}
            >
              Positions
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Manage employee positions
            </Text>
          </View>

          {/* Add */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                'CreatePosition'
              )
            }
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

        <View
          style={styles.summaryRow}
        >

          <View
            style={styles.summaryCard}
          >
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    `${PRIMARY_COLOR}12`,
                },
              ]}
            >
              <Icon
                name="briefcase-outline"
                size={18}
                color={PRIMARY_COLOR}
              />
            </View>

            <View>
              <Text
                style={styles.summaryNumber}
              >
                {positions.length}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                Total Positions
              </Text>
            </View>
          </View>

          <View
            style={styles.summaryCard}
          >
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    '#D1FAE5',
                },
              ]}
            >
              <Icon
                name="check-circle-outline"
                size={18}
                color={SUCCESS_COLOR}
              />
            </View>

            <View>
              <Text
                style={styles.summaryNumber}
              >
                {
                  positions.filter(
                    (item) =>
                      item.is_open
                  ).length
                }
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                Open
              </Text>
            </View>
          </View>

        </View>

        {/* =================================================
            SEARCH
        ================================================= */}

        <View
          style={styles.searchContainer}
        >

          <Icon
            name="magnify"
            size={20}
            color="#94A3B8"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search positions..."
            placeholderTextColor="#A0AAB8"
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 && (
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
          )}

        </View>

        {/* =================================================
            SECTION TITLE
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >

          <View>
            <Text
              style={styles.sectionTitle}
            >
              All Positions
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              {search
                ? `${filteredPositions.length} result${
                    filteredPositions.length === 1
                      ? ''
                      : 's'
                  } found`
                : 'Select a position to manage it'}
            </Text>
          </View>

          <View
            style={styles.countBadge}
          >
            <Text
              style={styles.countBadgeText}
            >
              {filteredPositions.length}
            </Text>
          </View>

        </View>
      </>
    );

  // =======================================================
  // EMPTY
  // =======================================================

  const EmptyComponent =
    () => (
      <View
        style={styles.emptyContainer}
      >

        <View
          style={styles.emptyIcon}
        >
          <Icon
            name={
              search
                ? 'magnify-close'
                : 'briefcase-off-outline'
            }
            size={30}
            color={PRIMARY_COLOR}
          />
        </View>

        <Text
          style={styles.emptyTitle}
        >
          {search
            ? 'No positions found'
            : 'No positions yet'}
        </Text>

        <Text
          style={styles.emptyDescription}
        >
          {search
            ? `No position matches "${search}".`
            : 'Create your first position to start managing employee roles.'}
        </Text>

        {search ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setSearch('')
            }
            style={styles.emptyButton}
          >
            <Text
              style={styles.emptyButtonText}
            >
              Clear Search
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                'CreatePosition'
              )
            }
            style={styles.emptyButton}
          >
            <Icon
              name="plus"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={styles.emptyButtonText}
            >
              Create Position
            </Text>
          </TouchableOpacity>
        )}

      </View>
    );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={styles.container}
      >
        <View
          style={styles.loadingScreen}
        >

          <View
            style={styles.loadingIcon}
          >
            <Icon
              name="briefcase-outline"
              size={28}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{
              marginTop: 20,
            }}
          />

          <Text
            style={styles.loadingTitle}
          >
            Loading positions
          </Text>

          <Text
            style={styles.loadingSubtitle}
          >
            Please wait...
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

      <FlatList
        data={filteredPositions}
        keyExtractor={(item) =>
          item.position_id
        }
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeader />
        }
        ListEmptyComponent={
          <EmptyComponent />
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              100 +
              insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchPositions(true)
            }
            tintColor={PRIMARY_COLOR}
            colors={[
              PRIMARY_COLOR,
            ]}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      />

      {/* =================================================
          FLOATING ADD BUTTON
      ================================================= */}

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate(
            'CreatePosition'
          )
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
        <Icon
          name="plus"
          size={25}
          color="#FFFFFF"
        />

        <Text
          style={styles.fabText}
        >
          New Position
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  label,
  type,
}: {
  label: string;
  type:
    | 'success'
    | 'error'
    | 'neutral';
}) {
  const config = {
    success: {
      background: '#ECFDF5',
      color: SUCCESS_COLOR,
      icon: 'check-circle-outline',
    },

    error: {
      background: '#FEF2F2',
      color: ERROR_COLOR,
      icon: 'close-circle-outline',
    },

    neutral: {
      background: '#F1F5F9',
      color: '#64748B',
      icon: 'minus-circle-outline',
    },
  }[type];

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.background,
        },
      ]}
    >
      <Icon
        name={config.icon}
        size={11}
        color={config.color}
      />

      <Text
        style={[
          styles.statusBadgeText,
          {
            color: config.color,
          },
        ]}
      >
        {label}
      </Text>
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

    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },

    // =====================================================
    // HEADER
    // =====================================================

    header: {
      minHeight: 78,

      flexDirection: 'row',
      alignItems: 'center',

      paddingVertical: 12,
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

      fontWeight: '700',

      letterSpacing: -0.4,
    },

    headerSubtitle: {
      marginTop: 2,

      color: TEXT_SECONDARY,

      fontSize: 9,

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

      shadowRadius: 7,

      elevation: 4,
    },

    // =====================================================
    // SUMMARY
    // =====================================================

    summaryRow: {
      flexDirection: 'row',

      gap: 10,

      marginTop: 8,
      marginBottom: 15,
    },

    summaryCard: {
      flex: 1,

      minHeight: 67,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 11,

      borderRadius: 13,

      backgroundColor:
        CARD_BACKGROUND,

      borderWidth: 1,

      borderColor:
        BORDER_COLOR,
    },

    summaryIcon: {
      width: 38,
      height: 38,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,
    },

    summaryNumber: {
      marginLeft: 9,

      color: TEXT_PRIMARY,

      fontSize: 17,

      fontWeight: '700',
    },

    summaryLabel: {
      marginLeft: 9,
      marginTop: 2,

      color: TEXT_SECONDARY,

      fontSize: 8,

      fontWeight: '600',
    },

    // =====================================================
    // SEARCH
    // =====================================================

    searchContainer: {
      height: 46,

      flexDirection: 'row',
      alignItems: 'center',

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

    // =====================================================
    // SECTION
    // =====================================================

    sectionHeader: {
      marginTop: 24,
      marginBottom: 13,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent: 'space-between',
    },

    sectionTitle: {
      color: TEXT_PRIMARY,

      fontSize: 17,

      fontWeight: '700',
    },

    sectionSubtitle: {
      marginTop: 3,

      color: TEXT_SECONDARY,

      fontSize: 9,

      fontWeight: '500',
    },

    countBadge: {
      minWidth: 29,
      height: 26,

      paddingHorizontal: 8,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 8,

      backgroundColor:
        `${PRIMARY_COLOR}12`,
    },

    countBadgeText: {
      color: PRIMARY_COLOR,

      fontSize: 10,

      fontWeight: '700',
    },

    // =====================================================
    // POSITION CARD
    // =====================================================

    positionCard: {
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

      shadowOpacity: 0.035,

      shadowRadius: 8,

      elevation: 2,
    },

    cardAccent: {
      position: 'absolute',

      top: 0,
      left: 0,
      right: 0,

      height: 3,

      backgroundColor:
        PRIMARY_COLOR,
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

    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // =====================================================
    // POSITION ICON
    // =====================================================

    positionIcon: {
      width: 48,
      height: 48,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 13,

      backgroundColor:
        `${PRIMARY_COLOR}12`,
    },

    positionInfo: {
      flex: 1,

      marginLeft: 12,

      paddingRight: 7,
    },

    positionTitle: {
      color: TEXT_PRIMARY,

      fontSize: 15,

      fontWeight: '700',

      lineHeight: 19,
    },

    positionMeta: {
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 5,
    },

    positionMetaText: {
      marginLeft: 4,

      color: TEXT_SECONDARY,

      fontSize: 9,

      fontWeight: '500',
    },

    // =====================================================
    // ACTIONS
    // =====================================================

    actions: {
      flexDirection: 'row',

      gap: 6,
    },

    actionButton: {
      width: 35,
      height: 35,

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
        '#FEF2F2',
    },

    // =====================================================
    // DETAILS
    // =====================================================

    detailsRow: {
      marginTop: 14,

      paddingTop: 12,

      flexDirection: 'row',

      gap: 13,

      borderTopWidth: 1,

      borderTopColor:
        '#EEF1F5',
    },

    detailItem: {
      flex: 1,

      flexDirection: 'row',
      alignItems: 'center',

      minWidth: 0,
    },

    detailText: {
      flex: 1,

      marginLeft: 5,

      color: '#64748B',

      fontSize: 9,

      fontWeight: '500',
    },

    // =====================================================
    // STATUS
    // =====================================================

    statusRow: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      gap: 6,

      marginTop: 12,
    },

    statusBadge: {
      minHeight: 24,

      paddingHorizontal: 8,

      flexDirection: 'row',
      alignItems: 'center',

      borderRadius: 7,

      gap: 4,
    },

    statusBadgeText: {
      fontSize: 8,

      fontWeight: '600',
    },

    // =====================================================
    // EMPTY
    // =====================================================

    emptyContainer: {
      minHeight: 300,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 30,

      marginTop: 10,

      borderWidth: 1,

      borderStyle: 'dashed',

      borderColor: '#DCE2EA',

      borderRadius: 16,

      backgroundColor:
        'rgba(255,255,255,0.55)',
    },

    emptyIcon: {
      width: 65,
      height: 65,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 18,

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
    },

    emptyButton: {
      minHeight: 40,

      marginTop: 20,

      paddingHorizontal: 16,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      borderRadius: 9,

      backgroundColor:
        PRIMARY_COLOR,
    },

    emptyButtonText: {
      color: '#FFFFFF',

      fontSize: 11,

      fontWeight: '700',
    },

    // =====================================================
    // FAB
    // =====================================================

    fab: {
      position: 'absolute',

      right: 18,

      minHeight: 48,

      paddingHorizontal: 17,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      borderRadius: 25,

      backgroundColor:
        PRIMARY_COLOR,

      shadowColor:
        PRIMARY_COLOR,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.25,

      shadowRadius: 10,

      elevation: 7,
    },

    fabText: {
      color: '#FFFFFF',

      fontSize: 11,

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
      width: 65,
      height: 65,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 18,

      backgroundColor:
        `${PRIMARY_COLOR}12`,
    },

    loadingTitle: {
      marginTop: 14,

      color: TEXT_PRIMARY,

      fontSize: 17,

      fontWeight: '700',
    },

    loadingSubtitle: {
      marginTop: 4,

      color: TEXT_SECONDARY,

      fontSize: 10,
    },
  });