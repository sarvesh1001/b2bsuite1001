import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Snackbar,
  Switch,
} from 'react-native-paper';

import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listScheduleTemplates,
  createScheduleTemplate,
  deleteScheduleTemplate,
  listWorkCalendars,
} from '@b2b/api-client';

import type {
  ScheduleTemplate,
  ScheduleTemplateType,
  TemplateRules,
  ClassPeriod,
  WorkCalendar,
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
// CONSTANTS
// ============================================================

const TEMPLATE_TYPES: {
  value: ScheduleTemplateType;
  label: string;
  icon: string;
  tone: string;
  desc: string;
}[] = [
  {
    value: 'office',
    label: 'Office',
    icon: 'briefcase-outline',
    tone: '#3B82F6',
    desc: 'Fixed start/end (e.g. 9–6)',
  },
  {
    value: 'shift',
    label: 'Shift',
    icon: 'clock-time-four-outline',
    tone: '#F59E0B',
    desc: 'Shift rotations',
  },
  {
    value: 'class',
    label: 'Class',
    icon: 'school-outline',
    tone: '#8B5CF6',
    desc: 'Class periods by day',
  },
];

// ============================================================
// HELPERS
// ============================================================

function isTimeValid(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function templateSummary(t: ScheduleTemplate): string {
  const r = t.rules || {};
  if (t.template_type === 'class') {
    const count = r.periods?.length ?? 0;
    return `${count} period${count === 1 ? '' : 's'} per day`;
  }
  if (r.start_time && r.end_time) {
    return `${r.start_time} – ${r.end_time}`;
  }
  return 'No times set';
}

// ============================================================
// SCREEN
// ============================================================

export default function ScheduleTemplatesScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<ScheduleTemplate[]>([]);
  const [calendars, setCalendars] = useState<WorkCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleTemplate | null>(null);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [tplRes, calRes] = await Promise.allSettled([
          listScheduleTemplates(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            { active_only: false },
          ),
          listWorkCalendars(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
          ),
        ]);

        const tplList: ScheduleTemplate[] =
          tplRes.status === 'fulfilled'
            ? Array.isArray((tplRes.value as any)?.data)
              ? (tplRes.value as any).data
              : []
            : [];
        setRows(tplList);

        const calList: WorkCalendar[] =
          calRes.status === 'fulfilled'
            ? Array.isArray((calRes.value as any)?.data)
              ? (calRes.value as any).data
              : []
            : [];
        setCalendars(calList);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load templates.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDelete = (t: ScheduleTemplate) => {
    Alert.alert(
      'Delete template',
      `Delete "${t.name}"? This fails if work center shifts reference it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(t.schedule_template_id);
            try {
              await deleteScheduleTemplate(
                companyId,
                t.schedule_template_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setRows((prev) =>
                prev.filter(
                  (x) => x.schedule_template_id !== t.schedule_template_id,
                ),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete template',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleCreateClick = () => {
    if (calendars.length === 0) {
      setSnack({
        text: 'Create a work calendar first',
        tone: 'err',
      });
      return;
    }
    setEditing(null);
    setEditorOpen(true);
  };

  const renderRow = ({ item }: { item: ScheduleTemplate }) => {
    const meta =
      TEMPLATE_TYPES.find((t) => t.value === item.template_type) ??
      TEMPLATE_TYPES[0];
    const isDeleting = deletingId === item.schedule_template_id;
    const calName = calendars.find(
      (c) => c.calendar_id === item.calendar_id,
    )?.name;

    return (
      <View
        style={[styles.card, !item.is_active && styles.cardInactive]}
      >
        <View style={[styles.cardAccent, { backgroundColor: meta.tone }]} />
        <View style={styles.cardHeader}>
          <View
            style={[styles.iconWrap, { backgroundColor: `${meta.tone}15` }]}
          >
            <Icon name={meta.icon} size={20} color={meta.tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {meta.label} · {calName ?? 'unknown calendar'}
            </Text>
          </View>
          {!item.is_active ? (
            <View style={styles.inactivePill}>
              <Text style={styles.inactivePillText}>INACTIVE</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryBar}>
          <Icon name="timer-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.summaryText}>
            {templateSummary(item)}
          </Text>
          {item.rules?.break_minutes ? (
            <View style={styles.breakChip}>
              <Text style={styles.breakChipText}>
                Break {item.rules.break_minutes}m
              </Text>
            </View>
          ) : null}
        </View>

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
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading templates…</Text>
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
          keyExtractor={(item) => item.schedule_template_id}
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
              <Icon
                name="calendar-clock-outline"
                size={32}
                color="#94A3B8"
              />
              <Text style={styles.errTitle}>No templates</Text>
              <Text style={styles.errMsg}>
                Templates define the expected work window for each schedule
                instance.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={handleCreateClick}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <TemplateEditor
        visible={editorOpen}
        editing={editing}
        calendars={calendars}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          fetchAll(true);
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
// TEMPLATE EDITOR MODAL
// ============================================================

function TemplateEditor({
  visible,
  editing,
  calendars,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: ScheduleTemplate | null;
  calendars: WorkCalendar[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const isEdit = !!editing;

  const [name, setName] = useState('');
  const [type, setType] = useState<ScheduleTemplateType>('office');
  const [calendarId, setCalendarId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState('');
  const [periods, setPeriods] = useState<ClassPeriod[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setType(editing.template_type);
      setCalendarId(editing.calendar_id);
      const r = editing.rules || {};
      setStartTime(r.start_time ?? '09:00');
      setEndTime(r.end_time ?? '18:00');
      setBreakMinutes(r.break_minutes?.toString() ?? '');
      setPeriods(r.periods ?? []);
      setIsActive(editing.is_active);
    } else {
      setName('');
      setType('office');
      setCalendarId(calendars[0]?.calendar_id ?? '');
      setStartTime('09:00');
      setEndTime('18:00');
      setBreakMinutes('');
      setPeriods([]);
      setIsActive(true);
    }
  }, [visible, editing, calendars]);

  const validationError = useMemo(() => {
    if (!name.trim()) return 'Name is required';
    if (!calendarId) return 'Pick a calendar';
    if (type !== 'class') {
      if (!isTimeValid(startTime)) return 'Start time must be HH:MM';
      if (!isTimeValid(endTime)) return 'End time must be HH:MM';
      if (startTime >= endTime) return 'End time must be after start time';
    }
    return null;
  }, [name, calendarId, type, startTime, endTime]);

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) return;
    if (validationError) {
      setSnack(validationError);
      return;
    }

    const rules: TemplateRules = {};
    if (type === 'class') {
      rules.periods = periods;
    } else {
      rules.start_time = startTime;
      rules.end_time = endTime;
      if (breakMinutes.trim()) {
        rules.break_minutes = Number(breakMinutes);
      }
    }

    setBusy(true);
    try {
      await createScheduleTemplate(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        {
          calendar_id: calendarId,
          template_type: type,
          name: name.trim(),
          rules,
          is_active: isActive,
        },
      );
      onSaved();
    } catch (err: any) {
      setSnack(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to save template',
      );
    } finally {
      setBusy(false);
    }
  };

  const addPeriod = () => {
    setPeriods((prev) => [
      ...prev,
      {
        period: prev.length + 1,
        start: '09:00',
        end: '10:00',
      },
    ]);
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
              {isEdit ? 'Edit template' : 'New template'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 560 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Name */}
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. General 9–6"
              placeholderTextColor="#94A3B8"
              editable={!isEdit}
            />

            {/* Type */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Type
            </Text>
            <View style={styles.typeGrid}>
              {TEMPLATE_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeCard,
                      active && styles.typeCardActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => !isEdit && setType(t.value)}
                    disabled={isEdit}
                  >
                    <Icon
                      name={t.icon}
                      size={18}
                      color={active ? t.tone : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.typeCardLabel,
                        active && { color: t.tone },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.typeCardDesc} numberOfLines={2}>
                      {t.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Calendar
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {calendars.map((c) => {
                const active = calendarId === c.calendar_id;
                return (
                  <TouchableOpacity
                    key={c.calendar_id}
                    style={[
                      styles.calChip,
                      active && styles.calChipActive,
                    ]}
                    onPress={() => setCalendarId(c.calendar_id)}
                  >
                    <Text
                      style={[
                        styles.calChipText,
                        active && styles.calChipTextActive,
                      ]}
                    >
                      {c.name} ({c.year})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Times (office + shift) */}
            {type !== 'class' ? (
              <>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      Start
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="09:00"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      End
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="18:00"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  Break (min)
                </Text>
                <TextInput
                  style={styles.input}
                  value={breakMinutes}
                  onChangeText={(t) => setBreakMinutes(t.replace(/[^\d]/g, ''))}
                  placeholder="Optional"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                <View style={styles.periodHeader}>
                  <Text style={styles.fieldLabel}>
                    Periods ({periods.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.addPeriodBtn}
                    onPress={addPeriod}
                  >
                    <Icon name="plus" size={12} color={PRIMARY_COLOR} />
                    <Text style={styles.addPeriodText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {periods.length === 0 ? (
                  <View style={styles.emptyPeriods}>
                    <Text style={styles.emptyPeriodsText}>
                      No periods yet. Add class periods (1st, 2nd, 3rd…).
                    </Text>
                  </View>
                ) : (
                  periods.map((p, idx) => (
                    <View key={idx} style={styles.periodRow}>
                      <Text style={styles.periodNumber}>{p.period}</Text>
                      <TextInput
                        style={[styles.input, styles.periodInput]}
                        value={p.start}
                        onChangeText={(v) =>
                          setPeriods((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, start: v } : x,
                            ),
                          )
                        }
                        placeholder="09:00"
                        placeholderTextColor="#94A3B8"
                      />
                      <Text style={styles.periodDash}>–</Text>
                      <TextInput
                        style={[styles.input, styles.periodInput]}
                        value={p.end}
                        onChangeText={(v) =>
                          setPeriods((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, end: v } : x,
                            ),
                          )
                        }
                        placeholder="10:00"
                        placeholderTextColor="#94A3B8"
                      />
                      <TouchableOpacity
                        style={styles.removePeriod}
                        onPress={() =>
                          setPeriods((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Icon name="close" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            {/* Active */}
            <View style={styles.activeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeLabel}>Template active</Text>
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
                <Text style={styles.validationText}>
                  {validationError}
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  (busy || !!validationError) && { opacity: 0.5 },
                ]}
                onPress={handleSubmit}
                disabled={busy || !!validationError}
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

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3000}
        style={{ backgroundColor: '#991B1B' }}
      >
        <Text style={{ color: '#FFFFFF' }}>{snack ?? ''}</Text>
      </Snackbar>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
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
  cardInactive: { opacity: 0.7 },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 6,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardType: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
  },
  inactivePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  inactivePillText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  summaryText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  breakChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#FEF3C7',
  },
  breakChipText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
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
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  typeCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: PRIMARY_COLOR,
  },
  typeCardLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '700',
  },
  typeCardDesc: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },

  calChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  calChipActive: { backgroundColor: PRIMARY_COLOR },
  calChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },
  calChipTextActive: { color: '#FFFFFF' },

  twoCol: { flexDirection: 'row', gap: 10 },

  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  addPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  addPeriodText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyPeriods: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
  },
  emptyPeriodsText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  periodNumber: {
    width: 24,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  periodInput: {
    flex: 1,
    paddingVertical: 8,
    textAlign: 'center',
    fontFamily: 'Courier',
  },
  periodDash: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  removePeriod: {
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
    marginTop: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  activeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

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

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
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