// apps/prayantra-b2b/src/components/LifecycleStatusCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type { EmployeeStatusNow } from '@b2b/shared-types';
import {
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../constants/colors';

export type LifecycleAction =
  | 'confirm_probation'
  | 'fail_probation'
  | 'extend_probation'
  | 'start_notice'
  | 'cancel_notice'
  | 'start_on_hold'
  | 'end_on_hold';

interface Props {
  status: EmployeeStatusNow | undefined;
  loading: boolean;
  onAction: (action: LifecycleAction) => void;
}

const STATUS_VISUALS = {
  active:     { label: 'Active',       color: '#10B981', icon: 'check-circle-outline' },
  probation:  { label: 'On Probation', color: '#F59E0B', icon: 'account-clock-outline' },
  notice:     { label: 'On Notice',    color: '#F97316', icon: 'calendar-alert' },
  on_hold:    { label: 'On Hold',      color: '#6366F1', icon: 'pause-circle-outline' },
  terminated: { label: 'Terminated',   color: '#EF4444', icon: 'close-circle-outline' },
} as const;

export const LifecycleStatusCard: React.FC<Props> = ({
  status,
  loading,
  onAction,
}) => {
  if (loading || !status) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const key = (status.employment_status || 'active') as keyof typeof STATUS_VISUALS;
  const vis = STATUS_VISUALS[key] ?? STATUS_VISUALS.active;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>CURRENT STATUS</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, { backgroundColor: `${vis.color}18` }]}>
          <Icon name={vis.icon} size={22} color={vis.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, { color: vis.color }]}>{vis.label}</Text>
          <SubtitleLine status={status} />
        </View>
      </View>

      <ActionRow status={status} onAction={onAction} />
    </View>
  );
};

function SubtitleLine({ status }: { status: EmployeeStatusNow }) {
  const s = status.employment_status;

  if (s === 'probation' && status.probation) {
    const p = status.probation;
    const days = daysUntil(p.end_date);
    return (
      <Text style={styles.statusSub}>
        Ends {p.end_date}{days >= 0 ? ` · ${days} day${days === 1 ? '' : 's'} left` : ' · overdue'}
        {p.extension_count > 0 ? ` · extended ${p.extension_count}×` : ''}
      </Text>
    );
  }

  if (s === 'notice' && status.notice) {
    const n = status.notice;
    const served = n.days_served ?? 0;
    const total = n.days_total ?? 0;
    return (
      <Text style={styles.statusSub}>
        Ends {n.end_date} · {served}/{total} days served · initiated by {n.initiated_by}
      </Text>
    );
  }

  if (s === 'on_hold' && status.on_hold) {
    const h = status.on_hold;
    return (
      <Text style={styles.statusSub} numberOfLines={2}>
        {h.end_date ? `Until ${h.end_date}` : 'Open-ended'} · {h.reason}
      </Text>
    );
  }

  if (s === 'terminated' && status.exit) {
    const e = status.exit;
    return (
      <Text style={styles.statusSub}>
        Effective {e.exit_date ?? '—'}
        {e.exit_reason ? ` · ${e.exit_reason}` : ''}
      </Text>
    );
  }

  return <Text style={styles.statusSub}>No active lifecycle event</Text>;
}

function ActionRow({
  status,
  onAction,
}: {
  status: EmployeeStatusNow;
  onAction: (a: LifecycleAction) => void;
}) {
  const s = status.employment_status;

  if (s === 'probation') {
    return (
      <View style={styles.actions}>
        <ActionButton
          label="Confirm"
          icon="check"
          primary
          onPress={() => onAction('confirm_probation')}
        />
        <ActionButton
          label="Extend"
          icon="calendar-plus"
          onPress={() => onAction('extend_probation')}
        />
        <ActionButton
          label="Fail"
          icon="close"
          danger
          onPress={() => onAction('fail_probation')}
        />
      </View>
    );
  }

  if (s === 'notice') {
    return (
      <View style={styles.actions}>
        <ActionButton
          label="Cancel Notice"
          icon="cancel"
          danger
          onPress={() => onAction('cancel_notice')}
        />
      </View>
    );
  }

  if (s === 'on_hold') {
    return (
      <View style={styles.actions}>
        <ActionButton
          label="End Hold"
          icon="play"
          primary
          onPress={() => onAction('end_on_hold')}
        />
      </View>
    );
  }

  if (s === 'active') {
    return (
      <View style={styles.actions}>
        <ActionButton
          label="Start Notice"
          icon="calendar-alert"
          onPress={() => onAction('start_notice')}
        />
        <ActionButton
          label="Place on Hold"
          icon="pause"
          onPress={() => onAction('start_on_hold')}
        />
      </View>
    );
  }

  // terminated — no actions in this card (rehire lives on the Exit tab)
  return null;
}

function ActionButton({
  label,
  icon,
  primary,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  primary?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const bg = primary ? PRIMARY_COLOR : danger ? '#EF4444' : '#F1F5F9';
  const fg = primary || danger ? '#FFFFFF' : TEXT_PRIMARY;
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress}>
      <Icon name={icon} size={16} color={fg} />
      <Text style={[styles.actionBtnText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---- date helper ----
function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.floor((d - Date.now()) / (24 * 60 * 60 * 1000));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: TEXT_SECONDARY,
    marginBottom: 10,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});