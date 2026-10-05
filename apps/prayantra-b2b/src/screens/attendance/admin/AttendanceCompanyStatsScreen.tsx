import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getCompanyStats } from '@b2b/api-client';

import type { AttendanceStats } from '@b2b/shared-types';

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
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPreset(key: string): { start: string; end: string } {
  const today = new Date();
  const end = new Date(today);
  switch (key) {
    case '7d': {
      const s = new Date(today);
      s.setDate(today.getDate() - 6);
      return { start: ymd(s), end: ymd(end) };
    }
    case '30d': {
      const s = new Date(today);
      s.setDate(today.getDate() - 29);
      return { start: ymd(s), end: ymd(end) };
    }
    case 'this_month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: ymd(s), end: ymd(end) };
    }
    case 'this_year': {
      const s = new Date(today.getFullYear(), 0, 1);
      return { start: ymd(s), end: ymd(end) };
    }
    default:
      return { start: ymd(today), end: ymd(today) };
  }
}

function isDateValid(s: string): boolean {
  if (!s) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function fmtHours(h: number | null | undefined): string {
  if (h == null) return '—';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

const PRESETS = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'this_year', label: 'This year' },
] as const;

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceCompanyStatsScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('30d');
  const [range, setRange] = useState(rangeForPreset('30d'));
  const [customOpen, setCustomOpen] = useState(false);

  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset !== 'custom') setRange(rangeForPreset(preset));
  }, [preset]);

  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await getCompanyStats(
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

  const statusBreakdown = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'present', label: 'Present', value: stats.present_count, tone: '#10B981' },
      { key: 'absent', label: 'Absent', value: stats.absent_count, tone: '#EF4444' },
      { key: 'late', label: 'Late', value: stats.late_count, tone: '#F59E0B' },
      { key: 'half_day', label: 'Half Day', value: stats.half_day_count, tone: '#F97316' },
      { key: 'leave', label: 'Leave', value: stats.leave_count, tone: '#6366F1' },
      { key: 'holiday', label: 'Holiday', value: stats.holiday_count, tone: '#EC4899' },
    ].filter((x) => x.value > 0);
  }, [stats]);

  const totalDays = statusBreakdown.reduce((s, x) => s + x.value, 0);
  const maxValue = Math.max(1, ...statusBreakdown.map((x) => x.value));

  const attendancePct = Math.max(
    0,
    Math.min(100, Math.round(stats?.average_attendance ?? 0)),
  );

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
          <TouchableOpacity
            style={[styles.chip, preset === 'custom' && styles.chipActive]}
            onPress={() => setCustomOpen(true)}
            activeOpacity={0.85}
          >
            <Icon
              name="calendar-range"
              size={13}
              color={preset === 'custom' ? '#FFFFFF' : TEXT_SECONDARY}
            />
            <Text
              style={[
                styles.chipText,
                { marginLeft: 5 },
                preset === 'custom' && styles.chipTextActive,
              ]}
            >
              {preset === 'custom' ? `${range.start} →` : 'Custom'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.rangeText}>
          {range.start} → {range.end}
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading company stats…</Text>
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
            <Icon
              name="chart-timeline-variant"
              size={32}
              color="#94A3B8"
            />
            <Text style={styles.errTitle}>No data</Text>
            <Text style={styles.errMsg}>
              No attendance summaries in this range yet.
            </Text>
          </View>
        ) : (
          <>
            {/* Hero: attendance % */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>AVERAGE ATTENDANCE</Text>
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
                Across {totalDays} day-record{totalDays === 1 ? '' : 's'}
              </Text>
            </View>

            {/* KPI row */}
            <View style={styles.kpiRow}>
              <KpiCard
                icon="account-multiple"
                label="Employees"
                value={String(stats.total_employees)}
                tone="#3B82F6"
              />
              <KpiCard
                icon="timer-sand"
                label="Worked"
                value={fmtHours(stats.total_worked_hours)}
                tone="#10B981"
              />
              <KpiCard
                icon="clock-plus-outline"
                label="Overtime"
                value={fmtHours(stats.total_overtime_hours)}
                tone="#8B5CF6"
              />
            </View>

            {/* Breakdown */}
            <Text style={styles.sectionTitle}>Status breakdown</Text>
            <View style={styles.breakdownCard}>
              {statusBreakdown.map((s) => {
                const pct = (s.value / totalDays) * 100;
                return (
                  <View key={s.key} style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelCol}>
                      <View
                        style={[
                          styles.breakdownDot,
                          { backgroundColor: s.tone },
                        ]}
                      />
                      <Text style={styles.breakdownLabel}>{s.label}</Text>
                    </View>
                    <View style={styles.breakdownBarCol}>
                      <View
                        style={[
                          styles.breakdownBar,
                          {
                            width: `${(s.value / maxValue) * 100}%`,
                            backgroundColor: s.tone,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>{s.value}</Text>
                    <Text style={styles.breakdownPct}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <CustomRangeModal
        visible={customOpen}
        initial={range}
        onClose={() => setCustomOpen(false)}
        onApply={(r) => {
          setRange(r);
          setPreset('custom');
          setCustomOpen(false);
        }}
      />
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
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function CustomRangeModal({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: { start: string; end: string };
  onClose: () => void;
  onApply: (r: { start: string; end: string }) => void;
}) {
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  useEffect(() => {
    if (visible) {
      setStart(initial.start);
      setEnd(initial.end);
    }
  }, [visible, initial.start, initial.end]);
  const valid = isDateValid(start) && isDateValid(end) && start <= end;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Custom range</Text>
          <Text style={styles.dialogLabel}>Start</Text>
          <TextInput
            style={styles.dialogInput}
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <Text style={styles.dialogLabel}>End</Text>
          <TextInput
            style={styles.dialogInput}
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onClose} style={styles.dialogBtnGhost}>
              <Text style={styles.dialogBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => valid && onApply({ start, end })}
              style={[styles.dialogBtn, !valid && { opacity: 0.5 }]}
              disabled={!valid}
            >
              <Text style={styles.dialogBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
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
  heroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  heroPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
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
  heroBarFill: { height: '100%', borderRadius: 3 },
  heroSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 10,
    fontWeight: '500',
  },

  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
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
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  kpiLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
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
    gap: 12,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLabelCol: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '700' },
  breakdownBarCol: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  breakdownBar: { height: '100%', borderRadius: 4 },
  breakdownValue: {
    width: 34,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: 'Courier',
  },
  breakdownPct: {
    width: 36,
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  dialogTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  dialogLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#F8FAFC',
  },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  dialogBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dialogBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  dialogBtnGhostText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
});