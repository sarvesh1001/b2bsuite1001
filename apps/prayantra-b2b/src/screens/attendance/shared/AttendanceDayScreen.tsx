import React, { useCallback, useEffect, useState } from 'react';
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
  searchEvents,
} from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  AttendanceDailySummary,
  AttendancePunchEvent,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  formatEventClock,
  formatInstantWithOffset,
} from '../../../utils/attendanceTime';

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

type DayRouteProp = RouteProp<
  {
    AttendanceDay: {
      subjectType: AttendanceSubjectType;
      subjectId: string;
      date: string;
      subjectName?: string;
    };
  },
  'AttendanceDay'
>;

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_META: Record<
  string,
  { label: string; tone: string; icon: string }
> = {
  present:       { label: 'Present',      tone: '#10B981', icon: 'check-circle-outline' },
  absent:        { label: 'Absent',       tone: '#EF4444', icon: 'close-circle-outline' },
  late:          { label: 'Late',         tone: '#F59E0B', icon: 'clock-alert-outline' },
  half_day:      { label: 'Half Day',     tone: '#F97316', icon: 'circle-half-full' },
  leave:         { label: 'On Leave',     tone: '#6366F1', icon: 'calendar-remove-outline' },
  leave_unpaid:  { label: 'Unpaid Leave', tone: '#8B5CF6', icon: 'calendar-remove-outline' },
  holiday:       { label: 'Holiday',      tone: '#EC4899', icon: 'party-popper' },
  weekly_off:    { label: 'Weekly Off',   tone: '#94A3B8', icon: 'calendar-week-end' },
  not_scheduled: { label: 'Not Scheduled', tone: '#94A3B8', icon: 'calendar-blank-outline' },
  excused:       { label: 'Excused',      tone: '#0EA5E9', icon: 'shield-check-outline' },
};

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
  attendance_adjustment: 'Adjustment',
  manual_override: 'Manual override',
};

// ============================================================
// HELPERS
// ============================================================

