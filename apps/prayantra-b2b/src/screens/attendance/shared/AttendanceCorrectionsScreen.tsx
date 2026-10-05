import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { createCorrection } from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  CorrectionType,
  OverrideStatus,
} from '@b2b/shared-types';

import { OVERRIDE_STATUSES } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import SubjectPickerSheet, {
  PickedSubject,
} from '../../../components/attendance/SubjectPickerSheet';

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

type CorrRouteProp = RouteProp<
  { AttendanceCorrections: { subjectType: AttendanceSubjectType } },
  'AttendanceCorrections'
>;

// ============================================================
// CONSTANTS
// ============================================================

const CORRECTION_TYPES: {
  value: CorrectionType;
  label: string;
  sub: string;
  icon: string;
}[] = [
  {
    value: 'manual_check_in',
    label: 'Manual Check-In',
    sub: 'Insert a check-in for the subject',
    icon: 'login',
  },
  {
    value: 'manual_check_out',
    label: 'Manual Check-Out',
    sub: 'Insert a check-out for the subject',
    icon: 'logout',
  },
  {
    value: 'attendance_adjustment',
    label: 'Adjustment',
    sub: 'Change the day status',
    icon: 'calendar-edit',
  },
  {
    value: 'manual_override',
    label: 'Manual Override',
    sub: 'Force the daily status',
    icon: 'shield-edit-outline',
  },
];

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  incomplete: 'Incomplete',
  weekly_off: 'Weekly off',
  holiday: 'Holiday',
  on_leave: 'On leave',
  not_scheduled: 'Not scheduled',
};

const CORRECTION_NEEDS_EVENT_TIME: CorrectionType[] = [
  'manual_check_in',
  'manual_check_out',
];

const CORRECTION_NEEDS_STATUS: CorrectionType[] = [
  'manual_override',
  'attendance_adjustment',
];

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isDateValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function isTimeValid(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceCorrectionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CorrRouteProp>();
  const { subjectType } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [subject, setSubject] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [correctionType, setCorrectionType] =
    useState<CorrectionType>('manual_check_in');
  const [businessDate, setBusinessDate] = useState(ymd(new Date()));
  const [eventTime, setEventTime] = useState('09:00');
  const [overrideStatus, setOverrideStatus] =
    useState<OverrideStatus>('present');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const needsEventTime = CORRECTION_NEEDS_EVENT_TIME.includes(correctionType);
  const needsStatus = CORRECTION_NEEDS_STATUS.includes(correctionType);

  const validationError = useMemo(() => {
    if (!subject) return 'Pick a subject';
    if (!isDateValid(businessDate)) return 'Business date must be YYYY-MM-DD';
    if (needsEventTime && !isTimeValid(eventTime))
      return 'Event time must be HH:MM';
    if (needsStatus && !overrideStatus) return 'Choose an override status';
    if (!reason.trim() || reason.trim().length < 3) return 'Reason is required';
    return null;
  }, [
    subject,
    businessDate,
    eventTime,
    needsEventTime,
    needsStatus,
    overrideStatus,
    reason,
  ]);

  const canSubmit = !validationError && !submitting;

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
      const payload: any = {
        target_user_id: subject!.user_id,
        subject_type: subjectType,
        business_date: businessDate,
        correction_type: correctionType,
        reason: reason.trim(),
      };

      if (needsEventTime) {
        // Server validates that event_time's date (in subject TZ)
        // matches business_date. Sending UTC works for typical cases;
        // if the subject's TZ is skewed, the server returns a clear
        // 400 and we surface it via Snackbar.
        payload.event_time = `${businessDate}T${eventTime}:00Z`;
      }
      if (needsStatus) {
        payload.override_status = overrideStatus;
      }

      const res: any = await createCorrection(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        payload,
      );

      const msg = res?.data?.message ?? 'Correction created successfully';
      setSnack({ text: msg, tone: 'ok' });

      setReason('');
      setTimeout(() => navigation.goBack(), 900);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create correction';
      setSnack({ text: msg, tone: 'err' });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

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
          {/* Subject */}
          <Text style={styles.sectionLabel}>Subject</Text>
          {subject ? (
            <View style={styles.subjectRow}>
              <UserAvatar
                userId={subject.user_id}
                username={subject.username}
                fullName={subject.full_name}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {subject.full_name ||
                    subject.username ||
                    subject.user_id}
                </Text>
                <Text style={styles.subjectSub} numberOfLines={1}>
                  {subject.user_id}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.subjectChange}
                onPress={() => setSubjectPickerOpen(true)}
              >
                <Icon name="pencil" size={14} color={PRIMARY_COLOR} />
                <Text style={styles.subjectChangeText}>Change</Text>
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
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.pickBtnText}>Pick {subjectType}</Text>
              <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}

          {/* Correction type */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Correction type
          </Text>
          <View style={styles.typeGrid}>
            {CORRECTION_TYPES.map((t) => {
              const active = correctionType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  activeOpacity={0.85}
                  onPress={() => setCorrectionType(t.value)}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      active && { backgroundColor: PRIMARY_COLOR },
                    ]}
                  >
                    <Icon
                      name={t.icon}
                      size={18}
                      color={active ? '#FFFFFF' : PRIMARY_COLOR}
                    />
                  </View>
                  <Text
                    style={[
                      styles.typeLabel,
                      active && { color: PRIMARY_COLOR },
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                  <Text style={styles.typeSub} numberOfLines={2}>
                    {t.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Business date */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Business date
          </Text>
          <View style={styles.row}>
            <RNTextInput
              style={[styles.input, { flex: 1 }]}
              value={businessDate}
              onChangeText={setBusinessDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => setBusinessDate(ymd(new Date()))}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setBusinessDate(ymd(y));
              }}
            >
              <Text style={styles.todayBtnText}>Yesterday</Text>
            </TouchableOpacity>
          </View>

          {/* Event time (conditional) */}
          {needsEventTime && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                Event time (24h HH:MM)
              </Text>
              <RNTextInput
                style={styles.input}
                value={eventTime}
                onChangeText={setEventTime}
                placeholder="09:00"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.helper}>
                Must fall on the business date in the subject's timezone.
              </Text>
            </>
          )}

          {/* Override status (conditional) */}
          {needsStatus && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                Override status
              </Text>
              <View style={styles.statusGrid}>
                {OVERRIDE_STATUSES.map((s) => {
                  const active = overrideStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusChip,
                        active && styles.statusChipActive,
                      ]}
                      onPress={() => setOverrideStatus(s)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          active && styles.statusChipTextActive,
                        ]}
                      >
                        {STATUS_LABEL[s] ?? s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Reason */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Reason</Text>
          <RNTextInput
            style={[styles.input, styles.textarea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why this correction is needed"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.helper}>{reason.length}/500</Text>

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
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Create Correction</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Subject picker — shared component, subject-type aware */}
      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType={subjectType}
        title={`Pick ${subjectType}`}
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p: PickedSubject) => {
          setSubject({
            user_id: p.user_id,
            full_name: p.full_name,
            username: p.username,
          });
          setSubjectPickerOpen(false);
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
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 12,
  },
  subjectName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  subjectSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  subjectChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  subjectChangeText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    gap: 10,
  },
  pickBtnText: {
    flex: 1,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  typeCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}15`,
    marginBottom: 10,
  },
  typeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  typeSub: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 3,
    lineHeight: 14,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
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
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  todayBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  todayBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '700',
  },
  helper: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 6,
  },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  statusChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },

  validation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
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
});