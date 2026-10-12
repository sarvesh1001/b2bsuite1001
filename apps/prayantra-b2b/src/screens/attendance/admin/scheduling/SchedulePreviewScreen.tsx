import React, { useCallback, useEffect, useState } from 'react';
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

import { previewUserSchedule } from '@b2b/api-client';
import type { PositionBasedResolvedDay } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { UserAvatar } from '../../../../components/UserAvatar';
import SubjectPickerSheet, {
  PickedSubject,
} from '../../../../components/attendance/SubjectPickerSheet';
import { formatInstantInTz } from '../../../../utils/attendanceTime';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// DEBUG LOGGER
// ============================================================

/**
 * All preview logs are prefixed so you can filter the RN console by
 * typing `preview` in the search box. Every step of the fetch → parse
 * → render cycle emits something, so if a day shows the wrong status
 * you can trace exactly which stage dropped the override / template.
 *
 * To silence in production, wrap the body in `if (__DEV__) { ... }`.
 */
const log = (...args: unknown[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[preview]', ...args);
  }
};
const warn = (...args: unknown[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[preview]', ...args);
  }
};
const logError = (...args: unknown[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[preview]', ...args);
  }
};

/** Truncate long strings for readable logs. */
function short(v: unknown, n = 80): string {
  if (v == null) return String(v);
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > n ? `${s.slice(0, n)}…` : s;
  } catch {
    return '<unstringifiable>';
  }
}

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "2026-10-17T00:00:00+05:30" → "2026-10-17" */
function dateOnly(iso: string): string {
  return String(iso ?? '').slice(0, 10);
}

function fmtDateLong(iso: string): string {
  try {
    const d = new Date(dateOnly(iso) + 'T00:00:00');
    return d.toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case 'scheduled':
    case 'working':
      return '#10B981';
    case 'weekly_off':
      return '#94A3B8';
    case 'holiday':
      return '#8B5CF6';
    case 'on_leave':
    case 'override_off':
      return '#F59E0B';
    case 'no_work_center':
    case 'no_shift_mapping':
    case 'template_not_found':
    case 'no_template':
    case 'template_invalid':
      return '#EF4444';
    case 'not_schedulable':
    case 'inactive':
    case 'subject_not_found':
    default:
      return '#94A3B8';
  }
}

function statusLabel(day: PositionBasedResolvedDay): string {
  if (day.is_on_leave) return 'LEAVE';
  if (day.is_override && day.override_type) {
    return day.override_type.replace(/_/g, ' ').toUpperCase();
  }
  return day.schedule_status.replace(/_/g, ' ').toUpperCase();
}

const DATE_PRESETS = [
  { key: 'week', label: 'This week', days: 7 },
  { key: '2w', label: 'Next 14 days', days: 14 },
  { key: 'month', label: 'Next 30 days', days: 30 },
] as const;

function rangeFromPreset(key: string): { start: string; end: string } {
  const today = new Date();
  const days = key === 'week' ? 7 : key === '2w' ? 14 : 30;
  const end = new Date(today);
  end.setDate(today.getDate() + days);
  return { start: ymd(today), end: ymd(end) };
}

// ============================================================
// SCREEN
// ============================================================

