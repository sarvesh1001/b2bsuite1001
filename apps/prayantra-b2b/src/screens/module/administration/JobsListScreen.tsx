// apps/prayantra-b2b/src/screens/module/administration/JobsListScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listJobs,
  deactivateJob,
  reactivateJob,
  deleteJob,
  getJobPositionCount,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../constants/colors';
import type { Job } from '@b2b/shared-types';

type Nav = StackNavigationProp<RootStackParamList, 'JobsList'>;

export default function JobsListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // =======================================================
  // FETCH
  // =======================================================
  const fetchJobs = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) {
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await listJobs(companyId, deviceId, accessToken, {
          active_only: !showInactive,
        });
        setJobs(res.data?.jobs ?? []);
      } catch (err: any) {
        console.error('Failed to load jobs:', err);
        Alert.alert(
          'Unable to load',
          err?.response?.data?.message ||
            err?.message ||
            'Failed to load jobs. Please try again.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, showInactive],
  );

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      return undefined;
    }, [fetchJobs]),
  );

  // =======================================================
  // SEARCH
  // =======================================================
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.job_title.toLowerCase().includes(q) ||
        j.job_code.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  // =======================================================
  // ROW ACTIONS
  // =======================================================
  const handleDeactivate = (job: Job) => {
    Alert.alert(
      'Deactivate job',
      `"${job.job_title}" will be hidden from new positions. Existing seats keep working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyId(job.job_id);
              await deactivateJob(
                companyId!,
                deviceId!,
                accessToken!,
                job.job_id,
              );
              await fetchJobs(true);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Failed to deactivate job',
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleReactivate = async (job: Job) => {
    try {
      setBusyId(job.job_id);
      await reactivateJob(companyId!, deviceId!, accessToken!, job.job_id);
      await fetchJobs(true);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Failed to reactivate job',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job: Job) => {
    try {
      setBusyId(job.job_id);
      const res = await getJobPositionCount(
        companyId!,
        deviceId!,
        accessToken!,
        job.job_id,
      );
      const count = res.data?.position_count ?? 0;

      if (count > 0) {
        Alert.alert(
          'Cannot delete',
          `This job is used by ${count} position${
            count === 1 ? '' : 's'
          }. Deactivate it instead.`,
          [
            {
              text: 'Deactivate',
              onPress: () => handleDeactivate(job),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }

      Alert.alert(
        'Delete job',
        `Permanently delete "${job.job_title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteJob(
                  companyId!,
                  deviceId!,
                  accessToken!,
                  job.job_id,
                );
                await fetchJobs(true);
              } catch (e: any) {
                Alert.alert(
                  'Error',
                  e?.response?.data?.message || 'Failed to delete job',
                );
              } finally {
                setBusyId(null);
              }
            },
          },
        ],
      );
    } catch (e: any) {
      setBusyId(null);
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Failed to check job usage',
      );
    }
  };

  // =======================================================
  // RENDER ROW
  // =======================================================
  const renderItem = ({ item, index }: { item: Job; index: number }) => {
    const isBusy = busyId === item.job_id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={isBusy}
        style={styles.card}
        onPress={() =>
          navigation.navigate('EditJob', { jobId: item.job_id })
        }
      >
        <View style={styles.cardAccent} />

        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(2, '0')}
        </Text>

        <View style={styles.cardTopRow}>
          <View style={styles.cardIcon}>
            <Icon name="briefcase-outline" size={24} color={PRIMARY_COLOR} />
          </View>

          <View style={styles.cardInfo}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.job_title}
            </Text>

            <View style={styles.cardCodeRow}>
              <Icon
                name="pound"
                size={11}
                color={TEXT_SECONDARY}
              />
              <Text numberOfLines={1} style={styles.cardCode}>
                {item.job_code}
              </Text>

              {!item.is_active && (
                <View style={styles.inactivePill}>
                  <Text style={styles.inactivePillText}>INACTIVE</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() =>
                navigation.navigate('EditJob', { jobId: item.job_id })
              }
              activeOpacity={0.75}
            >
              <Icon name="pencil-outline" size={18} color={PRIMARY_COLOR} />
            </TouchableOpacity>

            {item.is_active ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.warnButton]}
                onPress={() => handleDeactivate(item)}
                disabled={isBusy}
                activeOpacity={0.75}
              >
                {isBusy ? (
                  <ActivityIndicator size={14} color="#B45309" />
                ) : (
                  <Icon name="eye-off-outline" size={18} color="#B45309" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.successButton]}
                onPress={() => handleReactivate(item)}
                disabled={isBusy}
                activeOpacity={0.75}
              >
                {isBusy ? (
                  <ActivityIndicator size={14} color="#047857" />
                ) : (
                  <Icon name="eye-outline" size={18} color="#047857" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item)}
              disabled={isBusy}
              activeOpacity={0.75}
            >
              <Icon name="delete-outline" size={18} color={ERROR_COLOR} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Flags summary */}
        <View style={styles.flagsRow}>
          <Flag
            icon="calendar-check-outline"
            label="Schedulable"
            active={item.is_schedulable}
          />
          <Flag
            icon="clock-check-outline"
            label="Attendance"
            active={item.attendance_required}
          />
          <Flag
            icon="clock-plus-outline"
            label="Overtime"
            active={item.overtime_allowed}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // =======================================================
  // EMPTY
  // =======================================================
  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon
          name={search ? 'magnify-close' : 'briefcase-off-outline'}
          size={30}
          color={PRIMARY_COLOR}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {search ? 'No jobs found' : 'No jobs yet'}
      </Text>

      <Text style={styles.emptyDescription}>
        {search
          ? `Nothing matches "${search}".`
          : 'A job is a role definition — "Cashier", "Line Operator". Positions are built from jobs.'}
      </Text>

      {!search && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('CreateJob')}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={17} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Create Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // =======================================================
  // LOADING
  // =======================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon name="briefcase-outline" size={28} color={PRIMARY_COLOR} />
          </View>
          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{ marginTop: 20 }}
          />
          <Text style={styles.loadingTitle}>Loading jobs</Text>
          <Text style={styles.loadingSubtitle}>Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.job_id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}
              >
                <Icon name="arrow-left" size={21} color={TEXT_PRIMARY} />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                <Text style={styles.eyebrow}>HR</Text>
                <Text style={styles.headerTitle}>Jobs</Text>
                <Text style={styles.headerSubtitle}>
                  Role catalog used to build positions
                </Text>
              </View>

              <TouchableOpacity
                style={styles.headerAddButton}
                onPress={() => navigation.navigate('CreateJob')}
                activeOpacity={0.85}
              >
                <Icon name="plus" size={21} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: `${PRIMARY_COLOR}12` },
                  ]}
                >
                  <Icon
                    name="briefcase-outline"
                    size={18}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View>
                  <Text style={styles.summaryNumber}>{jobs.length}</Text>
                  <Text style={styles.summaryLabel}>Total Jobs</Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}
                >
                  <Icon
                    name="check-circle-outline"
                    size={18}
                    color={SUCCESS_COLOR}
                  />
                </View>
                <View>
                  <Text style={styles.summaryNumber}>
                    {jobs.filter((j) => j.is_active).length}
                  </Text>
                  <Text style={styles.summaryLabel}>Active</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#94A3B8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by title or code..."
                placeholderTextColor="#A0AAB8"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShowInactive((s) => !s)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  showInactive && styles.checkboxOn,
                ]}
              >
                {showInactive && (
                  <Icon name="check" size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.toggleLabel}>Show inactive jobs</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>All Jobs</Text>
                <Text style={styles.sectionSubtitle}>
                  {search
                    ? `${filtered.length} result${
                        filtered.length === 1 ? '' : 's'
                      } found`
                    : 'Tap a job to edit it'}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filtered.length}</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={<EmptyComponent />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchJobs(true)}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 18 + insets.bottom }]}
        onPress={() => navigation.navigate('CreateJob')}
        activeOpacity={0.88}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>New Job</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// =========================================================
