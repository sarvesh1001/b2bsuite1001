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

import { getScheduleStats } from '@b2b/api-client';

import type {
  ScheduleStats,
  ScheduleInstanceSummary,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { UserAvatar } from '../../../../components/UserAvatar';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TEMPLATE_TONE: Record<string, string> = {
  office: '#3B82F6',
  shift: '#F59E0B',
  class: '#8B5CF6',
};

const DATE_PRESETS = [
  { key: '7d', label: 'Next 7 days', days: 7 },
  { key: '30d', label: 'Next 30 days', days: 30 },
  { key: '90d', label: 'Next 90 days', days: 90 },
] as const;

// ============================================================
// SCREEN
// ============================================================

export default function ScheduleStatsScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('30d');
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    const days = Number(preset.replace('d', ''));
    end.setDate(today.getDate() + days);
    return { start: ymd(today), end: ymd(end) };
  }, [preset]);

  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await getScheduleStats(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          { start_date: range.start, end_date: range.end },
        );
        setStats(res?.data ?? null);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Unable to load stats.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, range.start, range.end],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Sort breakdowns by value desc
  const sortedTemplateTypes = useMemo(() => {
    if (!stats?.by_template_type) return [];
    return Object.entries(stats.by_template_type)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats]);

  const sortedWorkCenters = useMemo(() => {
    if (!stats?.by_work_center) return [];
    return Object.entries(stats.by_work_center)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats]);

  const upcomingDays = useMemo(() => {
    if (!stats?.by_date) return [];
    return Object.entries(stats.by_date)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 10);
  }, [stats]);

  const maxTemplateValue = Math.max(
    1,
    ...sortedTemplateTypes.map(([, v]) => v),
  );
  const maxWorkCenterValue = Math.max(
    1,
    ...sortedWorkCenters.map(([, v]) => v),
  );
  const maxDateValue = Math.max(1, ...upcomingDays.map(([, v]) => v));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
          {DATE_PRESETS.map((p) => {
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

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading stats…</Text>
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
        ) : !stats ? (
          <View style={styles.center}>
            <Icon name="chart-timeline-variant" size={32} color="#94A3B8" />
            <Text style={styles.errTitle}>No stats yet</Text>
          </View>
        ) : (
          <>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              <KpiCard
                icon="calendar-multiple-check"
                label="Instances"
                value={stats.total_instances}
                tone="#3B82F6"
              />
              <KpiCard
                icon="account-multiple"
                label="Users"
                value={stats.total_users}
                tone="#10B981"
              />
              <KpiCard
                icon="calendar-clock"
                label="Templates"
                value={stats.total_templates}
                tone="#8B5CF6"
              />
            </View>

            {/* By template type */}
            {sortedTemplateTypes.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>By template type</Text>
                <View style={styles.breakdownCard}>
                  {sortedTemplateTypes.map(([key, value]) => {
                    const tone = TEMPLATE_TONE[key] ?? '#64748B';
                    return (
                      <View key={key} style={styles.breakdownRow}>
                        <View style={styles.breakdownLabelCol}>
                          <View
                            style={[styles.breakdownDot, { backgroundColor: tone }]}
                          />
                          <Text style={styles.breakdownLabel}>
                            {key}
                          </Text>
                        </View>
                        <View style={styles.breakdownBarCol}>
                          <View
                            style={[
                              styles.breakdownBar,
                              {
                                width: `${(value / maxTemplateValue) * 100}%`,
                                backgroundColor: tone,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.breakdownValue}>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {/* By work center */}
            {sortedWorkCenters.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>By work center</Text>
                <View style={styles.breakdownCard}>
                  {sortedWorkCenters.map(([key, value]) => (
                    <View key={key} style={styles.breakdownRow}>
                      <View style={styles.breakdownLabelCol}>
                        <Icon
                          name="factory"
                          size={12}
                          color={PRIMARY_COLOR}
                        />
                        <Text
                          style={styles.breakdownLabel}
                          numberOfLines={1}
                        >
                          {key}
                        </Text>
                      </View>
                      <View style={styles.breakdownBarCol}>
                        <View
                          style={[
                            styles.breakdownBar,
                            {
                              width: `${(value / maxWorkCenterValue) * 100}%`,
                              backgroundColor: PRIMARY_COLOR,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Daily trend */}
            {upcomingDays.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Upcoming days</Text>
                <View style={styles.breakdownCard}>
                  {upcomingDays.map(([dateKey, value]) => (
                    <View key={dateKey} style={styles.breakdownRow}>
                      <View style={styles.breakdownLabelCol}>
                        <Icon
                          name="calendar-blank-outline"
                          size={12}
                          color={TEXT_SECONDARY}
                        />
                        <Text
                          style={[styles.breakdownLabel, { fontFamily: 'Courier' }]}
                        >
                          {dateKey}
                        </Text>
                      </View>
                      <View style={styles.breakdownBarCol}>
                        <View
                          style={[
                            styles.breakdownBar,
                            {
                              width: `${(value / maxDateValue) * 100}%`,
                              backgroundColor: '#10B981',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Upcoming schedules */}
            {stats.upcoming_schedules.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  Upcoming shifts ({stats.upcoming_schedules.length})
                </Text>
                {stats.upcoming_schedules
                  .slice(0, 20)
                  .map((s) => (
                    <UpcomingRow key={s.instance_id} item={s} />
                  ))}
              </>
            ) : null}

            <Text style={styles.helper}>
              Upcoming shifts are capped at 50 by the server. Widen the range
              or narrow filters for different slices.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function KpiCard({
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
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.kpiValue}>{value.toLocaleString()}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function UpcomingRow({ item }: { item: ScheduleInstanceSummary }) {
  return (
    <View style={styles.upcomingRow}>
      <UserAvatar
        userId={item.user_id}
        username={undefined}
        fullName={undefined}
        size={36}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.upcomingName} numberOfLines={1}>
          {item.user_id.slice(0, 12)}…
        </Text>
        <Text style={styles.upcomingMeta} numberOfLines={1}>
          {fmtDate(item.schedule_date)} · {fmtTime(item.expected_start)}–
          {fmtTime(item.expected_end)}
        </Text>
      </View>
      <View style={styles.upcomingChip}>
        <Text style={styles.upcomingChipText} numberOfLines={1}>
          {item.template_name}
        </Text>
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

  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  chipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '700' },
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

  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  kpiLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  breakdownCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownLabelCol: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  breakdownBarCol: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  breakdownBar: { height: '100%', borderRadius: 4 },
  breakdownValue: {
    width: 48,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: 'Courier',
  },

  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 6,
  },
  upcomingName: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700' },
  upcomingMeta: { color: TEXT_SECONDARY, fontSize: 10, marginTop: 2 },
  upcomingChip: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  upcomingChipText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: '700',
  },

  helper: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 15,
  },
});