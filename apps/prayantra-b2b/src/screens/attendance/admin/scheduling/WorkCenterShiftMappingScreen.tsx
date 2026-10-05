import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getWorkCenterShifts,
  createWorkCenterShiftMapping,
  updateWorkCenterShiftMapping,
  listScheduleTemplates,
} from '@b2b/api-client';

import type {
  WorkCenterShift,
  ScheduleTemplate,
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
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function WorkCenterShiftMappingScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [workCenterCode, setWorkCenterCode] = useState('');
  const [asOfDate, setAsOfDate] = useState(ymd(new Date()));

  const [current, setCurrent] = useState<WorkCenterShift | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // Load templates once
  useEffect(() => {
    if (!companyId || !deviceId || !accessToken) return;
    (async () => {
      try {
        const res: any = await listScheduleTemplates(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          { active_only: true },
        );
        const list: ScheduleTemplate[] = Array.isArray(res?.data)
          ? res.data
          : [];
        setTemplates(list);
      } catch {
        // non-fatal
      }
    })();
  }, [companyId, deviceId, accessToken, locationId]);

  const fetchCurrent = useCallback(async () => {
    if (!companyId || !deviceId || !accessToken) return;
    if (!workCenterCode.trim()) {
      setCurrent(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: any = await getWorkCenterShifts(
        companyId,
        deviceId,
        accessToken,
        { work_center_code: workCenterCode.trim(), date: asOfDate },
      );
      // Response is a list; take the first (backend returns 0 or 1)
      const list: WorkCenterShift[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setCurrent(list[0] ?? null);
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          e?.message ||
          'Failed to load mapping',
      );
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, deviceId, accessToken, workCenterCode, asOfDate]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const currentTemplateName = useMemo(() => {
    if (!current) return null;
    const t = templates.find(
      (x) => x.schedule_template_id === current.shift_id,
    );
    return t?.name ?? null;
  }, [current, templates]);

  const handleCreateMapping = async (shiftId: string, effectiveFrom: string) => {
    if (!companyId || !deviceId || !accessToken) return;
    setBusy(true);
    try {
      await createWorkCenterShiftMapping(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        {
          work_center_code: workCenterCode.trim(),
          shift_id: shiftId,
          effective_from: effectiveFrom,
        },
      );
      setSnack({ text: 'Mapping created', tone: 'ok' });
      setTplModalOpen(false);
      await fetchCurrent();
    } catch (e: any) {
      setSnack({
        text:
          e?.response?.data?.error ||
          e?.message ||
          'Failed to create mapping',
        tone: 'err',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEndMapping = async () => {
    if (!current || !companyId || !deviceId || !accessToken) return;
    setBusy(true);
    try {
      await updateWorkCenterShiftMapping(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        {
          work_center_code: current.work_center_code,
          effective_to: ymd(new Date()),
        },
      );
      setSnack({ text: 'Mapping ended', tone: 'ok' });
      await fetchCurrent();
    } catch (e: any) {
      setSnack({
        text:
          e?.response?.data?.error ||
          e?.message ||
          'Failed to end mapping',
        tone: 'err',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.introText}>
              Each work center maps to one shift template at a time. Change
              the mapping when you rotate schedules.
            </Text>
          </View>

          {/* Work center code */}
          <Text style={styles.sectionLabel}>Work center code</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={workCenterCode}
              onChangeText={setWorkCenterCode}
              placeholder="e.g. WC-MUM-01"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchCurrent}
              activeOpacity={0.85}
            >
              <Icon name="magnify" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* As-of date */}
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
            As of date
          </Text>
          <TextInput
            style={styles.input}
            value={asOfDate}
            onChangeText={setAsOfDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />

          {/* Current mapping */}
          {workCenterCode.trim() ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                Current mapping
              </Text>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                </View>
              ) : error ? (
                <View style={styles.errBox}>
                  <Icon
                    name="alert-circle-outline"
                    size={16}
                    color="#991B1B"
                  />
                  <Text style={styles.errBoxText}>{error}</Text>
                </View>
              ) : current ? (
                <View style={styles.currentCard}>
                  <View style={styles.currentIcon}>
                    <Icon name="calendar-clock" size={22} color={PRIMARY_COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentLabel}>SHIFT TEMPLATE</Text>
                    <Text style={styles.currentName} numberOfLines={1}>
                      {currentTemplateName ?? current.shift_id.slice(0, 12) + '…'}
                    </Text>
                    <Text style={styles.currentDates}>
                      {fmtDate(current.effective_from)} →{' '}
                      {current.effective_to
                        ? fmtDate(current.effective_to)
                        : 'open-ended'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: current.is_active
                          ? '#D1FAE5'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: current.is_active ? '#065F46' : '#475569',
                        },
                      ]}
                    >
                      {current.is_active ? 'ACTIVE' : 'ENDED'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Icon name="link-variant-off" size={26} color="#94A3B8" />
                  <Text style={styles.emptyBoxText}>
                    No active shift mapping for this work center.
                  </Text>
                </View>
              )}
            </>
          ) : null}

          {/* Actions */}
          {workCenterCode.trim() && !loading ? (
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => setTplModalOpen(true)}
                activeOpacity={0.9}
              >
                <Icon name="link-variant-plus" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>
                  {current ? 'Replace shift' : 'Create mapping'}
                </Text>
              </TouchableOpacity>
              {current && current.is_active ? (
                <TouchableOpacity
                  style={styles.dangerAction}
                  onPress={handleEndMapping}
                  disabled={busy}
                  activeOpacity={0.9}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Icon name="link-variant-off" size={18} color="#EF4444" />
                      <Text style={styles.dangerActionText}>
                        End mapping today
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <TemplatePicker
        visible={tplModalOpen}
        templates={templates}
        onClose={() => setTplModalOpen(false)}
        onSelect={(tpl) => handleCreateMapping(tpl.schedule_template_id, ymd(new Date()))}
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
// TEMPLATE PICKER
// ============================================================

function TemplatePicker({
  visible,
  templates,
  onClose,
  onSelect,
}: {
  visible: boolean;
  templates: ScheduleTemplate[];
  onClose: () => void;
  onSelect: (t: ScheduleTemplate) => void;
}) {
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
            <Text style={styles.modalTitle}>Pick shift template</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {templates.length === 0 ? (
              <View style={styles.emptyModal}>
                <Icon name="calendar-clock-outline" size={26} color="#94A3B8" />
                <Text style={styles.emptyModalText}>
                  No shift templates yet.
                </Text>
              </View>
            ) : (
              templates.map((t) => (
                <TouchableOpacity
                  key={t.schedule_template_id}
                  style={styles.modalRow}
                  activeOpacity={0.85}
                  onPress={() => onSelect(t)}
                >
                  <View style={styles.modalRowIcon}>
                    <Icon name="calendar-clock" size={18} color={PRIMARY_COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={styles.modalRowSub}>
                      {t.template_type}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
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
  introText: { flex: 1, color: TEXT_PRIMARY, fontSize: 11, lineHeight: 16 },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
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
  refreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  errBoxText: { flex: 1, color: '#991B1B', fontSize: 12 },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  currentIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  currentLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  currentName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  currentDates: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Courier',
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  emptyBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderStyle: 'dashed',
  },
  emptyBoxText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  actionCol: { gap: 10, marginTop: 22 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  primaryActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerActionText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },

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
    paddingBottom: 20,
    maxHeight: '80%',
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
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  modalRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalRowTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  modalRowSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyModal: { alignItems: 'center', paddingVertical: 30 },
  emptyModalText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 8 },
});