function fmtDateLong(ymd: string): string {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function fmtMinutes(mins: number | null | undefined): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DayRouteProp>();
  const { subjectType, subjectId, date, subjectName } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [summary, setSummary] = useState<AttendanceDailySummary | null>(null);
  const [events, setEvents] = useState<AttendancePunchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const [sumRes, evRes] = await Promise.allSettled([
          getDailySummary(
            companyId,
            subjectType,
            subjectId,
            date,
            deviceId,
            accessToken,
            locationId ?? undefined,
          ),
          searchEvents(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            {
              start_date: date,
              end_date: date,
              subject_type: subjectType,
              subject_id: subjectId,
              page: 1,
              page_size: 200,
            },
          ),
        ]);

        if (sumRes.status === 'fulfilled') {
          setSummary(sumRes.value?.data ?? null);
          setSummaryError(null);
        } else {
          setSummary(null);
          setSummaryError('Not yet resolved for this date');
        }

        if (evRes.status === 'fulfilled') {
          setEvents((evRes.value as any)?.data?.events ?? []);
        } else {
          setEvents([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, subjectType, subjectId, date],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const status = summary?.status ?? null;
  const meta = status ? STATUS_META[status] : null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Day Detail</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subjectName || subjectId}
          </Text>
        </View>
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
          <Text style={styles.loadingText}>Loading day…</Text>
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
          {/* Date label */}
          <Text style={styles.dateLine}>{fmtDateLong(date)}</Text>

          {/* Status hero */}
          <View
            style={[
              styles.statusHero,
              { borderColor: meta?.tone ? `${meta.tone}40` : BORDER_COLOR },
            ]}
          >
            <View
              style={[
                styles.statusIconWrap,
                { backgroundColor: meta?.tone ? `${meta.tone}15` : '#F1F5F9' },
              ]}
            >
              <Icon
                name={meta?.icon ?? 'calendar-help-outline'}
                size={26}
                color={meta?.tone ?? '#94A3B8'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>
                {meta?.label ?? (summaryError ? 'Not Resolved' : '—')}
              </Text>
              <Text style={styles.statusSub}>
                {summary?.is_payroll_locked
                  ? 'Locked by payroll'
                  : summary?.is_finalized
                  ? 'Finalized'
                  : summary
                  ? 'Provisional'
                  : summaryError ?? 'No summary'}
              </Text>
            </View>
            {summary?.is_payable ? (
              <View style={styles.payablePill}>
                <Icon name="cash-check" size={12} color="#065F46" />
                <Text style={styles.payableText}>PAYABLE</Text>
              </View>
            ) : null}
          </View>

          {/* Metric grid */}
          {summary ? (
            <View style={styles.metricsGrid}>
              <Metric
                icon="timer-sand"
                label="Worked"
                value={fmtMinutes(summary.worked_minutes)}
                tone="#10B981"
              />
              <Metric
                icon="clock-outline"
                label="Expected"
                value={fmtMinutes(summary.expected_minutes)}
                tone="#3B82F6"
              />
              <Metric
                icon="clock-plus-outline"
                label="Overtime"
                value={fmtMinutes(summary.overtime_minutes)}
                tone="#8B5CF6"
              />
              <Metric
                icon="clock-alert-outline"
                label="Late"
                value={fmtMinutes(summary.late_minutes)}
                tone="#F59E0B"
              />
            </View>
          ) : null}

          {/* Paired events (if any) */}
          {(summary?.metadata?.paired_events?.length ?? 0) > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Sessions ({summary!.metadata.paired_events!.length})
              </Text>
              {summary!.metadata.paired_events!.map((p, idx) => (
                <View key={idx} style={styles.sessionCard}>
                  <View style={styles.sessionDotIn}>
                    <Icon name="login" size={12} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionLabel}>
                      Check in ·{' '}
                      {formatInstantWithOffset(
                        p.check_in_time,
                        summary?.offset_minutes,
                      )}
                    </Text>
                  </View>
                  <View style={styles.sessionDivider} />
                  <View style={styles.sessionDotOut}>
                    <Icon name="logout" size={12} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionLabel}>
                      Check out ·{' '}
                      {formatInstantWithOffset(
                        p.check_out_time,
                        summary?.offset_minutes,
                      )}
                    </Text>
                  </View>
                  {p.worked_minutes != null ? (
                    <View style={styles.sessionChip}>
                      <Text style={styles.sessionChipText}>
                        {fmtMinutes(p.worked_minutes)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {/* Anomalies */}
          {(summary?.metadata?.anomalies?.length ?? 0) > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Anomalies</Text>
              <View style={styles.anomalyWrap}>
                {summary!.metadata.anomalies!.map((a, i) => (
                  <View key={i} style={styles.anomalyChip}>
                    <Icon
                      name="alert-outline"
                      size={11}
                      color="#92400E"
                    />
                    <Text style={styles.anomalyText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Raw events */}
          <Text style={styles.sectionTitle}>
            Events ({events.length})
          </Text>
          {events.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="calendar-blank-outline" size={26} color="#94A3B8" />
              <Text style={styles.emptyText}>No events on this day</Text>
            </View>
          ) : (
            events.map((e) => {
              const tone =
                e.event_type.includes('out') || e.event_type.includes('end')
                  ? '#EF4444'
                  : e.event_type.includes('break')
                  ? '#F59E0B'
                  : '#10B981';
              return (
                <View key={e.attendance_event_id} style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventMarker,
                      { backgroundColor: `${tone}20` },
                    ]}
                  >
                    <View
                      style={[styles.eventDot, { backgroundColor: tone }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventLabel}>
                      {EVENT_LABEL[e.event_type] ?? e.event_type}
                    </Text>
                    <Text style={styles.eventSub} numberOfLines={1}>
                      {e.source_type} · {formatEventClock(e)}
                      {e.context?.work_center_code
                        ? ` · ${e.context.work_center_code}`
                        : ''}
                    </Text>
                  </View>
                  {e.metadata?.is_correction ? (
                    <View style={styles.correctionPill}>
                      <Text style={styles.correctionPillText}>CORR</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENT
// ============================================================

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={14} color={tone} />
      </View>
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
  title: { color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  subtitle: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },

  scroll: { padding: 20, paddingBottom: 60 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },

  dateLine: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 14,
  },

  statusHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  statusSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
  },
  payablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  payableText: {
    color: '#065F46',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 10,
  },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '800',
  },
  metricLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
  },
  sessionDotIn: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
  },
  sessionDotOut: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  sessionDivider: {
    width: 1,
    height: 16,
    backgroundColor: BORDER_COLOR,
    marginHorizontal: 4,
  },
  sessionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  sessionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sessionChipText: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '700',
  },

  anomalyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  anomalyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  anomalyText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '600',
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  eventMarker: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  eventSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  correctionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  correctionPillText: {
    color: '#991B1B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
  },
});