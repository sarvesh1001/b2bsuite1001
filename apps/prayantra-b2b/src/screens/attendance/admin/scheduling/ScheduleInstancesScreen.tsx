import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listScheduleInstances,
  deleteScheduleInstance,
} from '@b2b/api-client';

import type { ScheduleInstance } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { UserAvatar } from '../../../../components/UserAvatar';
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

function rangeForPreset(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: ymd(start), end: ymd(end) };
}

function fmtDateLong(iso: string): string {
  try {
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case 'active':
      return '#10B981';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#94A3B8';
  }
}

const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '±7d', days: 7, ahead: true },
  { key: '30d', label: '±30d', days: 30, ahead: true },
] as const;

function rangeFromPreset(preset: string): { start: string; end: string } {
  if (preset === 'today') {
    const t = ymd(new Date());
    return { start: t, end: t };
  }
  if (preset === '7d') {
    const today = new Date();
    const s = new Date(today);
    s.setDate(today.getDate() - 7);
    const e = new Date(today);
    e.setDate(today.getDate() + 7);
    return { start: ymd(s), end: ymd(e) };
  }
  if (preset === '30d') {
    const today = new Date();
    const s = new Date(today);
    s.setDate(today.getDate() - 30);
    const e = new Date(today);
    e.setDate(today.getDate() + 30);
    return { start: ymd(s), end: ymd(e) };
  }
  return rangeForPreset(7);
}

// ============================================================
// SCREEN
// ============================================================

export default function ScheduleInstancesScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('7d');
  const [range, setRange] = useState(rangeFromPreset('7d'));
  const [customOpen, setCustomOpen] = useState(false);

  const [subject, setSubject] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [workCenterCode, setWorkCenterCode] = useState('');
  const [workCenterOpen, setWorkCenterOpen] = useState(false);

  const [rows, setRows] = useState<ScheduleInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setRange(rangeFromPreset(preset));
  }, [preset]);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params: any = {
          start_date: range.start,
          end_date: range.end,
        };
        if (subject) params.user_id = subject.user_id;
        if (workCenterCode.trim()) params.work_center_code = workCenterCode.trim();

        const res: any = await listScheduleInstances(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          params,
        );

        const list: ScheduleInstance[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.instances)
          ? res.data.instances
          : [];

        setRows(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load instances.',
        );
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
      workCenterCode,
    ],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const handleDelete = (row: ScheduleInstance) => {
    Alert.alert(
      'Delete instance',
      `Delete schedule for ${row.user_id.slice(0, 8)}… on ${row.schedule_date.slice(0, 10)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(row.schedule_instance_id);
            try {
              await deleteScheduleInstance(
                companyId,
                row.schedule_instance_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setRows((prev) =>
                prev.filter(
                  (x) => x.schedule_instance_id !== row.schedule_instance_id,
                ),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete instance',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const activeFilterCount =
    (subject ? 1 : 0) + (workCenterCode.trim() ? 1 : 0);

  const renderRow = ({ item }: { item: ScheduleInstance }) => {
    const tone = statusTone(item.status);
    const isDeleting = deletingId === item.schedule_instance_id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />
        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.user_id}
            username={undefined}
            fullName={undefined}
            size={42}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.user_id.slice(0, 12)}…
            </Text>
            <Text style={styles.cardDate}>
              {fmtDateLong(item.schedule_date)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${tone}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: tone }]} />
            <Text style={[styles.statusPillText, { color: tone }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.timeStrip}>
          <View style={styles.timeCell}>
            <Icon name="clock-start" size={13} color="#10B981" />
            <Text style={styles.timeText}>
              {fmtTime(item.expected_start)}
            </Text>
          </View>
          <Icon name="arrow-right" size={14} color="#CBD5E1" />
          <View style={styles.timeCell}>
            <Icon name="clock-end" size={13} color="#EF4444" />
            <Text style={styles.timeText}>{fmtTime(item.expected_end)}</Text>
          </View>
          {item.work_center_code ? (
            <View style={styles.wcChip}>
              <Icon name="factory" size={11} color={TEXT_SECONDARY} />
              <Text style={styles.wcChipText}>{item.work_center_code}</Text>
            </View>
          ) : null}
        </View>

        {item.cancel_reason ? (
          <View style={styles.reasonRow}>
            <Icon name="comment-text-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.cancel_reason}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('AttendanceInstanceForm', {
                instanceId: item.schedule_instance_id,
              })
            }
          >
            <Icon name="pencil" size={16} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="delete-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FilterPanel = () => (
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
            {preset === 'custom' ? `${range.start} → ${range.end}` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.advancedRow}>
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
            style={styles.filterBtn}
            onPress={() => setSubjectPickerOpen(true)}
            activeOpacity={0.85}
          >
            <Icon name="account-search-outline" size={14} color={PRIMARY_COLOR} />
            <Text style={styles.filterBtnText}>User</Text>
          </TouchableOpacity>
        )}

        {workCenterCode.trim() ? (
          <View style={styles.selectedChip}>
            <Icon name="factory" size={12} color={PRIMARY_COLOR} />
            <Text style={styles.selectedChipText}>{workCenterCode}</Text>
            <TouchableOpacity onPress={() => setWorkCenterCode('')}>
              <Icon name="close" size={13} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setWorkCenterOpen(true)}
            activeOpacity={0.85}
          >
            <Icon name="factory" size={14} color={PRIMARY_COLOR} />
            <Text style={styles.filterBtnText}>Work Center</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FilterPanel />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading instances…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAll()}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.schedule_instance_id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="calendar-blank-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No instances</Text>
              <Text style={styles.errMsg}>
                Generate schedules or widen the date range to see instances.
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
          setRange(r);
          setPreset('custom');
          setCustomOpen(false);
        }}
      />

      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType="employee"
        title="Filter by user"
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

      <SimpleTextModal
        visible={workCenterOpen}
        title="Work center code"
        placeholder="e.g. WC-MUM-01"
        initial={workCenterCode}
        onClose={() => setWorkCenterOpen(false)}
        onSubmit={(v) => {
          setWorkCenterCode(v.trim());
          setWorkCenterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================
// HELPERS — shared small modals
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

export function SimpleTextModal({
  visible,
  title,
  placeholder,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  initial?: string;
  onClose: () => void;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState(initial ?? '');
  useEffect(() => {
    if (visible) setValue(initial ?? '');
  }, [visible, initial]);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdropCenter}>
        <View style={styles.dialogCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            style={[styles.modalInput, { marginTop: 12 }]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, !value.trim() && { opacity: 0.5 }]}
              disabled={!value.trim()}
              onPress={() => onSubmit(value)}
            >
              <Text style={styles.modalBtnText}>OK</Text>
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
  chipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  chipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  advancedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  filterBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    maxWidth: 180,
  },
  selectedChipText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
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
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 6,
  },
  cardName: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  cardDate: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 3 },
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
  wcChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  wcChipText: { color: '#475569', fontSize: 10, fontWeight: '700' },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    marginLeft: 6,
  },
  reasonText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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
    padding: 20,
    paddingBottom: 28,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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