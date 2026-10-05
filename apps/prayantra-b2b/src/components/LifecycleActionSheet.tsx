// apps/prayantra-b2b/src/components/LifecycleActionSheet.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  CARD_BACKGROUND, PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, BORDER_COLOR,
} from '../constants/colors';
import type { LifecycleAction } from './LifecycleStatusCard';

interface Props {
  visible: boolean;
  action: LifecycleAction | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

const ACTION_META: Record<LifecycleAction, { title: string; cta: string; danger?: boolean }> = {
  confirm_probation: { title: 'Confirm Probation', cta: 'Confirm' },
  extend_probation:  { title: 'Extend Probation',  cta: 'Extend' },
  fail_probation:    { title: 'Fail Probation',    cta: 'Fail', danger: true },
  start_notice:      { title: 'Start Notice',      cta: 'Start' },
  cancel_notice:     { title: 'Cancel Notice',     cta: 'Cancel', danger: true },
  start_on_hold:     { title: 'Place on Hold',     cta: 'Place on Hold' },
  end_on_hold:       { title: 'End On-Hold',       cta: 'End Hold' },
};

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const LifecycleActionSheet: React.FC<Props> = ({
  visible, action, submitting, onClose, onSubmit,
}) => {
  const meta = action ? ACTION_META[action] : null;

  // Form state — one bag, reset when action changes.
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(addDays(30));
  const [initiatedBy, setInitiatedBy] = useState<'employee' | 'employer'>('employee');
  const [served, setServed] = useState(true);
  const [holdEnd, setHoldEnd] = useState(addDays(7));
  const [holdOpenEnded, setHoldOpenEnded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNote('');
    setReason('');
    setDate(addDays(30));
    setInitiatedBy('employee');
    setServed(true);
    setHoldEnd(addDays(7));
    setHoldOpenEnded(false);
  }, [visible, action]);

  if (!meta) return null;

  const submit = async () => {
    if (!action) return;
    try {
      switch (action) {
        case 'confirm_probation':
          await onSubmit({ note: note || undefined });
          break;
        case 'fail_probation':
          if (!reason.trim()) return Alert.alert('Required', 'Reason is required');
          if (!date) return Alert.alert('Required', 'Termination date is required');
          await onSubmit({ reason: reason.trim(), termination_date: date });
          break;
        case 'extend_probation':
          if (!date) return Alert.alert('Required', 'New end date is required');
          await onSubmit({ new_end_date: date, reason: reason || undefined });
          break;
        case 'start_notice':
          if (!date) return Alert.alert('Required', 'End date is required');
          await onSubmit({
            end_date: date,
            reason: reason || 'resignation',
            initiated_by: initiatedBy,
            served,
            pay_percentage: 100,
          });
          break;
        case 'cancel_notice':
          await onSubmit({ reason: reason || undefined });
          break;
        case 'start_on_hold':
          if (!reason.trim()) return Alert.alert('Required', 'Reason is required');
          await onSubmit({
            start_date: today(),
            end_date: holdOpenEnded ? null : holdEnd,
            reason: reason.trim(),
            pay_percentage: 100,
          });
          break;
        case 'end_on_hold':
          await onSubmit({});
          break;
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      Alert.alert('Error', msg);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{meta.title}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Icon name="close" size={22} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {renderForm(action!, {
              note, setNote,
              reason, setReason,
              date, setDate,
              initiatedBy, setInitiatedBy,
              served, setServed,
              holdEnd, setHoldEnd,
              holdOpenEnded, setHoldOpenEnded,
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submit, meta.danger && styles.submitDanger, submitting && styles.submitDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{meta.cta}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ---- form fields per action ----

interface FormState {
  note: string; setNote: (v: string) => void;
  reason: string; setReason: (v: string) => void;
  date: string; setDate: (v: string) => void;
  initiatedBy: 'employee' | 'employer';
  setInitiatedBy: (v: 'employee' | 'employer') => void;
  served: boolean; setServed: (v: boolean) => void;
  holdEnd: string; setHoldEnd: (v: string) => void;
  holdOpenEnded: boolean; setHoldOpenEnded: (v: boolean) => void;
}

function renderForm(action: LifecycleAction, f: FormState) {
  switch (action) {
    case 'confirm_probation':
      return (
        <Field
          label="Note (optional)"
          value={f.note}
          onChange={f.setNote}
          placeholder="Confirmed after review"
          multiline
        />
      );

    case 'fail_probation':
      return (
        <>
          <Field label="Reason" value={f.reason} onChange={f.setReason} placeholder="e.g. Did not meet expectations" multiline />
          <Field label="Termination date (YYYY-MM-DD)" value={f.date} onChange={f.setDate} placeholder="2026-12-31" />
        </>
      );

    case 'extend_probation':
      return (
        <>
          <Field label="New end date (YYYY-MM-DD)" value={f.date} onChange={f.setDate} placeholder="2027-03-31" />
          <Field label="Reason (optional)" value={f.reason} onChange={f.setReason} placeholder="Needs more time" multiline />
        </>
      );

    case 'start_notice':
      return (
        <>
          <Field label="End date (YYYY-MM-DD)" value={f.date} onChange={f.setDate} placeholder="2026-12-31" />
          <Field label="Reason" value={f.reason} onChange={f.setReason} placeholder="resignation" />
          <Choice
            label="Initiated by"
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'employer', label: 'Employer' },
            ]}
            value={f.initiatedBy}
            onChange={(v) => f.setInitiatedBy(v as 'employee' | 'employer')}
          />
          <Choice
            label="Notice will be served?"
            options={[
              { value: 'yes', label: 'Yes — serve full period' },
              { value: 'no',  label: 'No — pay in lieu' },
            ]}
            value={f.served ? 'yes' : 'no'}
            onChange={(v) => f.setServed(v === 'yes')}
          />
        </>
      );

    case 'cancel_notice':
      return (
        <Field label="Reason (optional)" value={f.reason} onChange={f.setReason} placeholder="Resignation withdrawn" multiline />
      );

    case 'start_on_hold':
      return (
        <>
          <Field label="Reason" value={f.reason} onChange={f.setReason} placeholder="Pending investigation" multiline />
          <Choice
            label="Duration"
            options={[
              { value: 'end',  label: 'Has end date' },
              { value: 'open', label: 'Open-ended' },
            ]}
            value={f.holdOpenEnded ? 'open' : 'end'}
            onChange={(v) => f.setHoldOpenEnded(v === 'open')}
          />
          {!f.holdOpenEnded && (
            <Field label="End date (YYYY-MM-DD)" value={f.holdEnd} onChange={f.setHoldEnd} placeholder="2026-10-15" />
          )}
        </>
      );

    case 'end_on_hold':
      return (
        <Text style={styles.confirmCopy}>
          This will end the employee's on-hold period and restore their previous status.
        </Text>
      );
  }
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.inputMulti]}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function Choice({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  title: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  body: { padding: 20, paddingTop: 8 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: TEXT_PRIMARY, backgroundColor: '#F8FAFC',
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER_COLOR,
    backgroundColor: '#F8FAFC',
  },
  choiceActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  choiceText: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  choiceTextActive: { color: '#FFFFFF' },
  confirmCopy: { fontSize: 14, color: TEXT_PRIMARY, lineHeight: 20 },
  submit: {
    marginHorizontal: 20, marginBottom: 24, marginTop: 4,
    backgroundColor: PRIMARY_COLOR, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  submitDanger: { backgroundColor: '#EF4444' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});