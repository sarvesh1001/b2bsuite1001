import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getDailySummary,
  listSubjectSummaries,
  searchEvents,
} from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  AttendanceDailySummary,
  AttendancePunchEvent,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { useUserDisplayName } from '../../../hooks/useUserDisplayName';
import PunchSheet from '../../../components/attendance/PunchSheet';
import { formatEventLocalTime } from '../../../utils/attendanceTime';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type MemberRouteProp = RouteProp<
  {
    TeamMemberAttendance: {
      subjectType: AttendanceSubjectType;
      subjectId: string;
      subjectName?: string;
    };
  },
  'TeamMemberAttendance'
>;

const STATUS_TONE: Record<string, string> = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
  half_day: '#F97316',
  leave: '#6366F1',
  leave_unpaid: '#8B5CF6',
  holiday: '#EC4899',
  weekly_off: '#94A3B8',
  not_scheduled: '#94A3B8',
  excused: '#0EA5E9',
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

function fmtMinutes(mins: number | null | undefined): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dayInitial(ymdStr: string): string {
  try {
    const [y, m, d] = ymdStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2);
  } catch {
    return '--';
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function TeamMemberAttendanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<MemberRouteProp>();
  const { subjectType, subjectId, subjectName } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();
  const { data: nameData } = useUserDisplayName(subjectId);
  const resolvedName = nameData?.full_name ?? nameData?.username ?? null;
  const finalName: string = subjectName || resolvedName || subjectId;
  const today = useMemo(() => ymd(new Date()), []);

  const [todaySummary, setTodaySummary] =
    useState<AttendanceDailySummary | null>(null);
  const [weekSummaries, setWeekSummaries] = useState<AttendanceDailySummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<AttendancePunchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchOpen, setPunchOpen] = useState(false);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const start = daysAgo(6);

        const [todayRes, weekRes, eventsRes] = await Promise.allSettled([
          getDailySummary(
            companyId,
            subjectType,
            subjectId,
            today,
            deviceId,
            accessToken,
            locationId ?? undefined,
          ),
          listSubjectSummaries(
            companyId,
            subjectType,
            subjectId,
            deviceId,
            accessToken,
            { start_date: start, end_date: today },
            locationId ?? undefined,
          ),
          searchEvents(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            {
              start_date: start,
              end_date: today,
              subject_type: subjectType,
              subject_id: subjectId,
              page: 1,
              page_size: 100,
            },
          ),
        ]);

        setTodaySummary(
          todayRes.status === 'fulfilled'
            ? todayRes.value?.data ?? null
            : null,
        );

        setWeekSummaries(
          weekRes.status === 'fulfilled'
            ? ((weekRes.value as any)?.data?.summaries ?? [])
            : [],
        );

        setRecentEvents(
          eventsRes.status === 'fulfilled'
            ? ((eventsRes.value as any)?.data?.events ?? [])
            : [],
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, subjectType, subjectId, today],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const goDay = (date: string) => {
    navigation.navigate('AttendanceDay', {
      subjectType,
      subjectId,
      date,
      subjectName: finalName,
    });
  };

  const todayTone = todaySummary
    ? STATUS_TONE[todaySummary.status] ?? '#94A3B8'
    : '#94A3B8';

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Member Detail</Text>
        <TouchableOpacity
          style={styles.back}
          onPress={() => fetchAll(true)}
          activeOpacity={0.8}
        >
          <Icon name="refresh" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading member…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
        >
          <View style={styles.identity}>
            <UserAvatar
              userId={subjectId}
              username={undefined}
              fullName={finalName}
              size={64}
            />
            <Text style={styles.identityName} numberOfLines={1}>
              {finalName}
            </Text>
            <Text style={styles.identitySub}>
              {subjectType} · {subjectId.slice(0, 8)}…
            </Text>

            <TouchableOpacity
              style={styles.punchBtn}
              activeOpacity={0.9}
              onPress={() => setPunchOpen(true)}
            >
              <Icon name="gesture-tap-button" size={18} color="#FFFFFF" />
              <Text style={styles.punchBtnText}>Punch for {subjectType}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Today</Text>
          {todaySummary ? (
            <TouchableOpacity
              style={[styles.todayCard, { borderColor: `${todayTone}40` }]}
              activeOpacity={0.85}
              onPress={() => goDay(today)}
            >
              <View
                style={[
                  styles.todayTone,
                  { backgroundColor: `${todayTone}18` },
                ]}
              >
                <Text style={[styles.todayToneText, { color: todayTone }]}>
                  {todaySummary.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.todayMetrics}>
                <Metric label="Worked" value={fmtMinutes(todaySummary.worked_minutes)} />
                <Metric label="Expected" value={fmtMinutes(todaySummary.expected_minutes)} />
                <Metric label="Overtime" value={fmtMinutes(todaySummary.overtime_minutes)} />
                <Metric label="Late" value={fmtMinutes(todaySummary.late_minutes)} />
              </View>
              <View style={styles.todayFooter}>
                <Text style={styles.todayFooterText}>View full day</Text>
                <Icon name="chevron-right" size={16} color={TEXT_SECONDARY} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="calendar-blank-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyCardText}>
                No summary yet for today
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Last 7 days</Text>
          <View style={styles.weekStrip}>
            {Array.from({ length: 7 }).map((_, idx) => {
              const day = daysAgo(6 - idx);
              const summary = weekSummaries.find(
                (s) => s.attendance_date.slice(0, 10) === day,
              );
              const tone = summary
                ? STATUS_TONE[summary.status] ?? '#94A3B8'
                : '#E2E8F0';
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dayCell}
                  activeOpacity={0.85}
                  onPress={() => goDay(day)}
                >
                  <Text style={styles.dayCellLabel}>{dayInitial(day)}</Text>
                  <View
                    style={[
                      styles.dayCellDot,
                      { backgroundColor: tone },
                    ]}
                  />
                  <Text style={styles.dayCellDate}>
                    {day.slice(8, 10)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>
            Recent events ({recentEvents.length})
          </Text>
          {recentEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="timeline-clock-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyCardText}>No recent events</Text>
            </View>
          ) : (
            recentEvents.slice(0, 30).map((e) => (
              <View key={e.attendance_event_id} style={styles.eventRow}>
                <View style={styles.eventIcon}>
                  <Icon
                    name={
                      e.event_type.includes('in') ||
                      e.event_type.includes('start') ||
                      e.event_type.includes('join')
                        ? 'login'
                        : e.event_type.includes('out') ||
                          e.event_type.includes('end') ||
                          e.event_type.includes('leave')
                        ? 'logout'
                        : 'coffee-outline'
                    }
                    size={14}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventLabel}>
                    {e.event_type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.eventSub} numberOfLines={1}>
                    {formatEventLocalTime(e)} · {e.source_type}
                  </Text>
                </View>
                {e.metadata?.is_correction ? (
                  <View style={styles.corrPill}>
                    <Text style={styles.corrPillText}>CORR</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <PunchSheet
        visible={punchOpen}
        subjectType={subjectType}
        target={{
          user_id: subjectId,
          full_name: finalName,
        }}
        onClose={() => setPunchOpen(false)}
        onSuccess={() => fetchAll(true)}
      />
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENT
// ============================================================

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  title: { flex: 1, color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },

  scroll: { padding: 20, paddingBottom: 60 },

  identity: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  identityName: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  identitySub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },

  todayCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
  },
  todayTone: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayToneText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  todayMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  metricCell: {
    width: '48%',
  },
  metricValue: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  metricLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  todayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  todayFooterText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyCardText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
  },

  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayCellLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dayCellDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  dayCellDate: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '700',
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  eventLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  corrPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  corrPillText: {
    color: '#991B1B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

