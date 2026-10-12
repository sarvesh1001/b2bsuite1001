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

  const {
    companyId,
    deviceId,
    accessToken,
    locationId: activeLocationId,
    // Locations the caller can see. For ALL-scope callers this is every
    // active location in the company; for SELECTED it's their granted set;
    // for PRIMARY it's just their primary. Sourced from the persisted
    // userAuthStore so no extra network call is needed here.
    accessibleLocations: locations,
  } = useUserAuthStore();

  // ALL-scope callers may create either company-wide or location-scoped
  // calendars. Location-scope callers are locked to their active location.
  const isAllScope = !activeLocationId || activeLocationId === 'ALL';

  const currentYear = new Date().getFullYear();

  const [name, setName] = useState(`${currentYear} Company Calendar`);
  const [year, setYear] = useState(String(currentYear));
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = useState<WorkCalendarHoliday[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Scope selection
  //   'company'  → location_id = null  (only permitted for ALL-scope callers)
  //   'location' → location_id = scopeLocationId
  const [scope, setScope] = useState<'company' | 'location'>('company');
  const [scopeLocationId, setScopeLocationId] = useState<string | null>(null);

  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // INITIAL SCOPE DEFAULTS
  // ============================================================
  // - ALL-scope caller → default to company-wide
  // - Location-scope caller → default to their active location, locked
  useEffect(() => {
    if (isEdit) return;
    if (isAllScope) {
      setScope('company');
      setScopeLocationId(null);
    } else {
      setScope('location');
      setScopeLocationId(activeLocationId ?? null);
    }
  }, [isEdit, isAllScope, activeLocationId]);

  // ============================================================
  // LOAD (edit mode)
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
        setWorkingDays(c.working_days ?? [1, 2, 3, 4, 5]);
        setIsActive(c.is_active ?? true);

        // Scope: if the row has a location_id, it's location-scoped.
        if (c.location_id) {
          setScope('location');
          setScopeLocationId(c.location_id);
        } else {
          setScope('company');
          setScopeLocationId(null);
        }

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
    if (scope === 'location' && !scopeLocationId) {
      return 'Pick a location for this calendar';
    }
    for (const h of holidays) {
      if (!isDateValid(h.date)) return `Holiday "${h.name}" has invalid date`;
      if (!h.name.trim()) return 'Holiday name is required';
    }
    return null;
  }, [name, year, workingDays, scope, scopeLocationId, holidays]);

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

    // location_id is only sent when the scope is location. Company-wide
    // calendars omit it — resolveTargetLocation interprets nil as
    // "company-wide" for ALL-scope callers.
    const payloadLocationId =
      scope === 'location' ? scopeLocationId ?? undefined : undefined;

    setSubmitting(true);
    try {
      if (isEdit && calendarId) {
        // Location is not editable after creation (the update payload has
        // no location_id field). We only send name/working_days/etc.
        await updateWorkCalendar(
          companyId,
          calendarId,
          deviceId,
          accessToken,
          activeLocationId ?? '',
          {
            name: name.trim(),
            working_days: workingDays,
            holidays,
            is_active: isActive,
          },
        );
        setSnack({ text: 'Calendar updated', tone: 'ok' });
      } else {
        const body: any = {
          year: Number(year),
          name: name.trim(),
          working_days: workingDays,
          holidays,
          is_active: isActive,
        };
        if (payloadLocationId) {
          body.location_id = payloadLocationId;
        }

        await createWorkCalendar(
          companyId,
          deviceId,
          accessToken,
          activeLocationId ?? '',
          body,
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

  const selectedLocation = locations.find(
    (l) => l.location_id === scopeLocationId,
  );

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
          {/* ==================================================
              SCOPE — who this calendar applies to.
              Read-only in edit mode: location cannot be changed
              after creation.
          ================================================== */}
          <Text style={styles.sectionLabel}>Scope</Text>

          {isEdit ? (
            <View style={styles.scopeReadonly}>
              <Icon
                name={scope === 'company' ? 'domain' : 'map-marker-outline'}
                size={16}
                color={PRIMARY_COLOR}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.scopeReadonlyLabel}>
                  {scope === 'company' ? 'Company-wide' : 'Location'}
                </Text>
                <Text style={styles.scopeReadonlyValue} numberOfLines={1}>
                  {scope === 'company'
                    ? 'Applies to every location'
                    : selectedLocation?.location_name ||
                      scopeLocationId?.slice(0, 8) + '…' ||
                      '—'}
                </Text>
              </View>
              <Text style={styles.scopeReadonlyHint}>Locked</Text>
            </View>
          ) : (
            <>
              <View style={styles.scopeChips}>
                <TouchableOpacity
                  style={[
                    styles.scopeChip,
                    scope === 'company' && styles.scopeChipActive,
                  ]}
                  activeOpacity={0.85}
                  disabled={!isAllScope}
                  onPress={() => {
                    if (!isAllScope) return;
                    setScope('company');
                    setScopeLocationId(null);
                  }}
                >
                  <Icon
                    name="domain"
                    size={16}
                    color={
                      scope === 'company'
                        ? '#FFFFFF'
                        : !isAllScope
                        ? '#CBD5E1'
                        : TEXT_SECONDARY
                    }
                  />
                  <Text
                    style={[
                      styles.scopeChipText,
                      scope === 'company' && styles.scopeChipTextActive,
                      !isAllScope && { color: '#CBD5E1' },
                    ]}
                  >
                    Company-wide
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scopeChip,
                    scope === 'location' && styles.scopeChipActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setScope('location');
                    if (
                      !scopeLocationId &&
                      activeLocationId &&
                      activeLocationId !== 'ALL'
                    ) {
                      setScopeLocationId(activeLocationId);
                    }
                  }}
                >
                  <Icon
                    name="map-marker-outline"
                    size={16}
                    color={scope === 'location' ? '#FFFFFF' : TEXT_SECONDARY}
                  />
                  <Text
                    style={[
                      styles.scopeChipText,
                      scope === 'location' && styles.scopeChipTextActive,
                    ]}
                  >
                    Specific location
                  </Text>
                </TouchableOpacity>
              </View>

              {!isAllScope ? (
                <Text style={styles.helperText}>
                  You can only create calendars for your active location.
                </Text>
              ) : scope === 'company' ? (
                <Text style={styles.helperText}>
                  One company-wide calendar per year. Applies everywhere the
                  location-specific calendar doesn't override.
                </Text>
              ) : null}

              {/* Location picker — only when scope === 'location' */}
              {scope === 'location' ? (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                    Location
                  </Text>
                  <TouchableOpacity
                    style={styles.locationPick}
                    onPress={() => setLocationPickerOpen(true)}
                    activeOpacity={0.85}
                    disabled={!isAllScope}
                  >
                    <Icon
                      name="map-marker-outline"
                      size={16}
                      color={PRIMARY_COLOR}
                    />
                    <Text
                      style={[
                        styles.locationPickText,
                        !selectedLocation && styles.locationPickPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedLocation?.location_name ??
                        (scopeLocationId
                          ? scopeLocationId.slice(0, 8) + '…'
                          : 'Pick a location')}
                    </Text>
                    <Icon
                      name="chevron-down"
                      size={16}
                      color={TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          )}

          {/* Name */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Calendar name
          </Text>
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
              <Icon name="party-popper" size={22} color="#94A3B8" />
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

      {/* Location picker */}
      <Modal
        visible={locationPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalCard} edges={['bottom']}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a location</Text>
              <TouchableOpacity
                onPress={() => setLocationPickerOpen(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {locations.length === 0 ? (
                <View style={styles.emptyPicker}>
                  <Icon
                    name="map-marker-off-outline"
                    size={26}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyPickerText}>
                    No locations available.
                  </Text>
                </View>
              ) : (
                locations.map((l) => {
                  const active = l.location_id === scopeLocationId;
                  return (
                    <TouchableOpacity
                      key={l.location_id}
                      style={[
                        styles.modalRow,
                        active && styles.modalRowActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setScopeLocationId(l.location_id);
                        setLocationPickerOpen(false);
                      }}
                    >
                      <View style={styles.modalRowIcon}>
                        <Icon
                          name="map-marker-outline"
                          size={18}
                          color={PRIMARY_COLOR}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalRowTitle} numberOfLines={1}>
                          {l.location_name}
                        </Text>
                        {l.location_code ? (
                          <Text style={styles.modalRowSub}>
                            {l.location_code}
                          </Text>
                        ) : null}
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
// HOLIDAY MODAL
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

          <Text style={[styles.dialogLabel, { marginTop: 12 }]}>Name</Text>
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

  helperText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },

  scopeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  scopeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scopeChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  scopeChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  scopeChipTextActive: { color: '#FFFFFF' },

  scopeReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  scopeReadonlyLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
  scopeReadonlyValue: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  scopeReadonlyHint: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  locationPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  locationPickText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  locationPickPlaceholder: {
    color: TEXT_SECONDARY,
    fontWeight: '400',
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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

  emptyPicker: { alignItems: 'center', paddingVertical: 30 },
  emptyPickerText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 8 },

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