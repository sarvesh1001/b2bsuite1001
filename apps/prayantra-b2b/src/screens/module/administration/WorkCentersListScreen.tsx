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
  LinearGradient,
} from 'expo-linear-gradient';

// ✅ Use axiosInstance directly
import { axiosInstance } from '@b2b/api-client';

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  SUCCESS_COLOR,
  BORDER_COLOR,
  DISABLED_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// =========================================================
// TYPES
// =========================================================

type WorkCenter = {
  work_center_code: string;
  name: string;
  description?: string;
  is_active: boolean;
};

type NavigationProp =
  StackNavigationProp<any>;

// =========================================================
// SCREEN
// =========================================================

export default function WorkCentersListScreen() {
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
    workCenters,
    setWorkCenters,
  ] = useState<WorkCenter[]>([]);

  const [
    filteredCenters,
    setFilteredCenters,
  ] = useState<WorkCenter[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    searching,
    setSearching,
  ] = useState(false);

  // =======================================================
  // FETCH WORK CENTERS
  // =======================================================

  const fetchWorkCenters = useCallback(
  async (isRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const headers = {
        'X-Company-ID': companyId,
        'X-Device-ID': deviceId,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axiosInstance.get(
        `/companies/${companyId}/attendance/work-centers`,
        {
          headers,
          params: {
            page: 1,
            page_size: 100,
          },
        }
      );

      // ✅ Type the data as WorkCenter[]
      const data: WorkCenter[] = response.data?.data || response.data || [];
      setWorkCenters(data);

      if (!searchQuery.trim()) {
        setFilteredCenters(data);
      } else {
        const query = searchQuery.trim().toLowerCase();
        setFilteredCenters(
          data.filter((wc: WorkCenter) =>
            wc.name.toLowerCase().includes(query) ||
            wc.work_center_code.toLowerCase().includes(query)
          )
        );
      }
    } catch (error: any) {
      console.error('Failed to load work centers:', error);
      Alert.alert(
        'Unable to Load',
        error?.message || 'Failed to load work centers. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [accessToken, companyId, deviceId, searchQuery]
);
  // =======================================================
  // INITIAL / FOCUS REFRESH
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      fetchWorkCenters();
      return undefined;
    }, [fetchWorkCenters])
  );

  // =======================================================
  // SEARCH
  // =======================================================

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    // Empty search → immediately restore list.
    if (!query) {
      setFilteredCenters(workCenters);
      setSearching(false);
      return;
    }

    // First filter locally so the UI feels instant.
    const localResults = workCenters.filter(
      (wc) =>
        wc.name.toLowerCase().includes(query) ||
        wc.work_center_code.toLowerCase().includes(query)
    );
    setFilteredCenters(localResults);

    // Debounced server search.
    const timer = setTimeout(async () => {
      if (!accessToken || !companyId || !deviceId) {
        return;
      }

      try {
        setSearching(true);

        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };

        const response = await axiosInstance.get(
          `/companies/${companyId}/attendance/work-centers/search`,
          {
            headers,
            params: {
              name: searchQuery.trim(),
              page: 1,
              page_size: 100,
            },
          }
        );

        const data = response.data?.data || response.data || [];
        setFilteredCenters(data);
      } catch (error) {
        // Keep local results if server search fails.
        setFilteredCenters(localResults);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, workCenters, accessToken, companyId, deviceId]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = (
    code: string,
    name: string
  ) => {
    Alert.alert(
      'Delete Work Center',
      `Are you sure you want to delete "${name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) {
              return;
            }

            try {
              const headers = {
                'X-Company-ID': companyId,
                'X-Device-ID': deviceId,
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              };

              await axiosInstance.delete(
                `/companies/${companyId}/attendance/work-centers/${code}`,
                { headers }
              );

              // Remove immediately for a smoother experience.
              setWorkCenters((prev) =>
                prev.filter((wc) => wc.work_center_code !== code)
              );
              setFilteredCenters((prev) =>
                prev.filter((wc) => wc.work_center_code !== code)
              );
            } catch (error: any) {
              Alert.alert(
                'Delete Failed',
                error?.message || 'Failed to delete work center.'
              );
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // STATISTICS
  // =======================================================

  const activeCount = useMemo(
    () => workCenters.filter((wc) => wc.is_active).length,
    [workCenters]
  );

  const inactiveCount = workCenters.length - activeCount;

  // =======================================================
  // LOADING
  // =======================================================

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.container}
      >
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon name="factory" size={30} color={PRIMARY_COLOR} />
          </View>
          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingTitle}>Loading Work Centers</Text>
          <Text style={styles.loadingSubtitle}>Preparing your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // CARD
  // =======================================================

  const renderItem = ({
    item,
    index,
  }: {
    item: WorkCenter;
    index: number;
  }) => {
    const accentColor = item.is_active ? PRIMARY_COLOR : '#94A3B8';

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() =>
          navigation.navigate('EditWorkCenter', {
            code: item.work_center_code,
          })
        }
        style={styles.card}
      >
        {/* Top accent */}
        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor: accentColor,
            },
          ]}
        />

        {/* Card top */}
        <View style={styles.cardTop}>
          {/* Icon */}
          <View
            style={[
              styles.workCenterIcon,
              {
                backgroundColor: `${accentColor}12`,
              },
            ]}
          >
            <Icon name="factory" size={24} color={accentColor} />
          </View>

          {/* Number */}
          <Text style={styles.cardNumber}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        {/* Information */}
        <View style={styles.cardInfo}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>

          {/* Code */}
          <View style={styles.codeRow}>
            <Icon name="identifier" size={13} color="#94A3B8" />
            <Text numberOfLines={1} style={styles.code}>
              {item.work_center_code}
            </Text>
          </View>

          {/* Description */}
          {!!item.description && (
            <Text numberOfLines={2} style={styles.description}>
              {item.description}
            </Text>
          )}
        </View>

        {/* Bottom row */}
        <View style={styles.cardBottom}>
          {/* Status */}
          <View
            style={[
              styles.statusBadge,
              item.is_active ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.is_active ? SUCCESS_COLOR : ERROR_COLOR,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: item.is_active ? SUCCESS_COLOR : ERROR_COLOR,
                },
              ]}
            >
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('EditWorkCenter', {
                  code: item.work_center_code,
                })
              }
              style={[styles.actionButton, styles.editButton]}
            >
              <Icon name="pencil-outline" size={17} color={PRIMARY_COLOR} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleDelete(item.work_center_code, item.name)}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Icon name="trash-can-outline" size={17} color={ERROR_COLOR} />
            </TouchableOpacity>
          </View>
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
          GRADIENT HEADER
      ================================================= */}

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          {/* Back */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.headerBack}
          >
            <Icon name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Work Centers</Text>
            <Text style={styles.headerSubtitle}>Administration</Text>
          </View>

          {/* Add */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateWorkCenter')}
            style={styles.headerAdd}
          >
            <Icon name="plus" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>{workCenters.length}</Text>
            <Text style={styles.headerStatLabel}>Total</Text>
          </View>

          <View style={styles.headerStatDivider} />

          <View style={styles.headerStat}>
            <Text
              style={[
                styles.headerStatNumber,
                {
                  color: '#86EFAC',
                },
              ]}
            >
              {activeCount}
            </Text>
            <Text style={styles.headerStatLabel}>Active</Text>
          </View>

          <View style={styles.headerStatDivider} />

          <View style={styles.headerStat}>
            <Text
              style={[
                styles.headerStatNumber,
                {
                  color: '#FCA5A5',
                },
              ]}
            >
              {inactiveCount}
            </Text>
            <Text style={styles.headerStatLabel}>Inactive</Text>
          </View>
        </View>
      </LinearGradient>

      {/* =================================================
          SEARCH
      ================================================= */}

      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={21} color="#94A3B8" />
          <Text
            style={styles.searchInput}
            onPress={() => {
              // This is intentionally left empty.
              // Replace with a TextInput if you want keyboard search.
            }}
          >
            {searchQuery || 'Search work centers...'}
          </Text>

          {searching ? (
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          ) : searchQuery ? (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* =================================================
          SECTION
      ================================================= */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>All Work Centers</Text>
          <Text style={styles.sectionSubtitle}>Manage your production work centers</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredCenters.length}</Text>
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
        data={filteredCenters}
        keyExtractor={(item) => item.work_center_code}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: 100 + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchWorkCenters(true)}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon
                name={searchQuery ? 'magnify-close' : 'factory-off'}
                size={31}
                color={PRIMARY_COLOR}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Work Centers Found' : 'No Work Centers Yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? `No work centers match "${searchQuery}".`
                : 'Create your first work center to start managing your production operations.'}
            </Text>

            {searchQuery ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchQuery('')}
                style={styles.emptyButton}
              >
                <Icon name="close" size={17} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('CreateWorkCenter')}
                style={styles.emptyButton}
              >
                <Icon name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Work Center</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* =================================================
          FLOATING ACTION BUTTON
      ================================================= */}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('CreateWorkCenter')}
        style={[
          styles.fab,
          {
            bottom: 20 + insets.bottom,
          },
        ]}
      >
        <LinearGradient
          colors={[GRADIENT_COLORS[1] || PRIMARY_COLOR, PRIMARY_COLOR]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Icon name="plus" size={25} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES (unchanged)
// =========================================================

const styles = StyleSheet.create({
  // =======================================================
  // PAGE
  // =======================================================

  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  listContent: {
    paddingBottom: 100,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,

    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.11,
    shadowRadius: 12,

    elevation: 5,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerBack: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor: 'rgba(255,255,255,0.13)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: '#FFFFFF',

    fontSize: 19,
    fontWeight: '700',

    letterSpacing: -0.2,
  },

  headerSubtitle: {
    marginTop: 2,

    color: 'rgba(255,255,255,0.68)',

    fontSize: 9,
    fontWeight: '500',
  },

  headerAdd: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 11,

    backgroundColor: 'rgba(255,255,255,0.16)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // =======================================================
  // HEADER STATS
  // =======================================================

  headerStats: {
    marginTop: 17,

    paddingVertical: 11,
    paddingHorizontal: 8,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 13,

    backgroundColor: 'rgba(255,255,255,0.10)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  headerStat: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerStatNumber: {
    color: '#FFFFFF',

    fontSize: 17,
    fontWeight: '700',
  },

  headerStatLabel: {
    marginTop: 2,

    color: 'rgba(255,255,255,0.62)',

    fontSize: 8,
    fontWeight: '600',
  },

  headerStatDivider: {
    width: 1,
    height: 27,

    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // =======================================================
  // SEARCH
  // =======================================================

  searchSection: {
    paddingHorizontal: 20,

    paddingTop: 18,
  },

  searchBox: {
    minHeight: 48,

    paddingHorizontal: 13,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 13,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,
    borderColor: BORDER_COLOR,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.025,
    shadowRadius: 5,

    elevation: 1,
  },

  searchInput: {
    flex: 1,

    marginLeft: 9,

    color: TEXT_SECONDARY,

    fontSize: 12,
    fontWeight: '500',
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    marginHorizontal: 20,

    marginTop: 23,
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
    minWidth: 31,
    height: 27,

    paddingHorizontal: 8,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 8,

    backgroundColor: `${PRIMARY_COLOR}10`,

    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}20`,
  },

  countBadgeText: {
    color: PRIMARY_COLOR,

    fontSize: 10,
    fontWeight: '700',
  },

  // =======================================================
  // CARD
  // =======================================================

  card: {
    marginHorizontal: 20,
    marginBottom: 12,

    padding: 16,

    borderRadius: 16,

    backgroundColor: CARD_BACKGROUND,

    borderWidth: 1,
    borderColor: BORDER_COLOR,

    position: 'relative',

    overflow: 'hidden',

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

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',
  },

  workCenterIcon: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,
  },

  cardNumber: {
    color: '#CBD5E1',

    fontSize: 9,
    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // =======================================================
  // CARD INFORMATION
  // =======================================================

  cardInfo: {
    marginTop: 14,

    paddingRight: 5,
  },

  name: {
    color: TEXT_PRIMARY,

    fontSize: 15,
    fontWeight: '700',

    lineHeight: 19,
  },

  codeRow: {
    marginTop: 5,

    flexDirection: 'row',
    alignItems: 'center',
  },

  code: {
    marginLeft: 5,

    color: TEXT_SECONDARY,

    fontSize: 10,
    fontWeight: '600',

    letterSpacing: 0.2,
  },

  description: {
    marginTop: 7,

    color: TEXT_SECONDARY,

    fontSize: 10,

    lineHeight: 15,

    fontWeight: '500',
  },

  // =======================================================
  // CARD BOTTOM
  // =======================================================

  cardBottom: {
    marginTop: 15,

    paddingTop: 12,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',

    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 7,
  },

  activeBadge: {
    backgroundColor: '#ECFDF5',
  },

  inactiveBadge: {
    backgroundColor: '#FEF2F2',
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,
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
    backgroundColor: `${PRIMARY_COLOR}10`,
  },

  deleteButton: {
    backgroundColor: '#FEF2F2',
  },

  // =======================================================
  // FAB
  // =======================================================

  fab: {
    position: 'absolute',

    right: 20,

    width: 58,
    height: 58,

    borderRadius: 19,

    overflow: 'hidden',

    shadowColor: PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.28,
    shadowRadius: 10,

    elevation: 8,
  },

  fabGradient: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyState: {
    marginHorizontal: 20,

    marginTop: 30,

    paddingVertical: 45,
    paddingHorizontal: 25,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 17,

    borderWidth: 1,
    borderStyle: 'dashed',

    borderColor: '#DCE2EA',

    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  emptyIcon: {
    width: 67,
    height: 67,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor: `${PRIMARY_COLOR}12`,
  },

  emptyTitle: {
    marginTop: 17,

    color: TEXT_PRIMARY,

    fontSize: 17,
    fontWeight: '700',

    textAlign: 'center',
  },

  emptyDescription: {
    marginTop: 7,

    maxWidth: 290,

    color: TEXT_SECONDARY,

    fontSize: 11,

    lineHeight: 17,

    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 19,

    paddingHorizontal: 15,
    minHeight: 40,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 10,

    backgroundColor: PRIMARY_COLOR,
  },

  emptyButtonText: {
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

    backgroundColor: `${PRIMARY_COLOR}12`,
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