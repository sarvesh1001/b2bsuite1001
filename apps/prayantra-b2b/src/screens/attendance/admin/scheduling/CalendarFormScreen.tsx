import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Snackbar,
  Switch,
} from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  createWorkCalendar,
  getWorkCalendar,
  updateWorkCalendar,
} from '@b2b/api-client';

import type {
  WorkCalendar,
  WorkCalendarHoliday,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';

// ── NEW: shared tz picker + helpers ───────────────────────
import { TimeZonePicker } from '../../../../components/TimeZonePicker';
import { isSupportedTimezone } from '../../../../utils/timezone';
import { DEFAULT_COMPANY_TIMEZONE } from '../../../../constants/timezones';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type FormRouteProp = RouteProp<
  { AttendanceCalendarForm: { calendarId?: string } },
  'AttendanceCalendarForm'
>;

const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 0, label: 'Sunday', short: 'S' },
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
];

// ── REMOVED: local COMMON_TIMEZONES. Now handled by TimeZonePicker.

// ============================================================
// HELPERS
// ============================================================

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

export default function CalendarFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRouteProp>();
  const { calendarId } = route.params || {};
  const isEdit = !!calendarId;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const currentYear = new Date().getFullYear();

  const [name, setName] = useState(`${currentYear} Company Calendar`);
  const [year, setYear] = useState(String(currentYear));
  // ── CHANGED: default to company-preferred tz.
  const [timezone, setTimezone] = useState<string>(DEFAULT_COMPANY_TIMEZONE);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = useState<WorkCalendarHoliday[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // ── REMOVED: tzModalOpen — TimeZonePicker owns its modal.

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // LOAD
  // ============================================================

  useEffect(() => {
    if (!isEdit) return;
    if (!companyId || !deviceId || !accessToken || !calendarId) return;

    (async () => {
      try {
        const res: any = await getWorkCalendar(
          companyId,
          calendarId,
          deviceId,
          accessToken,
        );
        const c: WorkCalendar | null = res?.data ?? res ?? null;
        if (!c) return;

        setName(c.name);
        setYear(String(c.year));
        setTimezone(c.timezone || DEFAULT_COMPANY_TIMEZONE);
        setWorkingDays(c.working_days ?? [1, 2, 3, 4, 5]);
        setIsActive(c.is_active ?? true);

        // Backend returns holidays as Record<string, {date, name}>.
        const holidayArr: WorkCalendarHoliday[] = Object.values(
          c.holidays ?? {},
        ).map((h: any) => ({
          date: h.date ?? '',
          name: h.name ?? '',
        }));
        setHolidays(holidayArr);
      } catch (err: any) {
        setSnack({
          text:
            err?.response?.data?.error ||
            err?.message ||
            'Failed to load calendar',
          tone: 'err',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, deviceId, accessToken, calendarId, isEdit]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!name.trim()) return 'Name is required';
    const yNum = Number(year);
    if (!yNum || yNum < 2000 || yNum > 2100) {
      return 'Year must be between 2000 and 2100';
    }
    if (workingDays.length === 0) return 'Pick at least one working day';
    if (!timezone.trim()) return 'Timezone is required';
    // ── NEW: validate tz against IANA allow-list.
    if (!isSupportedTimezone(timezone)) {
      return `'${timezone}' is not a valid IANA timezone`;
    }
    for (const h of holidays) {
      if (!isDateValid(h.date)) return `Holiday "${h.name}" has invalid date`;
      if (!h.name.trim()) return 'Holiday name is required';
    }
    return null;
  }, [name, year, workingDays, timezone, holidays]);

  const canSubmit = !validationError && !submitting;

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (validationError) {
      setSnack({ text: validationError, tone: 'err' });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && calendarId) {
        await updateWorkCalendar(
          companyId,
          calendarId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            name: name.trim(),
            timezone: timezone.trim(),
            working_days: workingDays,
            holidays,
            is_active: isActive,
          },
        );
        setSnack({ text: 'Calendar updated', tone: 'ok' });
      } else {
        await createWorkCalendar(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            year: Number(year),
            name: name.trim(),
            timezone: timezone.trim(),
            working_days: workingDays,
            holidays,
            is_active: isActive,
          },
        );
        setSnack({ text: 'Calendar created', tone: 'ok' });
      }
      setTimeout(() => navigation.goBack(), 800);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to save calendar',
        tone: 'err',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading calendar…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <Text style={styles.sectionLabel}>Calendar name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={`${currentYear} Company Calendar`}
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
          />

          {/* Year */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Year</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={(t) => setYear(t.replace(/[^\d]/g, ''))}
            placeholder="2025"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            editable={!isEdit}
          />
          {isEdit ? (
            <Text style={styles.helperText}>
              Year cannot be changed after creation.
            </Text>
          ) : null}

          {/* ── NEW: shared TimeZonePicker replaces the local picker. */}
          <View style={{ marginTop: 20 }}>
            <TimeZonePicker
              label="Timezone *"
              hint="IANA timezone — days roll at midnight in this zone."
              value={timezone}
              onChange={setTimezone}
            />
          </View>

          {/* Working days */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Working days
          </Text>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => {
              const active = workingDays.includes(wd.value);
              return (
                <TouchableOpacity
                  key={wd.value}
                  onPress={() =>
                    setWorkingDays((prev) =>
                      active
                        ? prev.filter((x) => x !== wd.value)
                        : [...prev, wd.value].sort((a, b) => a - b),
                    )
                  }
                  style={[styles.weekBtn, active && styles.weekBtnActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.weekBtnText,
                      active && styles.weekBtnTextActive,
                    ]}
                  >
                    {wd.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helperText}>
            {workingDays.length} day{workingDays.length === 1 ? '' : 's'} per
            week.
          </Text>

          {/* Holidays */}
          <View style={styles.holidayHeader}>
            <Text style={styles.sectionLabel}>
              Holidays ({holidays.length})
            </Text>
            <TouchableOpacity
              style={styles.holidayAddBtn}
              onPress={() => setHolidayModalOpen(true)}
            >
              <Icon name="plus" size={14} color={PRIMARY_COLOR} />
              <Text style={styles.holidayAddText}>Add holiday</Text>
            </TouchableOpacity>
          </View>

          {holidays.length === 0 ? (
            <View style={styles.emptyHolidayBox}>
              <Icon
                name="party-popper"
                size={22}
                color="#94A3B8"
              />
              <Text style={styles.emptyHolidayText}>
                No holidays yet. Add public holidays, festivals, etc.
              </Text>
            </View>
          ) : (
            holidays
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h, idx) => (
                <View key={idx} style={styles.holidayRow}>
                  <View style={styles.holidayDateCell}>
                    <Icon
                      name="calendar-blank-outline"
                      size={13}
                      color={PRIMARY_COLOR}
                    />
                    <Text style={styles.holidayDate}>{h.date}</Text>
                  </View>
                  <Text style={styles.holidayName} numberOfLines={1}>
                    {h.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.holidayRemove}
                    onPress={() =>
                      setHolidays((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    <Icon name="close" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
          )}

          {/* Active */}
          <View style={styles.activeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeLabel}>Calendar active</Text>
              <Text style={styles.activeSub}>
                Only active calendars can be used by templates
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Validation */}
          {validationError ? (
            <View style={styles.validation}>
              <Icon name="alert-circle-outline" size={14} color="#B45309" />
              <Text style={styles.validationText}>{validationError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submit, !canSubmit && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon
                  name={isEdit ? 'content-save-outline' : 'plus'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.submitText}>
                  {isEdit ? 'Save changes' : 'Create calendar'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── REMOVED: SimplePickerModal for timezone. */}
      {/*    TimeZonePicker owns its own modal now. */}

      {/* Holiday add modal */}
      <HolidayModal
        visible={holidayModalOpen}
        year={Number(year) || currentYear}
        onClose={() => setHolidayModalOpen(false)}
        onAdd={(h) => {
          setHolidays((prev) => [...prev, h]);
          setHolidayModalOpen(false);
        }}
      />

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3000}
        style={{
          backgroundColor: snack?.tone === 'ok' ? '#065F46' : '#991B1B',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>{snack?.text ?? ''}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

// ============================================================
// HOLIDAY MODAL — unchanged (still in use)
// ============================================================

function HolidayModal({
  visible,
  year,
  onClose,
  onAdd,
}: {
  visible: boolean;
  year: number;
  onClose: () => void;
  onAdd: (h: WorkCalendarHoliday) => void;
}) {
  const [date, setDate] = useState(`${year}-01-01`);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setDate(`${year}-01-01`);
      setName('');
    }
  }, [visible, year]);

  const valid = isDateValid(date) && name.trim().length >= 2;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdropCenter}>
        <View style={styles.dialogCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add holiday</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <Text style={styles.dialogLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder={`${year}-12-25`}
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />

          <Text style={[styles.dialogLabel, { marginTop: 12 }]}>
            Name
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Christmas Day"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
          />

          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtnPrimary, !valid && { opacity: 0.5 }]}
              disabled={!valid}
              onPress={() => onAdd({ date, name: name.trim() })}
            >
              <Text style={styles.modalBtnPrimaryText}>Add</Text>
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  // ── REMOVED: selectInput, selectInputText — picker supplies its own.

  helperText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },

  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  weekBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  weekBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
  },
  weekBtnTextActive: { color: '#FFFFFF' },

  holidayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  holidayAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  holidayAddText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },

  emptyHolidayBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
  },
  emptyHolidayText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 240,
  },

  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 6,
  },
  holidayDateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  holidayDate: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  holidayName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  holidayRemove: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  activeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  activeSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  validation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  validationText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // ── REMOVED: modalBackdrop, modalCard, modalGrabber, modalRow,
  //    modalRowActive, modalRowText, modalHeader, modalTitle, closeBtn.
  //    These were only for SimplePickerModal which is now gone.
  //    HolidayModal has its own styles below.

  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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

  dialogLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
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
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});