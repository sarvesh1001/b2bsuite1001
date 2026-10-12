import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, ActivityIndicator } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { searchEvents } from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  AttendancePunchEvent,
  AttendanceEventType,
  AttendanceSourceType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import SubjectPickerSheet, {
  PickedSubject,
} from '../../../components/attendance/SubjectPickerSheet';
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

type SearchRouteProp = RouteProp<
  { AttendanceSearch: { subjectType: AttendanceSubjectType } },
  'AttendanceSearch'
>;

// ============================================================
// CONSTANTS
// ============================================================

const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'yesterday', label: 'Yesterday', days: 1 },
  { key: '7d', label: '7 days', days: 6 },
  { key: '30d', label: '30 days', days: 29 },
] as const;

const EVENT_TYPE_OPTIONS: AttendanceEventType[] = [
  'check_in',
  'check_out',
  'break_start',
  'break_end',
  'shift_start',
  'shift_end',
  'manual_check_in',
  'manual_check_out',
  'class_start',
  'class_end',
  'session_join',
  'session_leave',
];

const SOURCE_TYPE_OPTIONS: AttendanceSourceType[] = [
  'mobile',
  'web',
  'manual',
  'biometric',
  'kiosk',
  'classroom',
  'correction',
  'system',
];

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

function sourceColor(src: AttendanceSourceType): string {
  switch (src) {
    case 'biometric':
      return '#8B5CF6';
    case 'mobile':
      return '#10B981';
    case 'web':
      return '#3B82F6';
    case 'manual':
      return '#F59E0B';
    case 'kiosk':
      return '#6366F1';
    case 'classroom':
      return '#EC4899';
    case 'correction':
      return '#EF4444';
    default:
      return '#94A3B8';
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRouteProp>();
  const { subjectType } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('today');
  const [range, setRange] = useState(rangeForPreset(0));
  const [customOpen, setCustomOpen] = useState(false);

  const [eventType, setEventType] = useState<AttendanceEventType | null>(null);
  const [sourceType, setSourceType] = useState<AttendanceSourceType | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [events, setEvents] = useState<AttendancePunchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<AttendancePunchEvent | null>(null);

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

        const filter: any = {
          start_date: range.start,
          end_date: range.end,
          subject_type: subjectType,
          page: targetPage,
          page_size: 50,
        };
        if (eventType) filter.event_type = eventType;
        if (sourceType) filter.source_type = sourceType;
        if (subjectFilter) filter.subject_id = subjectFilter.user_id;

        const res: any = await searchEvents(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          filter,
        );

        const batch: AttendancePunchEvent[] = res?.data?.events ?? [];
        const meta = res?.meta ?? {};
        const next = !!meta?.has_next;

        setEvents(replace ? batch : (prev) => [...prev, ...batch]);
        setHasNext(next);
        setPage(targetPage);
      } catch (err: any) {
        console.error('Search events error:', err);
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load events.',
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
      range.end,
      subjectType,
      eventType,
      sourceType,
      subjectFilter,
    ],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const onEndReached = () => {
    if (!hasNext || loadingMore || loading) return;
    fetchPage(page + 1, false);
  };

  // ============================================================
  // RENDER — EVENT ROW
  // ============================================================

  const renderEvent = ({ item }: { item: AttendancePunchEvent }) => {
    const label = EVENT_LABEL[item.event_type] ?? item.event_type;
    const tone = sourceColor(item.source_type);
    return (
      <TouchableOpacity
        style={styles.eventRow}
        activeOpacity={0.85}
        onPress={() => setDetail(item)}
      >
        <UserAvatar
          userId={item.subject_id}
          username={undefined}
          fullName={undefined}
          size={40}
        />
        <View style={styles.eventBody}>
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {label}
            </Text>
            <View style={[styles.sourcePill, { backgroundColor: `${tone}18` }]}>
              <Text style={[styles.sourcePillText, { color: tone }]}>
                {item.source_type}
              </Text>
            </View>
          </View>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {formatEventLocalTime(item)}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  // ============================================================
  // FILTER PANEL
  // ============================================================

  const activeFilterCount =
    (eventType ? 1 : 0) + (sourceType ? 1 : 0) + (subjectFilter ? 1 : 0);

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
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                ]}
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
            {preset === 'custom' ? `${range.start} → ${range.end}` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setFilterOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <Icon name="tune-variant" size={16} color={PRIMARY_COLOR} />
        <Text style={styles.advancedToggleText}>
          Advanced filters
          {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </Text>
        <Icon
          name={filterOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={TEXT_SECONDARY}
        />
      </TouchableOpacity>

      {filterOpen && (
        <View style={styles.advancedBody}>
          <Text style={styles.filterLabel}>Event type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <TouchableOpacity
              onPress={() => setEventType(null)}
              style={[styles.smallChip, !eventType && styles.smallChipActive]}
            >
              <Text
                style={[
                  styles.smallChipText,
                  !eventType && styles.smallChipTextActive,
                ]}
              >
                Any
              </Text>
            </TouchableOpacity>
            {EVENT_TYPE_OPTIONS.map((t) => {
              const active = eventType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEventType(t)}
                  style={[styles.smallChip, active && styles.smallChipActive]}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      active && styles.smallChipTextActive,
                    ]}
                  >
                    {EVENT_LABEL[t] ?? t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 14 }]}>Source</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <TouchableOpacity
              onPress={() => setSourceType(null)}
              style={[styles.smallChip, !sourceType && styles.smallChipActive]}
            >
              <Text
                style={[
                  styles.smallChipText,
                  !sourceType && styles.smallChipTextActive,
                ]}
              >
                Any
              </Text>
            </TouchableOpacity>
            {SOURCE_TYPE_OPTIONS.map((s) => {
              const active = sourceType === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSourceType(s)}
                  style={[styles.smallChip, active && styles.smallChipActive]}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      active && styles.smallChipTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 14 }]}>Subject</Text>
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
          <Text style={styles.title}>Search Events</Text>
          <Text style={styles.subtitle}>
            {subjectType} · {range.start} → {range.end}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.back}
          onPress={() => fetchPage(1, true, true)}
          activeOpacity={0.8}
        >
          <Icon name="refresh" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      <FilterPanel />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading events…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load events</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchPage(1, true)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.attendance_event_id}
          renderItem={renderEvent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 40 }}
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
              <Icon name="calendar-search" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No events</Text>
              <Text style={styles.errMsg}>
                Try widening the date range or clearing filters.
              </Text>
            </View>
          }
        />
      )}

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

      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType={subjectType}
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

      <EventDetailModal event={detail} onClose={() => setDetail(null)} />
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

  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Custom range</Text>
          <Text style={styles.modalLabel}>Start (YYYY-MM-DD)</Text>
          <RNTextInput
            style={styles.modalInput}
            value={start}
            onChangeText={setStart}
            placeholder="2025-01-01"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <Text style={styles.modalLabel}>End (YYYY-MM-DD)</Text>
          <RNTextInput
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
// EVENT DETAIL MODAL
// ============================================================

