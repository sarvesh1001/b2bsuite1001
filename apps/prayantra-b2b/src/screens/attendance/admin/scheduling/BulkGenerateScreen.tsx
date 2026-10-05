import React, { useMemo, useState } from 'react';
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

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  generateScheduleForUser,
  generateScheduleForCompany,
} from '@b2b/api-client';

import type { GenerateScheduleResponse } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
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
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
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

function daysBetween(a: string, b: string): number {
  try {
    const x = new Date(a).getTime();
    const y = new Date(b).getTime();
    return Math.max(0, Math.round((y - x) / 86400000)) + 1;
  } catch {
    return 0;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function BulkGenerateScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const tomorrow = useMemo(() => ymd(addDays(new Date(), 1)), []);
  const weekAhead = useMemo(() => ymd(addDays(new Date(), 7)), []);

  const [mode, setMode] = useState<'user' | 'company'>('company');
  const [subject, setSubject] = useState<PickedSubject | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(weekAhead);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [includeHolidays, setIncludeHolidays] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GenerateScheduleResponse | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const validationError = useMemo(() => {
    if (mode === 'user' && !subject) return 'Pick a subject';
    if (!isDateValid(startDate)) return 'Start date must be YYYY-MM-DD';
    if (!isDateValid(endDate)) return 'End date must be YYYY-MM-DD';
    if (startDate > endDate) return 'Start date cannot be after end date';
    if (!timezone.trim()) return 'Timezone is required';
    return null;
  }, [mode, subject, startDate, endDate, timezone]);

  const canSubmit = !validationError && !submitting;

  const dayCount = useMemo(
    () => daysBetween(startDate, endDate),
    [startDate, endDate],
  );

  // ============================================================
  // PRESETS
  // ============================================================

  const applyPreset = (key: string) => {
    const today = new Date();
    switch (key) {
      case 'tomorrow':
        setStartDate(ymd(addDays(today, 1)));
        setEndDate(ymd(addDays(today, 1)));
        break;
      case '7d':
        setStartDate(ymd(addDays(today, 1)));
        setEndDate(ymd(addDays(today, 7)));
        break;
      case '14d':
        setStartDate(ymd(addDays(today, 1)));
        setEndDate(ymd(addDays(today, 14)));
        break;
      case '30d':
        setStartDate(ymd(addDays(today, 1)));
        setEndDate(ymd(addDays(today, 30)));
        break;
      case 'month':
        const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        setStartDate(ymd(first));
        setEndDate(ymd(last));
        break;
    }
  };

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
      const payload: any = {
        start_date: startDate,
        end_date: endDate,
        timezone: timezone.trim(),
        include_holidays: includeHolidays,
        overwrite,
        batch_size: 100,
      };

      let res: any;
      if (mode === 'user' && subject) {
        res = await generateScheduleForUser(
          companyId,
          subject.user_id,
          deviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
      } else {
        res = await generateScheduleForCompany(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
      }

      const data: GenerateScheduleResponse = {
        message: res?.message ?? 'Schedule generated',
        instances: res?.instances ?? res?.data?.instances ?? 0,
        data: res?.data ?? [],
      };

      setResult(data);
      setResultModalOpen(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to generate schedule',
        tone: 'err',
      });
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
          {/* Intro */}
          <View style={styles.intro}>
            <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.introText}>
              Generation only creates instances for future dates (strictly
              after today). Past days are ignored.
            </Text>
          </View>

          {/* Mode */}
          <Text style={styles.sectionLabel}>Scope</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                mode === 'company' && styles.modeCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setMode('company')}
            >
              <Icon
                name="domain"
                size={20}
                color={mode === 'company' ? PRIMARY_COLOR : '#94A3B8'}
              />
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'company' && { color: PRIMARY_COLOR },
                ]}
              >
                Whole Company
              </Text>
              <Text style={styles.modeDesc}>
                All active employees with a resolvable work center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeCard,
                mode === 'user' && styles.modeCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setMode('user')}
            >
              <Icon
                name="account"
                size={20}
                color={mode === 'user' ? PRIMARY_COLOR : '#94A3B8'}
              />
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'user' && { color: PRIMARY_COLOR },
                ]}
              >
                Single Subject
              </Text>
              <Text style={styles.modeDesc}>
                One employee, one shift seed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subject picker (user mode) */}
          {mode === 'user' ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
                Subject
              </Text>
              {subject ? (
                <View style={styles.subjectRow}>
                  <View style={styles.subjectIcon}>
                    <Icon name="account" size={18} color={PRIMARY_COLOR} />
                  </View>
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
                    <Icon name="pencil" size={13} color={PRIMARY_COLOR} />
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
                  <Text style={styles.pickBtnText}>Pick employee</Text>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : null}

          {/* Date range */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Date range
          </Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>Start</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>End</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.presets}>
            <PresetBtn label="Tomorrow" onPress={() => applyPreset('tomorrow')} />
            <PresetBtn label="Next 7 days" onPress={() => applyPreset('7d')} />
            <PresetBtn label="Next 14 days" onPress={() => applyPreset('14d')} />
            <PresetBtn label="Next 30 days" onPress={() => applyPreset('30d')} />
            <PresetBtn label="Next month" onPress={() => applyPreset('month')} />
          </View>

          {dayCount > 0 ? (
            <View style={styles.durationBar}>
              <Icon name="calendar-range" size={14} color={PRIMARY_COLOR} />
              <Text style={styles.durationText}>
                {dayCount} day{dayCount === 1 ? '' : 's'} in range
              </Text>
            </View>
          ) : null}

          {/* Timezone */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Timezone
          </Text>
          <TextInput
            style={styles.input}
            value={timezone}
            onChangeText={setTimezone}
            placeholder="Asia/Kolkata"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Options */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Options
          </Text>
          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Include holidays</Text>
              <Text style={styles.optionSub}>
                Also create instances on holiday dates
              </Text>
            </View>
            <Switch
              value={includeHolidays}
              onValueChange={setIncludeHolidays}
              color={PRIMARY_COLOR}
            />
          </View>
          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Overwrite existing</Text>
              <Text style={styles.optionSub}>
                Replace any existing active schedule on the same day
              </Text>
            </View>
            <Switch
              value={overwrite}
              onValueChange={setOverwrite}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Preview */}
          {mode === 'company' && canSubmit ? (
            <View style={styles.previewCard}>
              <Icon name="alert-outline" size={14} color="#0369A1" />
              <Text style={styles.previewText}>
                This will attempt to generate schedules for every active
                employee across the company for the range above. Only days
                where the employee has a resolvable work-center + shift
                mapping will produce an instance.
              </Text>
            </View>
          ) : null}

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
                <Icon name="auto-fix" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Generate schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Subject picker */}
      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType="employee"
        title="Pick employee"
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p) => {
          setSubject(p);
          setSubjectPickerOpen(false);
        }}
      />

      {/* Result modal */}
      <Modal
        visible={resultModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setResultModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.resultIcon}>
              <Icon name="check-circle" size={28} color="#10B981" />
            </View>
            <Text style={styles.resultTitle}>Schedule generated</Text>
            <Text style={styles.resultMessage}>
              {result?.instances ?? 0} instance
              {result?.instances === 1 ? '' : 's'} created
            </Text>
            <Text style={styles.resultSub}>
              {result?.message ?? ''}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={() => setResultModalOpen(false)}
              >
                <Text style={styles.modalBtnGhostText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => {
                  setResultModalOpen(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3200}
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
// SUBCOMPONENTS
// ============================================================

function PresetBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.presetChip}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.presetChipText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
    marginBottom: 22,
  },
  introText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
  },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 6,
  },
  modeCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}06`,
  },
  modeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  modeDesc: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    lineHeight: 13,
  },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
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
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
  },
  pickBtnText: {
    flex: 1,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },

  dateRow: { flexDirection: 'row', gap: 10 },
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

  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  presetChipText: {
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

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
  },
  optionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  optionSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
  },
  previewText: {
    flex: 1,
    color: '#075985',
    fontSize: 11,
    lineHeight: 16,
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
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    marginBottom: 14,
  },
  resultTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultMessage: {
    color: PRIMARY_COLOR,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  resultSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
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