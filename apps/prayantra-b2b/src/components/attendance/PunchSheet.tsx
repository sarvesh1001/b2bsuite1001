import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { selfPunch, teamPunch } from '@b2b/api-client';

import type {
  AttendanceEventType,
  AttendanceSubjectType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../store/userAuthStore';
import { UserAvatar } from '../UserAvatar';

import {
  PRIMARY_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';

// ============================================================
// TYPES
// ============================================================

interface PunchTarget {
  user_id: string;
  full_name?: string;
  username?: string;
}

interface Props {
  visible: boolean;
  subjectType: AttendanceSubjectType;
  /** null → self punch (selfPunch API). Set → team punch (teamPunch API). */
  target?: PunchTarget | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PunchOption {
  value: AttendanceEventType;
  label: string;
  sub: string;
  icon: string;
  tone: string;
}

// ============================================================
// PER-SUBJECT PUNCH OPTIONS
// ============================================================

const PUNCH_OPTIONS: Record<AttendanceSubjectType, PunchOption[]> = {
  employee: [
    { value: 'check_in',    label: 'Check In',    sub: 'Start of work',      icon: 'login',           tone: '#10B981' },
    { value: 'check_out',   label: 'Check Out',   sub: 'End of work',        icon: 'logout',          tone: '#EF4444' },
    { value: 'break_start', label: 'Break Start', sub: 'Going on break',     icon: 'coffee-outline',  tone: '#F59E0B' },
    { value: 'break_end',   label: 'Break End',   sub: 'Back from break',    icon: 'coffee',          tone: '#10B981' },
  ],
  student: [
    { value: 'class_start',   label: 'Class Start', sub: 'Class begins',    icon: 'school-outline',       tone: '#10B981' },
    { value: 'class_end',     label: 'Class End',   sub: 'Class ends',      icon: 'school',               tone: '#EF4444' },
    { value: 'session_join',  label: 'Join Session', sub: 'Joining a session', icon: 'account-arrow-right', tone: '#3B82F6' },
    { value: 'session_leave', label: 'Leave Session', sub: 'Leaving a session', icon: 'account-arrow-left', tone: '#F59E0B' },
  ],
  customer: [
    { value: 'check_in',  label: 'Check In',  sub: 'Arrived',  icon: 'login',  tone: '#10B981' },
    { value: 'check_out', label: 'Check Out', sub: 'Leaving',  icon: 'logout', tone: '#EF4444' },
  ],
};

// ============================================================
// COMPONENT
// ============================================================

export default function PunchSheet({
  visible,
  subjectType,
  target,
  onClose,
  onSuccess,
}: Props) {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [selected, setSelected] = useState<AttendanceEventType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const options = PUNCH_OPTIONS[subjectType] ?? PUNCH_OPTIONS.employee;
  const isTarget = !!target;

  const handleClose = () => {
    if (submitting) return;
    setSelected(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }

    setSubmitting(true);
    try {
      const source = {
        source_type: 'mobile' as const,
        device_id: deviceId,
      };

      let res: any;
      if (isTarget && target) {
        res = await teamPunch(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            target_user_id: target.user_id,
            subject_type: subjectType,
            event_type: selected,
            source,
          },
        );
      } else {
        res = await selfPunch(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            event_type: selected,
            subject_type: subjectType,
            source,
          },
        );
      }

      if (res?.success === false) {
        throw new Error(res?.error || 'Punch failed');
      }

      setSnack({ text: 'Punch recorded', tone: 'ok' });
      setSelected(null);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to record punch';
      setSnack({ text: msg, tone: 'err' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {isTarget ? 'Punch for' : 'My Punch'}
              </Text>
              <Text style={styles.subtitle}>
                Select an event to record
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Target preview */}
          {isTarget && target ? (
            <View style={styles.targetRow}>
              <UserAvatar
                userId={target.user_id}
                username={target.username}
                fullName={target.full_name}
                size={44}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.targetName} numberOfLines={1}>
                  {target.full_name || target.username || target.user_id}
                </Text>
                <Text style={styles.targetSub} numberOfLines={1}>
                  {target.user_id}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Options */}
          <ScrollView
            contentContainerStyle={styles.optionsWrap}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => {
              const active = selected === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.option, active && styles.optionActive]}
                  activeOpacity={0.85}
                  onPress={() => setSelected(opt.value)}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: `${opt.tone}15` },
                      active && { backgroundColor: opt.tone },
                    ]}
                  >
                    <Icon
                      name={opt.icon}
                      size={20}
                      color={active ? '#FFFFFF' : opt.tone}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionLabel,
                        active && { color: opt.tone },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.optionSub}>{opt.sub}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      active && { borderColor: opt.tone },
                    ]}
                  >
                    {active ? (
                      <View
                        style={[styles.radioDot, { backgroundColor: opt.tone }]}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submit,
              (!selected || submitting) && { opacity: 0.5 },
            ]}
            disabled={!selected || submitting}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Record Punch</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={2600}
        style={{
          backgroundColor: snack?.tone === 'ok' ? '#065F46' : '#991B1B',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>{snack?.text ?? ''}</Text>
      </Snackbar>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  title: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  subtitle: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
  },
  targetName: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  targetSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },

  optionsWrap: {
    gap: 10,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  optionActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}06`,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  optionSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
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