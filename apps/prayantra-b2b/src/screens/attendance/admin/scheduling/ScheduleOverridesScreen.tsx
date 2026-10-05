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
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listScheduleOverrides,
  createScheduleOverride,
  updateScheduleOverride,
  deleteScheduleOverride,
} from '@b2b/api-client';

import type {
  ScheduleOverride,
  ScheduleOverrideType,
} from '@b2b/shared-types';

import { SCHEDULE_OVERRIDE_TYPES } from '@b2b/shared-types';

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
// CONSTANTS
// ============================================================

const TYPE_META: Record<
  ScheduleOverrideType,
  { label: string; tone: string; icon: string; desc: string }
> = {
  off: {
    label: 'Off',
    tone: '#94A3B8',
    icon: 'calendar-remove-outline',
    desc: 'Force a day off',
  },
  force_work: {
    label: 'Force Work',
    tone: '#10B981',
    icon: 'calendar-check-outline',
    desc: 'Work on a non-working day',
  },
  holiday_override: {
    label: 'Holiday',
    tone: '#EC4899',
    icon: 'party-popper',
    desc: 'Mark as holiday',
  },
};

const DATE_PRESETS = [
  { key: '7d', label: '±7d', days: 7 },
  { key: '30d', label: '±30d', days: 30 },
  { key: '90d', label: '±90d', days: 90 },
] as const;

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeFromPreset(days: number): { start: string; end: string } {
  const today = new Date();
  const s = new Date(today);
  s.setDate(today.getDate() - days);
  const e = new Date(today);
  e.setDate(today.getDate() + days);
  return { start: ymd(s), end: ymd(e) };
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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

// ============================================================
// SCREEN
// ============================================================

export default function ScheduleOverridesScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [preset, setPreset] = useState<string>('7d');
  const [range, setRange] = useState(rangeFromPreset(7));
  const [typeFilter, setTypeFilter] = useState<ScheduleOverrideType | null>(null);
  const [subject, setSubject] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [rows, setRows] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleOverride | null>(null);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  useEffect(() => {
    setRange(rangeFromPreset(Number(preset.replace('d', ''))));
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
        if (typeFilter) params.override_type = typeFilter;

        const res: any = await listScheduleOverrides(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          params,
        );

        const list: ScheduleOverride[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.overrides)
          ? res.data.overrides
          : [];

        setRows(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load overrides.',
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
      typeFilter,
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

  const handleDelete = (row: ScheduleOverride) => {
    Alert.alert(
      'Delete override',
      `Remove ${TYPE_META[row.override_type].label} override for ${row.override_date.slice(0, 10)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(row.override_id);
            try {
              await deleteScheduleOverride(
                companyId,
                row.override_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setRows((prev) =>
                prev.filter((x) => x.override_id !== row.override_id),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete override',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderRow = ({ item }: { item: ScheduleOverride }) => {
    const meta = TYPE_META[item.override_type];
    const isDeleting = deletingId === item.override_id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: meta.tone }]} />
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
              {fmtDate(item.override_date)}
            </Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: `${meta.tone}18` }]}>
            <Icon name={meta.icon} size={11} color={meta.tone} />
            <Text style={[styles.typePillText, { color: meta.tone }]}>
              {meta.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.reason ? (
          <View style={styles.reasonRow}>
            <Icon name="comment-text-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.reason}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setEditing(item);
              setEditorOpen(true);
            }}
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter panel */}
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
          {(['off', 'force_work', 'holiday_override'] as const).map((t) => {
            const active = typeFilter === t;
            const meta = TYPE_META[t];
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTypeFilter(active ? null : t)}
                style={[
                  styles.chip,
                  active && { backgroundColor: meta.tone },
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.subjectRow}>
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
              <Icon
                name="account-search-outline"
                size={14}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.filterBtnText}>Filter by user</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading overrides…</Text>
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
          keyExtractor={(item) => item.override_id}
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
              <Icon name="calendar-edit" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No overrides</Text>
              <Text style={styles.errMsg}>
                Create an override to force a day off or on for a specific
                date.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => {
          setEditing(null);
          setEditorOpen(true);
        }}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <OverrideEditor
        visible={editorOpen}
        editing={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          fetchAll(true);
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
// EDITOR MODAL
// ============================================================

function OverrideEditor({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: ScheduleOverride | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();
  const isEdit = !!editing;

  const [subject, setSubject] = useState<PickedSubject | null>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [date, setDate] = useState(ymd(new Date()));
  const [type, setType] = useState<ScheduleOverrideType>('off');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setSubject({
        user_id: editing.user_id,
      });
      setDate(editing.override_date.slice(0, 10));
      setType(editing.override_type);
      setReason(editing.reason ?? '');
    } else {
      setSubject(null);
      setDate(ymd(new Date()));
      setType('off');
      setReason('');
    }
    setErr(null);
  }, [visible, editing]);

  const validationError = useMemo(() => {
    if (!isEdit && !subject) return 'Pick a user';
    if (!isDateValid(date)) return 'Date must be YYYY-MM-DD';
    return null;
  }, [isEdit, subject, date]);

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) return;
    if (validationError) {
      setErr(validationError);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (isEdit && editing) {
        await updateScheduleOverride(
          companyId,
          editing.override_id,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            override_type: type,
            reason: reason.trim() || null,
          },
        );
      } else {
        await createScheduleOverride(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            user_id: subject!.user_id,
            override_date: date,
            override_type: type,
            reason: reason.trim() || null,
          },
        );
      }
      onSaved();
    } catch (e: any) {
      setErr(
        e?.response?.data?.error ||
          e?.message ||
          'Failed to save override',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalCard} edges={['bottom']}>
          <View style={styles.modalGrabber} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit override' : 'New override'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Subject */}
            {!isEdit ? (
              <>
                <Text style={styles.fieldLabel}>User</Text>
                {subject ? (
                  <View style={styles.subjectCard}>
                    <UserAvatar
                      userId={subject.user_id}
                      username={subject.username}
                      fullName={subject.full_name}
                      size={36}
                    />
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {subject.full_name || subject.username || subject.user_id}
                    </Text>
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => setSubjectPickerOpen(true)}
                    >
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
                      size={18}
                      color={PRIMARY_COLOR}
                    />
                    <Text style={styles.pickBtnText}>Pick user</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.immutableRow}>
                <Icon name="lock-outline" size={14} color={TEXT_SECONDARY} />
                <Text style={styles.immutableText}>
                  User and date cannot be changed after creation
                </Text>
              </View>
            )}

            {/* Date */}
            {!isEdit ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
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
                <View style={styles.quickDates}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => setDate(ymd(new Date()))}
                  >
                    <Text style={styles.quickChipText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setDate(ymd(d));
                    }}
                  >
                    <Text style={styles.quickChipText}>Tomorrow</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {/* Type */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
              Override type
            </Text>
            <View style={styles.typeGrid}>
              {SCHEDULE_OVERRIDE_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const active = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeCard,
                      active && {
                        borderColor: meta.tone,
                        backgroundColor: `${meta.tone}08`,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setType(t)}
                  >
                    <View
                      style={[
                        styles.typeIcon,
                        { backgroundColor: `${meta.tone}15` },
                        active && { backgroundColor: meta.tone },
                      ]}
                    >
                      <Icon
                        name={meta.icon}
                        size={16}
                        color={active ? '#FFFFFF' : meta.tone}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeLabel,
                        active && { color: meta.tone },
                      ]}
                    >
                      {meta.label}
                    </Text>
                    <Text style={styles.typeDesc} numberOfLines={2}>
                      {meta.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reason */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
              Reason (optional)
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Why this override is needed"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {err ? (
              <View style={styles.validation}>
                <Icon name="alert-circle-outline" size={14} color="#B45309" />
                <Text style={styles.validationText}>{err}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  (busy || !!validationError) && { opacity: 0.5 },
                ]}
                disabled={busy || !!validationError}
                onPress={handleSubmit}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnText}>
                    {isEdit ? 'Save' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType="employee"
        title="Pick user"
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p) => {
          setSubject(p);
          setSubjectPickerOpen(false);
        }}
      />
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
  subjectRow: { paddingHorizontal: 16, paddingTop: 12 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  filterBtnText: { color: PRIMARY_COLOR, fontSize: 11, fontWeight: '700' },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  selectedChipText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },

  listContent: { padding: 16, paddingBottom: 100 },
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
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
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

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

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
  },
  quickDates: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
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

  subjectCard: {
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
  immutableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  immutableText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },

  typeGrid: { flexDirection: 'row', gap: 8 },
  typeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
    gap: 6,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700' },
  typeDesc: { color: TEXT_SECONDARY, fontSize: 10, lineHeight: 13 },

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