// Flag chip
// =========================================================
function Flag({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <View
      style={[
        styles.flag,
        active ? styles.flagActive : styles.flagInactive,
      ]}
    >
      <Icon
        name={icon}
        size={11}
        color={active ? PRIMARY_COLOR : '#94A3B8'}
      />
      <Text
        style={[
          styles.flagText,
          active ? styles.flagTextActive : styles.flagTextInactive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// =========================================================
// Styles
// =========================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
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
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
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
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },

  // Summary
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
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
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

  // Search
  searchContainer: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
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

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxOn: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  toggleLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },

  // Section
  sectionHeader: {
    marginTop: 20,
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
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  countBadgeText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: '700',
  },

  // Card
  card: {
    position: 'relative',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
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
    backgroundColor: PRIMARY_COLOR,
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
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  cardInfo: { flex: 1, marginLeft: 12, paddingRight: 7 },
  cardTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  cardCode: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inactivePill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  inactivePillText: {
    color: '#B45309',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Actions
  actions: { flexDirection: 'row', gap: 6 },
  actionButton: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  editButton: { backgroundColor: `${PRIMARY_COLOR}10` },
  warnButton: { backgroundColor: '#FEF3C7' },
  successButton: { backgroundColor: '#D1FAE5' },
  deleteButton: { backgroundColor: '#FEF2F2' },

  // Flags
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  flagActive: {
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  flagInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  flagText: { fontSize: 9, fontWeight: '600' },
  flagTextActive: { color: PRIMARY_COLOR },
  flagTextInactive: { color: '#94A3B8' },

  // Empty
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
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  emptyIcon: {
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: `${PRIMARY_COLOR}12`,
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
    backgroundColor: PRIMARY_COLOR,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // FAB
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
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  fabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Loading
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
    backgroundColor: `${PRIMARY_COLOR}12`,
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