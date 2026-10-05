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

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getSubjectStats } from '@b2b/api-client';

import type { UserAttendanceStats } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';

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

type PresetKey =
  | 'this_week'
  | 'this_month'
  | 'last_30d'
  | 'last_90d'
  | 'this_year';

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPreset(key: PresetKey): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case 'this_week': {
      const start = new Date(end);
      // Sunday as week start
      start.setDate(end.getDate() - end.getDay());
      return { start: ymd(start), end: ymd(end) };
    }
    case 'this_month': {
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start: ymd(start), end: ymd(end) };
    }
    case 'last_30d': {
      const start = new Date(end);
      start.setDate(end.getDate() - 29);
      return { start: ymd(start), end: ymd(end) };
    }
    case 'last_90d': {
      const start = new Date(end);
      start.setDate(end.getDate() - 89);
      return { start: ymd(start), end: ymd(end) };
    }
    case 'this_year': {
      const start = new Date(end.getFullYear(), 0, 1);
      return { start: ymd(start), end: ymd(end) };
    }
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_30d', label: 'Last 30 days' },
  { key: 'last_90d', label: 'Last 90 days' },
  { key: 'this_year', label: 'This year' },
];

function fmtHours(h: number | null | undefined): string {
  if (h == null) return '—';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

// ============================================================
// SCREEN
// ============================================================

export default function MyStatsScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId, user } =
    useUserAuthStore();

  const userId = user?.user_id ?? null;

  const [preset, setPreset] = useState<PresetKey>('this_month');
  const range = useMemo(() => rangeForPreset(preset), [preset]);

  const [stats, setStats] = useState<UserAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken || !userId) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await getSubjectStats(
          companyId,
          'employee',
          userId,
          deviceId,
          accessToken,
          { start_date: range.start, end_date: range.end },
          locationId ?? undefined,
        );

        setStats(res?.data ?? null);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load stats.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      companyId,
      deviceId,
      accessToken,
      locationId,
      userId,
      range.start,
      range.end,
    ],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const attendancePct = Math.max(
    0,
    Math.min(100, Math.round(stats?.attendance_percent ?? 0)),
  );

  const totalDays =
    (stats?.present_days ?? 0) +
    (stats?.absent_days ?? 0) +
    (stats?.late_days ?? 0) +
    (stats?.half_days ?? 0) +
    (stats?.leave_days ?? 0);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {PRESETS.map((p) => {
            const active = preset === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPreset(p.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.rangeText}>
          {range.start} → {range.end}
        </Text>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading your stats…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Icon name="alert-circle-outline" size={32} color="#EF4444" />
            <Text style={styles.errTitle}>Couldn't load</Text>
            <Text style={styles.errMsg}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchStats()}
            >
              <Text style={styles.retryTxt}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !stats || totalDays === 0 ? (
          <View style={styles.center}>
            <Icon name="chart-timeline-variant" size={32} color="#94A3B8" />
            <Text style={styles.errTitle}>No stats yet</Text>
            <Text style={styles.errMsg}>
              Stats appear once your daily attendance starts resolving.
            </Text>
          </View>
        ) : (
          <>
            {/* Big attendance % */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>ATTENDANCE</Text>
                <View
                  style={[
                    styles.heroPill,
                    {
                      backgroundColor:
                        attendancePct >= 90
                          ? '#D1FAE5'
                          : attendancePct >= 75
                          ? '#FEF3C7'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroPillText,
                      {
                        color:
                          attendancePct >= 90
                            ? '#065F46'
                            : attendancePct >= 75
                            ? '#92400E'
                            : '#991B1B',
                      },
                    ]}
                  >
                    {attendancePct >= 90
                      ? 'GREAT'
                      : attendancePct >= 75
                      ? 'FAIR'
                      : 'LOW'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroValueRow}>
                <Text style={styles.heroValue}>{attendancePct}</Text>
                <Text style={styles.heroUnit}>%</Text>
              </View>

              <View style={styles.heroBar}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${attendancePct}%`,
                      backgroundColor:
                        attendancePct >= 90
                          ? '#10B981'
                          : attendancePct >= 75
                          ? '#F59E0B'
                          : '#EF4444',
                    },
                  ]}
                />
              </View>

              <Text style={styles.heroSub}>
                Across {totalDays} day{totalDays === 1 ? '' : 's'}
              </Text>
            </View>

            {/* Day breakdown */}
            <Text style={styles.sectionTitle}>Day breakdown</Text>
            <View style={styles.grid}>
              <StatCard
                icon="check-circle-outline"
                label="Present"
                value={stats.present_days}
                tone="#10B981"
              />
              <StatCard
                icon="close-circle-outline"
                label="Absent"
                value={stats.absent_days}
                tone="#EF4444"
              />
              <StatCard
                icon="clock-alert-outline"
                label="Late"
                value={stats.late_days}
                tone="#F59E0B"
              />
              <StatCard
                icon="circle-half-full"
                label="Half day"
                value={stats.half_days}
                tone="#F97316"
              />
              <StatCard
                icon="calendar-remove-outline"
                label="Leave"
                value={stats.leave_days}
                tone="#6366F1"
              />
            </View>

            {/* Hours */}
            <Text style={styles.sectionTitle}>Hours</Text>
            <View style={styles.grid}>
              <WideCard
                icon="timer-sand"
                label="Worked"
                value={fmtHours(stats.total_worked_hours)}
                tone="#10B981"
              />
              <WideCard
                icon="clock-plus-outline"
                label="Overtime"
                value={fmtHours(stats.total_overtime_hours)}
                tone="#8B5CF6"
              />
            </View>

            {/* Average times */}
            {stats.average_in_time || stats.average_out_time ? (
              <>
                <Text style={styles.sectionTitle}>Average times</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeCard}>
                    <Icon name="login" size={18} color="#10B981" />
                    <Text style={styles.timeLabel}>IN</Text>
                    <Text style={styles.timeValue}>
                      {stats.average_in_time || '—'}
                    </Text>
                  </View>
                  <View style={styles.timeCard}>
                    <Icon name="logout" size={18} color="#EF4444" />
                    <Text style={styles.timeLabel}>OUT</Text>
                    <Text style={styles.timeValue}>
                      {stats.average_out_time || '—'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {/* CTA */}
            <TouchableOpacity
              style={styles.ctaBtn}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('AttendanceSearch')}
            >
              <Icon name="calendar-search" size={18} color="#FFFFFF" />
              <Text style={styles.ctaText}>Browse my events</Text>
              <Icon name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WideCard({
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
    <View style={styles.wideCard}>
      <View style={[styles.wideIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={18} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.wideLabel}>{label}</Text>
        <Text style={styles.wideValue}>{value}</Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  chipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: { color: '#FFFFFF' },

  rangeText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 10,
    fontFamily: 'Courier',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },
  errTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  errMsg: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  retryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  heroCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  heroValue: {
    color: TEXT_PRIMARY,
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  heroUnit: {
    color: TEXT_SECONDARY,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },

  heroBar: {
    marginTop: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  heroSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 10,
    fontWeight: '500',
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '31%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  wideCard: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  wideIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  wideValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },

  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  timeLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timeValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Courier',
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
});