function EventDetailModal({
  event,
  onClose,
}: {
  event: AttendancePunchEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;
  const label = EVENT_LABEL[event.event_type] ?? event.event_type;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{k}</Text>
      <Text style={styles.detailVal} numberOfLines={2}>
        {v}
      </Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.modalTitle, { flex: 1 }]}>{label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ marginTop: 6 }}>
            <Row k="Event ID" v={event.attendance_event_id} />
            <Row k="Subject type" v={event.subject_type} />
            <Row k="Subject ID" v={event.subject_id} />
            <Row k="Event time" v={formatEventLocalTime(event)} />
            <Row k="Event date" v={event.event_date_local} />
            <Row k="Source" v={event.source_type} />
            <Row k="Device" v={event.device_id ?? '—'} />
            <Row k="IP" v={event.ip_address ?? '—'} />
            <Row k="Work center" v={event.context?.work_center_code ?? '—'} />
            <Row k="Reason" v={event.context?.reason ?? '—'} />
            <Row
              k="Correction"
              v={event.metadata?.is_correction ? 'Yes' : 'No'}
            />
            <Row
              k="Auto-generated"
              v={event.metadata?.is_auto_generated ? 'Yes' : 'No'}
            />
            <Row
              k="Created at"
              v={new Date(event.created_at).toLocaleString()}
            />
          </ScrollView>
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

  filterPanel: {
    backgroundColor: CARD_BACKGROUND,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
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
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  smallChipActive: { backgroundColor: PRIMARY_COLOR },
  smallChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },
  smallChipTextActive: { color: '#FFFFFF' },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
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

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  eventBody: { flex: 1 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  sourcePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sourcePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  eventMeta: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 3 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_COLOR,
    marginLeft: 68,
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
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  detailKey: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '65%',
  },
});