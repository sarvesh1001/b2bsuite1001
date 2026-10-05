import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listWorkCalendars,
  getCalendarAvailability,
} from '@b2b/api-client';

import type {
  WorkCalendar,
  CalendarAvailability,
} from '@b2b/shared-types';

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

type RouteT = RouteProp<
  { AttendanceCalendarAvailability: { calendarId?: string } },
  'AttendanceCalendarAvailability'
>;

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForDays(days: number): { start: string; end: string } {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + days - 1);
  return { start: ymd(today), end: ymd(end) };
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString([], {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
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

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceCalendarAvailabilityScreen() {
  const route = useRoute<RouteT>();
  const presetCalendarId = route.params?.calendarId;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [calendars, setCalendars] = useState<WorkCalendar[]>([]);
  const [calendarId, setCalendarId] = useState<string>(presetCalendarId ?? '');
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);

  const [preset, setPreset] = useState<'7d' | '14d' | '30d' | 'custom'>('30d');
  const [range, setRange] = useState(rangeForDays(30));
  const [customOpen, setCustomOpen] = useState(false);

  const [rows, setRows] = useState<CalendarAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load calendars once
  useEffect(() => {
    if (!companyId || !deviceId || !accessToken) return;
    (async () => {
      try {
        const res: any = await listWorkCalendars(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
        );
        const list: WorkCalendar[] = Array.isArray(res?.data)
          ? res.data
          : [];
        setCalendars(list);
        if (!presetCalendarId && list[0]) {
          setCalendarId(list[0].calendar_id);
        }
      } catch {
        // non-fatal
      }
    })();
  }, [companyId, deviceId, accessToken, locationId, presetCalendarId]);

  useEffect(() => {
    if (preset === '7d') setRange(rangeForDays(7));
    else if (preset === '14d') setRange(rangeForDays(14));
    else if (preset === '30d') setRange(rangeForDays(30));
  }, [preset]);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchAvailability = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken || !calendarId) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await getCalendarAvailability(
          companyId,
          calendarId,
          deviceId,
          accessToken,
          { start_date: range.start, end_date: range.end },
        );

        const list: CalendarAvailability[] = Array.isArray(res?.data)
          ? res.data
          : [];
        setRows(list);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Unable to load availability.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, calendarId, range.start, range.end],
  );

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const currentCalendar = useMemo(
    () => calendars.find((c) => c.calendar_id === calendarId),
    [calendars, calendarId],
  );

  const counts = useMemo(() => {
    let working = 0;
    let off = 0;
    let holidays = 0;
    for (const r of rows) {
      if (r.is_holiday) holidays++;
      else if (r.is_working_day) working++;
      else off++;
    }
    return { working, off, holidays };
  }, [rows]);

  // ============================================================
  // ROW
  // ============================================================

  const renderRow = ({ item }: { item: CalendarAvailability }) => {
    const isHoliday = item.is_holiday;
    const isWorking = item.is_working_day;
    const tone = isHoliday ? '#EC4899' : isWorking ? '#10B981' : '#94A3B8';
    const label = isHoliday
      ? 'Holiday'
      : isWorking
      ? 'Working day'
      : 'Weekly off';
    const icon = isHoliday
      ? 'party-popper'
      : isWorking
      ? 'briefcase-check-outline'
      : 'calendar-week-end';

    return (
      <View style={styles.row}>
        <View style={[styles.rowAccent, { backgroundColor: tone }]} />
        <View style={[styles.rowIcon, { backgroundColor: `${tone}15` }]}>
          <Icon name={icon} size={18} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowDate} numberOfLines={1}>
            {fmtDate(item.date)}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {isHoliday && item.holiday_name
              ? item.holiday_name
              : label}
          </Text>
        </View>
        <View style={[styles.rowPill, { backgroundColor: `${tone}18` }]}>
          <Text style={[styles.rowPillText, { color: tone }]}>
            {isHoliday ? 'HOLIDAY' : isWorking ? 'WORKING' : 'OFF'}
          </Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Calendar picker */}
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Calendar</Text>
        <TouchableOpacity
          style={styles.calendarPick}
          onPress={() => setCalendarPickerOpen(true)}
          activeOpacity={0.85}
        >
          <Icon name="calendar-star" size={15} color={PRIMARY_COLOR} />
          <Text style={styles.calendarPickText} numberOfLines={1}>
            {currentCalendar
              ? `${currentCalendar.name} (${currentCalendar.year})`
              : 'Pick a calendar'}
          </Text>
          <Icon name="chevron-down" size={16} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Range presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsRow}
      >
        {(['7d', '14d', '30d'] as const).map((k) => {
          const active = preset === k;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setPreset(k)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                Next {k.replace('d', '')} days
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
            {preset === 'custom'
              ? `${range.start} → ${range.end}`
              : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Summary strip */}
      {!loading && rows.length > 0 ? (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: '#10B981' }]}>
              {counts.working}
            </Text>
            <Text style={styles.summaryLabel}>Working</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: '#94A3B8' }]}>
              {counts.off}
            </Text>
            <Text style={styles.summaryLabel}>Off</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: '#EC4899' }]}>
              {counts.holidays}
            </Text>
            <Text style={styles.summaryLabel}>Holidays</Text>
          </View>
        </View>
      ) : null}

      {/* Body */}
      {!calendarId ? (
        <View style={styles.center}>
          <Icon name="calendar-blank-outline" size={32} color="#94A3B8" />
          <Text style={styles.errTitle}>Pick a calendar</Text>
          <Text style={styles.errMsg}>
            Choose a work calendar above to see its day-by-day availability.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading availability…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAvailability()}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.date}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAvailability(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon
                name="calendar-search"
                size={32}
                color="#94A3B8"
              />
              <Text style={styles.errTitle}>No days in range</Text>
            </View>
          }
        />
      )}

      {/* Calendar picker modal */}
      <Modal
        visible={calendarPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalCard} edges={['bottom']}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a calendar</Text>
              <TouchableOpacity
                onPress={() => setCalendarPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {calendars.length === 0 ? (
                <View style={styles.emptyModal}>
                  <Icon
                    name="calendar-blank-outline"
                    size={26}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyModalText}>
                    No calendars configured.
                  </Text>
                </View>
              ) : (
                calendars.map((c) => {
                  const active = c.calendar_id === calendarId;
                  return (
                    <TouchableOpacity
                      key={c.calendar_id}
                      style={[
                        styles.modalRow,
                        active && styles.modalRowActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setCalendarId(c.calendar_id);
                        setCalendarPickerOpen(false);
                      }}
                    >
                      <View style={styles.modalRowIcon}>
                        <Icon
                          name="calendar-star"
                          size={18}
                          color={PRIMARY_COLOR}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalRowTitle} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.modalRowSub}>
                          {c.year} · {c.timezone}
                        </Text>
                      </View>
                      {active ? (
                        <Icon
                          name="check-circle"
                          size={16}
                          color={PRIMARY_COLOR}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Custom range modal */}
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
  const valid = isDateValid(start) && isDateValid(end) && start <= end;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.modalTitle}>Custom range</Text>
          <Text style={styles.modalLabel}>Start</Text>
          <TextInput
            style={styles.modalInput}
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
          <Text style={styles.modalLabel}>End</Text>
          <TextInput
            style={styles.modalInput}
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD"
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

  topBar: { paddingHorizontal: 20, paddingTop: 14 },
  topLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  calendarPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  calendarPickText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

  presetsRow: { paddingHorizontal: 20, paddingTop: 14, gap: 8 },
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
  chipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '800' },
  summaryLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER_COLOR,
  },

  listContent: { padding: 20, paddingBottom: 40 },
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 18,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  rowAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDate: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  rowSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  rowPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rowPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  sep: { height: 8 },

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
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalRowActive: { backgroundColor: `${PRIMARY_COLOR}08` },
  modalRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalRowTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  modalRowSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  emptyModal: { alignItems: 'center', paddingVertical: 30 },
  emptyModalText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 8 },

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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
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