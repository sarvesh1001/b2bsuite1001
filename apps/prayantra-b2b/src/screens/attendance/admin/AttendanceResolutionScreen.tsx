import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar, Switch } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  resolveEvent,
  resolveDay,
  batchResolveEvents,
  resolveByPeriod,
} from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  ResolveDayPayload,
} from '@b2b/shared-types';

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

type ActionKey = 'event' | 'day' | 'batch' | 'period';

interface ActionDef {
  key: ActionKey;
  label: string;
  sub: string;
  icon: string;
  tone: string;
}

const ACTIONS: ActionDef[] = [
  {
    key: 'day',
    label: 'Resolve Day',
    sub: 'One subject, one date',
    icon: 'calendar-refresh',
    tone: '#3B82F6',
  },
  {
    key: 'event',
    label: 'Resolve Event',
    sub: 'Recompute the day of an event',
    icon: 'refresh',
    tone: '#8B5CF6',
  },
  {
    key: 'batch',
    label: 'Batch Events',
    sub: 'Resolve up to 1000 event IDs',
    icon: 'layers-triple-outline',
    tone: '#F59E0B',
  },
  {
    key: 'period',
    label: 'Resolve Period',
    sub: 'Date range for one subject',
    icon: 'calendar-range',
    tone: '#10B981',
  },
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isUUIDish(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
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

export default function AttendanceResolutionScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [action, setAction] = useState<ActionKey | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // Form state (shared across actions; reset on open)
  const [eventId, setEventId] = useState('');
  const [batchIds, setBatchIds] = useState('');
  const [subject, setSubject] = useState<PickedSubject | null>(null);
  const [subjectType, setSubjectType] = useState<AttendanceSubjectType>('employee');
  const [date, setDate] = useState(ymd(new Date()));
  const [startDate, setStartDate] = useState(ymd(new Date()));
  const [endDate, setEndDate] = useState(ymd(new Date()));
  const [recalculate, setRecalculate] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleOpen = (key: ActionKey) => {
    setAction(key);
    // Reset per-open
    setEventId('');
    setBatchIds('');
    setSubject(null);
    setSubjectType('employee');
    const today = ymd(new Date());
    setDate(today);
    setStartDate(today);
    setEndDate(today);
    setRecalculate(true);
    setOpen(true);
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
    setAction(null);
  };

  // ============================================================
  // VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!action) return null;

    if (action === 'event') {
      if (!isUUIDish(eventId)) return 'Paste a valid event UUID';
      return null;
    }

    if (action === 'batch') {
      const ids = batchIds
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) return 'Paste at least one event UUID';
      if (ids.length > 1000) return 'Maximum 1000 events per batch';
      const bad = ids.find((id) => !isUUIDish(id));
      if (bad) return `Invalid UUID: ${bad.slice(0, 12)}…`;
      return null;
    }

    if (action === 'day') {
      if (!subject) return 'Pick a subject';
      if (!isDateValid(date)) return 'Date must be YYYY-MM-DD';
      return null;
    }

    if (action === 'period') {
      if (!subject) return 'Pick a subject';
      if (!isDateValid(startDate) || !isDateValid(endDate)) {
        return 'Both dates must be YYYY-MM-DD';
      }
      if (startDate > endDate) return 'Start date cannot be after end date';
      return null;
    }

    return null;
  }, [action, eventId, batchIds, subject, date, startDate, endDate]);

  const canSubmit = !validationError && !busy && !!action;

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (validationError || !action) return;

    setBusy(true);
    try {
      if (action === 'event') {
        const res: any = await resolveEvent(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          { event_id: eventId.trim() },
        );
        setSnack({
          text: res?.message ?? 'Event queued for resolution',
          tone: 'ok',
        });
      } else if (action === 'batch') {
        const ids = batchIds
          .split(/[\s,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const res: any = await batchResolveEvents(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          { event_ids: ids },
        );
        const count = res?.data?.processed_count ?? ids.length;
        setSnack({ text: `Batch queued · ${count} events`, tone: 'ok' });
      } else if (action === 'day' && subject) {
        const payload: ResolveDayPayload = {
          user_id: subject.user_id,
          date,
          recalculate,
          subject_type: subjectType,
        };
        const res: any = await resolveDay(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
        setSnack({
          text:
            res?.message ??
            (recalculate ? 'Recalculation queued' : 'Resolution queued'),
          tone: 'ok',
        });
      } else if (action === 'period' && subject) {
        const res: any = await resolveByPeriod(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            user_ids: [subject.user_id],
            start_date: startDate,
            end_date: endDate,
            recalculate,
            subject_type: subjectType,
          },
        );
        setSnack({
          text: res?.message ?? 'Period resolution queued',
          tone: 'ok',
        });
      }
      handleClose();
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Resolution failed',
        tone: 'err',
      });
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const activeAction = ACTIONS.find((a) => a.key === action) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Intro */}
        <View style={styles.intro}>
          <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.introText}>
            The resolver normally runs automatically via Kafka. Use these
            actions to force a recalculation when a summary looks stale.
          </Text>
        </View>

        {/* Actions */}
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => handleOpen(a.key)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${a.tone}15` }]}>
              <Icon name={a.icon} size={20} color={a.tone} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionSub}>{a.sub}</Text>
            </View>
            <Icon name="chevron-right" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <Text style={styles.helper}>
          Recalculation skips days that are locked by payroll. If you don't
          see a change, check the payroll lock on that subject/day.
        </Text>
      </ScrollView>

      {/* Action modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <SafeAreaView style={styles.modalCard} edges={['bottom']}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              {activeAction ? (
                <>
                  <View
                    style={[
                      styles.modalHeaderIcon,
                      { backgroundColor: `${activeAction.tone}15` },
                    ]}
                  >
                    <Icon
                      name={activeAction.icon}
                      size={16}
                      color={activeAction.tone}
                    />
                  </View>
                  <Text style={styles.modalTitle}>
                    {activeAction.label}
                  </Text>
                </>
              ) : null}
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              keyboardShouldPersistTaps="handled"
            >
              {action === 'event' ? (
                <>
                  <Text style={styles.fieldLabel}>Event UUID</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 70 }]}
                    value={eventId}
                    onChangeText={setEventId}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </>
              ) : null}

              {action === 'batch' ? (
                <>
                  <Text style={styles.fieldLabel}>
                    Event UUIDs (comma or newline separated)
                  </Text>
                  <TextInput
                    style={[styles.input, { minHeight: 140 }]}
                    value={batchIds}
                    onChangeText={setBatchIds}
                    placeholder="Paste event IDs here…"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <Text style={styles.helperSmall}>
                    Up to 1000 events. The backend caps batch size server-side.
                  </Text>
                </>
              ) : null}

              {action === 'day' || action === 'period' ? (
                <>
                  <Text style={styles.fieldLabel}>Subject type</Text>
                  <View style={styles.typeGrid}>
                    {(['employee', 'student', 'customer'] as const).map((t) => {
                      const active = subjectType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.typeChip,
                            active && styles.typeChipActive,
                          ]}
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

                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    Subject
                  </Text>
                  {subject ? (
                    <View style={styles.subjectRow}>
                      <UserAvatar
                        userId={subject.user_id}
                        username={subject.username}
                        fullName={subject.full_name}
                        size={36}
                      />
                      <Text style={styles.subjectName} numberOfLines={1}>
                        {subject.full_name ||
                          subject.username ||
                          subject.user_id}
                      </Text>
                      <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={() => setPickerOpen(true)}
                      >
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickBtn}
                      onPress={() => setPickerOpen(true)}
                      activeOpacity={0.85}
                    >
                      <Icon
                        name="account-search-outline"
                        size={18}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.pickBtnText}>
                        Pick {subjectType}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : null}

              {action === 'day' ? (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    Date
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </>
              ) : null}

              {action === 'period' ? (
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      Start
                    </Text>
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
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      End
                    </Text>
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
              ) : null}

              {action === 'day' || action === 'period' ? (
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Recalculate</Text>
                    <Text style={styles.toggleSub}>
                      Delete & rebuild the summary instead of upserting
                    </Text>
                  </View>
                  <Switch
                    value={recalculate}
                    onValueChange={setRecalculate}
                    color={PRIMARY_COLOR}
                  />
                </View>
              ) : null}

              {validationError ? (
                <View style={styles.validation}>
                  <Icon
                    name="alert-circle-outline"
                    size={14}
                    color="#B45309"
                  />
                  <Text style={styles.validationText}>
                    {validationError}
                  </Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.modalBtnGhost}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, !canSubmit && { opacity: 0.5 }]}
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnText}>Trigger</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <SubjectPickerSheet
        visible={pickerOpen}
        subjectType={subjectType}
        title={`Pick ${subjectType}`}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => {
          setSubject(p);
          setPickerOpen(false);
        }}
      />

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
    marginBottom: 20,
  },
  introText: { flex: 1, color: TEXT_PRIMARY, fontSize: 11, lineHeight: 16 },

  actionCard: {
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
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  actionSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },

  helper: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 20,
    textAlign: 'center',
  },
  helperSmall: { color: TEXT_SECONDARY, fontSize: 10, marginTop: 6 },

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
    paddingBottom: 12,
    maxHeight: '92%',
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
    gap: 10,
    marginBottom: 14,
  },
  modalHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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

  fieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#F8FAFC',
    fontFamily: 'Courier',
  },

  typeGrid: { flexDirection: 'row', gap: 8 },
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
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  subjectName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  changeBtnText: { color: PRIMARY_COLOR, fontSize: 11, fontWeight: '700' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  pickBtnText: { color: PRIMARY_COLOR, fontSize: 13, fontWeight: '700' },

  twoCol: { flexDirection: 'row', gap: 10 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  toggleLabel: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  toggleSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },

  validation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
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