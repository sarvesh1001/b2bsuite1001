import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, ActivityIndicator } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getCompanyStats,
  searchEvents,
} from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  AttendancePunchEvent,
  AttendanceStats,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { useAttendanceStore } from '../../../store/attendanceSubjectStore';
import { UserAvatar } from '../../../components/UserAvatar';
import PunchSheet from '../../../components/attendance/PunchSheet';
import { formatEventLocalTime } from '../../../utils/attendanceTime';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type AttendanceHomeRouteProp = RouteProp<
  {
    AttendanceHome: { subjectType: AttendanceSubjectType };
  },
  'AttendanceHome'
>;

type NavigationProp = StackNavigationProp<any>;

// ============================================================
// SUBJECT LABELS
// ============================================================

const SUBJECT_META: Record<
  AttendanceSubjectType,
  { label: string; plural: string; icon: string; verb: string }
> = {
  employee: {
    label: 'Employee',
    plural: 'Employees',
    icon: 'account-tie',
    verb: 'at work',
  },
  student: {
    label: 'Student',
    plural: 'Students',
    icon: 'school',
    verb: 'in class',
  },
  customer: {
    label: 'Customer',
    plural: 'Customers',
    icon: 'account-star',
    verb: 'checked in',
  },
};

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EVENT_LABEL: Record<string, string> = {
  check_in: 'Checked in',
  check_out: 'Checked out',
  break_start: 'Break started',
  break_end: 'Break ended',
  shift_start: 'Shift started',
  shift_end: 'Shift ended',
  class_start: 'Class started',
  class_end: 'Class ended',
  session_join: 'Joined session',
  session_leave: 'Left session',
  manual_check_in: 'Manual check-in',
  manual_check_out: 'Manual check-out',
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AttendanceHomeRouteProp>();

  const { subjectType } = route.params as { subjectType: AttendanceSubjectType };
  const meta = SUBJECT_META[subjectType];

  const {
    companyId,
    deviceId,
    accessToken,
    locationId,
    user,
  } = useUserAuthStore();

  const setSubjectContext = useAttendanceStore((s) => s.setSubjectContext);

  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [events, setEvents] = useState<AttendancePunchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [punchOpen, setPunchOpen] = useState(false);

  const today = useMemo(() => ymd(new Date()), []);

  // Sync subject type to store — other screens read from here
  useEffect(() => {
    setSubjectContext(subjectType);
  }, [subjectType, setSubjectContext]);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) {
        setError('Session missing. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [statsRes, eventsRes] = await Promise.all([
          getCompanyStats(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            { start_date: today, end_date: today },
          ),
          searchEvents(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            {
              start_date: today,
              end_date: today,
              subject_type: subjectType,
              page: 1,
              page_size: 50,
            },
          ),
        ]);

        setStats(statsRes?.data ?? null);
        setEvents(eventsRes?.data?.events ?? []);
      } catch (err: any) {
        console.error('AttendanceHome fetch error:', err);
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load attendance data.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, today, subjectType],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ============================================================
  // NAVIGATION
  // ============================================================

  const goSearch = () =>
    navigation.navigate('AttendanceSearch', { subjectType });
  const goCorrections = () =>
    navigation.navigate('AttendanceCorrections', { subjectType });
  const goReports = () =>
    navigation.navigate('AttendanceReports', { subjectType });

  // ============================================================
  // RENDER — EVENT ROW
  // ============================================================

  const renderEvent = ({ item }: { item: AttendancePunchEvent }) => {
    const label = EVENT_LABEL[item.event_type] ?? item.event_type;
    return (
      <TouchableOpacity
        style={styles.eventRow}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AttendanceDay', {
            subjectType,
            subjectId: item.subject_id,
            date: item.event_date_local,
          })
        }
      >
        <UserAvatar
          userId={item.subject_id}
          username={undefined}
          fullName={undefined}
          size={40}
        />
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {item.source_type} · {formatEventLocalTime(item)}
          </Text>
        </View>
        <View style={styles.eventDot} />
      </TouchableOpacity>
    );
  };

  // ============================================================
  // HEADER
  // ============================================================

  const Header = () => (
    <>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={21} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerSmall}>ATTENDANCE</Text>
            <Text style={styles.headerTitle}>{meta.plural}</Text>
          </View>

          <TouchableOpacity
            onPress={() => fetchAll(true)}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Icon name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Icon name={meta.icon} size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroDate}>Today · {today}</Text>
            <Text style={styles.heroSub}>
              Live status of {meta.plural.toLowerCase()} {meta.verb}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Present"
          value={stats?.present_count ?? 0}
          tone="#10B981"
          icon="check-circle-outline"
        />
        <StatCard
          label="Absent"
          value={stats?.absent_count ?? 0}
          tone="#EF4444"
          icon="close-circle-outline"
        />
        <StatCard
          label="Late"
          value={stats?.late_count ?? 0}
          tone="#F59E0B"
          icon="clock-alert-outline"
        />
        <StatCard
          label="Leave"
          value={stats?.leave_count ?? 0}
          tone="#6366F1"
          icon="calendar-remove-outline"
        />
      </View>

      {/* Quick actions */}
      <View style={styles.actionsGrid}>
        <QuickAction
          icon="magnify"
          label="Search Events"
          onPress={goSearch}
        />
        <QuickAction
          icon="file-document-edit-outline"
          label="Corrections"
          onPress={goCorrections}
        />
        <QuickAction
          icon="download"
          label="Reports"
          onPress={goReports}
        />
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Activity</Text>
        <Text style={styles.sectionSub}>
          {events.length} event{events.length === 1 ? '' : 's'} today
        </Text>
      </View>
    </>
  );

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {loading && !refreshing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.stateText}>Loading attendance…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Icon name="alert-circle-outline" size={30} color="#EF4444" />
          </View>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAll()}
            activeOpacity={0.85}
          >
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.attendance_event_id}
          renderItem={renderEvent}
          ListHeaderComponent={<Header />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={PRIMARY_COLOR}
              colors={[PRIMARY_COLOR]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="calendar-blank-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No events yet today</Text>
              <Text style={styles.emptySub}>
                Punches will appear here as {meta.plural.toLowerCase()} check in.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.punchFab}
        activeOpacity={0.9}
        onPress={() => setPunchOpen(true)}
      >
        <Icon name="gesture-tap-button" size={20} color="#FFFFFF" />
        <Text style={styles.punchFabText}>Punch</Text>
      </TouchableOpacity>

      <PunchSheet
        visible={punchOpen}
        subjectType={subjectType}
        onClose={() => setPunchOpen(false)}
        onSuccess={() => fetchAll(true)}
      />
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

const StatCard = ({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: string;
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${tone}15` }]}>
      <Icon name={icon} size={16} color={tone} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.actionCard}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={styles.actionIcon}>
      <Icon name={icon} size={20} color={PRIMARY_COLOR} />
    </View>
    <Text style={styles.actionLabel} numberOfLines={2}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  listContent: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  headerTitleWrap: { flex: 1, marginLeft: 12 },

  headerSmall: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },

  heroRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 14,
  },

  heroDate: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 8,
  },

  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },

  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  statValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },

  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },

  actionCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },

  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}14`,
    marginBottom: 8,
  },

  actionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },

  sectionSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '500',
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  eventBody: {
    flex: 1,
    marginLeft: 12,
  },

  eventTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },

  eventMeta: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_COLOR,
    marginLeft: 72,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginBottom: 14,
  },

  stateTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  stateText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },

  retryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },

  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },

  emptySub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  punchFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 32,
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  punchFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});