import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

import {
  createExemption,
  updateExemption,
} from '@b2b/api-client';

import type { AttendanceSubjectType } from '@b2b/shared-types';

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

type FormRouteProp = RouteProp<
  { AttendanceExemptionForm: { exemptionId?: string } },
  'AttendanceExemptionForm'
>;

const SUBJECT_OPTIONS: AttendanceSubjectType[] = [
  'employee',
  'student',
  'customer',
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

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceExemptionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRouteProp>();
  const { exemptionId } = route.params || {};
  const isEdit = !!exemptionId;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [subjectType, setSubjectType] =
    useState<AttendanceSubjectType>('employee');
  const [subject, setSubject] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [fromDate, setFromDate] = useState(ymd(new Date()));
  const [toDate, setToDate] = useState(ymd(new Date()));
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!subject) return 'Pick a subject';
    if (!isDateValid(fromDate)) return 'From date must be YYYY-MM-DD';
    if (!isDateValid(toDate)) return 'To date must be YYYY-MM-DD';
    if (fromDate > toDate) return 'From date cannot be after to date';
    return null;
  }, [subject, fromDate, toDate]);

  const canSubmit = !validationError && !submitting;

  const dayCount = useMemo(() => {
    if (!isDateValid(fromDate) || !isDateValid(toDate)) return 0;
    if (fromDate > toDate) return 0;
    const a = new Date(fromDate).getTime();
    const b = new Date(toDate).getTime();
    return Math.round((b - a) / 86400000) + 1;
  }, [fromDate, toDate]);

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
      if (isEdit && exemptionId) {
        await updateExemption(
          companyId,
          exemptionId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            from_date: fromDate,
            to_date: toDate,
            reason: reason.trim() || null,
          },
        );
        setSnack({ text: 'Exemption updated', tone: 'ok' });
      } else {
        await createExemption(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            subject_type: subjectType,
            subject_id: subject!.user_id,
            from_date: fromDate,
            to_date: toDate,
            reason: reason.trim() || null,
          },
        );
        setSnack({ text: 'Exemption created', tone: 'ok' });
      }
      setTimeout(() => navigation.goBack(), 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save exemption';
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
          {/* Subject type (create only — immutable on edit) */}
          {!isEdit ? (
            <>
              <Text style={styles.sectionLabel}>Subject type</Text>
              <View style={styles.typeGrid}>
                {SUBJECT_OPTIONS.map((t) => {
                  const active = subjectType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => {
                        setSubjectType(t);
                        setSubject(null);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          active && styles.typeChipTextActive,
                        ]}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Subject picker */}
          <Text style={[styles.sectionLabel, { marginTop: isEdit ? 0 : 20 }]}>
            {isEdit ? 'Subject' : `Pick ${subjectType}`}
          </Text>
          {isEdit ? (
            <View style={styles.immutableRow}>
              <Icon name="lock-outline" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.immutableText}>
                Subject cannot be changed after creation
              </Text>
            </View>
          ) : subject ? (
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
                style={styles.changeBtn}
                onPress={() => setSubjectPickerOpen(true)}
              >
                <Icon name="pencil" size={14} color={PRIMARY_COLOR} />
                <Text style={styles.changeBtnText}>Change</Text>
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

          {/* Date range */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Date range
          </Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>From</Text>
              <TextInput
                style={styles.input}
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>To</Text>
              <TextInput
                style={styles.input}
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={styles.quickDates}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                const today = ymd(new Date());
                setFromDate(today);
                setToDate(today);
              }}
            >
              <Text style={styles.quickChipText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                const tomorrow = ymd(d);
                setFromDate(tomorrow);
                setToDate(tomorrow);
              }}
            >
              <Text style={styles.quickChipText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                const start = ymd(new Date());
                const end = new Date();
                end.setDate(end.getDate() + 6);
                setFromDate(start);
                setToDate(ymd(end));
              }}
            >
              <Text style={styles.quickChipText}>Next 7 days</Text>
            </TouchableOpacity>
          </View>

          {/* Duration preview */}
          {dayCount > 0 ? (
            <View style={styles.durationBar}>
              <Icon name="calendar-range" size={14} color={PRIMARY_COLOR} />
              <Text style={styles.durationText}>
                Exempting {dayCount} day{dayCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}

          {/* Reason */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Reason (optional)
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Medical leave, Approved training"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.helper}>{reason.length}/300</Text>

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
                  {isEdit ? 'Save changes' : 'Create exemption'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {!isEdit ? (
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
      ) : null}

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
  scroll: { padding: 20, paddingBottom: 60 },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  typeChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  typeChipTextActive: { color: '#FFFFFF' },

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
  subjectSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  changeBtnText: {
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

  immutableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  immutableText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateFieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
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
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  quickDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  quickChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },

  durationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  durationText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },

  helper: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 6,
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