export default function SchedulePreviewScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('week');
  const [range, setRange] = useState(rangeFromPreset('week'));
  const [customOpen, setCustomOpen] = useState(false);

  const [subject, setSubject] = useState<PickedSubject | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [rows, setRows] = useState<PositionBasedResolvedDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRange(rangeFromPreset(preset));
  }, [preset]);

  // ── LOG: mount + state summary ───────────────────────────────────
  useEffect(() => {
    log('mounted', {
      companyId,
      deviceId: deviceId ? `${deviceId.slice(0, 8)}…` : null,
      hasToken: !!accessToken,
      locationId,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LOG: whenever the range changes ──────────────────────────────
  useEffect(() => {
    log('range changed', { preset, start: range.start, end: range.end });
  }, [preset, range.start, range.end]);

  // ── LOG: whenever the subject changes ────────────────────────────
  useEffect(() => {
    log('subject changed', subject);
  }, [subject]);

  const fetchPreview = useCallback(
    async (isRefresh = false) => {
      // ── gate ────────────────────────────────────────────────────
      if (!companyId || !deviceId || !accessToken || !subject) {
        log('fetch skipped (missing inputs)', {
          hasCompany: !!companyId,
          hasDevice: !!deviceId,
          hasToken: !!accessToken,
          hasSubject: !!subject,
        });
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const reqBody = {
        companyId,
        userId: subject.user_id,
        deviceId: `${deviceId.slice(0, 8)}…`,
        range: { from: range.start, to: range.end },
        locationId: locationId ?? undefined,
      };

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        // ── 1. REQUEST ──────────────────────────────────────────
        log('→ previewUserSchedule', reqBody);

        const t0 = Date.now();
        const res: any = await previewUserSchedule(
          companyId,
          subject.user_id,
          deviceId,
          accessToken,
          { from: range.start, to: range.end },
          locationId ?? undefined,
        );
        const ms = Date.now() - t0;

        // ── 2. RAW RESPONSE ─────────────────────────────────────
        log('← previewUserSchedule', {
          ms,
          status: res?.status ?? 'n/a',
          topKeys:
            res && typeof res === 'object'
              ? Object.keys(res).slice(0, 10)
              : '(not an object)',
          isArray: Array.isArray(res),
          preview: short(res, 400),
        });

        // ── 3. UNWRAP ───────────────────────────────────────────
        // The API client may return one of:
        //   - ApiResponse<PositionBasedResolvedDay[]> → { success, data: [...] }
        //   - bare PositionBasedResolvedDay[]
        //   - { data: { days: [...] } }   (defensive)
        let list: PositionBasedResolvedDay[] = [];
        let unwrapKind = 'unknown';
        if (Array.isArray(res)) {
          list = res;
          unwrapKind = 'bare-array';
        } else if (Array.isArray(res?.data)) {
          list = res.data;
          unwrapKind = 'envelope.data';
        } else if (Array.isArray(res?.data?.days)) {
          list = res.data.days;
          unwrapKind = 'envelope.data.days';
        } else if (Array.isArray(res?.days)) {
          list = res.days;
          unwrapKind = 'envelope.days';
        }

        log('unwrap', { kind: unwrapKind, count: list.length });

        // ── 4. PER-DAY SUMMARY ──────────────────────────────────
        // This is the most important log. For each day the resolver
        // returned, we print exactly what we received. If a day shows
        // `weekly_off` and you expected `scheduled` because an override
        // exists, compare `is_override`, `override_type`, and the dates
        // against the DB row.
        if (list.length > 0) {
          log(
            'days received:',
            list.map((d) => ({
              date: dateOnly(d.date),
              status: d.schedule_status,
              is_override: d.is_override,
              override_type: d.override_type ?? null,
              is_on_leave: d.is_on_leave,
              shift_name: d.shift_name ?? null,
              wc: d.work_center_code ?? null,
              tz: d.timezone,
              start: d.expected_start ?? null,
              end: d.expected_end ?? null,
            })),
          );
        }

        // ── 5. LOOK FOR THE DAY WE CARE ABOUT ──────────────────
        // If you're debugging a specific date, log the full object
        // for that date in isolation.
        const DEBUG_DATE = '2026-10-17';
        const dbg = list.find((d) => dateOnly(d.date) === DEBUG_DATE);
        if (dbg) {
          log(`FULL OBJECT for ${DEBUG_DATE}:`, JSON.stringify(dbg, null, 2));
        } else if (list.length > 0) {
          log(
            `FULL OBJECT for ${DEBUG_DATE}: NOT FOUND in returned list`,
            'returned dates =',
            list.map((d) => dateOnly(d.date)),
          );
        }

        setRows(list);
      } catch (err: any) {
        // ── ERROR ───────────────────────────────────────────────
        logError('fetch failed', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
          url: err?.config?.url,
          params: err?.config?.params,
        });
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load schedule.',
        );
        setRows([]);
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
      range.start,
      range.end,
      subject,
    ],
  );

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useFocusEffect(
    useCallback(() => {
      log('screen focused → refetch');
      fetchPreview();
    }, [fetchPreview]),
  );

  const openOverrideEditor = (day: PositionBasedResolvedDay) => {
    if (!subject) return;
    // Route params must be a plain YYYY-MM-DD string, not the ISO
    // instant the resolver returns. Otherwise the overrides screen's
    // date validator rejects it and the form defaults to today.
    const paramDate = dateOnly(day.date);
    log('navigate → AttendanceScheduleOverrides', {
      userId: subject.user_id,
      date: paramDate,
      overrideId: day.override_id ?? null,
      existingType: day.override_type ?? null,
      rawDayDate: day.date,
    });
    navigation.navigate('AttendanceScheduleOverrides', {
      userId: subject.user_id,
      date: paramDate,
      overrideId: day.override_id ?? null,
      existingType: day.override_type ?? null,
    });
  };

  const renderRow = ({ item }: { item: PositionBasedResolvedDay }) => {
    const tone = statusTone(item.schedule_status);
    const label = statusLabel(item);

    // Per-render log — noise in a long list, but useful if a specific
    // card is showing the wrong thing.
    log('render row', {
      date: dateOnly(item.date),
      label,
      hasStart: !!item.expected_start,
      hasEnd: !!item.expected_end,
      is_override: item.is_override,
      override_type: item.override_type ?? null,
    });

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardDate}>{fmtDateLong(item.date)}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.work_center_name || item.work_center_code || '—'}
              {item.shift_name ? ` · ${item.shift_name}` : ''}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${tone}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: tone }]} />
            <Text style={[styles.statusPillText, { color: tone }]}>
              {label}
            </Text>
          </View>
        </View>

        {item.expected_start && item.expected_end ? (
          <View style={styles.timeStrip}>
            <View style={styles.timeCell}>
              <Icon name="clock-start" size={13} color="#10B981" />
              <Text style={styles.timeText}>
                {formatInstantInTz(item.expected_start, item.timezone)}
              </Text>
            </View>
            <Icon name="arrow-right" size={14} color="#CBD5E1" />
            <View style={styles.timeCell}>
              <Icon name="clock-end" size={13} color="#EF4444" />
              <Text style={styles.timeText}>
                {formatInstantInTz(item.expected_end, item.timezone)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyStrip}>
            <Icon name="minus-circle-outline" size={13} color="#94A3B8" />
            <Text style={styles.emptyStripText}>
              No expected window for this day
            </Text>
          </View>
        )}

        {item.timezone ? (
          <View style={styles.tzRow}>
            <Icon name="earth" size={11} color={TEXT_SECONDARY} />
            <Text style={styles.tzText}>{item.timezone}</Text>
          </View>
        ) : null}

        {item.is_on_leave ? (
          <View style={styles.badgeRow}>
            <Icon name="beach" size={11} color="#F59E0B" />
            <Text style={styles.badgeText}>
              On leave · {item.is_leave_paid ? 'paid' : 'unpaid'}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openOverrideEditor(item)}
            activeOpacity={0.85}
          >
            <Icon
              name={item.is_override ? 'pencil' : 'plus'}
              size={14}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.actionBtnText}>
              {item.is_override ? 'Edit override' : 'Add override'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            onPress={() => setCustomOpen(true)}
            style={[styles.chip, preset === 'custom' && styles.chipActive]}
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

        <View style={styles.userRow}>
          {subject ? (
            <View style={styles.selectedChip}>
              <UserAvatar
                userId={subject.user_id}
                username={subject.username}
                fullName={subject.full_name}
                size={22}
              />
              <Text style={styles.selectedChipText} numberOfLines={1}>
                {subject.full_name || subject.username || 'User'}
              </Text>
              <TouchableOpacity onPress={() => setSubject(null)}>
                <Icon name="close" size={13} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => setSubjectPickerOpen(true)}
              activeOpacity={0.85}
            >
              <Icon
                name="account-search-outline"
                size={16}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.pickBtnText}>Pick user</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!subject ? (
        <View style={styles.center}>
          <Icon name="account-question-outline" size={32} color="#94A3B8" />
          <Text style={styles.errTitle}>Pick a user</Text>
          <Text style={styles.errMsg}>
            Schedules are computed per user. Choose someone to preview their
            derived schedule for the selected range.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading schedule…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchPreview()}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPreview(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="calendar-blank-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No days</Text>
              <Text style={styles.errMsg}>
                Nothing to show for this range. Try widening the dates.
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
          log('custom range applied', r);
          setRange(r);
          setPreset('custom');
          setCustomOpen(false);
        }}
      />

      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType="employee"
        title="Preview schedule for"
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p: PickedSubject) => {
          log('subject picked', {
            user_id: p.user_id,
            full_name: p.full_name,
            username: p.username,
          });
          setSubject(p);
          setSubjectPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENT
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
    /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
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

  filterPanel: {
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 12,
  },
  chipsRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
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
  chipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  userRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  pickBtnText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: '700' },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    maxWidth: 220,
  },
  selectedChipText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
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
  cardDate: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  cardSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 3 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  timeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  timeCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  emptyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  emptyStripText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontStyle: 'italic',
  },

  tzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginLeft: 6,
  },
  tzText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Courier',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    marginLeft: 6,
  },
  badgeText: { color: '#B45309', fontSize: 11, fontWeight: '600' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  actionBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
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