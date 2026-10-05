import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listSessionSummaries } from '@b2b/api-client';

import type {
  AttendanceSessionSummary,
  AttendanceSubjectType,
  AttendanceSessionStatus,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { UserAvatar } from '../../../../components/UserAvatar';
import SubjectPickerSheet, {
  PickedSubject,
} from '../../../../components/attendance/SubjectPickerSheet';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// CONSTANTS
// ============================================================

const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'yesterday', label: 'Yesterday', days: 1 },
  { key: '7d', label: '7 days', days: 6 },
  { key: '30d', label: '30 days', days: 29 },
] as const;

const STATUS_OPTIONS: {
  value: AttendanceSessionStatus;
  label: string;
  tone: string;
}[] = [
  { value: 'present', label: 'Present', tone: '#10B981' },
  { value: 'absent', label: 'Absent', tone: '#EF4444' },
  { value: 'late', label: 'Late', tone: '#F59E0B' },
  { value: 'excused', label: 'Excused', tone: '#0EA5E9' },
];

const SUBJECT_TONE: Record<string, string> = {
  employee: '#3B82F6',
  student: '#EC4899',
  customer: '#8B5CF6',
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

function rangeForPreset(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: ymd(start), end: ymd(end) };
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function isDateValid(s: string): boolean {
  if (!s) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function SessionSummariesListScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('7d');
  const [range, setRange] = useState(rangeForPreset(6));
  const [customOpen, setCustomOpen] = useState(false);

  const [subjectType, setSubjectType] =
    useState<AttendanceSubjectType | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [statusFilter, setStatusFilter] =
    useState<AttendanceSessionStatus | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [rows, setRows] = useState<AttendanceSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync preset → range
  useEffect(() => {
    const p = DATE_PRESETS.find((x) => x.key === preset);
    if (p) setRange(rangeForPreset(p.days));
  }, [preset]);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean, isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else if (replace) setLoading(true);
        else setLoadingMore(true);

        setError(null);

        const params: any = {
          session_date: range.start, // backend takes a single date; use start
          page: targetPage,
          page_size: 50,
        };
        if (subjectType !== 'all') params.subject_type = subjectType;
        if (subjectFilter) params.subject_id = subjectFilter.user_id;
        if (statusFilter) params.status = statusFilter;

        const res: any = await listSessionSummaries(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          params,
        );

        const batch: AttendanceSessionSummary[] = Array.isArray(res?.data)
          ? res.data
          : [];
        const meta = res?.meta ?? {};
        const next = !!meta?.has_next;

        setRows(replace ? batch : (prev) => [...prev, ...batch]);
        setHasNext(next);
        setPage(targetPage);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load session summaries.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      companyId,
      deviceId,
      accessToken,
      locationId,
      range.start,
      subjectType,
      subjectFilter,
      statusFilter,
    ],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, true);
    }, [fetchPage]),
  );

  const onEndReached = () => {
    if (!hasNext || loadingMore || loading) return;
    fetchPage(page + 1, false);
  };

  const activeFilterCount =
    (subjectType !== 'all' ? 1 : 0) +
    (subjectFilter ? 1 : 0) +
    (statusFilter ? 1 : 0);

  // ============================================================
  // RENDER ROW
  // ============================================================

  const renderRow = ({ item }: { item: AttendanceSessionSummary }) => {
    const tone = SUBJECT_TONE[item.subject_type] ?? '#64748B';
    const statusMeta = STATUS_OPTIONS.find((s) => s.value === item.status);
    const statusTone = statusMeta?.tone ?? '#94A3B8';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AttendanceSessionSummaryDetail', {
            sessionId: item.session_id,
            subjectType: item.subject_type,
            subjectId: item.subject_id,
          })
        }
      >
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.subject_id}
            username={undefined}
            fullName={undefined}
            size={42}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subject_id.slice(0, 12)}…
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.session_id.slice(0, 8)}… · {fmtDateTime(item.marked_at)}
            </Text>
          </View>
          <View
            style={[styles.statusPill, { backgroundColor: `${statusTone}18` }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusTone }]}
            />
            <Text style={[styles.statusPillText, { color: statusTone }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <View style={[styles.typePill, { backgroundColor: `${tone}15` }]}>
            <Text style={[styles.typePillText, { color: tone }]}>
              {item.subject_type}
            </Text>
          </View>
          <View style={styles.sourcePill}>
            <Icon name="source-branch" size={10} color={TEXT_SECONDARY} />
            <Text style={styles.sourcePillText}>{item.source_type}</Text>
          </View>
          {item.is_auto ? (
            <View style={styles.autoPill}>
              <Icon name="robot-outline" size={10} color="#8B5CF6" />
              <Text style={styles.autoPillText}>AUTO</Text>
            </View>
          ) : null}
        </View>

        {item.remarks ? (
          <View style={styles.remarksRow}>
            <Icon name="comment-text-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.remarksText} numberOfLines={2}>
              {item.remarks}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // ============================================================
  // FILTER PANEL
  // ============================================================

  const FilterPanel = () => (
    <View style={styles.filterPanel}>
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
              onPress={() => setPreset(p.key)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}
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
          onPress={() => setCustomOpen(true)}
          style={[styles.chip, preset === 'custom' && styles.chipActive]}
          activeOpacity={0.8}
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
            {preset === 'custom' ? `${range.start}` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setAdvancedOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <Icon name="tune-variant" size={16} color={PRIMARY_COLOR} />
        <Text style={styles.advancedToggleText}>
          Filters
          {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </Text>
        <Icon
          name={advancedOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={TEXT_SECONDARY}
        />
      </TouchableOpacity>

      {advancedOpen && (
        <View style={styles.advancedBody}>
          {/* Subject type */}
          <Text style={styles.filterLabel}>Subject type</Text>
          <View style={styles.chipsRowWrap}>
            <TouchableOpacity
              onPress={() => setSubjectType('all')}
              style={[
                styles.smallChip,
                subjectType === 'all' && styles.smallChipActive,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.smallChipText,
                  subjectType === 'all' && styles.smallChipTextActive,
                ]}
              >
                Any
              </Text>
            </TouchableOpacity>
            {(['student', 'employee', 'customer'] as const).map((t) => {
              const active = subjectType === t;
              const tone = SUBJECT_TONE[t];
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setSubjectType(t);
                    setSubjectFilter(null);
                  }}
                  style={[
                    styles.smallChip,
                    active && { backgroundColor: tone },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      active && styles.smallChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status */}
          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Status</Text>
          <View style={styles.chipsRowWrap}>
            <TouchableOpacity
              onPress={() => setStatusFilter(null)}
              style={[
                styles.smallChip,
                !statusFilter && styles.smallChipActive,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.smallChipText,
                  !statusFilter && styles.smallChipTextActive,
                ]}
              >
                Any
              </Text>
            </TouchableOpacity>
            {STATUS_OPTIONS.map((s) => {
              const active = statusFilter === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setStatusFilter(s.value)}
                  style={[
                    styles.smallChip,
                    active && { backgroundColor: s.tone },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      active && styles.smallChipTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subject */}
          <Text style={[styles.filterLabel, { marginTop: 12 }]}>
            Specific subject
          </Text>
          {subjectFilter ? (
            <View style={styles.subjectRow}>
              <UserAvatar
                userId={subjectFilter.user_id}
                username={subjectFilter.username}
                fullName={subjectFilter.full_name}
                size={32}
              />
              <Text style={styles.subjectName} numberOfLines={1}>
                {subjectFilter.full_name ||
                  subjectFilter.username ||
                  subjectFilter.user_id}
              </Text>
              <TouchableOpacity
                onPress={() => setSubjectFilter(null)}
                style={styles.subjectClear}
              >
                <Icon name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setSubjectPickerOpen(true)}
              style={styles.subjectPickBtn}
              activeOpacity={0.8}
            >
              <Icon
                name="account-search-outline"
                size={16}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.subjectPickText}>Pick a subject</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FilterPanel />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading session summaries…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchPage(1, true)}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.summary_id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPage(1, true, true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon
                name="calendar-check-outline"
                size={32}
                color="#94A3B8"
              />
              <Text style={styles.errTitle}>No session summaries</Text>
              <Text style={styles.errMsg}>
                Session summaries appear when students join a class session
                or a teacher marks the roster.
              </Text>
            </View>
          }
        />
      )}

      {/* Custom range */}
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

      {/* Subject picker */}
      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType={subjectType === 'all' ? 'student' : subjectType}
        title="Filter by subject"
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p: PickedSubject) => {
          setSubjectFilter({
            user_id: p.user_id,
            full_name: p.full_name,
            username: p.username,
          });
          setSubjectPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================
// CUSTOM RANGE MODAL
// ============================================================

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

  const valid = isDateValid(start) && isDateValid(end);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Custom range</Text>
          <Text style={styles.modalLabel}>Start (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.modalInput}
            value={start}
            onChangeText={setStart}
            placeholder="2025-01-01"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <Text style={styles.modalLabel}>End (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.modalInput}
            value={end}
            onChangeText={setEnd}
            placeholder="2025-01-31"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => valid && onApply({ start, end })}
              style={[styles.modalBtn, !valid && { opacity: 0.5 }]}
              disabled={!valid}
            >
              <Text style={styles.modalBtnText}>Apply</Text>
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

  filterPanel: {
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 12,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
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
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: { color: '#FFFFFF' },

  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  advancedToggleText: {
    flex: 1,
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },
  advancedBody: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  filterLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  smallChipActive: { backgroundColor: PRIMARY_COLOR },
  smallChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  smallChipTextActive: { color: '#FFFFFF' },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  subjectName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  subjectClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#94A3B8',
  },
  subjectPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}10`,
    gap: 6,
  },
  subjectPickText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    position: 'relative',
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 6,
  },
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sourcePillText: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  autoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
  },
  autoPillText: {
    color: '#7C3AED',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  remarksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    marginLeft: 6,
  },
  remarksText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
  },

  center: {
    flex: 1,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#F8FAFC',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  modalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  modalBtnGhostText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
});